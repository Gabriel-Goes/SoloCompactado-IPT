(function (global) {
  var app = global.SoloCompactado;
  var BDC_CLASS_CODE_TO_NAME = {
    0: null,
    1: "vegetation_dense",
    2: "vegetation_sparse",
    3: "bare_soil",
    4: "water"
  };
  var BDC_SOIL_LOOKUP = {
    vegetation_dense: { clay_content: 0.45, water_content: 0.35, bulk_density: 1.15 },
    vegetation_sparse: { clay_content: 0.35, water_content: 0.28, bulk_density: 1.30 },
    bare_soil: { clay_content: 0.30, water_content: 0.18, bulk_density: 1.45 }
  };

  function cloneDataset(dataset, sourceLabel) {
    if (!dataset) {
      throw new Error("Dataset carregado nao encontrado: " + sourceLabel);
    }

    try {
      return JSON.parse(JSON.stringify(dataset));
    } catch (_error) {
      throw new Error("Falha ao interpretar dataset carregado em " + sourceLabel + ".");
    }
  }

  function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isInsideBounds(position, bounds) {
    return (
      position.lat <= bounds.north &&
      position.lat >= bounds.south &&
      position.lng <= bounds.east &&
      position.lng >= bounds.west
    );
  }

  function decodeBase64ToUint8Array(base64Value) {
    var binary = global.atob(base64Value);
    var result = new Uint8Array(binary.length);
    var index;

    for (index = 0; index < binary.length; index += 1) {
      result[index] = binary.charCodeAt(index);
    }

    return result;
  }

  function hydrateTerrainRaster(raster) {
    var codes = decodeBase64ToUint8Array(raster.classCodesBase64);
    if (codes.length !== raster.width * raster.height) {
      throw new Error("Raster BDC local com dimensoes inconsistentes.");
    }

    return Object.assign({}, raster, {
      classCodes: codes
    });
  }

  function validateDatasets(grid, raster, manifest) {
    var invalidCell;

    if (!grid || !raster || !manifest) {
      return { valid: false, reason: "Dataset local ausente." };
    }

    if (grid.farmId !== "fazenda-paladino" || manifest.farmId !== "fazenda-paladino") {
      return { valid: false, reason: "O dataset nao referencia a Fazenda Paladino." };
    }

    if (!grid.datasetVersion || grid.datasetVersion !== manifest.datasetVersion || raster.datasetVersion !== manifest.datasetVersion) {
      return { valid: false, reason: "Dataset com versao inconsistente entre grade, raster e manifesto." };
    }

    if (!Array.isArray(grid.cells) || grid.cells.length === 0) {
      return { valid: false, reason: "A grade local nao contem celulas." };
    }

    invalidCell = grid.cells.find(function (cell) {
      return !cell.cellId || !cell.bounds || !cell.terrainSnapshotBase || !cell.provenance;
    });

    if (invalidCell) {
      return { valid: false, reason: "Existe ao menos uma celula invalida no dataset local." };
    }

    if (
      typeof raster.width !== "number" ||
      typeof raster.height !== "number" ||
      !raster.bounds ||
      typeof raster.classCodesBase64 !== "string"
    ) {
      return { valid: false, reason: "Raster BDC local invalido." };
    }

    return { valid: true, reason: null };
  }

  function deriveSoilFromThematicClass(thematicClass, cellId) {
    var lookup;
    var suction;
    var concFactor;
    var sigmaP;

    if (!thematicClass || thematicClass === "water") {
      return {
        cell_id: cellId,
        clay_content: null,
        water_content: null,
        matric_suction: null,
        bulk_density: null,
        conc_factor: null,
        sigma_p: null,
        thematic_class: thematicClass,
        provenance: {
          thematic_class: "unavailable",
          clay_content: "unavailable",
          water_content: "unavailable",
          matric_suction: "unavailable",
          bulk_density: "unavailable",
          conc_factor: "unavailable",
          sigma_p: "unavailable"
        }
      };
    }

    lookup = BDC_SOIL_LOOKUP[thematicClass];
    suction = thematicClass === "vegetation_dense" ? 28.4 : thematicClass === "vegetation_sparse" ? 49.1 : 147.3;
    concFactor = suction < 20 ? 3.0 : suction < 50 ? 4.0 : suction < 150 ? 5.0 : 6.0;
    sigmaP = thematicClass === "bare_soil" ? 236.0 : thematicClass === "vegetation_sparse" ? 182.9 : 136.4;

    return {
      cell_id: cellId,
      clay_content: lookup.clay_content,
      water_content: lookup.water_content,
      matric_suction: suction,
      bulk_density: lookup.bulk_density,
      conc_factor: concFactor,
      sigma_p: sigmaP,
      thematic_class: thematicClass,
      provenance: {
        thematic_class: "derived",
        clay_content: "derived",
        water_content: "derived",
        matric_suction: "derived",
        bulk_density: "derived",
        conc_factor: "derived",
        sigma_p: "derived"
      }
    };
  }

  function resolveTerrainPixel(position, raster) {
    var xRatio;
    var yRatio;
    var col;
    var row;
    var index;
    var classCode;
    var thematicClass;

    if (!raster || !isInsideBounds(position, raster.bounds)) {
      return null;
    }

    xRatio = (position.lng - raster.bounds.west) / (raster.bounds.east - raster.bounds.west);
    yRatio = (raster.bounds.north - position.lat) / (raster.bounds.north - raster.bounds.south);
    col = Math.min(raster.width - 1, Math.max(0, Math.floor(xRatio * raster.width)));
    row = Math.min(raster.height - 1, Math.max(0, Math.floor(yRatio * raster.height)));
    index = row * raster.width + col;
    classCode = raster.classCodes[index];
    thematicClass = BDC_CLASS_CODE_TO_NAME[classCode] || null;

    return {
      row: row,
      col: col,
      index: index,
      class_code: classCode,
      thematic_class: thematicClass,
      snapshot: deriveSoilFromThematicClass(thematicClass, "bdc-px-r" + row + "-c" + col)
    };
  }

  function resolveCell(position, grid) {
    if (!grid || !isInsideBounds(position, grid.bounds)) {
      return null;
    }

    return (
      grid.cells.find(function (cell) {
        return isInsideBounds(position, cell.bounds);
      }) || null
    );
  }

  function buildTerrainSnapshot(cell) {
    return {
      cell_id: cell.cellId,
      clay_content: cell.terrainSnapshotBase.clay_content,
      water_content: cell.terrainSnapshotBase.water_content,
      matric_suction: cell.terrainSnapshotBase.matric_suction,
      bulk_density: cell.terrainSnapshotBase.bulk_density,
      conc_factor: cell.terrainSnapshotBase.conc_factor,
      sigma_p: cell.terrainSnapshotBase.sigma_p,
      thematic_class: cell.terrainSnapshotBase.thematic_class,
      provenance: cloneValue(cell.provenance)
    };
  }

  app.registerModule("domains", "terrain", {
    createTerrainDomain: function createTerrainDomain() {
      return {};
    },
    loadTerrainGrid: function loadTerrainGrid() {
      return cloneDataset(global.__SOLO_TERRAIN_GRID__, "data/terrain-grid.js");
    },
    loadTerrainRaster: function loadTerrainRaster() {
      return cloneDataset(global.__SOLO_TERRAIN_BDC_RASTER__, "data/terrain-bdc-raster.js");
    },
    loadTerrainSources: function loadTerrainSources() {
      return cloneDataset(global.__SOLO_TERRAIN_SOURCES__, "data/terrain-sources.js");
    },
    validateDatasets: validateDatasets,
    hydrateTerrainRaster: hydrateTerrainRaster,
    resolveTerrainPixel: resolveTerrainPixel,
    resolveCell: resolveCell,
    buildTerrainSnapshot: buildTerrainSnapshot,
    getTerrainGridSourceRef: function getTerrainGridSourceRef() {
      return "file:data/terrain-grid.js";
    }
  });
})(window);
