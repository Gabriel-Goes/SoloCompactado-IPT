#!/usr/bin/env python3
"""Enriquece trilhas GPS com classes locais de uso e cobertura do solo.

Fluxo esperado:
- baixar/recortar rasters temáticos do MapBiomas e/ou BDC para a área operacional;
- copiar os rasters para a máquina ou para o pipeline de pré-processamento;
- consultar localmente a classe do pixel e a classe modal em uma vizinhança;
- exportar um CSV pronto para alimentar o modelo de compactação.

O script opera offline e foi pensado para pré-processamento periódico.
"""

from __future__ import annotations

import argparse
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List

import numpy as np
import pandas as pd

try:
    import rasterio
    from rasterio.transform import rowcol
    from rasterio.warp import transform as warp_transform
except ImportError as exc:  # pragma: no cover - falha explícita em runtime
    raise SystemExit(
        "Dependência ausente: instale 'rasterio' para usar o enriquecimento geoespacial."
    ) from exc


@dataclass(frozen=True)
class RasterSpec:
    prefix: str
    raster_path: Path
    legend_csv: Path | None = None


def parse_raster_spec(spec: str, default_prefix: str) -> RasterSpec:
    if not spec.strip():
        raise ValueError("Especificação de raster vazia.")

    tokens = spec.split("::")
    if len(tokens) == 1:
        raster_path = Path(tokens[0].strip())
        return RasterSpec(prefix=default_prefix, raster_path=raster_path, legend_csv=None)
    if len(tokens) == 2:
        prefix, raster_path = tokens
        return RasterSpec(prefix=prefix.strip(), raster_path=Path(raster_path.strip()), legend_csv=None)
    if len(tokens) == 3:
        prefix, raster_path, legend_csv = tokens
        return RasterSpec(
            prefix=prefix.strip(),
            raster_path=Path(raster_path.strip()),
            legend_csv=Path(legend_csv.strip()),
        )
    raise ValueError(
        f"Especificação inválida: '{spec}'. Use 'raster.tif', 'prefixo::raster.tif' "
        "ou 'prefixo::raster.tif::legenda.csv'."
    )


def load_legend(legend_csv: Path | None) -> Dict[int, str]:
    if legend_csv is None:
        return {}
    if not legend_csv.exists():
        raise FileNotFoundError(f"Arquivo de legenda não encontrado: {legend_csv}")

    legend_df = pd.read_csv(legend_csv)
    required = {"class_id", "class_name"}
    if not required.issubset(legend_df.columns):
        raise ValueError(
            f"Legenda {legend_csv} precisa ter colunas {sorted(required)}. "
            f"Encontradas: {list(legend_df.columns)}"
        )

    return {
        int(class_id): str(class_name)
        for class_id, class_name in legend_df[["class_id", "class_name"]].itertuples(index=False)
    }


def transform_points(
    x_values: np.ndarray,
    y_values: np.ndarray,
    src_crs: str,
    dst_crs: object,
) -> tuple[np.ndarray, np.ndarray]:
    if dst_crs is None:
        raise ValueError("Raster sem CRS definido; não é possível reprojetar coordenadas.")

    dst_crs_str = dst_crs.to_string() if hasattr(dst_crs, "to_string") else str(dst_crs)
    if dst_crs_str == src_crs:
        return x_values, y_values

    x_out, y_out = warp_transform(src_crs, dst_crs, x_values.tolist(), y_values.tolist())
    return np.asarray(x_out, dtype=float), np.asarray(y_out, dtype=float)


def compute_window_radius_px(dataset: rasterio.io.DatasetReader, radius_m: float) -> tuple[int, int]:
    if radius_m <= 0.0:
        return 0, 0

    res_x, res_y = dataset.res
    px = max(0, int(math.ceil(radius_m / max(abs(res_x), 1e-9))))
    py = max(0, int(math.ceil(radius_m / max(abs(res_y), 1e-9))))
    return px, py


def normalize_class_value(value: object) -> float | int | None:
    if value is None:
        return None
    if isinstance(value, (np.floating, float)):
        if np.isnan(value):
            return None
        if float(value).is_integer():
            return int(value)
        return float(value)
    if isinstance(value, (np.integer, int)):
        return int(value)
    return None


def valid_window_values(window_values: np.ndarray, nodata: float | int | None) -> np.ndarray:
    values = np.asarray(window_values).reshape(-1)
    if values.size == 0:
        return np.array([], dtype=float)

    if np.issubdtype(values.dtype, np.floating):
        values = values[~np.isnan(values)]

    if nodata is not None:
        values = values[values != nodata]

    return values


def modal_value(values: np.ndarray) -> float | int | None:
    if values.size == 0:
        return None
    unique_values, counts = np.unique(values, return_counts=True)
    idx = int(np.argmax(counts))
    value = unique_values[idx]
    return normalize_class_value(value)


def sample_raster(
    dataset: rasterio.io.DatasetReader,
    x_native: np.ndarray,
    y_native: np.ndarray,
    radius_m: float,
) -> pd.DataFrame:
    band = dataset.read(1)
    nodata = dataset.nodata
    radius_x_px, radius_y_px = compute_window_radius_px(dataset, radius_m)

    rows: List[dict[str, object]] = []
    height, width = band.shape

    for x_coord, y_coord in zip(x_native, y_native, strict=True):
        row_idx, col_idx = rowcol(dataset.transform, x_coord, y_coord)
        inside = 0 <= row_idx < height and 0 <= col_idx < width

        current_value = None
        current_window = np.array([], dtype=band.dtype)
        if inside:
            current_value = normalize_class_value(band[row_idx, col_idx])

            row_start = max(0, row_idx - radius_y_px)
            row_stop = min(height, row_idx + radius_y_px + 1)
            col_start = max(0, col_idx - radius_x_px)
            col_stop = min(width, col_idx + radius_x_px + 1)
            current_window = band[row_start:row_stop, col_start:col_stop]

        valid_values = valid_window_values(current_window, nodata)
        if current_value == nodata:
            current_value = None

        rows.append(
            {
                "pixel_row": int(row_idx),
                "pixel_col": int(col_idx),
                "class_id_point": current_value,
                "class_id_mode": modal_value(valid_values),
                "window_valid_pixels": int(valid_values.size),
                "inside_raster": bool(inside),
            }
        )

    return pd.DataFrame(rows)


def enrich_route_with_raster(
    route_df: pd.DataFrame,
    x_col: str,
    y_col: str,
    route_crs: str,
    raster_spec: RasterSpec,
    window_radius_m: float,
) -> pd.DataFrame:
    if not raster_spec.raster_path.exists():
        raise FileNotFoundError(f"Raster não encontrado: {raster_spec.raster_path}")

    legend = load_legend(raster_spec.legend_csv)

    with rasterio.open(raster_spec.raster_path) as dataset:
        x_native, y_native = transform_points(
            route_df[x_col].to_numpy(dtype=float),
            route_df[y_col].to_numpy(dtype=float),
            src_crs=route_crs,
            dst_crs=dataset.crs,
        )
        sampled_df = sample_raster(dataset, x_native, y_native, radius_m=window_radius_m)

    prefix = raster_spec.prefix
    sampled_df = sampled_df.rename(
        columns={
            "pixel_row": f"{prefix}_pixel_row",
            "pixel_col": f"{prefix}_pixel_col",
            "class_id_point": f"{prefix}_class_id_point",
            "class_id_mode": f"{prefix}_class_id_mode",
            "window_valid_pixels": f"{prefix}_window_valid_pixels",
            "inside_raster": f"{prefix}_inside_raster",
        }
    )

    sampled_df[f"{prefix}_source_raster"] = str(raster_spec.raster_path)
    if legend:
        sampled_df[f"{prefix}_class_name_point"] = sampled_df[f"{prefix}_class_id_point"].map(legend)
        sampled_df[f"{prefix}_class_name_mode"] = sampled_df[f"{prefix}_class_id_mode"].map(legend)

    return pd.concat([route_df.reset_index(drop=True), sampled_df], axis=1)


def add_transition_features(
    route_df: pd.DataFrame,
    prefixes: Iterable[str],
    x_col: str,
    y_col: str,
) -> pd.DataFrame:
    enriched = route_df.copy()

    dx = enriched[x_col].diff().fillna(0.0)
    dy = enriched[y_col].diff().fillna(0.0)
    enriched["segment_length_m"] = np.sqrt(dx**2 + dy**2)
    enriched["cumulative_distance_m"] = enriched["segment_length_m"].cumsum()

    for prefix in prefixes:
        mode_col = f"{prefix}_class_id_mode"
        if mode_col not in enriched.columns:
            continue
        enriched[f"{prefix}_class_change"] = (
            enriched[mode_col].astype("string") != enriched[mode_col].shift(1).astype("string")
        ).fillna(False)

    return enriched


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Enriquece trajetos CSV com classes de uso/cobertura do solo de rasters locais."
    )
    parser.add_argument("--route-csv", type=Path, required=True, help="CSV com o trajeto GPS/RTK.")
    parser.add_argument("--output-csv", type=Path, required=True, help="CSV enriquecido de saída.")
    parser.add_argument("--x-col", default="x", help="Coluna X/longitude/easting do CSV.")
    parser.add_argument("--y-col", default="y", help="Coluna Y/latitude/northing do CSV.")
    parser.add_argument(
        "--route-crs",
        default="EPSG:4326",
        help="CRS das coordenadas do trajeto. Ex.: EPSG:4326, EPSG:31983.",
    )
    parser.add_argument(
        "--window-radius-m",
        type=float,
        default=15.0,
        help="Raio da vizinhança para classe modal, em metros.",
    )
    parser.add_argument(
        "--mapbiomas",
        action="append",
        default=[],
        help=(
            "Raster do MapBiomas. Formatos: 'arquivo.tif', 'prefixo::arquivo.tif' "
            "ou 'prefixo::arquivo.tif::legenda.csv'."
        ),
    )
    parser.add_argument(
        "--bdc",
        action="append",
        default=[],
        help=(
            "Raster do BDC. Formatos: 'arquivo.tif', 'prefixo::arquivo.tif' "
            "ou 'prefixo::arquivo.tif::legenda.csv'."
        ),
    )
    return parser.parse_args()


def validate_route_columns(route_df: pd.DataFrame, x_col: str, y_col: str) -> None:
    missing = [col for col in (x_col, y_col) if col not in route_df.columns]
    if missing:
        raise ValueError(f"CSV do trajeto não contém colunas obrigatórias: {missing}")


def main() -> None:
    args = parse_args()
    route_df = pd.read_csv(args.route_csv)
    validate_route_columns(route_df, args.x_col, args.y_col)

    route_df = route_df.copy()
    route_df[args.x_col] = pd.to_numeric(route_df[args.x_col], errors="raise")
    route_df[args.y_col] = pd.to_numeric(route_df[args.y_col], errors="raise")

    raster_specs: List[RasterSpec] = []
    raster_specs.extend(parse_raster_spec(item, default_prefix="mapbiomas") for item in args.mapbiomas)
    raster_specs.extend(parse_raster_spec(item, default_prefix="bdc") for item in args.bdc)
    if not raster_specs:
        raise SystemExit("Informe ao menos um raster em --mapbiomas ou --bdc.")

    enriched_df = route_df
    for raster_spec in raster_specs:
        enriched_df = enrich_route_with_raster(
            route_df=enriched_df,
            x_col=args.x_col,
            y_col=args.y_col,
            route_crs=args.route_crs,
            raster_spec=raster_spec,
            window_radius_m=args.window_radius_m,
        )

    enriched_df = add_transition_features(
        route_df=enriched_df,
        prefixes=[spec.prefix for spec in raster_specs],
        x_col=args.x_col,
        y_col=args.y_col,
    )
    args.output_csv.parent.mkdir(parents=True, exist_ok=True)
    enriched_df.to_csv(args.output_csv, index=False)


if __name__ == "__main__":
    main()
