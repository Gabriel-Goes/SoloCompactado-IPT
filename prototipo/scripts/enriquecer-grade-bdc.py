#!/usr/bin/env python3
"""
enriquecer-grade-bdc.py
Sprint 4 — Inferencia de Parametros de Solo via BDC

Processa o recorte operacional do BDC pixel a pixel, gera um raster local
compactado para o runtime e deriva a grade operacional de 2 km como camada
de compatibilidade para missao/exportacao.
"""

import base64
import json
import sys
from pathlib import Path

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.windows import from_bounds, transform as window_transform

BASE_DIR = Path(__file__).resolve().parent.parent
SOURCES_PATH = BASE_DIR / "data" / "terrain-sources.json"
GRID_PATH = BASE_DIR / "data" / "terrain-grid.json"
RASTER_PATH = BASE_DIR / "data" / "terrain-bdc-raster.json"

DATASET_VERSION_V2 = "2026-04-05-paladino-bdc-7km-v2"

CLASS_NAME_TO_CODE = {
    None: 0,
    "vegetation_dense": 1,
    "vegetation_sparse": 2,
    "bare_soil": 3,
    "water": 4,
}

CLASS_CODE_TO_NAME = {
    0: None,
    1: "vegetation_dense",
    2: "vegetation_sparse",
    3: "bare_soil",
    4: "water",
}

SOIL_LOOKUP = {
    "vegetation_dense": {
        "clay_content": 0.45,
        "water_content": 0.35,
        "bulk_density": 1.15,
    },
    "vegetation_sparse": {
        "clay_content": 0.35,
        "water_content": 0.28,
        "bulk_density": 1.30,
    },
    "bare_soil": {
        "clay_content": 0.30,
        "water_content": 0.18,
        "bulk_density": 1.45,
    },
    "water": {
        "clay_content": None,
        "water_content": None,
        "bulk_density": None,
    },
}


def classify_thematic(scl: float, ndvi: float) -> str | None:
    if scl == 4:
        return "vegetation_dense" if ndvi >= 0.5 else "vegetation_sparse"
    if scl == 5:
        return "bare_soil"
    if scl == 6:
        return "water"
    return None


def matric_suction_kpa(
    theta: float,
    theta_r: float = 0.10,
    theta_s: float = 0.50,
    alpha: float = 0.05,
    n: float = 1.8,
) -> float:
    se = (theta - theta_r) / (theta_s - theta_r)
    se = max(se, 1e-6)
    se = min(se, 1.0 - 1e-6)
    m = 1 - 1 / n
    h = (1 / alpha) * (se ** (-1 / m) - 1) ** (1 / n)
    return round(h, 1)


def conc_factor(suction_kpa: float) -> float:
    if suction_kpa < 20:
        return 3.0
    if suction_kpa < 50:
        return 4.0
    if suction_kpa < 150:
        return 5.0
    return 6.0


def sigma_p_severiano(clay_fraction: float, suction_kpa: float) -> float:
    clay_pct = clay_fraction * 100
    if clay_pct < 20:
        return round(129.0 * suction_kpa ** 0.15, 1)
    if clay_pct < 31:
        return round(123.3 * suction_kpa ** 0.13, 1)
    if clay_pct < 41:
        return round(119.2 * suction_kpa ** 0.11, 1)
    if clay_pct < 52:
        return round(88.3 * suction_kpa ** 0.13, 1)
    return round(62.7 * suction_kpa ** 0.15, 1)


def projected_bounds(bounds_lonlat: dict, transformer: Transformer) -> tuple[float, float, float, float]:
    west, south = transformer.transform(bounds_lonlat["west"], bounds_lonlat["south"])
    east, north = transformer.transform(bounds_lonlat["east"], bounds_lonlat["north"])
    return min(west, east), min(south, north), max(west, east), max(south, north)


def class_code_snapshot(class_code: int, cell_id: str) -> tuple[dict, dict]:
    thematic = CLASS_CODE_TO_NAME[int(class_code)]
    if thematic is None or thematic == "water":
        provenance_value = "unavailable"
        snap = {
            "cell_id": cell_id,
            "thematic_class": thematic,
            "clay_content": None,
            "water_content": None,
            "matric_suction": None,
            "bulk_density": None,
            "conc_factor": None,
            "sigma_p": None,
        }
        prov = {
            "thematic_class": provenance_value,
            "clay_content": provenance_value,
            "water_content": provenance_value,
            "matric_suction": provenance_value,
            "bulk_density": provenance_value,
            "conc_factor": provenance_value,
            "sigma_p": provenance_value,
        }
        return snap, prov

    lookup = SOIL_LOOKUP[thematic]
    clay = lookup["clay_content"]
    water = lookup["water_content"]
    density = lookup["bulk_density"]
    suction = matric_suction_kpa(water)
    xi = conc_factor(suction)
    sigma_p = sigma_p_severiano(clay, suction)
    snap = {
        "cell_id": cell_id,
        "thematic_class": thematic,
        "clay_content": clay,
        "water_content": water,
        "matric_suction": suction,
        "bulk_density": density,
        "conc_factor": xi,
        "sigma_p": sigma_p,
    }
    prov = {
        "thematic_class": "derived",
        "clay_content": "derived",
        "water_content": "derived",
        "matric_suction": "derived",
        "bulk_density": "derived",
        "conc_factor": "derived",
        "sigma_p": "derived",
    }
    return snap, prov


def classify_full_raster(ndvi_data: np.ma.MaskedArray, scl_data: np.ma.MaskedArray) -> np.ndarray:
    ndvi = ndvi_data.astype(np.float64).filled(np.nan) / 10000.0
    scl = scl_data.astype(np.float64).filled(np.nan)
    codes = np.zeros(scl.shape, dtype=np.uint8)

    vegetation_mask = scl == 4
    codes[vegetation_mask & (ndvi >= 0.5)] = CLASS_NAME_TO_CODE["vegetation_dense"]
    codes[vegetation_mask & (ndvi < 0.5)] = CLASS_NAME_TO_CODE["vegetation_sparse"]
    codes[scl == 5] = CLASS_NAME_TO_CODE["bare_soil"]
    codes[scl == 6] = CLASS_NAME_TO_CODE["water"]
    return codes


def aggregate_cell_class(
    class_codes: np.ndarray,
    bounds_lonlat: dict,
    transformer: Transformer,
    crop_transform,
) -> tuple[int, dict]:
    left, bottom, right, top = projected_bounds(bounds_lonlat, transformer)
    window = from_bounds(left, bottom, right, top, transform=crop_transform).round_offsets().round_lengths()

    row0 = max(0, int(window.row_off))
    col0 = max(0, int(window.col_off))
    row1 = min(class_codes.shape[0], row0 + max(1, int(window.height)))
    col1 = min(class_codes.shape[1], col0 + max(1, int(window.width)))
    cell_codes = class_codes[row0:row1, col0:col1].reshape(-1)
    valid_codes = cell_codes[cell_codes > 0]

    stats = {
        "pixel_count": int(cell_codes.size),
        "valid_pixel_count": int(valid_codes.size),
    }

    if valid_codes.size == 0:
        return 0, stats

    values, counts = np.unique(valid_codes, return_counts=True)
    dominant_code = int(values[np.argmax(counts)])
    stats["dominant_code"] = dominant_code
    stats["dominant_count"] = int(np.max(counts))
    return dominant_code, stats


def build_raster_payload(bounds: dict, class_codes: np.ndarray) -> dict:
    return {
        "farmId": "fazenda-paladino",
        "datasetVersion": DATASET_VERSION_V2,
        "bounds": bounds,
        "width": int(class_codes.shape[1]),
        "height": int(class_codes.shape[0]),
        "classEncoding": {
            "0": "invalid",
            "1": "vegetation_dense",
            "2": "vegetation_sparse",
            "3": "bare_soil",
            "4": "water",
        },
        "classCodesBase64": base64.b64encode(class_codes.tobytes()).decode("ascii"),
    }


def main():
    print("Carregando terrain-sources.json...")
    with open(SOURCES_PATH, encoding="utf-8") as file:
        sources = json.load(file)

    obs = sources["sources"]["bdc"]["selectedObservation"]
    ndvi_url = obs["assets"].get("NDVI")
    scl_url = obs["assets"].get("SCL")
    if not ndvi_url or not scl_url:
        sys.exit("ERRO: assets NDVI/SCL ausentes em terrain-sources.json")

    print("Carregando terrain-grid.json...")
    with open(GRID_PATH, encoding="utf-8") as file:
        grid = json.load(file)

    cells = grid["cells"]
    farm_bounds = grid["bounds"]
    print(f"  observacao: {obs['itemId']} ({obs['datetime'][:10]})")
    print(f"  celulas operacionais: {len(cells)}")

    ndvi_vsicurl = f"/vsicurl/{ndvi_url}"
    scl_vsicurl = f"/vsicurl/{scl_url}"
    print("\nLendo recorte completo do BDC via /vsicurl/...")

    try:
        with rasterio.open(ndvi_vsicurl) as src_ndvi, rasterio.open(scl_vsicurl) as src_scl:
            t_ndvi = Transformer.from_crs("EPSG:4326", src_ndvi.crs, always_xy=True)
            t_scl = Transformer.from_crs("EPSG:4326", src_scl.crs, always_xy=True)

            ndvi_bounds = projected_bounds(farm_bounds, t_ndvi)
            scl_bounds = projected_bounds(farm_bounds, t_scl)
            ndvi_window = from_bounds(*ndvi_bounds, transform=src_ndvi.transform).round_offsets().round_lengths()
            scl_window = from_bounds(*scl_bounds, transform=src_scl.transform).round_offsets().round_lengths()

            ndvi_data = src_ndvi.read(1, window=ndvi_window, masked=True)
            scl_data = src_scl.read(1, window=scl_window, masked=True)

            if ndvi_data.shape != scl_data.shape:
                sys.exit(
                    f"ERRO: NDVI e SCL com shapes diferentes no recorte ({ndvi_data.shape} vs {scl_data.shape})"
                )

            class_codes = classify_full_raster(ndvi_data, scl_data)
            crop_transform = window_transform(scl_window, src_scl.transform)
            grid_observations = [
                aggregate_cell_class(class_codes, cell["bounds"], t_scl, crop_transform)
                for cell in cells
            ]

    except Exception as error:
        sys.exit(f"ERRO ao acessar COGs via /vsicurl/: {error}")

    print(
        f"  raster local: {class_codes.shape[1]} colunas x {class_codes.shape[0]} linhas "
        f"({class_codes.size} pixels)"
    )

    print("\nDerivando grade operacional a partir do raster pixelado...")
    enriched_cells = []
    sigma_p_count = 0

    for cell, (dominant_code, stats) in zip(cells, grid_observations):
        cell_id = cell["cellId"]
        snapshot, provenance = class_code_snapshot(dominant_code, cell_id)
        if snapshot["sigma_p"] is not None:
            sigma_p_count += 1

        enriched_cells.append(
            {
                "cellId": cell_id,
                "datasetVersion": DATASET_VERSION_V2,
                "center": cell["center"],
                "bounds": cell["bounds"],
                "thematicClass": {
                    "source": "bdc-raster-pixel-derived",
                    "value": snapshot["thematic_class"],
                },
                "terrainSnapshotBase": snapshot,
                "provenance": provenance,
            }
        )

        print(
            f"  {cell_id}: class={snapshot['thematic_class'] or 'invalid'} "
            f"| px={stats['pixel_count']} valid={stats['valid_pixel_count']}"
        )

    raster_payload = build_raster_payload(farm_bounds, class_codes)
    print(f"\nGravando {RASTER_PATH}...")
    with open(RASTER_PATH, "w", encoding="utf-8") as file:
        json.dump(raster_payload, file, ensure_ascii=False, indent=2)
    print("  OK")

    grid_v2 = {
        "farmId": grid["farmId"],
        "datasetVersion": DATASET_VERSION_V2,
        "cellSizeMeters": grid["cellSizeMeters"],
        "bounds": grid["bounds"],
        "cells": enriched_cells,
    }
    print(f"Gravando {GRID_PATH}...")
    with open(GRID_PATH, "w", encoding="utf-8") as file:
        json.dump(grid_v2, file, ensure_ascii=False, indent=2)
    print("  OK")

    inference_chain = {
        "observation_item_id": obs["itemId"],
        "observation_date": obs["datetime"][:10],
        "observation_season": "final do periodo chuvoso (marco)",
        "assets_used": ["NDVI", "SCL"],
        "ndvi_scale_factor": 10000,
        "pixel_processing": "classificacao pixel a pixel no recorte operacional completo",
        "raster_runtime_product": "terrain-bdc-raster.json (classCodesBase64 + bounds + width + height)",
        "grid_compatibility": "terrain-grid.json derivado por agregacao do raster apenas para missao/exportacao",
        "classification": (
            "SCL + NDVI threshold: "
            "SCL=4 NDVI>=0.5 -> vegetation_dense; "
            "SCL=4 NDVI<0.5 -> vegetation_sparse; "
            "SCL=5 -> bare_soil; "
            "SCL=6 -> water; "
            "demais -> null (invalido)"
        ),
        "soil_lookup_reference": "Imhoff et al. 2004; Latossolo Vermelho-Amarelo, oeste Bahia",
        "soil_lookup_epoch_note": (
            "Valores de water_content calibrados para o final do periodo chuvoso. "
            "Trocar a observacao por outra epoca exige recalibrar o lookup."
        ),
        "van_genuchten_params": {
            "source": "Tomasella & Hodnett 1996",
            "theta_r": 0.10,
            "theta_s": 0.50,
            "alpha": 0.05,
            "n": 1.8,
        },
        "sigma_p_ptf": "Severiano et al. 2013",
        "conc_factor_rule": "3.0 (suction<20kPa) / 4.0 (<50kPa) / 5.0 (<150kPa) / 6.0 (>=150kPa)",
    }

    sources["datasetVersion"] = DATASET_VERSION_V2
    sources["inferenceChain"] = inference_chain
    sources["fieldProvenance"] = {
        "_note": (
            "Proveniencia metodologica global do dataset. "
            "Proveniencia real do runtime de terreno e registrada no raster local pixelado; "
            "a grade operacional preserva apenas a compatibilidade da missao."
        ),
        "thematic_class": "derived",
        "clay_content": "derived",
        "water_content": "derived",
        "matric_suction": "derived",
        "bulk_density": "derived",
        "conc_factor": "derived",
        "sigma_p": "derived",
    }

    print(f"Gravando {SOURCES_PATH}...")
    with open(SOURCES_PATH, "w", encoding="utf-8") as file:
        json.dump(sources, file, ensure_ascii=False, indent=2)
    print("  OK")

    print("\nSprint 4 — inferencia pixelada concluida.")
    print(f"  datasetVersion: {DATASET_VERSION_V2}")
    print(f"  raster pixels: {class_codes.size}")
    print(f"  celulas operacionais com sigma_p > 0: {sigma_p_count}/{len(enriched_cells)}")


if __name__ == "__main__":
    main()
