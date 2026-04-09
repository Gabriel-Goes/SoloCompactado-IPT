(function (global) {
  var app = global.SoloCompactado;

  function createCoveragePlannerState(config) {
    return {
      mode: "idle",
      overlay_mode: "optimized",
      working_width_m: 6.0,
      draft_vertices: [],
      field_polygon: null,
      coverage_preview: null,
      coverage_plan: null,
      status_message: null,
      paused_tractor: false,
      view: {
        mode: "follow",
        map_base: "imagery",
        follow_zoom: config.initialZoom,
        planner_zoom: config.initialZoom,
        imagery_native_zoom: config.imageryNativeZoom,
        visual_max_zoom: config.visualMaxZoom,
        fit_padding_px: config.fitPaddingPx,
        imagery_failed: false
      }
    };
  }

  function createRuntime(config) {
    return {
      datasetReady: false,
      datasetError: null,
      terrainGrid: null,
      terrainRaster: null,
      terrainManifest: null,
      mission: null,
      currentCell: null,
      currentTerrainPixel: null,
      currentCompactionProfile: null,
      storageAvailable: true,
      storageError: null,
      mapTileFailed: false,
      latestSample: null,
      uiMessage: null,
      lastTickTimestamp: null,
      lastDeltaMs: 0,
      coveragePlanner: createCoveragePlannerState(config),
      autopilot: {
        state: "inactive"   // espelho mínimo — atualizado por autopilot.js; fonte de verdade é autopilotState local no domain
      }
    };
  }

  function pushUiMessage(runtimeState, message, ttlMs) {
    runtimeState.uiMessage = {
      text: message,
      expiresAt: Date.now() + ttlMs
    };
  }

  function getUiMessage(runtimeState) {
    if (!runtimeState.uiMessage) {
      return null;
    }

    if (Date.now() > runtimeState.uiMessage.expiresAt) {
      runtimeState.uiMessage = null;
      return null;
    }

    return runtimeState.uiMessage.text;
  }

  function getRuntimeSnapshot(runtimeState) {
    return {
      datasetReady: runtimeState.datasetReady,
      datasetError: runtimeState.datasetError,
      storageAvailable: runtimeState.storageAvailable,
      storageError: runtimeState.storageError,
      currentCellId: runtimeState.currentCell ? runtimeState.currentCell.cellId : null,
      latestSampleTimestamp: runtimeState.latestSample ? runtimeState.latestSample.timestamp : null,
      plannerMode: runtimeState.coveragePlanner.mode,
      plannerViewMode: runtimeState.coveragePlanner.view.mode,
      plannerMapBase: runtimeState.coveragePlanner.view.map_base,
      uiMessage: getUiMessage(runtimeState),
      lastDeltaMs: runtimeState.lastDeltaMs,
      autopilotState: runtimeState.autopilot.state
    };
  }

  function tickRuntime(runtimeState, timestamp, maxDeltaMs) {
    if (runtimeState.lastTickTimestamp === null) {
      runtimeState.lastTickTimestamp = timestamp;
      runtimeState.lastDeltaMs = 0;
      return 0;
    }

    var deltaMs = Math.min(timestamp - runtimeState.lastTickTimestamp, maxDeltaMs);
    runtimeState.lastTickTimestamp = timestamp;
    runtimeState.lastDeltaMs = deltaMs;
    return deltaMs;
  }

  app.registerModule("core", "runtime", {
    createRuntime: createRuntime,
    pushUiMessage: pushUiMessage,
    getUiMessage: getUiMessage,
    getRuntimeSnapshot: getRuntimeSnapshot,
    tickRuntime: tickRuntime
  });
})(window);
