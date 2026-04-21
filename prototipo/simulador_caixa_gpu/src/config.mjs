export const MAX_LAYER_COUNT = 3;
export const MAX_OVERVIEW_POINTS = 2400;
export const SLICE_SAMPLE_INTERVAL_MS = 120;
export const OVERVIEW_SAMPLE_INTERVAL_MS = 900;
export const METRIC_SAMPLE_INTERVAL_MS = 350;
export const PHYSICS_STEP_S = 1 / 30;
export const VOXEL_STATE_FLOATS = 8;

export const DEFAULT_DOMAIN = {
  lengthM: 5,
  widthM: 1,
  depthM: 1
};

export const RESOLUTION_PRESETS = [
  { id: "10cm", label: "10 cm", cellSizeM: 0.1 },
  { id: "5cm", label: "5 cm", cellSizeM: 0.05 },
  { id: "2cm", label: "2 cm", cellSizeM: 0.02 },
  { id: "1cm", label: "1 cm", cellSizeM: 0.01 }
];

export const MATERIAL_PRESETS = {
  topsoil_loose: {
    id: "topsoil_loose",
    label: "Topsoil solto",
    density: 1.24,
    porosity: 0.52,
    moisture: 0.28,
    yieldKpa: 70,
    hardening: 1.4,
    maxDensity: 1.72
  },
  topsoil_moist: {
    id: "topsoil_moist",
    label: "Topsoil úmido",
    density: 1.3,
    porosity: 0.49,
    moisture: 0.34,
    yieldKpa: 62,
    hardening: 1.25,
    maxDensity: 1.7
  },
  transition_dense: {
    id: "transition_dense",
    label: "Horizonte de transição",
    density: 1.42,
    porosity: 0.43,
    moisture: 0.25,
    yieldKpa: 110,
    hardening: 1.65,
    maxDensity: 1.84
  },
  subsoil_lateritic: {
    id: "subsoil_lateritic",
    label: "Subsolo laterítico",
    density: 1.58,
    porosity: 0.36,
    moisture: 0.22,
    yieldKpa: 165,
    hardening: 1.95,
    maxDensity: 1.96
  }
};

export const DEFAULT_SCENARIO = {
  domain: DEFAULT_DOMAIN,
  resolutionId: "2cm",
  loadMode: "wheel",
  massKg: 28000,
  passes: 18,
  speedMps: 0.35,
  footprintWidthM: 0.32,
  footprintLengthM: 0.48,
  sliceRatioX: 0.5,
  sliceRatioY: 0.5,
  sliceRatioZ: 0.25,
  layers: [
    { presetId: "topsoil_loose", thicknessM: 0.25 },
    { presetId: "transition_dense", thicknessM: 0.4 },
    { presetId: "subsoil_lateritic", thicknessM: 0.35 }
  ]
};

export function materialPresetList() {
  return Object.keys(MATERIAL_PRESETS).map(function mapPreset(key) {
    return MATERIAL_PRESETS[key];
  });
}

export function getResolutionPreset(id) {
  return RESOLUTION_PRESETS.find(function findPreset(preset) {
    return preset.id === id;
  }) || RESOLUTION_PRESETS[0];
}

export function getVoxelCount(cellSizeM, domain) {
  const dims = getGridDimensions(cellSizeM, domain);
  return dims.nx * dims.ny * dims.nz;
}

export function estimateStateMegabytes(cellSizeM, domain, floatsPerVoxel) {
  const voxels = getVoxelCount(cellSizeM, domain);
  return (voxels * floatsPerVoxel * 4) / (1024 * 1024);
}

export function buildScenarioConfig(rawScenario) {
  const resolution = getResolutionPreset(rawScenario.resolutionId);
  const domain = sanitizeDomain(rawScenario.domain);
  const dimensions = getGridDimensions(resolution.cellSizeM, domain);
  const layers = normalizeLayers(rawScenario.layers || DEFAULT_SCENARIO.layers, dimensions.depthM);

  return {
    domain: domain,
    resolution: resolution,
    dimensions: dimensions,
    loadMode: rawScenario.loadMode,
    massKg: Math.max(1000, Number(rawScenario.massKg)),
    passes: Math.max(1, Math.round(Number(rawScenario.passes))),
    speedMps: Math.max(0.05, Number(rawScenario.speedMps)),
    footprintWidthM: Math.max(0.05, Number(rawScenario.footprintWidthM)),
    footprintLengthM: Math.max(0.05, Number(rawScenario.footprintLengthM)),
    sliceRatios: {
      x: clamp01(rawScenario.sliceRatioX),
      y: clamp01(rawScenario.sliceRatioY),
      z: clamp01(rawScenario.sliceRatioZ)
    },
    layers: layers
  };
}

export function deriveSlices(dimensions, ratios) {
  return {
    x: clampIndex(Math.round((dimensions.nx - 1) * ratios.x), dimensions.nx),
    y: clampIndex(Math.round((dimensions.ny - 1) * ratios.y), dimensions.ny),
    z: clampIndex(Math.round((dimensions.nz - 1) * ratios.z), dimensions.nz)
  };
}

function getGridDimensions(cellSizeM, domain) {
  const nx = Math.max(1, Math.round(domain.lengthM / cellSizeM));
  const ny = Math.max(1, Math.round(domain.widthM / cellSizeM));
  const nz = Math.max(1, Math.round(domain.depthM / cellSizeM));
  return {
    nx: nx,
    ny: ny,
    nz: nz,
    cellSizeM: cellSizeM,
    lengthM: nx * cellSizeM,
    widthM: ny * cellSizeM,
    depthM: nz * cellSizeM
  };
}

function sanitizeDomain(domain) {
  return {
    lengthM: Math.max(0.5, Number(domain.lengthM)),
    widthM: Math.max(0.5, Number(domain.widthM)),
    depthM: Math.max(0.5, Number(domain.depthM))
  };
}

function normalizeLayers(layers, totalDepthM) {
  const validLayers = layers.filter(function filterLayer(layer) {
    return layer && Number.isFinite(layer.thicknessM) && layer.thicknessM > 0;
  });

  if (!validLayers.length) {
    return normalizeLayers(DEFAULT_SCENARIO.layers, totalDepthM);
  }

  const total = validLayers.reduce(function sumThickness(acc, layer) {
    return acc + layer.thicknessM;
  }, 0);

  let cursor = 0;
  return validLayers.slice(0, MAX_LAYER_COUNT).map(function mapLayer(layer, index, source) {
    const normalized = layer.thicknessM / total;
    const targetThickness = index === source.length - 1 ? totalDepthM - cursor : normalized * totalDepthM;
    const topM = cursor;
    const bottomM = Math.min(totalDepthM, topM + targetThickness);
    cursor = bottomM;
    return {
      presetId: layer.presetId,
      thicknessM: bottomM - topM,
      topM: topM,
      bottomM: bottomM
    };
  });
}

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0.5;
  }
  return Math.max(0, Math.min(1, numeric));
}

function clampIndex(index, size) {
  return Math.max(0, Math.min(size - 1, index));
}
