#!/usr/bin/env python3
"""Protótipo 3D simplificado de compactação por tráfego em rota.

Objetivo:
- Simular, de forma aberta e reprodutível, o acúmulo de compactação em um volume 3D.
- Representar caminhão/trator passando repetidamente na mesma rota.
- Gerar visualizações 2D e 3D (incluindo HTML interativo) para inspeção técnica rápida.

Observação:
- Modelo conceitual para etapa inicial (TRL 4-5), não substitui calibração de campo.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

os.environ.setdefault("MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "matplotlib"))

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from prototipo_ponto_unico import GRAVITY, MachineParams, contact_pressure_pa, wheel_load_n

SOIL_LAYER_PROFILES_KPA: Dict[str, List[Tuple[float, float]]] = {
    # (profundidade_max_m, sigma_crit_kPa)
    "sandy_loam": [(0.30, 85.0), (1.00, 120.0), (2.00, 160.0), (5.00, 210.0)],
    "clayey": [(0.30, 110.0), (1.00, 155.0), (2.00, 210.0), (5.00, 280.0)],
    "lateritic": [(0.30, 130.0), (1.00, 190.0), (2.00, 260.0), (5.00, 340.0)],
    "wet_weak": [(0.30, 70.0), (1.00, 95.0), (2.00, 130.0), (5.00, 180.0)],
}


@dataclass
class Soil3DParams:
    moisture: float = 0.28
    reference_moisture: float = 0.23
    compaction_alpha: float = 0.035
    stress_exponent: float = 1.2
    max_compaction_index: float = 0.95
    depth_stress_decay_m: float = 1.05

    # Modelo linear (legado)
    sigma_crit_surface_kpa: float = 110.0
    sigma_crit_gradient_kpa_m: float = 35.0

    # Modelo por perfil/camadas
    soil_profile: str = "sandy_loam"  # linear | sandy_loam | clayey | lateritic | wet_weak | custom
    sigma_crit_layers: str = ""  # Ex.: "0.30:100,1.00:150,2.00:210,5.00:280"


@dataclass
class Domain3DParams:
    route_length_m: float = 80.0
    domain_width_m: float = 8.0
    depth_m: float = 5.0
    dx_m: float = 1.0
    dy_m: float = 0.25
    dz_m: float = 0.20


@dataclass
class Traffic3DParams:
    passes: int = 30
    track_gauge_m: float = 2.2
    step_along_route_m: float = 0.5


@dataclass
class Route3DParams:
    mode: str = "straight"  # straight | sine | csv
    csv_path: Path | None = None
    csv_x_col: str = "x_m"
    csv_y_col: str = "y_m"
    sine_amplitude_m: float = 1.2
    sine_wavelength_m: float = 30.0
    y_offset_m: float = 0.0


def mean_in_depth_band(
    z: np.ndarray,
    values_3d: np.ndarray,
    z_min: float,
    z_max: float,
    include_min: bool = False,
) -> float:
    if include_min:
        mask = (z >= z_min) & (z <= z_max)
    else:
        mask = (z > z_min) & (z <= z_max)

    if np.any(mask):
        return float(np.mean(values_3d[mask, :, :]))

    z_center = 0.5 * (z_min + z_max)
    idx = int(np.argmin(np.abs(z - z_center)))
    return float(np.mean(values_3d[idx : idx + 1, :, :]))


def parse_layer_spec(layers_spec: str, depth_m: float) -> List[Tuple[float, float]]:
    """Converte string "z1:v1,z2:v2,..." para lista de camadas."""
    raw_tokens = [token.strip() for token in layers_spec.split(",") if token.strip()]
    if not raw_tokens:
        raise ValueError("Camadas vazias em --sigma-crit-layers.")

    layers: List[Tuple[float, float]] = []
    last_depth = 0.0
    for token in raw_tokens:
        if ":" not in token:
            raise ValueError(f"Formato inválido de camada: '{token}'. Use profundidade:kPa.")
        z_txt, val_txt = token.split(":", 1)
        z_val = float(z_txt.strip())
        kpa_val = float(val_txt.strip())
        if z_val <= last_depth:
            raise ValueError("Profundidades em --sigma-crit-layers devem ser estritamente crescentes.")
        if kpa_val <= 0.0:
            raise ValueError("Valores de sigma_crit devem ser positivos.")
        layers.append((z_val, kpa_val))
        last_depth = z_val

    if layers[-1][0] < depth_m:
        layers.append((depth_m, layers[-1][1]))
    return layers


def resolve_sigma_crit_layers(soil: Soil3DParams, depth_m: float) -> List[Tuple[float, float]]:
    if soil.soil_profile == "linear":
        # No caso linear, as camadas são derivadas depois; não há tabela fixa aqui.
        return []

    if soil.soil_profile == "custom":
        if not soil.sigma_crit_layers.strip():
            raise ValueError("Perfil 'custom' exige --sigma-crit-layers.")
        return parse_layer_spec(soil.sigma_crit_layers, depth_m)

    if soil.soil_profile not in SOIL_LAYER_PROFILES_KPA:
        valid_profiles = ["linear", "custom"] + sorted(SOIL_LAYER_PROFILES_KPA.keys())
        raise ValueError(f"Perfil de solo desconhecido: {soil.soil_profile}. Opções: {valid_profiles}")

    layers = list(SOIL_LAYER_PROFILES_KPA[soil.soil_profile])
    if layers[-1][0] < depth_m:
        layers.append((depth_m, layers[-1][1]))
    return layers


def sigma_crit_profile_pa(
    z: np.ndarray,
    soil: Soil3DParams,
    depth_m: float,
) -> Tuple[np.ndarray, pd.DataFrame]:
    """Retorna sigma_crit(z) e tabela de camadas usadas."""
    if soil.soil_profile == "linear":
        sigma = (soil.sigma_crit_surface_kpa + soil.sigma_crit_gradient_kpa_m * z) * 1000.0
        table_df = pd.DataFrame(
            {
                "depth_m": z,
                "sigma_crit_kpa": sigma / 1000.0,
                "source_profile": "linear",
            }
        )
        return sigma, table_df

    layers = resolve_sigma_crit_layers(soil, depth_m)
    upper_bounds = np.array([layer[0] for layer in layers], dtype=float)
    values_kpa = np.array([layer[1] for layer in layers], dtype=float)
    idx = np.searchsorted(upper_bounds, z, side="left")
    idx = np.clip(idx, 0, values_kpa.size - 1)
    sigma = values_kpa[idx] * 1000.0

    layer_rows = [
        {
            "layer_upper_depth_m": bound,
            "sigma_crit_kpa": val,
            "source_profile": soil.soil_profile,
        }
        for bound, val in layers
    ]
    return sigma, pd.DataFrame(layer_rows)


def resample_polyline(points_xy: np.ndarray, step_m: float) -> np.ndarray:
    if points_xy.shape[0] < 2:
        raise ValueError("A rota precisa de pelo menos 2 pontos.")
    diffs = np.diff(points_xy, axis=0)
    seg_len = np.sqrt(np.sum(diffs**2, axis=1))
    keep = np.concatenate(([True], seg_len > 1e-9))
    points_xy = points_xy[keep]
    if points_xy.shape[0] < 2:
        raise ValueError("A rota contém pontos duplicados apenas.")

    diffs = np.diff(points_xy, axis=0)
    seg_len = np.sqrt(np.sum(diffs**2, axis=1))
    s = np.concatenate(([0.0], np.cumsum(seg_len)))
    total = float(s[-1])
    if total <= 1e-9:
        raise ValueError("Comprimento total da rota é zero.")

    new_s = np.arange(0.0, total + 0.5 * step_m, step_m)
    x_new = np.interp(new_s, s, points_xy[:, 0])
    y_new = np.interp(new_s, s, points_xy[:, 1])
    return np.column_stack([x_new, y_new])


def load_route_csv(route: Route3DParams) -> np.ndarray:
    if route.csv_path is None:
        raise ValueError("--route-mode csv exige --route-csv.")
    route_file = Path(route.csv_path)
    if not route_file.exists():
        raise FileNotFoundError(f"Arquivo de rota não encontrado: {route_file}")

    df = pd.read_csv(route_file)
    x_col = route.csv_x_col if route.csv_x_col in df.columns else ("x" if "x" in df.columns else None)
    y_col = route.csv_y_col if route.csv_y_col in df.columns else ("y" if "y" in df.columns else None)
    if x_col is None or y_col is None:
        raise ValueError(
            f"Colunas de rota não encontradas no CSV. Esperado: ({route.csv_x_col},{route.csv_y_col}) ou (x,y)."
        )

    points = df[[x_col, y_col]].dropna().to_numpy(dtype=float)
    if points.shape[0] < 2:
        raise ValueError("CSV de rota precisa de ao menos 2 pontos válidos.")
    points[:, 1] = points[:, 1] + route.y_offset_m
    return points


def build_route_centerline(
    route: Route3DParams,
    domain: Domain3DParams,
    traffic: Traffic3DParams,
) -> np.ndarray:
    if route.mode == "straight":
        x = np.arange(0.0, domain.route_length_m + 0.5 * traffic.step_along_route_m, traffic.step_along_route_m)
        y = np.full_like(x, route.y_offset_m, dtype=float)
        points = np.column_stack([x, y])
    elif route.mode == "sine":
        x = np.arange(0.0, domain.route_length_m + 0.5 * traffic.step_along_route_m, traffic.step_along_route_m)
        omega = 2.0 * np.pi / max(route.sine_wavelength_m, 1e-6)
        y = route.y_offset_m + route.sine_amplitude_m * np.sin(omega * x)
        points = np.column_stack([x, y])
    elif route.mode == "csv":
        points = load_route_csv(route)
    else:
        raise ValueError(f"Modo de rota inválido: {route.mode}")

    return resample_polyline(points, traffic.step_along_route_m)


def build_wheel_tracks(centerline_xy: np.ndarray, track_gauge_m: float) -> Tuple[np.ndarray, np.ndarray]:
    dx = np.gradient(centerline_xy[:, 0])
    dy = np.gradient(centerline_xy[:, 1])
    norm = np.hypot(dx, dy)
    norm = np.where(norm < 1e-9, 1.0, norm)

    tx = dx / norm
    ty = dy / norm
    nx = -ty
    ny = tx

    offset = 0.5 * track_gauge_m
    left = centerline_xy + np.column_stack([offset * nx, offset * ny])
    right = centerline_xy - np.column_stack([offset * nx, offset * ny])
    return left, right


def create_grid(
    centerline_xy: np.ndarray,
    domain: Domain3DParams,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    half_width = 0.5 * domain.domain_width_m
    x_min = float(np.min(centerline_xy[:, 0]) - half_width)
    x_max = float(np.max(centerline_xy[:, 0]) + half_width)
    y_min = float(np.min(centerline_xy[:, 1]) - half_width)
    y_max = float(np.max(centerline_xy[:, 1]) + half_width)

    x = np.arange(x_min, x_max + 0.5 * domain.dx_m, domain.dx_m)
    y = np.arange(y_min, y_max + 0.5 * domain.dy_m, domain.dy_m)
    z = np.arange(domain.dz_m / 2.0, domain.depth_m + 0.5 * domain.dz_m, domain.dz_m)
    return x, y, z


def build_route_load_map(
    x: np.ndarray,
    y: np.ndarray,
    left_track_xy: np.ndarray,
    right_track_xy: np.ndarray,
    machine: MachineParams,
) -> np.ndarray:
    """Gera mapa 2D de intensidade relativa de carregamento da rota."""
    sx = max(0.10, machine.contact_length_m / 2.2)
    sy = max(0.08, machine.tire_width_m / 2.2)

    yy, xx = np.meshgrid(y, x, indexing="ij")
    load_map = np.zeros_like(yy, dtype=float)
    all_wheel_points = np.vstack([left_track_xy, right_track_xy])

    for px, py in all_wheel_points:
        gx = np.exp(-0.5 * ((xx - px) / sx) ** 2)
        gy = np.exp(-0.5 * ((yy - py) / sy) ** 2)
        load_map += gx * gy

    load_map /= max(float(np.max(load_map)), 1e-12)
    return load_map


def sample_compaction_points(
    x: np.ndarray,
    y: np.ndarray,
    z: np.ndarray,
    compaction: np.ndarray,
    threshold: float,
    max_points: int,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    zz3, yy3, xx3 = np.meshgrid(z, y, x, indexing="ij")
    mask = compaction >= threshold
    if not np.any(mask):
        mask = compaction >= min(0.35, float(np.max(compaction)))

    x_pts = xx3[mask]
    y_pts = yy3[mask]
    z_pts = zz3[mask]
    c_pts = compaction[mask]

    if x_pts.size > max_points:
        step = int(np.ceil(x_pts.size / max_points))
        x_pts = x_pts[::step]
        y_pts = y_pts[::step]
        z_pts = z_pts[::step]
        c_pts = c_pts[::step]
    return x_pts, y_pts, z_pts, c_pts


def write_interactive_volume_html(
    out_file: Path,
    x_pts: np.ndarray,
    y_pts: np.ndarray,
    z_pts: np.ndarray,
    c_pts: np.ndarray,
    centerline_xy: np.ndarray,
    left_track_xy: np.ndarray,
    right_track_xy: np.ndarray,
    title: str,
) -> None:
    payload = {
        "pts_x": x_pts.tolist(),
        "pts_y": y_pts.tolist(),
        "pts_z": z_pts.tolist(),
        "pts_c": c_pts.tolist(),
        "route_x": centerline_xy[:, 0].tolist(),
        "route_y": centerline_xy[:, 1].tolist(),
        "left_x": left_track_xy[:, 0].tolist(),
        "left_y": left_track_xy[:, 1].tolist(),
        "right_x": right_track_xy[:, 0].tolist(),
        "right_y": right_track_xy[:, 1].tolist(),
    }
    payload_json = json.dumps(payload, separators=(",", ":"))

    html_template = """<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>__TITLE__</title>
    <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f6f6f6; }
      #wrap { padding: 10px 12px 18px; }
      #plot { width: 100%; height: 88vh; background: #fff; border: 1px solid #ddd; }
      .meta { font-size: 13px; color: #444; margin: 0 0 8px; }
    </style>
  </head>
  <body>
    <div id="wrap">
      <p class="meta">Visualização interativa 3D do volume de compactação (protótipo aberto)</p>
      <div id="plot"></div>
    </div>
    <script>
      const d = __PAYLOAD__;
      const traces = [
        {
          type: "scatter3d",
          mode: "markers",
          x: d.pts_x,
          y: d.pts_y,
          z: d.pts_z,
          marker: {
            size: 2.8,
            color: d.pts_c,
            colorscale: "Inferno",
            opacity: 0.65,
            colorbar: { title: "Índice de compactação" }
          },
          name: "Volume compactado"
        },
        {
          type: "scatter3d",
          mode: "lines",
          x: d.route_x,
          y: d.route_y,
          z: new Array(d.route_x.length).fill(0),
          line: { color: "#111111", width: 5 },
          name: "Centro da rota"
        },
        {
          type: "scatter3d",
          mode: "lines",
          x: d.left_x,
          y: d.left_y,
          z: new Array(d.left_x.length).fill(0),
          line: { color: "#00bcd4", width: 4 },
          name: "Trilha roda esquerda"
        },
        {
          type: "scatter3d",
          mode: "lines",
          x: d.right_x,
          y: d.right_y,
          z: new Array(d.right_x.length).fill(0),
          line: { color: "#00bcd4", width: 4 },
          name: "Trilha roda direita"
        }
      ];

      const layout = {
        title: "__TITLE__",
        margin: { l: 0, r: 0, t: 46, b: 0 },
        scene: {
          xaxis: { title: "x (m)" },
          yaxis: { title: "y (m)" },
          zaxis: { title: "Profundidade (m)", autorange: "reversed" },
          camera: { eye: { x: 1.35, y: -1.45, z: 0.85 } }
        },
        legend: { x: 0.02, y: 0.98 }
      };

      Plotly.newPlot("plot", traces, layout, { responsive: true, displaylogo: false });
    </script>
  </body>
</html>
"""
    html_content = html_template.replace("__PAYLOAD__", payload_json).replace("__TITLE__", title)
    out_file.write_text(html_content, encoding="utf-8")


def simulate_3d(
    soil: Soil3DParams,
    machine: MachineParams,
    domain: Domain3DParams,
    traffic: Traffic3DParams,
    route: Route3DParams,
    wheel_load_kg: float | None = None,
) -> Dict[str, object]:
    centerline_xy = build_route_centerline(route, domain, traffic)
    left_track_xy, right_track_xy = build_wheel_tracks(centerline_xy, traffic.track_gauge_m)
    x, y, z = create_grid(centerline_xy, domain)

    load_n = wheel_load_n(machine, wheel_load_kg)
    pressure_pa = contact_pressure_pa(machine, load_n)

    load_map = build_route_load_map(x, y, left_track_xy, right_track_xy, machine)
    wheels_per_track = max(machine.wheels / 2.0, 1.0)
    load_map_effective = load_map * wheels_per_track

    sigma_crit_pa, sigma_profile_df = sigma_crit_profile_pa(z, soil, domain.depth_m)
    depth_kernel = np.exp(-z / max(soil.depth_stress_decay_m, 1e-6))
    sigma_field_pa = pressure_pa * depth_kernel[:, None, None] * load_map_effective[None, :, :]

    compaction = (0.08 * np.exp(-z / 1.3))[:, None, None] * np.ones_like(sigma_field_pa)

    moisture_offset = soil.moisture - soil.reference_moisture
    moisture_factor = float(np.clip(1.0 + 2.0 * max(0.0, moisture_offset), 0.75, 2.0))

    summary_rows = []
    for i in range(1, traffic.passes + 1):
        stress_ratio = np.clip(sigma_field_pa / np.maximum(sigma_crit_pa[:, None, None], 1e-6), 0.0, 6.0)
        delta_c = (
            soil.compaction_alpha
            * moisture_factor
            * np.power(stress_ratio, soil.stress_exponent)
            * (1.0 - compaction / soil.max_compaction_index)
        )
        compaction = np.clip(compaction + delta_c, 0.0, soil.max_compaction_index)

        summary_rows.append(
            {
                "pass": i,
                "max_compaction_index": float(np.max(compaction)),
                "mean_compaction_0_30m": mean_in_depth_band(
                    z, compaction, z_min=0.0, z_max=0.30, include_min=True
                ),
                "mean_compaction_30_100m": mean_in_depth_band(
                    z, compaction, z_min=0.30, z_max=1.0, include_min=False
                ),
            }
        )

    summary_df = pd.DataFrame(summary_rows)
    return {
        "x": x,
        "y": y,
        "z": z,
        "compaction": compaction,
        "load_map": load_map,
        "summary_df": summary_df,
        "load_n": load_n,
        "pressure_pa": pressure_pa,
        "sigma_crit_pa": sigma_crit_pa,
        "sigma_profile_df": sigma_profile_df,
        "centerline_xy": centerline_xy,
        "left_track_xy": left_track_xy,
        "right_track_xy": right_track_xy,
    }


def plot_outputs_3d(
    out_dir: Path,
    sim_out: Dict[str, object],
    soil: Soil3DParams,
    machine: MachineParams,
    domain: Domain3DParams,
    traffic: Traffic3DParams,
    volume_threshold: float,
    interactive_html: bool,
) -> None:
    x = sim_out["x"]  # type: ignore[assignment]
    y = sim_out["y"]  # type: ignore[assignment]
    z = sim_out["z"]  # type: ignore[assignment]
    compaction = sim_out["compaction"]  # type: ignore[assignment]
    load_map = sim_out["load_map"]  # type: ignore[assignment]
    centerline_xy = sim_out["centerline_xy"]  # type: ignore[assignment]
    left_track_xy = sim_out["left_track_xy"]  # type: ignore[assignment]
    right_track_xy = sim_out["right_track_xy"]  # type: ignore[assignment]
    pressure_pa = float(sim_out["pressure_pa"])  # type: ignore[arg-type]
    load_n = float(sim_out["load_n"])  # type: ignore[arg-type]

    wheel_load_kg = load_n / GRAVITY
    header = (
        f"Passadas={traffic.passes} | Coluna={domain.depth_m:.1f} m | Grid={domain.dx_m:.2f}x{domain.dy_m:.2f}x{domain.dz_m:.2f} m\n"
        f"Massa={machine.mass_kg:.0f} kg | Rodas={machine.wheels} | Carga/roda={wheel_load_kg:.0f} kg | "
        f"Pressao contato={pressure_pa / 1000.0:.1f} kPa | Umidade={soil.moisture:.2f} | Perfil={soil.soil_profile}"
    )

    # 1) Mapa 2D da carga relativa na superfície.
    fig, ax = plt.subplots(figsize=(10.2, 4.6), dpi=130)
    im = ax.imshow(
        load_map,
        origin="lower",
        aspect="auto",
        extent=[float(np.min(x)), float(np.max(x)), float(np.min(y)), float(np.max(y))],
        cmap="viridis",
    )
    ax.plot(centerline_xy[:, 0], centerline_xy[:, 1], "w--", linewidth=1.5, label="Centro da rota")
    ax.plot(left_track_xy[:, 0], left_track_xy[:, 1], color="#9df8ff", linewidth=1.1, label="Trilha esquerda")
    ax.plot(right_track_xy[:, 0], right_track_xy[:, 1], color="#9df8ff", linewidth=1.1, label="Trilha direita")
    ax.set_title("Carga relativa acumulada da rota (superfície)")
    ax.set_xlabel("x ao longo da rota (m)")
    ax.set_ylabel("y transversal (m)")
    ax.legend(loc="upper right", fontsize=8)
    cbar = fig.colorbar(im, ax=ax)
    cbar.set_label("Intensidade relativa de carregamento")
    fig.text(0.01, 0.995, header, ha="left", va="top", fontsize=8)
    fig.tight_layout(rect=[0.0, 0.0, 1.0, 0.90])
    fig.savefig(out_dir / "mapa_carga_superficial.png")
    plt.close(fig)

    # 2) Seção y-z no x mediano da rota.
    x_mid = float(np.median(centerline_xy[:, 0]))
    ix_mid = int(np.argmin(np.abs(x - x_mid)))
    yz_slice = compaction[:, :, ix_mid]
    yy, zz = np.meshgrid(y, z)
    fig, ax = plt.subplots(figsize=(8.8, 5.2), dpi=130)
    contour = ax.contourf(yy, zz, yz_slice, levels=18, cmap="inferno", vmin=0.0, vmax=0.95)
    ax.set_title("Seção transversal no meio da rota (índice de compactação)")
    ax.set_xlabel("y transversal (m)")
    ax.set_ylabel("Profundidade (m)")
    ax.invert_yaxis()
    cbar = fig.colorbar(contour, ax=ax)
    cbar.set_label("Índice de compactação")
    fig.text(0.01, 0.995, header, ha="left", va="top", fontsize=8)
    fig.tight_layout(rect=[0.0, 0.0, 1.0, 0.90])
    fig.savefig(out_dir / "secao_transversal_meio_rota.png")
    plt.close(fig)

    # 3) Volume 3D estático.
    x_pts, y_pts, z_pts, c_pts = sample_compaction_points(
        x, y, z, compaction, threshold=volume_threshold, max_points=22_000
    )
    fig = plt.figure(figsize=(11.2, 6.2), dpi=130)
    ax = fig.add_subplot(111, projection="3d")
    sc = ax.scatter(x_pts, y_pts, z_pts, c=c_pts, cmap="inferno", s=6, alpha=0.65, linewidths=0)
    ax.plot(centerline_xy[:, 0], centerline_xy[:, 1], np.zeros(centerline_xy.shape[0]), "k--", linewidth=1.2)
    ax.plot(left_track_xy[:, 0], left_track_xy[:, 1], np.zeros(left_track_xy.shape[0]), color="#00acc1", linewidth=1.0)
    ax.plot(right_track_xy[:, 0], right_track_xy[:, 1], np.zeros(right_track_xy.shape[0]), color="#00acc1", linewidth=1.0)
    ax.set_title("Volume 3D do índice de compactação (acima do limiar)")
    ax.set_xlabel("x ao longo da rota (m)")
    ax.set_ylabel("y transversal (m)")
    ax.set_zlabel("Profundidade (m)")
    ax.set_zlim(float(np.max(z)), 0.0)
    cbar = fig.colorbar(sc, ax=ax, shrink=0.7)
    cbar.set_label("Índice de compactação")
    fig.text(0.01, 0.995, header, ha="left", va="top", fontsize=8)
    fig.tight_layout(rect=[0.0, 0.0, 1.0, 0.90])
    fig.savefig(out_dir / "volume_compactacao_3d.png")
    plt.close(fig)

    # 4) Volume 3D interativo (HTML com Plotly via CDN, sem dependência Python).
    if interactive_html:
        html_file = out_dir / "volume_compactacao_3d_interativo.html"
        xh, yh, zh, ch = sample_compaction_points(
            x, y, z, compaction, threshold=volume_threshold, max_points=45_000
        )
        write_interactive_volume_html(
            out_file=html_file,
            x_pts=xh,
            y_pts=yh,
            z_pts=zh,
            c_pts=ch,
            centerline_xy=centerline_xy,
            left_track_xy=left_track_xy,
            right_track_xy=right_track_xy,
            title="Compactação 3D interativa (protótipo aberto)",
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Protótipo 3D simples de compactação para rota com passadas repetidas."
    )
    parser.add_argument("--output-dir", type=Path, default=Path("outputs/prototipo_trajeto_3d"))

    parser.add_argument("--passes", type=int, default=30)
    parser.add_argument("--mass-kg", type=float, default=28_000.0)
    parser.add_argument("--wheels", type=int, default=8)
    parser.add_argument("--tire-width-m", type=float, default=0.65)
    parser.add_argument("--contact-length-m", type=float, default=0.45)
    parser.add_argument("--track-gauge-m", type=float, default=2.2)

    parser.add_argument("--route-length-m", type=float, default=80.0)
    parser.add_argument("--domain-width-m", type=float, default=8.0)
    parser.add_argument("--depth-m", type=float, default=5.0)
    parser.add_argument("--dx-m", type=float, default=1.0)
    parser.add_argument("--dy-m", type=float, default=0.25)
    parser.add_argument("--dz-m", type=float, default=0.20)
    parser.add_argument("--step-along-route-m", type=float, default=0.5)

    parser.add_argument("--route-mode", choices=["straight", "sine", "csv"], default="straight")
    parser.add_argument("--route-csv", type=Path, default=None)
    parser.add_argument("--route-csv-x-col", type=str, default="x_m")
    parser.add_argument("--route-csv-y-col", type=str, default="y_m")
    parser.add_argument("--route-sine-amplitude-m", type=float, default=1.2)
    parser.add_argument("--route-sine-wavelength-m", type=float, default=30.0)
    parser.add_argument("--route-y-offset-m", type=float, default=0.0)

    parser.add_argument("--moisture", type=float, default=0.28)
    parser.add_argument("--reference-moisture", type=float, default=0.23)
    parser.add_argument("--compaction-alpha", type=float, default=0.035)
    parser.add_argument("--stress-exponent", type=float, default=1.2)
    parser.add_argument("--max-compaction-index", type=float, default=0.95)
    parser.add_argument("--depth-stress-decay-m", type=float, default=1.05)

    parser.add_argument(
        "--soil-profile",
        choices=["linear", "sandy_loam", "clayey", "lateritic", "wet_weak", "custom"],
        default="sandy_loam",
    )
    parser.add_argument("--sigma-crit-surface-kpa", type=float, default=110.0)
    parser.add_argument("--sigma-crit-gradient-kpa-m", type=float, default=35.0)
    parser.add_argument("--sigma-crit-layers", type=str, default="")

    parser.add_argument("--volume-threshold", type=float, default=0.45)
    parser.add_argument("--no-interactive-html", action="store_true")
    parser.add_argument("--wheel-load-kg", type=float, default=None)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    out_dir: Path = args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    machine = MachineParams(
        mass_kg=args.mass_kg,
        wheels=args.wheels,
        tire_width_m=args.tire_width_m,
        contact_length_m=args.contact_length_m,
    )
    domain = Domain3DParams(
        route_length_m=args.route_length_m,
        domain_width_m=args.domain_width_m,
        depth_m=args.depth_m,
        dx_m=args.dx_m,
        dy_m=args.dy_m,
        dz_m=args.dz_m,
    )
    traffic = Traffic3DParams(
        passes=args.passes,
        track_gauge_m=args.track_gauge_m,
        step_along_route_m=args.step_along_route_m,
    )
    route = Route3DParams(
        mode=args.route_mode,
        csv_path=args.route_csv,
        csv_x_col=args.route_csv_x_col,
        csv_y_col=args.route_csv_y_col,
        sine_amplitude_m=args.route_sine_amplitude_m,
        sine_wavelength_m=args.route_sine_wavelength_m,
        y_offset_m=args.route_y_offset_m,
    )
    soil = Soil3DParams(
        moisture=args.moisture,
        reference_moisture=args.reference_moisture,
        compaction_alpha=args.compaction_alpha,
        stress_exponent=args.stress_exponent,
        max_compaction_index=args.max_compaction_index,
        depth_stress_decay_m=args.depth_stress_decay_m,
        sigma_crit_surface_kpa=args.sigma_crit_surface_kpa,
        sigma_crit_gradient_kpa_m=args.sigma_crit_gradient_kpa_m,
        soil_profile=args.soil_profile,
        sigma_crit_layers=args.sigma_crit_layers,
    )

    sim_out = simulate_3d(
        soil=soil,
        machine=machine,
        domain=domain,
        traffic=traffic,
        route=route,
        wheel_load_kg=args.wheel_load_kg,
    )

    summary_df: pd.DataFrame = sim_out["summary_df"]  # type: ignore[assignment]
    sigma_profile_df: pd.DataFrame = sim_out["sigma_profile_df"]  # type: ignore[assignment]
    centerline_xy = sim_out["centerline_xy"]  # type: ignore[assignment]
    left_track_xy = sim_out["left_track_xy"]  # type: ignore[assignment]
    right_track_xy = sim_out["right_track_xy"]  # type: ignore[assignment]
    pressure_kpa = float(sim_out["pressure_pa"]) / 1000.0  # type: ignore[arg-type]
    load_n = float(sim_out["load_n"])  # type: ignore[arg-type]

    summary_df.to_csv(out_dir / "evolucao_compactacao_passadas.csv", index=False)
    sigma_profile_df.to_csv(out_dir / "perfil_sigma_crit.csv", index=False)
    pd.DataFrame({"x_m": centerline_xy[:, 0], "y_m": centerline_xy[:, 1]}).to_csv(
        out_dir / "rota_centro_amostrada.csv", index=False
    )
    pd.DataFrame({"x_m": left_track_xy[:, 0], "y_m": left_track_xy[:, 1]}).to_csv(
        out_dir / "rota_trilha_esquerda.csv", index=False
    )
    pd.DataFrame({"x_m": right_track_xy[:, 0], "y_m": right_track_xy[:, 1]}).to_csv(
        out_dir / "rota_trilha_direita.csv", index=False
    )

    pd.DataFrame(
        [
            {
                "passes": traffic.passes,
                "depth_m": domain.depth_m,
                "mass_kg": machine.mass_kg,
                "wheels": machine.wheels,
                "wheel_load_kg": load_n / GRAVITY,
                "tire_width_m": machine.tire_width_m,
                "contact_length_m": machine.contact_length_m,
                "track_gauge_m": traffic.track_gauge_m,
                "contact_pressure_kpa": pressure_kpa,
                "moisture": soil.moisture,
                "soil_profile": soil.soil_profile,
                "sigma_crit_surface_kpa": soil.sigma_crit_surface_kpa,
                "sigma_crit_gradient_kpa_m": soil.sigma_crit_gradient_kpa_m,
                "sigma_crit_layers": soil.sigma_crit_layers,
                "route_mode": route.mode,
                "route_csv": str(route.csv_path) if route.csv_path else "",
                "route_sine_amplitude_m": route.sine_amplitude_m,
                "route_sine_wavelength_m": route.sine_wavelength_m,
            }
        ]
    ).to_csv(out_dir / "parametros_simulacao_3d.csv", index=False)

    plot_outputs_3d(
        out_dir=out_dir,
        sim_out=sim_out,
        soil=soil,
        machine=machine,
        domain=domain,
        traffic=traffic,
        volume_threshold=args.volume_threshold,
        interactive_html=not args.no_interactive_html,
    )

    final_row = summary_df.iloc[-1]
    print("--- PROTOTIPO 3D: TRAFEGO EM ROTA ---")
    print(
        "Resultado final: "
        f"max_compaction={float(final_row['max_compaction_index']):.3f}, "
        f"media_0_30m={float(final_row['mean_compaction_0_30m']):.3f}, "
        f"media_30_100m={float(final_row['mean_compaction_30_100m']):.3f}"
    )
    print(f"Pressao de contato: {pressure_kpa:.1f} kPa")
    print(f"Perfil de solo: {soil.soil_profile}")
    print(f"Modo de rota: {route.mode}")
    print(f"Arquivos gerados em: {out_dir}")


if __name__ == "__main__":
    main()
