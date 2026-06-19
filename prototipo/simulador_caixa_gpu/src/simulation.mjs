import {
  MAX_LAYER_COUNT,
  METRIC_SAMPLE_INTERVAL_MS,
  OVERVIEW_SAMPLE_INTERVAL_MS,
  PHYSICS_STEP_S,
  SLICE_SAMPLE_INTERVAL_MS,
  deriveSlices
} from "./config.mjs";

const WORKGROUP_SIZE = 64;
const VOXEL_STATE_FLOATS = 8;
const SIM_UNIFORM_BYTES = 16 * 8;
const SAMPLE_UNIFORM_BYTES = 16 * 4;
const LAYER_STRIDE_BYTES = 8 * 4;

const INIT_SHADER = `
struct SimUniforms {
  dims : vec4u,
  domain : vec4f,
  load0 : vec4f,
  load1 : vec4f,
  motion : vec4f,
  padding0 : vec4f,
  padding1 : vec4f,
  padding2 : vec4f,
}

struct LayerConfig {
  bounds : vec4f,
  state0 : vec4f,
}

struct VoxelState {
  density : f32,
  porosity : f32,
  moisture : f32,
  compaction_index : f32,
  plastic_strain : f32,
  vertical_stress : f32,
  reserved0 : f32,
  reserved1 : f32,
}

@group(0) @binding(0) var<storage, read_write> states : array<VoxelState>;
@group(0) @binding(1) var<uniform> sim : SimUniforms;
@group(0) @binding(2) var<uniform> layers : array<LayerConfig, ${MAX_LAYER_COUNT}>;

fn layer_for_depth(depth : f32) -> LayerConfig {
  var selected = layers[0];
  for (var i = 0u; i < ${MAX_LAYER_COUNT}u; i = i + 1u) {
    let candidate = layers[i];
    if (depth >= candidate.bounds.x && depth <= candidate.bounds.y && candidate.bounds.y > candidate.bounds.x) {
      selected = candidate;
    }
  }
  return selected;
}

@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let index = gid.x;
  if (index >= sim.dims.w) {
    return;
  }

  let plane = sim.dims.x * sim.dims.y;
  let z = index / plane;
  let depth = (f32(z) + 0.5) * sim.domain.w;
  let layer = layer_for_depth(depth);

  states[index] = VoxelState(
    layer.state0.x,
    layer.state0.y,
    layer.state0.z,
    0.0,
    0.0,
    0.0,
    0.0,
    0.0
  );
}
`;

const UPDATE_SHADER = `
struct SimUniforms {
  dims : vec4u,
  domain : vec4f,
  load0 : vec4f,
  load1 : vec4f,
  motion : vec4f,
  padding0 : vec4f,
  padding1 : vec4f,
  padding2 : vec4f,
}

struct LayerConfig {
  bounds : vec4f,
  state0 : vec4f,
}

struct VoxelState {
  density : f32,
  porosity : f32,
  moisture : f32,
  compaction_index : f32,
  plastic_strain : f32,
  vertical_stress : f32,
  reserved0 : f32,
  reserved1 : f32,
}

@group(0) @binding(0) var<storage, read_write> states : array<VoxelState>;
@group(0) @binding(1) var<uniform> sim : SimUniforms;
@group(0) @binding(2) var<uniform> layers : array<LayerConfig, ${MAX_LAYER_COUNT}>;

fn layer_for_depth(depth : f32) -> LayerConfig {
  var selected = layers[0];
  for (var i = 0u; i < ${MAX_LAYER_COUNT}u; i = i + 1u) {
    let candidate = layers[i];
    if (depth >= candidate.bounds.x && depth <= candidate.bounds.y && candidate.bounds.y > candidate.bounds.x) {
      selected = candidate;
    }
  }
  return selected;
}

fn footprint_weight(mode_selector : f32, dx : f32, dy : f32, half_length : f32, half_width : f32) -> f32 {
  let safe_length = max(half_length, 0.001);
  let safe_width = max(half_width, 0.001);

  if (mode_selector < 0.5) {
    let ex = dx / safe_length;
    let ey = dy / safe_width;
    return exp(-1.6 * (ex * ex + ey * ey));
  }

  let rx = abs(dx) / safe_length;
  let ry = abs(dy) / safe_width;
  let edge = max(rx, ry);
  return exp(-1.2 * edge * edge);
}

@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let index = gid.x;
  if (index >= sim.dims.w) {
    return;
  }

  let plane = sim.dims.x * sim.dims.y;
  let z = index / plane;
  let rem = index - z * plane;
  let y = rem / sim.dims.x;
  let x = rem - y * sim.dims.x;

  let cell_size = sim.domain.w;
  let pos_x = (f32(x) + 0.5) * cell_size;
  let pos_y = (f32(y) + 0.5) * cell_size;
  let depth = (f32(z) + 0.5) * cell_size;
  let layer = layer_for_depth(depth);
  var state = states[index];

  let dx = pos_x - sim.load0.x;
  let dy = pos_y - sim.load0.y;
  let footprint = footprint_weight(sim.motion.x, dx, dy, sim.load1.x, sim.load1.y);
  let depth_decay = exp(-depth * sim.load1.z);
  let spread = max(sim.load1.w * (0.25 + depth), 0.0025);
  let lateral_decay = exp(-(dx * dx + dy * dy) / spread);
  let applied = sim.load0.z * footprint * depth_decay * lateral_decay;

  let base_density = layer.state0.x;
  let yield_kpa = layer.bounds.z * (1.0 + state.plastic_strain * layer.bounds.w);
  let moisture_factor = 1.0 + max(0.0, (state.moisture - 0.20) * 1.7);
  let remaining_capacity = max(layer.state0.w - state.density, 0.0);
  let density_window = max(layer.state0.w - base_density, 0.0001);
  let capacity_ratio = clamp(remaining_capacity / density_window, 0.0, 1.0);
  let overstress = max(0.0, applied - yield_kpa);
  let delta = sim.load0.w * sim.motion.y * (overstress / max(yield_kpa, 1.0)) * moisture_factor * capacity_ratio;

  state.compaction_index = clamp(state.compaction_index + delta, 0.0, 0.999);
  state.density = min(layer.state0.w, state.density + delta * 0.11);
  state.porosity = max(0.05, state.porosity - delta * 0.09);
  state.plastic_strain = min(5.0, state.plastic_strain + delta * 0.6);
  state.vertical_stress = applied;
  state.reserved0 = sim.motion.z;

  states[index] = state;
}
`;

const SLICE_SHADER = `
struct SampleUniforms {
  dims : vec4u,
  slices : vec4u,
  mode_info : vec4f,
  reserved : vec4f,
}

struct VoxelState {
  density : f32,
  porosity : f32,
  moisture : f32,
  compaction_index : f32,
  plastic_strain : f32,
  vertical_stress : f32,
  reserved0 : f32,
  reserved1 : f32,
}

@group(0) @binding(0) var<storage, read> states : array<VoxelState>;
@group(0) @binding(1) var<storage, read_write> slice_out : array<vec4f>;
@group(0) @binding(2) var<uniform> sample : SampleUniforms;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid : vec3u) {
  let axis_mode = u32(sample.mode_info.x);
  let plane = sample.dims.x * sample.dims.y;
  var source_index = 0u;
  var out_index = 0u;

  if (axis_mode == 0u) {
    if (gid.x >= sample.dims.x || gid.y >= sample.dims.y) {
      return;
    }
    source_index = sample.slices.z * plane + gid.y * sample.dims.x + gid.x;
    out_index = gid.y * sample.dims.x + gid.x;
  } else if (axis_mode == 1u) {
    if (gid.x >= sample.dims.x || gid.y >= sample.dims.z) {
      return;
    }
    source_index = gid.y * plane + sample.slices.y * sample.dims.x + gid.x;
    out_index = gid.y * sample.dims.x + gid.x;
  } else {
    if (gid.x >= sample.dims.y || gid.y >= sample.dims.z) {
      return;
    }
    source_index = gid.y * plane + gid.x * sample.dims.x + sample.slices.x;
    out_index = gid.y * sample.dims.y + gid.x;
  }

  let state = states[source_index];
  slice_out[out_index] = vec4f(
    state.compaction_index,
    state.density,
    state.porosity,
    state.vertical_stress
  );
}
`;

export class SimulationEngine {
  static async isSupported() {
    return typeof navigator !== "undefined" && !!navigator.gpu;
  }

  static async create(config) {
    const engine = new SimulationEngine(config);
    await engine.initialize();
    return engine;
  }

  constructor(config) {
    this.config = config;
    this.device = null;
    this.adapter = null;
    this.running = false;
    this.accumulatorS = 0;
    this.lastAnimationTimeMs = 0;
    this.simulationTimeS = 0;
    this.timeline = [];
    this.lastRecordedPass = -1;
    this.fpsEstimate = 0;
    this.renderState = {
      slices: null,
      overviewSnapshot: null,
      sliceInFlight: false,
      overviewInFlight: false,
      lastSliceSampleMs: 0,
      lastOverviewSampleMs: 0,
      lastMetricSampleMs: 0
    };
    this.metrics = {
      stateLabel: "Parado",
      currentPass: 0,
      totalPasses: config.passes,
      loadXM: 0,
      maxCompaction: 0,
      meanTopCompaction: 0,
      peakDensity: 0,
      peakStressKpa: 0
    };
  }

  async initialize() {
    if (!(await SimulationEngine.isSupported())) {
      throw new Error("WebGPU não está disponível neste navegador.");
    }

    const preflightSelection = await getPreflightAdapterSelection();
    const adapterSelection = preflightSelection || (await requestBestAdapter(navigator.gpu));
    this.adapter = adapterSelection.adapter;
    this.adapterPreference = adapterSelection.preference;
    if (!this.adapter) {
      throw new Error(buildAdapterFailureMessage(adapterSelection.attempts));
    }

    this.device = await this.adapter.requestDevice();
    this.device.lost.then(
      function onLost(info) {
        console.error("WebGPU device lost:", info);
      }.bind(this)
    );

    await this.reconfigure(this.config);
  }

  async reconfigure(nextConfig) {
    this.config = nextConfig;
    this.dimensions = nextConfig.dimensions;
    this.voxelCount = this.dimensions.nx * this.dimensions.ny * this.dimensions.nz;
    this.sliceIndices = deriveSlices(this.dimensions, nextConfig.sliceRatios);
    this.motion = createMotionPlan(nextConfig);
    this.metrics.totalPasses = nextConfig.passes;
    this.metrics.currentPass = 0;
    this.metrics.loadXM = this.motion.startXM;
    this.metrics.stateLabel = "Parado";
    this.timeline = [];
    this.lastRecordedPass = -1;
    this.simulationTimeS = 0;
    this.accumulatorS = 0;
    this.lastAnimationTimeMs = 0;
    this.renderState.lastSliceSampleMs = 0;
    this.renderState.lastOverviewSampleMs = 0;
    this.renderState.lastMetricSampleMs = 0;

    this.validateBufferBudget();
    this.destroyBuffers();
    this.allocateBuffers();
    this.createPipelines();
    await this.initializeState();
    await this.captureSlices(true);
    await this.captureOverview(true);
    this.recordMetricSample(true);
  }

  start() {
    this.running = true;
    this.metrics.stateLabel = "Rodando";
  }

  pause() {
    this.running = false;
    this.metrics.stateLabel = "Pausado";
  }

  async reset() {
    this.pause();
    await this.reconfigure(this.config);
  }

  updateSliceRatios(ratios) {
    this.sliceIndices = deriveSlices(this.dimensions, ratios);
  }

  frame(nowMs) {
    if (!this.lastAnimationTimeMs) {
      this.lastAnimationTimeMs = nowMs;
      return this.buildViewModel();
    }

    const elapsedMs = Math.min(220, nowMs - this.lastAnimationTimeMs);
    this.lastAnimationTimeMs = nowMs;
    this.fpsEstimate = this.fpsEstimate === 0 ? 1000 / Math.max(elapsedMs, 1) : this.fpsEstimate * 0.84 + (1000 / Math.max(elapsedMs, 1)) * 0.16;

    if (this.running) {
      this.accumulatorS += elapsedMs / 1000;
      while (this.accumulatorS >= PHYSICS_STEP_S) {
        if (this.simulationTimeS >= this.motion.totalDurationS) {
          this.running = false;
          this.metrics.stateLabel = "Concluído";
          break;
        }
        this.advanceSimulationStep();
        this.accumulatorS -= PHYSICS_STEP_S;
      }
    }

    if (!this.renderState.sliceInFlight && nowMs - this.renderState.lastSliceSampleMs >= SLICE_SAMPLE_INTERVAL_MS) {
      this.captureSlices(false).catch(this.handleAsyncError.bind(this));
    }

    if (!this.renderState.overviewInFlight && nowMs - this.renderState.lastOverviewSampleMs >= OVERVIEW_SAMPLE_INTERVAL_MS) {
      this.captureOverview(false).catch(this.handleAsyncError.bind(this));
    }

    if (nowMs - this.renderState.lastMetricSampleMs >= METRIC_SAMPLE_INTERVAL_MS) {
      this.recordMetricSample(false);
    }

    return this.buildViewModel();
  }

  buildViewModel() {
    const pressureKpa = computePressureKpa(this.config);
    return {
      slices: this.renderState.slices,
      overviewSnapshot: this.renderState.overviewSnapshot,
      dimensions: this.dimensions,
      sliceIndices: this.sliceIndices,
      metrics: Object.assign({}, this.metrics, {
        fps: this.fpsEstimate,
        voxelCount: this.voxelCount,
        pressureKpa: pressureKpa,
        footprintWidthM: this.config.footprintWidthM,
        footprintLengthM: this.config.footprintLengthM,
        simulationTimeS: this.simulationTimeS
      })
    };
  }

  async exportArtifacts() {
    const fullSnapshot = await this.readFullState();
    const meta = {
      dimensions: this.dimensions,
      strideFloats: VOXEL_STATE_FLOATS,
      config: serializeConfig(this.config),
      simulationTimeS: this.simulationTimeS,
      currentPass: this.metrics.currentPass
    };

    return {
      fullSnapshot: fullSnapshot,
      meta: meta,
      timeline: this.timeline.slice()
    };
  }

  validateBufferBudget() {
    const stateBytes = this.voxelCount * VOXEL_STATE_FLOATS * 4;
    const maxStorage = Number(this.device.limits.maxStorageBufferBindingSize || 0);
    const maxBuffer = Number(this.device.limits.maxBufferSize || 0);

    if (maxStorage && stateBytes > maxStorage) {
      throw new Error(
        "A configuração excede maxStorageBufferBindingSize da GPU (" +
          toMegabytes(stateBytes) +
          " MB solicitados). Reduza comprimento ou resolução."
      );
    }

    if (maxBuffer && stateBytes > maxBuffer) {
      throw new Error(
        "A configuração excede maxBufferSize da GPU (" +
          toMegabytes(stateBytes) +
          " MB solicitados). Reduza comprimento ou resolução."
      );
    }
  }

  destroyBuffers() {
    [
      "stateBuffer",
      "fullReadBuffer",
      "simUniformBuffer",
      "sampleUniformBuffer",
      "layerBuffer",
      "xySliceBuffer",
      "xyReadBuffer",
      "xzSliceBuffer",
      "xzReadBuffer",
      "yzSliceBuffer",
      "yzReadBuffer"
    ].forEach(
      function destroyMaybe(key) {
        if (this[key]) {
          this[key].destroy();
          this[key] = null;
        }
      }.bind(this)
    );
  }

  allocateBuffers() {
    const device = this.device;
    const stateBytes = this.voxelCount * VOXEL_STATE_FLOATS * 4;
    const xyBytes = this.dimensions.nx * this.dimensions.ny * 4 * 4;
    const xzBytes = this.dimensions.nx * this.dimensions.nz * 4 * 4;
    const yzBytes = this.dimensions.ny * this.dimensions.nz * 4 * 4;

    this.stateBuffer = device.createBuffer({
      size: stateBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });
    this.fullReadBuffer = device.createBuffer({
      size: stateBytes,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    this.simUniformBuffer = device.createBuffer({
      size: SIM_UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.sampleUniformBuffer = device.createBuffer({
      size: SAMPLE_UNIFORM_BYTES,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.layerBuffer = device.createBuffer({
      size: LAYER_STRIDE_BYTES * MAX_LAYER_COUNT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.xySliceBuffer = device.createBuffer({
      size: xyBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    this.xyReadBuffer = device.createBuffer({
      size: xyBytes,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    this.xzSliceBuffer = device.createBuffer({
      size: xzBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    this.xzReadBuffer = device.createBuffer({
      size: xzBytes,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    this.yzSliceBuffer = device.createBuffer({
      size: yzBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });
    this.yzReadBuffer = device.createBuffer({
      size: yzBytes,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
  }

  createPipelines() {
    const device = this.device;
    this.initPipeline = device.createComputePipeline({
      layout: "auto",
      compute: {
        module: device.createShaderModule({ code: INIT_SHADER }),
        entryPoint: "main"
      }
    });
    this.updatePipeline = device.createComputePipeline({
      layout: "auto",
      compute: {
        module: device.createShaderModule({ code: UPDATE_SHADER }),
        entryPoint: "main"
      }
    });
    this.slicePipeline = device.createComputePipeline({
      layout: "auto",
      compute: {
        module: device.createShaderModule({ code: SLICE_SHADER }),
        entryPoint: "main"
      }
    });

    this.initBindGroup = device.createBindGroup({
      layout: this.initPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.stateBuffer } },
        { binding: 1, resource: { buffer: this.simUniformBuffer } },
        { binding: 2, resource: { buffer: this.layerBuffer } }
      ]
    });
    this.updateBindGroup = device.createBindGroup({
      layout: this.updatePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.stateBuffer } },
        { binding: 1, resource: { buffer: this.simUniformBuffer } },
        { binding: 2, resource: { buffer: this.layerBuffer } }
      ]
    });
    this.xySliceBindGroup = device.createBindGroup({
      layout: this.slicePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.stateBuffer } },
        { binding: 1, resource: { buffer: this.xySliceBuffer } },
        { binding: 2, resource: { buffer: this.sampleUniformBuffer } }
      ]
    });
    this.xzSliceBindGroup = device.createBindGroup({
      layout: this.slicePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.stateBuffer } },
        { binding: 1, resource: { buffer: this.xzSliceBuffer } },
        { binding: 2, resource: { buffer: this.sampleUniformBuffer } }
      ]
    });
    this.yzSliceBindGroup = device.createBindGroup({
      layout: this.slicePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.stateBuffer } },
        { binding: 1, resource: { buffer: this.yzSliceBuffer } },
        { binding: 2, resource: { buffer: this.sampleUniformBuffer } }
      ]
    });
  }

  async initializeState() {
    this.writeLayerUniforms();
    this.writeSimUniforms(this.motion.startXM, 0);
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.initPipeline);
    pass.setBindGroup(0, this.initBindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.voxelCount / WORKGROUP_SIZE));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();
  }

  advanceSimulationStep() {
    this.simulationTimeS += PHYSICS_STEP_S;
    const pose = poseAtTime(this.motion, this.simulationTimeS);
    this.metrics.currentPass = pose.passIndex;
    this.metrics.loadXM = pose.loadXM;
    this.writeSimUniforms(pose.loadXM, pose.passIndex);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.updatePipeline);
    pass.setBindGroup(0, this.updateBindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.voxelCount / WORKGROUP_SIZE));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  async captureSlices(force) {
    this.renderState.sliceInFlight = true;
    try {
      const timestamp = performance.now();
      const slices = this.sliceIndices;
      this.renderState.slices = {
        xy: await this.readSlice("xy", slices),
        xz: await this.readSlice("xz", slices),
        yz: await this.readSlice("yz", slices)
      };
      this.renderState.lastSliceSampleMs = timestamp;
      if (force) {
        this.renderState.lastMetricSampleMs = 0;
      }
    } finally {
      this.renderState.sliceInFlight = false;
    }
  }

  async captureOverview(force) {
    this.renderState.overviewInFlight = true;
    try {
      this.renderState.overviewSnapshot = await this.readFullState();
      this.renderState.lastOverviewSampleMs = performance.now();
      if (force) {
        this.renderState.lastMetricSampleMs = 0;
      }
    } finally {
      this.renderState.overviewInFlight = false;
    }
  }

  recordMetricSample(force) {
    if (!this.renderState.slices || !this.renderState.slices.xy) {
      return;
    }

    const xySummary = summarizeSliceData(this.renderState.slices.xy.values);
    const xzSummary = summarizeSliceData(this.renderState.slices.xz.values);
    const yzSummary = summarizeSliceData(this.renderState.slices.yz.values);

    this.metrics.maxCompaction = Math.max(xySummary.maxCompaction, xzSummary.maxCompaction, yzSummary.maxCompaction);
    this.metrics.meanTopCompaction = xySummary.meanCompaction;
    this.metrics.peakDensity = Math.max(xySummary.peakDensity, xzSummary.peakDensity, yzSummary.peakDensity);
    this.metrics.peakStressKpa = Math.max(xySummary.maxStress, xzSummary.maxStress, yzSummary.maxStress);

    if (!this.running && this.simulationTimeS === 0) {
      this.metrics.stateLabel = "Parado";
    }

    const nowMs = performance.now();
    this.renderState.lastMetricSampleMs = nowMs;

    const shouldAppend =
      force ||
      this.metrics.currentPass !== this.lastRecordedPass ||
      !this.timeline.length ||
      nowMs - this.timeline[this.timeline.length - 1].capturedAtMs >= METRIC_SAMPLE_INTERVAL_MS;

    if (!shouldAppend) {
      return;
    }

    this.timeline.push({
      capturedAtMs: nowMs,
      timeS: this.simulationTimeS,
      passIndex: this.metrics.currentPass,
      loadXM: this.metrics.loadXM,
      maxCompaction: this.metrics.maxCompaction,
      meanTopCompaction: this.metrics.meanTopCompaction,
      peakDensity: this.metrics.peakDensity,
      peakStressKpa: this.metrics.peakStressKpa
    });
    this.lastRecordedPass = this.metrics.currentPass;
  }

  async readSlice(kind, slices) {
    const descriptor = getSliceDescriptor(kind, this.dimensions);
    const mode = kind === "xy" ? 0 : kind === "xz" ? 1 : 2;
    this.writeSampleUniforms(mode, slices);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.slicePipeline);
    pass.setBindGroup(0, descriptor.bindGroup.call(this));
    pass.dispatchWorkgroups(Math.ceil(descriptor.width / 8), Math.ceil(descriptor.height / 8));
    pass.end();
    encoder.copyBufferToBuffer(
      descriptor.storage.call(this),
      0,
      descriptor.read.call(this),
      0,
      descriptor.bytes
    );
    this.device.queue.submit([encoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();

    const readBuffer = descriptor.read.call(this);
    await readBuffer.mapAsync(GPUMapMode.READ);
    const copy = new Float32Array(readBuffer.getMappedRange().slice(0));
    readBuffer.unmap();

    return {
      width: descriptor.width,
      height: descriptor.height,
      values: copy
    };
  }

  async readFullState() {
    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(
      this.stateBuffer,
      0,
      this.fullReadBuffer,
      0,
      this.voxelCount * VOXEL_STATE_FLOATS * 4
    );
    this.device.queue.submit([encoder.finish()]);
    await this.device.queue.onSubmittedWorkDone();
    await this.fullReadBuffer.mapAsync(GPUMapMode.READ);
    const copy = new Float32Array(this.fullReadBuffer.getMappedRange().slice(0));
    this.fullReadBuffer.unmap();
    return copy;
  }

  writeLayerUniforms() {
    const buffer = new ArrayBuffer(LAYER_STRIDE_BYTES * MAX_LAYER_COUNT);
    const view = new Float32Array(buffer);

    for (let index = 0; index < MAX_LAYER_COUNT; index += 1) {
      const layer = this.config.layers[index] || this.config.layers[this.config.layers.length - 1];
      const base = index * 8;
      view[base] = layer.topM || 0;
      view[base + 1] = layer.bottomM || this.dimensions.depthM;
      view[base + 2] = layer.material.yieldKpa;
      view[base + 3] = layer.material.hardening;
      view[base + 4] = layer.material.density;
      view[base + 5] = layer.material.porosity;
      view[base + 6] = layer.material.moisture;
      view[base + 7] = layer.material.maxDensity;
    }

    this.device.queue.writeBuffer(this.layerBuffer, 0, buffer);
  }

  writeSimUniforms(loadXM, passIndex) {
    const pressureKpa = computePressureKpa(this.config);
    const raw = new ArrayBuffer(SIM_UNIFORM_BYTES);
    const floats = new Float32Array(raw);
    const uints = new Uint32Array(raw);

    uints[0] = this.dimensions.nx;
    uints[1] = this.dimensions.ny;
    uints[2] = this.dimensions.nz;
    uints[3] = this.voxelCount;

    floats[4] = this.dimensions.lengthM;
    floats[5] = this.dimensions.widthM;
    floats[6] = this.dimensions.depthM;
    floats[7] = this.dimensions.cellSizeM;

    floats[8] = loadXM;
    floats[9] = this.dimensions.widthM * 0.5;
    floats[10] = pressureKpa;
    floats[11] = PHYSICS_STEP_S;

    floats[12] = this.config.footprintLengthM * 0.5;
    floats[13] = this.config.footprintWidthM * 0.5;
    floats[14] = this.config.loadMode === "track" ? 3.6 : 4.4;
    floats[15] = this.config.loadMode === "track" ? 0.085 : 0.06;

    floats[16] = this.config.loadMode === "track" ? 1 : 0;
    floats[17] = this.config.loadMode === "track" ? 0.92 : 1.08;
    floats[18] = passIndex;
    floats[19] = this.config.passes;

    floats[20] = this.motion.startXM;
    floats[21] = this.motion.endXM;
    floats[22] = this.simulationTimeS;
    floats[23] = this.motion.totalDurationS;

    this.device.queue.writeBuffer(this.simUniformBuffer, 0, raw);
  }

  writeSampleUniforms(mode, slices) {
    const raw = new ArrayBuffer(SAMPLE_UNIFORM_BYTES);
    const floats = new Float32Array(raw);
    const uints = new Uint32Array(raw);

    uints[0] = this.dimensions.nx;
    uints[1] = this.dimensions.ny;
    uints[2] = this.dimensions.nz;
    uints[3] = this.voxelCount;
    uints[4] = slices.x;
    uints[5] = slices.y;
    uints[6] = slices.z;
    uints[7] = mode;
    floats[8] = mode;

    this.device.queue.writeBuffer(this.sampleUniformBuffer, 0, raw);
  }

  handleAsyncError(error) {
    console.error(error);
    this.running = false;
    this.metrics.stateLabel = "Erro";
    this.renderState.sliceInFlight = false;
    this.renderState.overviewInFlight = false;
  }
}

function createMotionPlan(config) {
  const padding = Math.max(config.footprintLengthM, config.footprintWidthM) * 0.75;
  const startXM = -padding;
  const endXM = config.dimensions.lengthM + padding;
  const travelDistanceM = endXM - startXM;
  const durationPerPassS = travelDistanceM / Math.max(config.speedMps, 0.05);
  return {
    startXM: startXM,
    endXM: endXM,
    travelDistanceM: travelDistanceM,
    durationPerPassS: durationPerPassS,
    totalDurationS: durationPerPassS * config.passes
  };
}

function poseAtTime(motion, timeS) {
  const clamped = Math.min(timeS, motion.totalDurationS);
  const passIndex = Math.max(1, Math.min(Math.floor(clamped / motion.durationPerPassS) + 1, Math.ceil(motion.totalDurationS / motion.durationPerPassS)));
  const localTime = Math.min(motion.durationPerPassS, clamped - (passIndex - 1) * motion.durationPerPassS);
  const ratio = motion.durationPerPassS <= 0 ? 0 : localTime / motion.durationPerPassS;
  return {
    passIndex: passIndex,
    loadXM: motion.startXM + motion.travelDistanceM * ratio
  };
}

function computePressureKpa(config) {
  const area = Math.max(config.footprintWidthM * config.footprintLengthM, 0.001);
  const distribution = config.loadMode === "track" ? 0.72 : 1;
  return (config.massKg * 9.81 * distribution) / area / 1000;
}

function getSliceDescriptor(kind, dimensions) {
  if (kind === "xy") {
    return {
      width: dimensions.nx,
      height: dimensions.ny,
      bytes: dimensions.nx * dimensions.ny * 4 * 4,
      bindGroup: function bindGroup() {
        return this.xySliceBindGroup;
      },
      storage: function storage() {
        return this.xySliceBuffer;
      },
      read: function read() {
        return this.xyReadBuffer;
      }
    };
  }

  if (kind === "xz") {
    return {
      width: dimensions.nx,
      height: dimensions.nz,
      bytes: dimensions.nx * dimensions.nz * 4 * 4,
      bindGroup: function bindGroup() {
        return this.xzSliceBindGroup;
      },
      storage: function storage() {
        return this.xzSliceBuffer;
      },
      read: function read() {
        return this.xzReadBuffer;
      }
    };
  }

  return {
    width: dimensions.ny,
    height: dimensions.nz,
    bytes: dimensions.ny * dimensions.nz * 4 * 4,
    bindGroup: function bindGroup() {
      return this.yzSliceBindGroup;
    },
    storage: function storage() {
      return this.yzSliceBuffer;
    },
    read: function read() {
      return this.yzReadBuffer;
    }
  };
}

function summarizeSliceData(values) {
  if (!values || !values.length) {
    return { maxCompaction: 0, meanCompaction: 0, maxStress: 0, peakDensity: 0 };
  }

  let maxCompaction = 0;
  let sumCompaction = 0;
  let maxStress = 0;
  let peakDensity = 0;
  const count = values.length / 4;

  for (let index = 0; index < count; index += 1) {
    const base = index * 4;
    maxCompaction = Math.max(maxCompaction, values[base]);
    peakDensity = Math.max(peakDensity, values[base + 1]);
    maxStress = Math.max(maxStress, values[base + 3]);
    sumCompaction += values[base];
  }

  return {
    maxCompaction: maxCompaction,
    meanCompaction: sumCompaction / count,
    maxStress: maxStress,
    peakDensity: peakDensity
  };
}

function serializeConfig(config) {
  return {
    domain: config.domain,
    dimensions: config.dimensions,
    resolution: config.resolution.id,
    loadMode: config.loadMode,
    massKg: config.massKg,
    passes: config.passes,
    speedMps: config.speedMps,
    footprintWidthM: config.footprintWidthM,
    footprintLengthM: config.footprintLengthM,
    layers: config.layers.map(function mapLayer(layer) {
      return {
        presetId: layer.presetId,
        topM: layer.topM,
        bottomM: layer.bottomM,
        thicknessM: layer.thicknessM,
        material: layer.material
      };
    })
  };
}

function toMegabytes(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

async function getPreflightAdapterSelection() {
  const ready = globalThis.__webgpuPreflightReady;
  if (ready && typeof ready.then === "function") {
    try {
      await ready;
    } catch (error) {
      console.warn("WebGPU preflight promise failed:", error);
    }
  }

  const state = globalThis.__webgpuPreflightState;
  if (!state || !state.adapter) {
    return null;
  }

  return {
    adapter: state.adapter,
    preference: state.preference || "preflight",
    attempts: state.attempts || []
  };
}

async function requestBestAdapter(gpu) {
  const attempts = [];
  const preferences = [
    { label: "high-performance", options: { powerPreference: "high-performance" } },
    { label: "default", options: undefined },
    { label: "low-power", options: { powerPreference: "low-power" } }
  ];

  for (const preference of preferences) {
    try {
      const adapter = await gpu.requestAdapter(preference.options);
      attempts.push(preference.label + ": " + (adapter ? "ok" : "null"));
      if (adapter) {
        return {
          adapter: adapter,
          preference: preference.label,
          attempts: attempts
        };
      }
    } catch (error) {
      attempts.push(preference.label + ": " + (error.message || String(error)));
    }
  }

  return {
    adapter: null,
    preference: null,
    attempts: attempts
  };
}

function buildAdapterFailureMessage(attempts) {
  const secureContextLabel =
    typeof window !== "undefined" ? (window.isSecureContext ? "secure-context=yes" : "secure-context=no") : "secure-context=unknown";
  const attemptLabel = attempts && attempts.length ? attempts.join(" | ") : "sem detalhes";

  return (
    "Nenhum adaptador WebGPU disponível. " +
    "Tentativas: " +
    attemptLabel +
    ". " +
    secureContextLabel +
    ". " +
    'Teste no console: await navigator.gpu.requestAdapter({ powerPreference: "high-performance" })'
  );
}
