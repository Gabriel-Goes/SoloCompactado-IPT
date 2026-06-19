import {
  DEFAULT_SCENARIO,
  MATERIAL_PRESETS,
  RESOLUTION_PRESETS,
  VOXEL_STATE_FLOATS,
  buildScenarioConfig,
  estimateStateMegabytes,
  getVoxelCount,
  materialPresetList
} from "./config.mjs";
import {
  buildTimelineCsv,
  canvasBlob,
  createCanvasRenderer,
  formatSliceLabel,
  triggerDownload
} from "./renderer.mjs";
import { SimulationEngine } from "./simulation.mjs";

const dom = {
  form: document.getElementById("control-form"),
  domainLength: document.getElementById("domain-length"),
  domainWidth: document.getElementById("domain-width"),
  domainDepth: document.getElementById("domain-depth"),
  resolution: document.getElementById("resolution"),
  loadMode: document.getElementById("load-mode"),
  massKg: document.getElementById("mass-kg"),
  passes: document.getElementById("passes"),
  speedMps: document.getElementById("speed-mps"),
  footprintWidth: document.getElementById("footprint-width"),
  footprintLength: document.getElementById("footprint-length"),
  sliceX: document.getElementById("slice-x"),
  sliceY: document.getElementById("slice-y"),
  sliceZ: document.getElementById("slice-z"),
  layer1Material: document.getElementById("layer-1-material"),
  layer2Material: document.getElementById("layer-2-material"),
  layer3Material: document.getElementById("layer-3-material"),
  layer1Thickness: document.getElementById("layer-1-thickness"),
  layer2Thickness: document.getElementById("layer-2-thickness"),
  layer3Thickness: document.getElementById("layer-3-thickness"),
  start: document.getElementById("btn-start"),
  pause: document.getElementById("btn-pause"),
  reset: document.getElementById("btn-reset"),
  export: document.getElementById("btn-export"),
  statusText: document.getElementById("status-text"),
  supportPill: document.getElementById("support-pill"),
  voxelCountPill: document.getElementById("voxel-count-pill"),
  simState: document.getElementById("sim-state"),
  simTime: document.getElementById("sim-time"),
  passState: document.getElementById("pass-state"),
  loadPosition: document.getElementById("load-position"),
  maxCompaction: document.getElementById("max-compaction"),
  meanTopCompaction: document.getElementById("mean-top-compaction"),
  pressureState: document.getElementById("pressure-state"),
  footprintState: document.getElementById("footprint-state"),
  fpsState: document.getElementById("fps-state"),
  sampleState: document.getElementById("sample-state"),
  sliceXyLabel: document.getElementById("slice-xy-label"),
  sliceXzLabel: document.getElementById("slice-xz-label"),
  sliceYzLabel: document.getElementById("slice-yz-label"),
  overviewLabel: document.getElementById("overview-label"),
  sliceXyCanvas: document.getElementById("slice-xy-canvas"),
  sliceXzCanvas: document.getElementById("slice-xz-canvas"),
  sliceYzCanvas: document.getElementById("slice-yz-canvas"),
  overviewCanvas: document.getElementById("overview-canvas")
};

const renderers = {
  xy: createCanvasRenderer(dom.sliceXyCanvas),
  xz: createCanvasRenderer(dom.sliceXzCanvas),
  yz: createCanvasRenderer(dom.sliceYzCanvas),
  overview: createCanvasRenderer(dom.overviewCanvas)
};

let engine = null;
let currentViewModel = null;
let supportAvailable = false;

bootstrap().catch(function onBootstrapError(error) {
  console.error(error);
  applySupportState(false, error.message || "Falha ao inicializar o simulador.");
  paintEmptyState();
});

async function bootstrap() {
  fillResolutionOptions();
  fillMaterialOptions();
  hydrateDefaults();
  updateVoxelPill();
  attachEvents();

  supportAvailable = await SimulationEngine.isSupported();
  if (!supportAvailable) {
    applySupportState(false, "Este navegador não expõe navigator.gpu. Use Chrome ou Edge recentes em HTTPS.");
    paintEmptyState();
    return;
  }

  applySupportState(true, "WebGPU detectado. Ajuste o domínio e clique em aplicar/resetar quando necessário.");
  await safeRebuildEngine();
  window.requestAnimationFrame(loop);
}

function attachEvents() {
  dom.form.addEventListener("change", function onFormChange() {
    updateVoxelPill();
    setStatus("Parâmetros alterados. Clique em aplicar/resetar para recriar o domínio.");
  });

  [dom.sliceX, dom.sliceY, dom.sliceZ].forEach(function attachSliceInput(element) {
    element.addEventListener("input", function onSliceInput() {
      updateVoxelPill();
      if (engine) {
        engine.updateSliceRatios(readSliceRatios());
      }
    });
  });

  dom.start.addEventListener("click", function onStart() {
    if (engine) {
      engine.start();
      setStatus("Simulação em execução na GPU.");
    }
  });

  dom.pause.addEventListener("click", function onPause() {
    if (engine) {
      engine.pause();
      setStatus("Simulação pausada.");
    }
  });

  dom.reset.addEventListener("click", async function onReset() {
    await safeRebuildEngine();
  });

  dom.export.addEventListener("click", async function onExport() {
    if (!engine || !currentViewModel) {
      return;
    }

    dom.export.disabled = true;
    try {
      const artifacts = await engine.exportArtifacts();
      triggerDownload("config.json", new Blob([JSON.stringify(artifacts.meta.config, null, 2)], { type: "application/json" }));
      triggerDownload("snapshot-meta.json", new Blob([JSON.stringify(artifacts.meta, null, 2)], { type: "application/json" }));
      triggerDownload("timeline.csv", new Blob([buildTimelineCsv(artifacts.timeline)], { type: "text/csv" }));
      triggerDownload("snapshot-state.bin", new Blob([artifacts.fullSnapshot.buffer], { type: "application/octet-stream" }));
      await exportCanvas("slice-xy.png", dom.sliceXyCanvas);
      await exportCanvas("slice-xz.png", dom.sliceXzCanvas);
      await exportCanvas("slice-yz.png", dom.sliceYzCanvas);
      await exportCanvas("overview.png", dom.overviewCanvas);
      setStatus("Artefatos exportados: configuração, timeline, snapshot bruto e PNGs.");
    } finally {
      dom.export.disabled = false;
    }
  });
}

async function safeRebuildEngine() {
  if (!supportAvailable) {
    return;
  }

  const scenario = readScenarioFromForm();
  const config = buildScenarioConfig(scenario);
  config.layers = config.layers.map(function attachMaterial(layer) {
    return Object.assign({}, layer, {
      material: MATERIAL_PRESETS[layer.presetId] || materialPresetList()[0]
    });
  });

  dom.start.disabled = true;
  dom.pause.disabled = true;
  dom.reset.disabled = true;
  dom.export.disabled = true;
  setStatus("Reconfigurando buffers, camadas e pipelines...");

  try {
    const nextEngine = await SimulationEngine.create(config);
    if (engine) {
      engine.pause();
    }
    engine = nextEngine;
    currentViewModel = engine.buildViewModel();
    renderCurrentView(currentViewModel);
    setStatus("Simulador pronto. Inicie quando quiser.");
    dom.start.disabled = false;
    dom.pause.disabled = false;
    dom.reset.disabled = false;
    dom.export.disabled = false;
  } catch (error) {
    console.error(error);
    if (engine) {
      engine.pause();
    }
    engine = null;
    currentViewModel = null;
    setStatus(error.message || "Falha ao criar o domínio atual.");
    paintEmptyState();
    dom.reset.disabled = false;
  }
}

function loop(nowMs) {
  if (engine) {
    currentViewModel = engine.frame(nowMs);
    renderCurrentView(currentViewModel);
  }
  window.requestAnimationFrame(loop);
}

function renderCurrentView(viewModel) {
  if (!viewModel) {
    paintEmptyState();
    return;
  }

  const slices = viewModel.slices;
  const dimensions = viewModel.dimensions;
  const metrics = viewModel.metrics;

  if (slices && slices.xy && slices.xz && slices.yz) {
    renderers.xy.drawSlice(
      slices.xy.values,
      slices.xy.width,
      slices.xy.height,
      formatSliceLabel("z", viewModel.sliceIndices.z, dimensions.nz, dimensions.depthM)
    );
    renderers.xz.drawSlice(
      slices.xz.values,
      slices.xz.width,
      slices.xz.height,
      formatSliceLabel("y", viewModel.sliceIndices.y, dimensions.ny, dimensions.widthM)
    );
    renderers.yz.drawSlice(
      slices.yz.values,
      slices.yz.width,
      slices.yz.height,
      formatSliceLabel("x", viewModel.sliceIndices.x, dimensions.nx, dimensions.lengthM)
    );
  }

  if (viewModel.overviewSnapshot) {
    renderers.overview.drawOverview(viewModel.overviewSnapshot, dimensions, "threshold > 0.025 | compaction");
  }

  dom.sliceXyLabel.textContent = formatSliceLabel("z", viewModel.sliceIndices.z, dimensions.nz, dimensions.depthM);
  dom.sliceXzLabel.textContent = formatSliceLabel("y", viewModel.sliceIndices.y, dimensions.ny, dimensions.widthM);
  dom.sliceYzLabel.textContent = formatSliceLabel("x", viewModel.sliceIndices.x, dimensions.nx, dimensions.lengthM);
  dom.overviewLabel.textContent = "amostra volumétrica desacoplada";

  dom.simState.textContent = metrics.stateLabel;
  dom.simTime.textContent = "t = " + metrics.simulationTimeS.toFixed(2) + " s";
  dom.passState.textContent = metrics.currentPass + " / " + metrics.totalPasses;
  dom.loadPosition.textContent = "x = " + metrics.loadXM.toFixed(2) + " m";
  dom.maxCompaction.textContent = metrics.maxCompaction.toFixed(3);
  dom.meanTopCompaction.textContent = "top mean = " + metrics.meanTopCompaction.toFixed(3);
  dom.pressureState.textContent = metrics.pressureKpa.toFixed(1) + " kPa";
  dom.footprintState.textContent = metrics.footprintWidthM.toFixed(2) + " x " + metrics.footprintLengthM.toFixed(2) + " m";
  dom.fpsState.textContent = metrics.fps.toFixed(1) + " FPS";
  dom.sampleState.textContent = slices ? "slices on | overview delayed" : "aguardando buffers";
}

function paintEmptyState() {
  renderers.xy.clear("XY indisponível");
  renderers.xz.clear("XZ indisponível");
  renderers.yz.clear("YZ indisponível");
  renderers.overview.clear("Visão 3D indisponível");
}

function fillResolutionOptions() {
  dom.resolution.innerHTML = "";
  RESOLUTION_PRESETS.forEach(function appendResolution(preset) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    dom.resolution.appendChild(option);
  });
}

function fillMaterialOptions() {
  [dom.layer1Material, dom.layer2Material, dom.layer3Material].forEach(function fillSelect(selectElement) {
    selectElement.innerHTML = "";
    materialPresetList().forEach(function appendPreset(preset) {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.label;
      selectElement.appendChild(option);
    });
  });
}

function hydrateDefaults() {
  dom.domainLength.value = DEFAULT_SCENARIO.domain.lengthM;
  dom.domainWidth.value = DEFAULT_SCENARIO.domain.widthM;
  dom.domainDepth.value = DEFAULT_SCENARIO.domain.depthM;
  dom.resolution.value = DEFAULT_SCENARIO.resolutionId;
  dom.loadMode.value = DEFAULT_SCENARIO.loadMode;
  dom.massKg.value = DEFAULT_SCENARIO.massKg;
  dom.passes.value = DEFAULT_SCENARIO.passes;
  dom.speedMps.value = DEFAULT_SCENARIO.speedMps;
  dom.footprintWidth.value = DEFAULT_SCENARIO.footprintWidthM;
  dom.footprintLength.value = DEFAULT_SCENARIO.footprintLengthM;
  dom.sliceX.value = String(DEFAULT_SCENARIO.sliceRatioX * 100);
  dom.sliceY.value = String(DEFAULT_SCENARIO.sliceRatioY * 100);
  dom.sliceZ.value = String(DEFAULT_SCENARIO.sliceRatioZ * 100);
  dom.layer1Material.value = DEFAULT_SCENARIO.layers[0].presetId;
  dom.layer2Material.value = DEFAULT_SCENARIO.layers[1].presetId;
  dom.layer3Material.value = DEFAULT_SCENARIO.layers[2].presetId;
  dom.layer1Thickness.value = DEFAULT_SCENARIO.layers[0].thicknessM;
  dom.layer2Thickness.value = DEFAULT_SCENARIO.layers[1].thicknessM;
  dom.layer3Thickness.value = DEFAULT_SCENARIO.layers[2].thicknessM;
}

function readScenarioFromForm() {
  return {
    domain: {
      lengthM: Number(dom.domainLength.value),
      widthM: Number(dom.domainWidth.value),
      depthM: Number(dom.domainDepth.value)
    },
    resolutionId: dom.resolution.value,
    loadMode: dom.loadMode.value,
    massKg: Number(dom.massKg.value),
    passes: Number(dom.passes.value),
    speedMps: Number(dom.speedMps.value),
    footprintWidthM: Number(dom.footprintWidth.value),
    footprintLengthM: Number(dom.footprintLength.value),
    sliceRatioX: Number(dom.sliceX.value) / 100,
    sliceRatioY: Number(dom.sliceY.value) / 100,
    sliceRatioZ: Number(dom.sliceZ.value) / 100,
    layers: [
      { presetId: dom.layer1Material.value, thicknessM: Number(dom.layer1Thickness.value) },
      { presetId: dom.layer2Material.value, thicknessM: Number(dom.layer2Thickness.value) },
      { presetId: dom.layer3Material.value, thicknessM: Number(dom.layer3Thickness.value) }
    ]
  };
}

function readSliceRatios() {
  return {
    x: Number(dom.sliceX.value) / 100,
    y: Number(dom.sliceY.value) / 100,
    z: Number(dom.sliceZ.value) / 100
  };
}

function updateVoxelPill() {
  const resolution = RESOLUTION_PRESETS.find(function findPreset(item) {
    return item.id === dom.resolution.value;
  }) || RESOLUTION_PRESETS[0];
  const domain = {
    lengthM: Number(dom.domainLength.value),
    widthM: Number(dom.domainWidth.value),
    depthM: Number(dom.domainDepth.value)
  };
  const voxels = getVoxelCount(resolution.cellSizeM, domain);
  const memoryMb = estimateStateMegabytes(resolution.cellSizeM, domain, VOXEL_STATE_FLOATS);
  dom.voxelCountPill.textContent = Intl.NumberFormat("pt-BR").format(voxels) + " voxels | ~" + memoryMb.toFixed(1) + " MB";
}

function applySupportState(isSupported, message) {
  dom.supportPill.textContent = isSupported ? "WebGPU disponível" : "Sem WebGPU";
  dom.supportPill.classList.toggle("muted", !isSupported);
  dom.start.disabled = !isSupported;
  dom.pause.disabled = !isSupported;
  dom.reset.disabled = !isSupported;
  dom.export.disabled = !isSupported;
  setStatus(message);
}

function setStatus(message) {
  dom.statusText.textContent = message;
}

async function exportCanvas(filename, canvas) {
  const blob = await canvasBlob(canvas);
  if (blob) {
    triggerDownload(filename, blob);
  }
}
