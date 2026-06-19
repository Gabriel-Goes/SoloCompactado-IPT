import { MAX_OVERVIEW_POINTS } from "./config.mjs";

const EMPTY_COLOR = [242, 236, 229];
const GRID_COLOR = "rgba(72, 54, 42, 0.16)";
const LABEL_COLOR = "#4c3c33";

export function createCanvasRenderer(canvas) {
  const context = canvas.getContext("2d");
  const scratch = document.createElement("canvas");
  const scratchContext = scratch.getContext("2d");

  return {
    clear: function clearCanvas(message) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#fbf6f1";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawCanvasFrame(context, canvas.width, canvas.height, message || "sem dados");
    },
    drawSlice: function drawSlice(sliceData, width, height, label) {
      if (!sliceData || !sliceData.length) {
        this.clear(label || "sem dados");
        return;
      }

      scratch.width = width;
      scratch.height = height;
      const image = scratchContext.createImageData(width, height);

      for (let index = 0; index < width * height; index += 1) {
        const compaction = sliceData[index * 4];
        const density = sliceData[index * 4 + 1];
        const porosity = sliceData[index * 4 + 2];
        const stress = sliceData[index * 4 + 3];
        const color = heatColor(compaction, density, porosity, stress);
        const pixelOffset = index * 4;
        image.data[pixelOffset] = color[0];
        image.data[pixelOffset + 1] = color[1];
        image.data[pixelOffset + 2] = color[2];
        image.data[pixelOffset + 3] = 255;
      }

      scratchContext.putImageData(image, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(scratch, 0, 0, canvas.width, canvas.height);
      drawGrid(context, canvas.width, canvas.height);
      drawCanvasFrame(context, canvas.width, canvas.height, label);
    },
    drawOverview: function drawOverview(snapshot, dimensions, label) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#fbf6f1";
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (!snapshot || !snapshot.length) {
        drawCanvasFrame(context, canvas.width, canvas.height, label || "sem snapshot");
        return;
      }

      const points = buildOverviewPoints(snapshot, dimensions).sort(function sortByDepth(a, b) {
        return a.depthKey - b.depthKey;
      });

      context.save();
      context.translate(canvas.width * 0.18, canvas.height * 0.12);
      points.forEach(function drawPoint(point) {
        const screen = projectIsometric(point.x, point.y, point.z, canvas.width, canvas.height);
        context.beginPath();
        context.fillStyle = point.color;
        context.globalAlpha = point.alpha;
        context.arc(screen.x, screen.y, point.radius, 0, Math.PI * 2);
        context.fill();
      });
      context.restore();

      context.globalAlpha = 1;
      drawOverviewAxes(context, canvas.width, canvas.height);
      drawCanvasFrame(context, canvas.width, canvas.height, label);
    }
  };
}

export function summarizeSlice(sliceData) {
  if (!sliceData || !sliceData.length) {
    return { maxCompaction: 0, meanCompaction: 0, maxStress: 0, peakDensity: 0 };
  }

  let maxCompaction = 0;
  let sumCompaction = 0;
  let maxStress = 0;
  let peakDensity = 0;
  const sampleCount = sliceData.length / 4;

  for (let index = 0; index < sampleCount; index += 1) {
    const base = index * 4;
    maxCompaction = Math.max(maxCompaction, sliceData[base]);
    peakDensity = Math.max(peakDensity, sliceData[base + 1]);
    maxStress = Math.max(maxStress, sliceData[base + 3]);
    sumCompaction += sliceData[base];
  }

  return {
    maxCompaction: maxCompaction,
    meanCompaction: sumCompaction / sampleCount,
    maxStress: maxStress,
    peakDensity: peakDensity
  };
}

export function buildTimelineCsv(rows) {
  const header = [
    "time_s",
    "pass_index",
    "load_x_m",
    "max_compaction",
    "mean_top_compaction",
    "peak_density",
    "peak_stress_kpa"
  ];
  const lines = rows.map(function mapRow(row) {
    return [
      safeNumber(row.timeS),
      safeNumber(row.passIndex),
      safeNumber(row.loadXM),
      safeNumber(row.maxCompaction),
      safeNumber(row.meanTopCompaction),
      safeNumber(row.peakDensity),
      safeNumber(row.peakStressKpa)
    ].join(",");
  });
  return [header.join(","), lines.join("\n")].join("\n");
}

export function triggerDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(function cleanup() {
    URL.revokeObjectURL(url);
  }, 2000);
}

export function canvasBlob(canvas) {
  return new Promise(function toBlob(resolve) {
    canvas.toBlob(function onBlob(blob) {
      resolve(blob);
    }, "image/png");
  });
}

export function formatSliceLabel(axis, index, count, axisLengthM) {
  const ratio = count <= 1 ? 0 : index / (count - 1);
  return axis + " = " + (ratio * axisLengthM).toFixed(2) + " m";
}

function drawCanvasFrame(context, width, height, label) {
  context.strokeStyle = "rgba(72, 54, 42, 0.16)";
  context.lineWidth = 1.4;
  context.strokeRect(10, 10, width - 20, height - 20);
  context.fillStyle = LABEL_COLOR;
  context.font = "600 14px Segoe UI";
  context.fillText(label || "", 18, height - 18);
}

function drawGrid(context, width, height) {
  context.save();
  context.strokeStyle = GRID_COLOR;
  context.lineWidth = 1;
  for (let step = 1; step < 8; step += 1) {
    const x = (width / 8) * step;
    const y = (height / 8) * step;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();
}

function drawOverviewAxes(context, width, height) {
  context.save();
  context.strokeStyle = "rgba(72, 54, 42, 0.35)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(width * 0.1, height * 0.84);
  context.lineTo(width * 0.88, height * 0.84);
  context.stroke();
  context.beginPath();
  context.moveTo(width * 0.1, height * 0.84);
  context.lineTo(width * 0.1, height * 0.2);
  context.stroke();
  context.fillStyle = LABEL_COLOR;
  context.font = "600 13px Segoe UI";
  context.fillText("x", width * 0.9, height * 0.84);
  context.fillText("z", width * 0.05, height * 0.2);
  context.restore();
}

function buildOverviewPoints(snapshot, dimensions) {
  const stride = Math.max(1, Math.floor(Math.cbrt((dimensions.nx * dimensions.ny * dimensions.nz) / MAX_OVERVIEW_POINTS)));
  const points = [];
  const plane = dimensions.nx * dimensions.ny;
  const maxDimension = Math.max(dimensions.lengthM, dimensions.widthM, dimensions.depthM);

  for (let z = 0; z < dimensions.nz; z += stride) {
    for (let y = 0; y < dimensions.ny; y += stride) {
      for (let x = 0; x < dimensions.nx; x += stride) {
        const index = (z * plane + y * dimensions.nx + x) * 8;
        const compaction = snapshot[index + 3];
        if (compaction < 0.025) {
          continue;
        }
        const density = snapshot[index];
        points.push({
          x: (x / Math.max(1, dimensions.nx - 1)) * (dimensions.lengthM / maxDimension),
          y: (y / Math.max(1, dimensions.ny - 1)) * (dimensions.widthM / maxDimension),
          z: (z / Math.max(1, dimensions.nz - 1)) * (dimensions.depthM / maxDimension),
          depthKey: x + y + z,
          radius: 2.2 + compaction * 2.8,
          alpha: Math.min(0.9, 0.24 + compaction * 0.65),
          color: colorString(heatColor(compaction, density, snapshot[index + 1], snapshot[index + 5]))
        });
      }
    }
  }

  return points;
}

function projectIsometric(x, y, z, width, height) {
  const scaleX = width * 0.32;
  const scaleY = height * 0.42;
  return {
    x: (x - y) * scaleX * 0.7,
    y: (x + y) * scaleX * 0.28 + z * scaleY * 0.82
  };
}

function heatColor(compaction, density, porosity, stress) {
  const normalizedCompaction = clamp(compaction, 0, 1);
  const densityBoost = clamp((density - 1.15) / 0.85, 0, 1);
  const stressBoost = clamp(stress / 190, 0, 1);
  const porosityOffset = clamp(1 - porosity / 0.6, 0, 1);
  const mix = clamp(normalizedCompaction * 0.55 + densityBoost * 0.2 + stressBoost * 0.2 + porosityOffset * 0.05, 0, 1);
  return blendColorStops(mix);
}

function blendColorStops(value) {
  const stops = [
    [EMPTY_COLOR[0], EMPTY_COLOR[1], EMPTY_COLOR[2]],
    [137, 176, 132],
    [212, 172, 100],
    [203, 106, 73],
    [125, 46, 35]
  ];
  const scaled = value * (stops.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(stops.length - 1, index + 1);
  const mix = scaled - index;
  return [
    Math.round(lerp(stops[index][0], stops[nextIndex][0], mix)),
    Math.round(lerp(stops[index][1], stops[nextIndex][1], mix)),
    Math.round(lerp(stops[index][2], stops[nextIndex][2], mix))
  ];
}

function colorString(rgb) {
  return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
}

function safeNumber(value) {
  return Number.isFinite(value) ? Number(value).toFixed(6) : "0.000000";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}
