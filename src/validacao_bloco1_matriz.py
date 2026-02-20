#!/usr/bin/env python3
"""Bloco 1 - validação física interna por matriz de cenários.

Varia uma variável por vez (OVAT: One Variable At a Time), mantendo as
outras fixas no cenário de referência, para verificar coerência de tendência.
"""

from __future__ import annotations

import argparse
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, Iterable, List

# Evita warning quando ~/.config/matplotlib não é gravável em ambiente de sandbox.
os.environ.setdefault("MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "matplotlib"))

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from prototipo_ponto_unico import MachineParams, SimParams, SoilParams, simulate


def run_case(params: Dict[str, Any]) -> Dict[str, Any]:
    sim = SimParams(
        passes=int(params["passes"]),
        depth_m=float(params["depth_m"]),
        dz_m=float(params["dz_m"]),
    )
    machine = MachineParams(
        mass_kg=float(params["mass_kg"]),
        wheels=int(params["wheels"]),
        tire_width_m=float(params["tire_width_m"]),
        contact_length_m=float(params["contact_length_m"]),
    )
    soil = SoilParams(
        kc=float(params["kc"]),
        kphi=float(params["kphi"]),
        n_bekker=float(params["n_bekker"]),
        moisture=float(params["moisture"]),
    )

    result = simulate(sim, soil, machine, wheel_load_kg=params.get("wheel_load_kg"))
    pass_df: pd.DataFrame = result["pass_df"]  # type: ignore[assignment]
    final = pass_df.iloc[-1]

    return {
        **params,
        "rut_final_mm": float(final["rut_depth_mm"]),
        "surface_compaction_final": float(final["surface_compaction_index"]),
        "avg_compaction_0_30cm_final": float(final["avg_compaction_0_30cm"]),
        "avg_compaction_30_100cm_final": float(final["avg_compaction_30_100cm"]),
        "energy_final_kJ": float(final["cumulative_compaction_energy_kJ"]),
    }


def monotonic_non_decreasing(values: Iterable[float], tol: float = 1e-9) -> bool:
    arr = np.asarray(list(values), dtype=float)
    if arr.size < 2:
        return True
    return bool(np.all(np.diff(arr) >= -tol))


def build_sweep(
    baseline: Dict[str, Any],
    variable: str,
    values: List[float],
) -> pd.DataFrame:
    rows: List[Dict[str, Any]] = []
    for v in values:
        p = dict(baseline)
        p[variable] = v
        rows.append(run_case(p))
    return pd.DataFrame(rows)


def plot_sweeps(
    out_dir: Path,
    sweep_passes: pd.DataFrame,
    sweep_mass: pd.DataFrame,
    sweep_moisture: pd.DataFrame,
    baseline: Dict[str, Any],
) -> None:
    fig, axes = plt.subplots(1, 3, figsize=(15.5, 4.8), dpi=130)
    context_text = (
        f"Cenario base: passadas={int(baseline['passes'])}, massa={float(baseline['mass_kg']):.0f} kg, "
        f"rodas={int(baseline['wheels'])}, umidade={float(baseline['moisture']):.2f}, "
        f"coluna={float(baseline['depth_m']):.1f} m, dz={float(baseline['dz_m']):.2f} m\n"
        f"Pneu={float(baseline['tire_width_m']):.2f}x{float(baseline['contact_length_m']):.2f} m | "
        f"Bekker: kc={float(baseline['kc']):.2e}, kphi={float(baseline['kphi']):.2e}, "
        f"n={float(baseline['n_bekker']):.2f}"
    )
    fig.text(
        0.01,
        0.995,
        context_text,
        ha="left",
        va="top",
        fontsize=8,
        bbox={"boxstyle": "round,pad=0.3", "facecolor": "#f5f5f5", "edgecolor": "#cccccc"},
    )

    def _plot(ax: Any, x: np.ndarray, y1: np.ndarray, y2: np.ndarray, title: str, xlabel: str) -> None:
        l1 = ax.plot(x, y1, marker="o", linewidth=2, color="#1f77b4", label="Sulco final (mm)")
        ax.set_xlabel(xlabel)
        ax.set_ylabel("Sulco final (mm)", color="#1f77b4")
        ax.tick_params(axis="y", labelcolor="#1f77b4")
        ax.grid(alpha=0.3)

        ax2 = ax.twinx()
        l2 = ax2.plot(
            x,
            y2,
            marker="s",
            linestyle="--",
            linewidth=1.8,
            color="#d62728",
            label="Índice de compactação superficial final",
        )
        ax2.set_ylabel("Índice de compactação superficial", color="#d62728")
        ax2.tick_params(axis="y", labelcolor="#d62728")

        lines = l1 + l2
        labels = [line.get_label() for line in lines]
        ax.legend(lines, labels, fontsize=7.5, loc="best")
        ax.set_title(title)

    _plot(
        axes[0],
        sweep_passes["passes"].to_numpy(),
        sweep_passes["rut_final_mm"].to_numpy(),
        sweep_passes["surface_compaction_final"].to_numpy(),
        "Sensibilidade a número de passadas",
        "Passadas",
    )

    _plot(
        axes[1],
        sweep_mass["mass_kg"].to_numpy(),
        sweep_mass["rut_final_mm"].to_numpy(),
        sweep_mass["surface_compaction_final"].to_numpy(),
        "Sensibilidade a massa total",
        "Massa da máquina (kg)",
    )

    _plot(
        axes[2],
        sweep_moisture["moisture"].to_numpy(),
        sweep_moisture["rut_final_mm"].to_numpy(),
        sweep_moisture["surface_compaction_final"].to_numpy(),
        "Sensibilidade a umidade",
        "Umidade volumétrica",
    )

    fig.tight_layout(rect=[0.0, 0.0, 1.0, 0.90])
    fig.savefig(out_dir / "sensibilidade_bloco1.png")
    plt.close(fig)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Executa matriz de cenários (variando uma variável por vez) para validação física interna."
    )
    parser.add_argument("--output-dir", type=Path, default=Path("outputs/validacao_bloco1"))
    parser.add_argument("--depth-m", type=float, default=10.0)
    parser.add_argument("--dz-m", type=float, default=0.1)
    parser.add_argument("--passes", type=int, default=30)
    parser.add_argument("--mass-kg", type=float, default=28_000.0)
    parser.add_argument("--wheels", type=int, default=8)
    parser.add_argument("--tire-width-m", type=float, default=0.65)
    parser.add_argument("--contact-length-m", type=float, default=0.45)
    parser.add_argument("--moisture", type=float, default=0.28)
    parser.add_argument("--kc", type=float, default=120_000.0)
    parser.add_argument("--kphi", type=float, default=4_500_000.0)
    parser.add_argument("--n-bekker", type=float, default=1.1)
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    baseline: Dict[str, Any] = {
        "passes": args.passes,
        "depth_m": args.depth_m,
        "dz_m": args.dz_m,
        "mass_kg": args.mass_kg,
        "wheels": args.wheels,
        "tire_width_m": args.tire_width_m,
        "contact_length_m": args.contact_length_m,
        "moisture": args.moisture,
        "kc": args.kc,
        "kphi": args.kphi,
        "n_bekker": args.n_bekker,
        "wheel_load_kg": None,
    }

    pass_values = [5, 10, 20, 30, 40, 60]
    mass_values = [18_000, 24_000, 28_000, 34_000, 42_000]
    moisture_values = [0.18, 0.23, 0.28, 0.33, 0.38]

    baseline_row = pd.DataFrame([run_case(baseline)])
    sweep_passes = build_sweep(baseline, "passes", pass_values)
    sweep_mass = build_sweep(baseline, "mass_kg", mass_values)
    sweep_moisture = build_sweep(baseline, "moisture", moisture_values)

    checks = [
        {
            "check": "Sulco final cresce com passadas",
            "result": monotonic_non_decreasing(sweep_passes["rut_final_mm"]),
        },
        {
            "check": "Compactação superficial final cresce com passadas",
            "result": monotonic_non_decreasing(sweep_passes["surface_compaction_final"]),
        },
        {
            "check": "Sulco final cresce com massa",
            "result": monotonic_non_decreasing(sweep_mass["rut_final_mm"]),
        },
        {
            "check": "Compactação superficial final cresce com massa",
            "result": monotonic_non_decreasing(sweep_mass["surface_compaction_final"]),
        },
        {
            "check": "Sulco final cresce com umidade",
            "result": monotonic_non_decreasing(sweep_moisture["rut_final_mm"]),
        },
        {
            "check": "Compactação superficial final cresce com umidade",
            "result": monotonic_non_decreasing(sweep_moisture["surface_compaction_final"]),
        },
    ]
    checks_df = pd.DataFrame(checks)

    out_dir: Path = args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    baseline_row.to_csv(out_dir / "baseline.csv", index=False)
    sweep_passes.to_csv(out_dir / "sweep_passes.csv", index=False)
    sweep_mass.to_csv(out_dir / "sweep_mass.csv", index=False)
    sweep_moisture.to_csv(out_dir / "sweep_moisture.csv", index=False)
    checks_df.to_csv(out_dir / "gate_checks.csv", index=False)

    plot_sweeps(out_dir, sweep_passes, sweep_mass, sweep_moisture, baseline)

    print("--- BLOCO 1: VALIDACAO FISICA INTERNA ---")
    print(f"Profundidade de coluna usada: {args.depth_m:.1f} m")
    print(f"Cenario de referencia: {baseline_row.to_dict(orient='records')[0]}")
    print("\nResultados dos checks de coerencia:")
    for row in checks:
        print(f"- {row['check']}: {'PASSOU' if row['result'] else 'FALHOU'}")
    print(f"\nArquivos gerados em: {out_dir}")


if __name__ == "__main__":
    main()
