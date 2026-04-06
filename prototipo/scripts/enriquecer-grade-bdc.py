#!/usr/bin/env python3
"""
enriquecer-grade-bdc.py
Sprint 4 — Inferencia de Parametros de Solo via BDC

Amostra NDVI e SCL dos COGs do Brazil Data Cube para as 49 celulas da grade
da Fazenda Paladino e aplica a cadeia de inferencia por celula:
  SCL + NDVI -> thematic_class
  thematic_class -> clay_content, water_content, bulk_density (lookup)
  water_content -> matric_suction (van Genuchten)
  matric_suction -> conc_factor (Froehlich xi)
  clay_content + matric_suction -> sigma_p (PTF Severiano 2013)

Inputs:
  prototipo/data/terrain-sources.json  (selectedObservation com URLs dos COGs)
  prototipo/data/terrain-grid.json     (grade atual, todas as celulas null)

Outputs:
  prototipo/data/terrain-grid.json     (atualizado com variaveis de solo derivadas)
  prototipo/data/terrain-sources.json  (atualizado com inferenceChain)

Ambiente: pyenv geologia (rasterio, numpy, pyproj)
"""

import json
import sys
from pathlib import Path

import rasterio
from pyproj import Transformer

# ---------------------------------------------------------------------------
# Caminhos
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent  # prototipo/
SOURCES_PATH = BASE_DIR / "data" / "terrain-sources.json"
GRID_PATH    = BASE_DIR / "data" / "terrain-grid.json"

DATASET_VERSION_V2 = "2026-04-05-paladino-bdc-7km-v2"

# ---------------------------------------------------------------------------
# Lookup de variaveis de solo por thematic_class
# Calibrado para Latossolo Vermelho-Amarelo, oeste da Bahia
# Ref: Imhoff et al. 2004; Severiano et al. 2013
# Dependencia de epoca: water_content valido para final do periodo chuvoso (marco)
# Se a selectedObservation for trocada para outra epoca, recalibrar water_content.
# ---------------------------------------------------------------------------
SOIL_LOOKUP = {
    "vegetation_dense": {
        "clay_content":  0.45,   # fracao (45%) — cerrado nativo, mais argiloso
        "water_content": 0.35,   # m3/m3 — final periodo umido (marco)
        "bulk_density":  1.15,   # Mg/m3 — solo nao perturbado
    },
    "vegetation_sparse": {
        "clay_content":  0.35,   # pastagem ou lavoura em desenvolvimento
        "water_content": 0.28,
        "bulk_density":  1.30,
    },
    "bare_soil": {
        "clay_content":  0.30,   # campo colhido ou preparado
        "water_content": 0.18,
        "bulk_density":  1.45,
    },
    "water": {
        "clay_content":  None,   # corpo d'agua: variaveis de solo inaplicaveis
        "water_content": None,
        "bulk_density":  None,
    },
}

# ---------------------------------------------------------------------------
# Funcoes de inferencia
# ---------------------------------------------------------------------------

def classify_thematic(scl: int, ndvi: float) -> str | None:
    """
    Classifica thematic_class a partir de SCL e NDVI (ja dividido por 10000).
    Retorna None para SCL invalido (nuvem, sombra, sem dado).
    """
    if scl == 4:                                  # vegetacao
        return "vegetation_dense" if ndvi >= 0.5 else "vegetation_sparse"
    elif scl == 5:                                # solo exposto
        return "bare_soil"
    elif scl == 6:                                # agua
        return "water"
    else:                                         # 0,1,2,3,7-11: invalido
        return None


def matric_suction_kpa(theta: float,
                        theta_r: float = 0.10,
                        theta_s: float = 0.50,
                        alpha:   float = 0.05,
                        n:       float = 1.8) -> float:
    """
    Succao matricial via van Genuchten simplificado.
    Ref: Tomasella & Hodnett 1996, Latossolo.
    Parametros: theta_r=0.10, theta_s=0.50, alpha=0.05 kPa^-1, n=1.8.
    theta fora dos limites fisicos e fixado nos extremos antes do calculo.
    """
    Se = (theta - theta_r) / (theta_s - theta_r)
    Se = max(Se, 1e-6)         # fixar no minimo fisico
    Se = min(Se, 1.0 - 1e-6)  # fixar no maximo fisico
    m = 1 - 1 / n
    h = (1 / alpha) * (Se ** (-1 / m) - 1) ** (1 / n)
    return round(h, 1)


def conc_factor(suction_kpa: float) -> float:
    """
    Fator de concentracao xi de Froehlich, derivado por faixa de succao.
    dense(28.4)->4.0, sparse(49.1)->4.0, bare(147.3)->5.0
    """
    if suction_kpa < 20:   return 3.0
    if suction_kpa < 50:   return 4.0
    if suction_kpa < 150:  return 5.0
    return 6.0


def sigma_p_severiano(clay_fraction: float, suction_kpa: float) -> float:
    """
    Pressao de pre-adensamento via PTF Severiano et al. 2013.
    Equacoes por faixa de argila para Latossolos brasileiros.
    clay_fraction: fracao decimal (0.45 = 45%).
    """
    c = clay_fraction * 100   # converter para %
    if c < 20:    return round(129.0 * suction_kpa ** 0.15, 1)
    elif c < 31:  return round(123.3 * suction_kpa ** 0.13, 1)
    elif c < 41:  return round(119.2 * suction_kpa ** 0.11, 1)
    elif c < 52:  return round(88.3  * suction_kpa ** 0.13, 1)
    else:         return round(62.7  * suction_kpa ** 0.15, 1)


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def main():
    # Passo 1 — Carregar observacao de referencia
    print("Carregando terrain-sources.json...")
    with open(SOURCES_PATH) as f:
        sources = json.load(f)

    obs = sources["sources"]["bdc"]["selectedObservation"]
    ndvi_url = obs["assets"].get("NDVI")
    scl_url  = obs["assets"].get("SCL")

    if not ndvi_url:
        sys.exit("ERRO: assets.NDVI ausente em terrain-sources.json")
    if not scl_url:
        sys.exit("ERRO: assets.SCL ausente em terrain-sources.json")

    obs_item_id = obs["itemId"]
    obs_date    = obs["datetime"][:10]  # "2026-03-06"

    print(f"  observacao: {obs_item_id} ({obs_date})")
    print(f"  NDVI: {ndvi_url}")
    print(f"  SCL:  {scl_url}")

    # Passo 2 — Carregar grade e amostrar NDVI e SCL por celula
    print("\nCarregando terrain-grid.json...")
    with open(GRID_PATH) as f:
        grid = json.load(f)

    cells = grid["cells"]
    print(f"  celulas: {len(cells)}")

    print("\nAmostrando NDVI e SCL dos COGs BDC via /vsicurl/...")
    ndvi_vsicurl = f"/vsicurl/{ndvi_url}"
    scl_vsicurl  = f"/vsicurl/{scl_url}"

    try:
        with rasterio.open(ndvi_vsicurl) as src_ndvi, \
             rasterio.open(scl_vsicurl)  as src_scl:

            t_ndvi = Transformer.from_crs("EPSG:4326", src_ndvi.crs, always_xy=True)
            t_scl  = Transformer.from_crs("EPSG:4326", src_scl.crs,  always_xy=True)

            coords_ndvi = [
                t_ndvi.transform(c["center"]["lng"], c["center"]["lat"])
                for c in cells
            ]
            coords_scl = [
                t_scl.transform(c["center"]["lng"], c["center"]["lat"])
                for c in cells
            ]

            # sample() le apenas os pixels necessarios — sem carregar a banda inteira
            ndvi_samples = [v[0] for v in src_ndvi.sample(coords_ndvi)]
            scl_samples  = [v[0] for v in src_scl.sample(coords_scl)]

    except Exception as e:
        sys.exit(f"ERRO ao acessar COGs via /vsicurl/: {e}")

    # Passo 3 a 7 — Inferencia por celula
    print("\nAplicando cadeia de inferencia por celula...")
    enriched_cells = []
    sigma_p_count  = 0

    for cell, ndvi_raw, scl_raw in zip(cells, ndvi_samples, scl_samples):
        cell_id  = cell["cellId"]
        ndvi_val = ndvi_raw / 10000.0   # escala BDC: inteiro x10000
        scl_val  = int(scl_raw)

        thematic = classify_thematic(scl_val, ndvi_val)

        if thematic is None or thematic == "water":
            # SCL invalido ou agua: todos os campos de solo null
            provenance_value = "unavailable"
            snap = {
                "cell_id":       cell_id,
                "thematic_class": thematic,
                "clay_content":   None,
                "water_content":  None,
                "matric_suction": None,
                "bulk_density":   None,
                "conc_factor":    None,
                "sigma_p":        None,
            }
            prov = {
                "thematic_class": provenance_value,
                "clay_content":   provenance_value,
                "water_content":  provenance_value,
                "matric_suction": provenance_value,
                "bulk_density":   provenance_value,
                "conc_factor":    provenance_value,
                "sigma_p":        provenance_value,
            }
            thematic_source_value = thematic  # "water" ou None
        else:
            # Solo classificado: derivar todas as variaveis
            lookup = SOIL_LOOKUP[thematic]
            clay   = lookup["clay_content"]
            water  = lookup["water_content"]
            density = lookup["bulk_density"]

            suction = matric_suction_kpa(water)
            xi      = conc_factor(suction)
            sp      = sigma_p_severiano(clay, suction)

            sigma_p_count += 1

            snap = {
                "cell_id":        cell_id,
                "thematic_class": thematic,
                "clay_content":   clay,
                "water_content":  water,
                "matric_suction": suction,
                "bulk_density":   density,
                "conc_factor":    xi,
                "sigma_p":        sp,
            }
            prov = {
                "thematic_class": "derived",
                "clay_content":   "derived",
                "water_content":  "derived",
                "matric_suction": "derived",
                "bulk_density":   "derived",
                "conc_factor":    "derived",
                "sigma_p":        "derived",
            }
            thematic_source_value = thematic

        # Montar celula atualizada preservando campos geometricos originais
        enriched_cell = {
            "cellId":          cell_id,
            "datasetVersion":  DATASET_VERSION_V2,
            "center":          cell["center"],
            "bounds":          cell["bounds"],
            "thematicClass": {
                "source": "bdc-scl-ndvi",
                "value":  thematic_source_value,
            },
            "terrainSnapshotBase": snap,
            "provenance":          prov,
        }
        enriched_cells.append(enriched_cell)

        status = f"SCL={scl_val} NDVI={ndvi_val:.3f} -> {thematic or 'invalido'}"
        if thematic not in (None, "water"):
            status += f" | suction={snap['matric_suction']} kPa sigma_p={snap['sigma_p']} kPa"
        print(f"  {cell_id}: {status}")

    # Validacao pre-gravacao: >= 80% das celulas devem ter sigma_p > 0
    total_cells  = len(enriched_cells)
    pct_valid = sigma_p_count / total_cells * 100
    print(f"\nCelulas com sigma_p > 0: {sigma_p_count}/{total_cells} ({pct_valid:.1f}%)")

    if pct_valid < 80.0:
        sys.exit(
            f"ERRO: apenas {pct_valid:.1f}% das celulas tem sigma_p > 0 "
            f"(minimo: 80%). Verificar acesso aos COGs ou SCL da observacao."
        )

    # Passo 8 — Gravar terrain-grid.json v2
    grid_v2 = {
        "farmId":         grid["farmId"],
        "datasetVersion": DATASET_VERSION_V2,
        "cellSizeMeters": grid["cellSizeMeters"],
        "bounds":         grid["bounds"],
        "cells":          enriched_cells,
    }

    print(f"\nGravando {GRID_PATH} v2...")
    with open(GRID_PATH, "w", encoding="utf-8") as f:
        json.dump(grid_v2, f, ensure_ascii=False, indent=2)
    print("  OK")

    # Passo 9 — Gravar terrain-sources.json v2 com inferenceChain
    inference_chain = {
        "observation_item_id":  obs_item_id,
        "observation_date":     obs_date,
        "observation_season":   "final do periodo chuvoso (marco)",
        "assets_used":          ["NDVI", "SCL"],
        "ndvi_scale_factor":    10000,
        "classification":       (
            "SCL + NDVI threshold: "
            "SCL=4 NDVI>=0.5 -> vegetation_dense; "
            "SCL=4 NDVI<0.5 -> vegetation_sparse; "
            "SCL=5 -> bare_soil; "
            "SCL=6 -> water; "
            "demais -> null (invalido)"
        ),
        "soil_lookup_reference":  "Imhoff et al. 2004; Latossolo Vermelho-Amarelo, oeste Bahia",
        "soil_lookup_epoch_note": (
            "Valores de water_content calibrados para o final do periodo chuvoso. "
            "Trocar a observacao por outra epoca exige recalibrar o lookup."
        ),
        "van_genuchten_params": {
            "source":  "Tomasella & Hodnett 1996",
            "theta_r": 0.10,
            "theta_s": 0.50,
            "alpha":   0.05,
            "n":       1.8,
        },
        "sigma_p_ptf":      "Severiano et al. 2013",
        "conc_factor_rule": "3.0 (suction<20kPa) / 4.0 (<50kPa) / 5.0 (<150kPa) / 6.0 (>=150kPa)",
    }

    field_provenance = {
        "_note": (
            "Proveniencia metodologica global do dataset. "
            "Proveniencia real de cada campo e registrada por celula em terrain-grid.json."
        ),
        "thematic_class": "derived",
        "clay_content":   "derived",
        "water_content":  "derived",
        "matric_suction": "derived",
        "bulk_density":   "derived",
        "conc_factor":    "derived",
        "sigma_p":        "derived",
    }

    sources["datasetVersion"]   = DATASET_VERSION_V2
    sources["inferenceChain"]   = inference_chain
    sources["fieldProvenance"]  = field_provenance

    print(f"Gravando {SOURCES_PATH} v2...")
    with open(SOURCES_PATH, "w", encoding="utf-8") as f:
        json.dump(sources, f, ensure_ascii=False, indent=2)
    print("  OK")

    print(f"\nSprint 4 — inferencia concluida.")
    print(f"  datasetVersion: {DATASET_VERSION_V2}")
    print(f"  celulas enriquecidas: {sigma_p_count}/{total_cells} com sigma_p > 0")


if __name__ == "__main__":
    main()
