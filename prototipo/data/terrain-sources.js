window.__SOLO_TERRAIN_SOURCES__ = {
  "farmId": "fazenda-paladino",
  "datasetVersion": "2026-04-05-paladino-bdc-7km-v2",
  "generatedAt": "2026-04-05T12:00:00.000Z",
  "areaBounds": {
    "north": -13.035192217750629,
    "south": -13.160955782249372,
    "east": -45.781667560590094,
    "west": -45.91079043940991
  },
  "center": {
    "lat": -13.098074,
    "lng": -45.846229
  },
  "radiusMeters": 7000,
  "sources": {
    "bdc": {
      "collectionId": "S2-16D-2",
      "stacUrl": "https://data.inpe.br/bdc/stac/v1/",
      "description": "Fonte oficial unica configurada para contexto espacial, temporal e indices auxiliares.",
      "selectedObservation": {
        "itemId": "S2-16D_V2_030019_20260306",
        "datetime": "2026-03-06T00:00:00.000000Z",
        "cloudCover": 1.47,
        "assets": {
          "NDVI": "https://data.inpe.br/bdc/data/s2-16d/v2/030/019/2026/03/06/S2-16D_V2_030019_20260306_NDVI.tif",
          "SCL": "https://data.inpe.br/bdc/data/s2-16d/v2/030/019/2026/03/06/S2-16D_V2_030019_20260306_SCL.tif",
          "B03": "https://data.inpe.br/bdc/data/s2-16d/v2/030/019/2026/03/06/S2-16D_V2_030019_20260306_B03.tif",
          "thumbnail": "https://data.inpe.br/bdc/data/s2-16d/v2/030/019/2026/03/06/S2-16D_V2_030019_20260306.png"
        }
      }
    }
  },
  "fieldProvenance": {
    "_note": "Proveniencia metodologica global do dataset. Proveniencia real do runtime de terreno e registrada no raster local pixelado; a grade operacional preserva apenas a compatibilidade da missao.",
    "thematic_class": "derived",
    "clay_content": "derived",
    "water_content": "derived",
    "matric_suction": "derived",
    "bulk_density": "derived",
    "conc_factor": "derived",
    "sigma_p": "derived"
  },
  "notes": [
    "O recorte esta limitado a um raio de 7 km em torno do centro usado pela demo na Fazenda Paladino.",
    "Campos sem valor oficial extraido no recorte local permanecem null e nunca sao inventados.",
    "A Sprint 2 usa apenas o BDC como fonte oficial de dados de terreno."
  ],
  "inferenceChain": {
    "observation_item_id": "S2-16D_V2_030019_20260306",
    "observation_date": "2026-03-06",
    "observation_season": "final do periodo chuvoso (marco)",
    "assets_used": [
      "NDVI",
      "SCL"
    ],
    "ndvi_scale_factor": 10000,
    "pixel_processing": "classificacao pixel a pixel no recorte operacional completo",
    "raster_runtime_product": "terrain-bdc-raster.json (classCodesBase64 + bounds + width + height)",
    "grid_compatibility": "terrain-grid.json derivado por agregacao do raster apenas para missao/exportacao",
    "classification": "SCL + NDVI threshold: SCL=4 NDVI>=0.5 -> vegetation_dense; SCL=4 NDVI<0.5 -> vegetation_sparse; SCL=5 -> bare_soil; SCL=6 -> water; demais -> null (invalido)",
    "soil_lookup_reference": "Imhoff et al. 2004; Latossolo Vermelho-Amarelo, oeste Bahia",
    "soil_lookup_epoch_note": "Valores de water_content calibrados para o final do periodo chuvoso. Trocar a observacao por outra epoca exige recalibrar o lookup.",
    "van_genuchten_params": {
      "source": "Tomasella & Hodnett 1996",
      "theta_r": 0.1,
      "theta_s": 0.5,
      "alpha": 0.05,
      "n": 1.8
    },
    "sigma_p_ptf": "Severiano et al. 2013",
    "conc_factor_rule": "3.0 (suction<20kPa) / 4.0 (<50kPa) / 5.0 (<150kPa) / 6.0 (>=150kPa)"
  }
};
