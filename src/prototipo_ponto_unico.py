#!/usr/bin/env python3
"""Protótipo de compactação em ponto único com múltiplas passadas.

Modelo simplificado para TLR 4-5:
- Pressão de contato do pneu -> afundamento (forma de Bekker)
- Atualização incremental de compactação em uma coluna de solo (profundidade configurável)
- Regra de carga repetitiva com endurecimento progressivo (histerese simplificada)
- Sensores virtuais (cone index e densidade aparente)
"""

from __future__ import annotations

import argparse
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

# Evita warning quando ~/.config/matplotlib não é gravável em ambiente de sandbox.
os.environ.setdefault("MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "matplotlib"))

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

GRAVITY = 9.81


@dataclass
class SoilParams:
    kc: float = 120_000.0
    kphi: float = 4_500_000.0
    n_bekker: float = 1.1
    moisture: float = 0.28
    reference_moisture: float = 0.23
    moisture_softening_gain: float = 1.4
    hardening_gain: float = 2.5
    compaction_alpha: float = 0.06
    stress_exponent: float = 1.15
    precon_hardening: float = 0.08
    max_compaction_index: float = 0.95


@dataclass
class MachineParams:
    mass_kg: float = 28_000.0
    wheels: int = 8
    tire_width_m: float = 0.65
    contact_length_m: float = 0.45


@dataclass
class SimParams:
    passes: int = 30
    depth_m: float = 10.0
    dz_m: float = 0.1


def mean_in_band_or_nearest(
    depths_m: np.ndarray,
    values: np.ndarray,
    z_min: float,
    z_max: float,
    include_min: bool = False,
) -> float:
    if include_min:
        mask = (depths_m >= z_min) & (depths_m <= z_max)
    else:
        mask = (depths_m > z_min) & (depths_m <= z_max)

    if np.any(mask):
        return float(np.mean(values[mask]))

    band_center = 0.5 * (z_min + z_max)
    idx = int(np.argmin(np.abs(depths_m - band_center)))
    return float(values[idx])


def wheel_load_n(machine: MachineParams, wheel_load_kg: float | None) -> float:
    if wheel_load_kg is not None:
        return wheel_load_kg * GRAVITY
    return machine.mass_kg * GRAVITY / machine.wheels


def contact_pressure_pa(machine: MachineParams, load_n: float) -> float:
    area = machine.tire_width_m * machine.contact_length_m
    return load_n / max(area, 1e-6)


def bekker_sinkage_m(
    pressure_pa: float,
    tire_width_m: float,
    soil: SoilParams,
    surface_compaction: float,
) -> float:
    moisture_offset = soil.moisture - soil.reference_moisture
    softening = max(0.35, 1.0 - soil.moisture_softening_gain * moisture_offset)
    hardening = 1.0 + soil.hardening_gain * surface_compaction

    stiffness = (soil.kc / max(tire_width_m, 1e-6) + soil.kphi) * softening * hardening
    return max(0.0, pressure_pa / max(stiffness, 1e-6)) ** (1.0 / soil.n_bekker)


def vertical_stress_profile_pa(
    pressure_pa: float,
    contact_area_m2: float,
    depths_m: np.ndarray,
) -> np.ndarray:
    """Distribuição de tensão vertical sob o centro do contato.

    Aproximação por área circular equivalente usando solução elástica axisimétrica.
    """
    a = np.sqrt(max(contact_area_m2, 1e-8) / np.pi)
    z = np.maximum(depths_m, 1e-4)
    factor = 1.0 - 1.0 / np.power(1.0 + (a / z) ** 2, 1.5)
    return pressure_pa * np.clip(factor, 0.0, 1.0)


def virtual_sensors(
    depths_m: np.ndarray,
    compaction_idx: np.ndarray,
    moisture: float,
    reference_moisture: float,
) -> pd.DataFrame:
    moisture_offset = moisture - reference_moisture

    ci_base_mpa = 0.45 + 0.50 * np.log1p(depths_m * 2.8)
    cone_index_mpa = ci_base_mpa * (1.0 + 2.2 * compaction_idx) * np.exp(-1.8 * moisture_offset)

    rho_base_g_cm3 = 1.25 + 0.28 * (1.0 - np.exp(-depths_m / 0.7))
    bulk_density_g_cm3 = rho_base_g_cm3 + 0.35 * compaction_idx - 0.08 * moisture_offset

    return pd.DataFrame(
        {
            "depth_m": depths_m,
            "compaction_index": compaction_idx,
            "cone_index_mpa": np.clip(cone_index_mpa, 0.1, None),
            "bulk_density_g_cm3": np.clip(bulk_density_g_cm3, 0.9, 2.1),
        }
    )


def simulate(
    sim: SimParams,
    soil: SoilParams,
    machine: MachineParams,
    wheel_load_kg: float | None = None,
) -> Dict[str, object]:
    depths = np.arange(sim.dz_m / 2.0, sim.depth_m + sim.dz_m / 2.0, sim.dz_m)

    load_n = wheel_load_n(machine, wheel_load_kg)
    area_m2 = machine.tire_width_m * machine.contact_length_m
    pressure_pa = contact_pressure_pa(machine, load_n)

    # Estado inicial: leve compactação pré-existente e tensão de pré-adensamento basal.
    compaction_idx = 0.12 * np.exp(-depths / 1.2)
    precon_stress_pa = 20_000.0 + 12_000.0 * depths

    rut_depth_m = 0.0
    cumulative_compaction_energy_j = 0.0

    pass_rows: List[Dict[str, float]] = []
    compaction_history: List[np.ndarray] = []

    moisture_offset = soil.moisture - soil.reference_moisture
    moisture_factor = float(np.clip(1.0 + 2.2 * max(0.0, moisture_offset), 0.7, 2.0))

    for idx in range(1, sim.passes + 1):
        z_eq = bekker_sinkage_m(pressure_pa, machine.tire_width_m, soil, float(compaction_idx[0]))

        rut_target = z_eq * (1.15 + 0.25 * max(0.0, moisture_offset))
        growth_rate = max(0.04, 0.35 * (1.0 - 0.45 * compaction_idx[0]))
        rut_increment = max(0.0, (rut_target - rut_depth_m) * (1.0 - np.exp(-growth_rate)))
        rut_depth_m += rut_increment

        sigma_z = vertical_stress_profile_pa(pressure_pa, area_m2, depths)
        stress_ratio = np.clip(
            sigma_z / np.maximum(precon_stress_pa, 1e-6),
            0.0,
            4.0,
        )

        delta_c = (
            soil.compaction_alpha
            * moisture_factor
            * np.power(stress_ratio, soil.stress_exponent)
            * np.exp(-depths / 2.5)
            * (1.0 - compaction_idx / soil.max_compaction_index)
        )

        compaction_idx = np.clip(compaction_idx + delta_c, 0.0, soil.max_compaction_index)

        precon_stress_pa += soil.precon_hardening * np.maximum(0.0, sigma_z - precon_stress_pa)
        precon_stress_pa += 0.01 * sigma_z * (1.0 - compaction_idx)

        delta_work_j = load_n * rut_increment
        cumulative_compaction_energy_j += delta_work_j * machine.wheels

        pass_rows.append(
            {
                "pass": idx,
                "rut_depth_mm": rut_depth_m * 1000.0,
                "rut_increment_mm": rut_increment * 1000.0,
                "surface_compaction_index": float(compaction_idx[0]),
                "avg_compaction_0_30cm": mean_in_band_or_nearest(
                    depths,
                    compaction_idx,
                    z_min=0.0,
                    z_max=0.30,
                    include_min=True,
                ),
                "avg_compaction_30_100cm": mean_in_band_or_nearest(
                    depths,
                    compaction_idx,
                    z_min=0.30,
                    z_max=1.0,
                    include_min=False,
                ),
                "compaction_resistance_kN": float(
                    (load_n * rut_depth_m / max(machine.contact_length_m, 1e-6)) / 1000.0
                ),
                "cumulative_compaction_energy_kJ": cumulative_compaction_energy_j / 1000.0,
            }
        )
        compaction_history.append(compaction_idx.copy())

    pass_df = pd.DataFrame(pass_rows)
    profile_df = virtual_sensors(depths, compaction_idx, soil.moisture, soil.reference_moisture)

    return {
        "pass_df": pass_df,
        "profile_df": profile_df,
        "compaction_history": compaction_history,
        "depths": depths,
        "load_n": load_n,
        "pressure_pa": pressure_pa,
    }


def plot_outputs(
    out_dir: Path,
    pass_df: pd.DataFrame,
    profile_df: pd.DataFrame,
    compaction_history: List[np.ndarray],
    depths: np.ndarray,
    sim: SimParams,
    soil: SoilParams,
    machine: MachineParams,
    load_n: float,
    pressure_pa: float,
) -> None:
    wheel_load_kg = load_n / GRAVITY
    context_text = (
        f"Passadas={sim.passes} | Coluna={sim.depth_m:.1f} m | dz={sim.dz_m:.2f} m | Umidade={soil.moisture:.2f}\n"
        f"Massa={machine.mass_kg:.0f} kg | Rodas={machine.wheels} | Carga/roda={wheel_load_kg:.0f} kg | "
        f"Pressao contato={pressure_pa / 1000:.1f} kPa\n"
        f"Pneu: largura={machine.tire_width_m:.2f} m, contato={machine.contact_length_m:.2f} m | "
        f"Bekker: kc={soil.kc:.2e}, kphi={soil.kphi:.2e}, n={soil.n_bekker:.2f}"
    )

    fig, axes = plt.subplots(1, 2, figsize=(12, 4.5), dpi=130)
    fig.text(
        0.01,
        0.995,
        context_text,
        ha="left",
        va="top",
        fontsize=7.6,
        bbox={"boxstyle": "round,pad=0.28", "facecolor": "#f5f5f5", "edgecolor": "#cccccc"},
    )
    max_pass = int(pass_df["pass"].iloc[-1])
    if len(depths) > 1:
        dz = float(depths[1] - depths[0])
    else:
        dz = float(depths[0])
    max_depth_m = float(depths[-1] + dz / 2.0)

    if max_pass <= 12:
        xticks = np.arange(0, max_pass + 1, 1)
    else:
        step = max(1, int(np.ceil(max_pass / 12)))
        xticks = np.arange(0, max_pass + 1, step)
        if xticks[-1] != max_pass:
            xticks = np.append(xticks, max_pass)

    axes[0].plot(
        pass_df["pass"],
        pass_df["rut_depth_mm"],
        color="#1f77b4",
        linewidth=2,
        marker="o",
        markersize=4,
        label="Sulco residual (mm)",
    )
    axes[0].set_title("Ponto único: afundamento residual")
    axes[0].set_xlabel("Número de passadas")
    axes[0].set_ylabel("Profundidade de sulco (mm)")
    axes[0].set_xlim(0.0, float(max(1, max_pass)))
    axes[0].set_xticks(xticks)
    axes[0].grid(alpha=0.3)

    ax2 = axes[0].twinx()
    ax2.plot(
        pass_df["pass"],
        pass_df["surface_compaction_index"],
        color="#d62728",
        linestyle="--",
        linewidth=1.8,
        marker="s",
        markersize=3.5,
        label="Índice superficial",
    )
    ax2.set_ylabel("Índice de compactação superficial")
    lines_left, labels_left = axes[0].get_legend_handles_labels()
    lines_right, labels_right = ax2.get_legend_handles_labels()
    axes[0].legend(lines_left + lines_right, labels_left + labels_right, fontsize=8, loc="lower right")

    snapshot_candidates = [1, 3, 5, 10, max_pass]
    snapshot_passes = sorted(set(p for p in snapshot_candidates if 1 <= p <= max_pass))
    for p in snapshot_passes:
        profile = compaction_history[p - 1]
        axes[1].plot(profile, depths, label=f"Passada {p}")

    axes[1].set_title(f"Coluna de solo (0-{max_depth_m:.1f} m)")
    axes[1].set_xlabel("Índice de compactação")
    axes[1].set_ylabel("Profundidade (m)")
    axes[1].invert_yaxis()
    axes[1].grid(alpha=0.3)
    axes[1].legend(fontsize=8)

    fig.tight_layout(rect=[0.0, 0.0, 1.0, 0.87])
    fig.savefig(out_dir / "evolucao_ponto_unico.png")
    plt.close(fig)

    fig2, ax_left = plt.subplots(figsize=(6.2, 5), dpi=130)
    fig2.text(
        0.01,
        0.995,
        context_text,
        ha="left",
        va="top",
        fontsize=7.3,
        bbox={"boxstyle": "round,pad=0.26", "facecolor": "#f5f5f5", "edgecolor": "#cccccc"},
    )
    ax_right = ax_left.twiny()

    ax_left.plot(
        profile_df["cone_index_mpa"],
        profile_df["depth_m"],
        color="#2ca02c",
        linewidth=2,
        label="Cone index virtual (MPa)",
    )
    ax_right.plot(
        profile_df["bulk_density_g_cm3"],
        profile_df["depth_m"],
        color="#9467bd",
        linewidth=2,
        label="Densidade virtual (g/cm³)",
    )

    ax_left.set_title("Sensores virtuais no perfil final")
    ax_left.set_xlabel("Cone index (MPa)")
    ax_right.set_xlabel("Densidade aparente (g/cm³)")
    ax_left.set_ylabel("Profundidade (m)")
    ax_left.invert_yaxis()
    ax_left.grid(alpha=0.3)
    lines_left, labels_left = ax_left.get_legend_handles_labels()
    lines_right, labels_right = ax_right.get_legend_handles_labels()
    ax_left.legend(lines_left + lines_right, labels_left + labels_right, fontsize=8, loc="upper right")

    fig2.tight_layout(rect=[0.0, 0.0, 1.0, 0.87])
    fig2.savefig(out_dir / "sensores_virtuais_perfil_final.png")
    plt.close(fig2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Simula compactação em ponto único para passadas repetidas de máquina agrícola."
    )
    parser.add_argument("--passes", type=int, default=30, help="Número de passadas sobre o ponto")
    parser.add_argument("--depth-m", type=float, default=10.0, help="Profundidade total da coluna (m)")
    parser.add_argument("--dz-m", type=float, default=0.1, help="Espessura da camada (m)")
    parser.add_argument("--mass-kg", type=float, default=28_000.0, help="Massa total da máquina (kg)")
    parser.add_argument("--wheels", type=int, default=8, help="Quantidade de rodas")
    parser.add_argument("--wheel-load-kg", type=float, default=None, help="Carga por roda (kg), opcional")
    parser.add_argument("--tire-width-m", type=float, default=0.65, help="Largura efetiva do pneu (m)")
    parser.add_argument(
        "--contact-length-m",
        type=float,
        default=0.45,
        help="Comprimento efetivo de contato pneu-solo (m)",
    )
    parser.add_argument(
        "--moisture",
        type=float,
        default=0.28,
        help="Umidade volumétrica do solo (fração 0-1)",
    )
    parser.add_argument("--kc", type=float, default=120_000.0, help="Parâmetro kc da relação pressão-afundamento")
    parser.add_argument("--kphi", type=float, default=4_500_000.0, help="Parâmetro kphi da relação pressão-afundamento")
    parser.add_argument("--n-bekker", type=float, default=1.1, help="Expoente n da relação pressão-afundamento")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("outputs/ponto_unico"),
        help="Diretório de saída para CSVs e gráficos",
    )
    return parser.parse_args()


def validate_args(args: argparse.Namespace) -> None:
    if args.passes < 1:
        raise ValueError("--passes deve ser >= 1")
    if args.depth_m <= 0:
        raise ValueError("--depth-m deve ser > 0")
    if args.dz_m <= 0:
        raise ValueError("--dz-m deve ser > 0")
    if args.dz_m > args.depth_m:
        raise ValueError("--dz-m deve ser <= --depth-m")
    if args.mass_kg <= 0:
        raise ValueError("--mass-kg deve ser > 0")
    if args.wheels < 1:
        raise ValueError("--wheels deve ser >= 1")
    if args.wheel_load_kg is not None and args.wheel_load_kg <= 0:
        raise ValueError("--wheel-load-kg deve ser > 0")
    if args.tire_width_m <= 0:
        raise ValueError("--tire-width-m deve ser > 0")
    if args.contact_length_m <= 0:
        raise ValueError("--contact-length-m deve ser > 0")
    if not (0.0 <= args.moisture <= 1.0):
        raise ValueError("--moisture deve estar entre 0 e 1")
    if args.kc <= 0:
        raise ValueError("--kc deve ser > 0")
    if args.kphi <= 0:
        raise ValueError("--kphi deve ser > 0")
    if args.n_bekker <= 0:
        raise ValueError("--n-bekker deve ser > 0")


def main() -> None:
    args = parse_args()
    try:
        validate_args(args)
    except ValueError as exc:
        raise SystemExit(f"Erro de entrada: {exc}") from exc

    sim = SimParams(passes=args.passes, depth_m=args.depth_m, dz_m=args.dz_m)
    soil = SoilParams(kc=args.kc, kphi=args.kphi, n_bekker=args.n_bekker, moisture=args.moisture)
    machine = MachineParams(
        mass_kg=args.mass_kg,
        wheels=args.wheels,
        tire_width_m=args.tire_width_m,
        contact_length_m=args.contact_length_m,
    )

    result = simulate(sim, soil, machine, wheel_load_kg=args.wheel_load_kg)

    out_dir: Path = args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    pass_df: pd.DataFrame = result["pass_df"]  # type: ignore[assignment]
    profile_df: pd.DataFrame = result["profile_df"]  # type: ignore[assignment]
    compaction_history: List[np.ndarray] = result["compaction_history"]  # type: ignore[assignment]
    depths: np.ndarray = result["depths"]  # type: ignore[assignment]
    load_n: float = float(result["load_n"])  # type: ignore[arg-type]
    pressure_pa: float = float(result["pressure_pa"])  # type: ignore[arg-type]

    pass_df.to_csv(out_dir / "series_passadas.csv", index=False)
    profile_df.to_csv(out_dir / "perfil_final_coluna.csv", index=False)
    metadata_df = pd.DataFrame(
        [
            {
                "passes": sim.passes,
                "depth_m": sim.depth_m,
                "dz_m": sim.dz_m,
                "mass_kg": machine.mass_kg,
                "wheels": machine.wheels,
                "wheel_load_kg_effective": load_n / GRAVITY,
                "tire_width_m": machine.tire_width_m,
                "contact_length_m": machine.contact_length_m,
                "contact_pressure_kpa": pressure_pa / 1000.0,
                "moisture": soil.moisture,
                "kc": soil.kc,
                "kphi": soil.kphi,
                "n_bekker": soil.n_bekker,
                "surface_compaction_final": float(pass_df["surface_compaction_index"].iloc[-1]),
                "rut_depth_final_mm": float(pass_df["rut_depth_mm"].iloc[-1]),
            }
        ]
    )
    metadata_df.to_csv(out_dir / "parametros_simulacao.csv", index=False)
    plot_outputs(out_dir, pass_df, profile_df, compaction_history, depths, sim, soil, machine, load_n, pressure_pa)

    print("--- PROTOTIPO PONTO UNICO ---")
    print(f"Passadas simuladas: {sim.passes}")
    print(f"Carga por roda: {load_n / GRAVITY:.1f} kg")
    print(f"Pressao media de contato: {pressure_pa / 1000:.1f} kPa")
    print(f"Sulco residual final: {pass_df['rut_depth_mm'].iloc[-1]:.1f} mm")
    print(f"Indice de compactacao superficial final: {pass_df['surface_compaction_index'].iloc[-1]:.3f}")
    print(f"Energia acumulada de compactacao: {pass_df['cumulative_compaction_energy_kJ'].iloc[-1]:.1f} kJ")
    print(f"Profundidade total simulada: {sim.depth_m:.1f} m")
    print(f"Arquivos gerados em: {out_dir}")


if __name__ == "__main__":
    main()
