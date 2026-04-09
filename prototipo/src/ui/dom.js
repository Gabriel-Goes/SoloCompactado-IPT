(function (global) {
  var app = global.SoloCompactado;
  var cachedRefs = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function buildCompactionRows() {
    return Array.from({ length: 6 }, function (_value, index) {
      return {
        depth: byId("compaction-depth-" + index),
        risk: byId("compaction-risk-" + index),
        sigma: byId("compaction-sigma-" + index),
        sigmaP: byId("compaction-sigmap-" + index),
        deformation: byId("compaction-deformation-" + index)
      };
    });
  }

  function buildDomRefs() {
    return {
      app: byId("app"),
      map: {
        tractorCore: byId("tractor-core"),
        error: byId("map-error"),
        errorMessage: byId("map-error-message"),
        toggleButton: byId("btn-toggle-map"),
        legend: byId("bdc-legend")
      },
      tractor: {
        machinePreset: byId("tractor-machine-preset"),
        routeSpeed: byId("tractor-route-speed"),
        heading: byId("tractor-heading"),
        wheelLoad: byId("tractor-wheel-load"),
        inflationPressure: byId("tractor-inflation-pressure"),
        tyreWidth: byId("tractor-tyre-width"),
        trackGauge: byId("tractor-track-gauge")
      },
      terrain: {
        cellId: byId("terrain-cell-id"),
        clayContent: byId("terrain-clay-content"),
        waterContent: byId("terrain-water-content"),
        matricSuction: byId("terrain-matric-suction"),
        bulkDensity: byId("terrain-bulk-density"),
        concFactor: byId("terrain-conc-factor"),
        sigmaP: byId("terrain-sigma-p")
      },
      compaction: {
        rows: buildCompactionRows()
      },
      mission: {
        status: byId("mission-status"),
        cellId: byId("mission-cell-id"),
        sampleCount: byId("mission-sample-count"),
        lastReason: byId("mission-last-reason"),
        lastTimestamp: byId("mission-last-timestamp"),
        lat: byId("mission-lat"),
        lng: byId("mission-lng"),
        storage: byId("mission-storage"),
        id: byId("mission-id"),
        message: byId("mission-message"),
        exportButton: byId("mission-export"),
        clearButton: byId("mission-clear")
      },
      planner: {
        workingWidthInput: byId("planner-working-width"),
        startDrawingButton: byId("planner-start-drawing"),
        finishDrawingButton: byId("planner-finish-drawing"),
        cancelDrawingButton: byId("planner-cancel-drawing"),
        generatePlanButton: byId("planner-generate-plan"),
        clearPlanButton: byId("planner-clear-plan"),
        viewModeToggleButton: byId("planner-view-mode-toggle"),
        fitPlanButton: byId("planner-fit-plan"),
        zoomOutButton: byId("planner-zoom-out"),
        zoomInButton: byId("planner-zoom-in"),
        baseImageryButton: byId("planner-base-imagery"),
        baseBdcButton: byId("planner-base-bdc"),
        overlayBaselineButton: byId("planner-overlay-baseline"),
        overlayOptimizedButton: byId("planner-overlay-optimized"),
        viewMode: byId("planner-view-mode"),
        mapBase: byId("planner-map-base"),
        zoomLevel: byId("planner-zoom-level"),
        swathCount: byId("planner-swath-count"),
        overlayMode: byId("planner-overlay-mode"),
        baselineLength: byId("planner-baseline-length"),
        optimizedLength: byId("planner-optimized-length"),
        baselineCompaction: byId("planner-baseline-compaction"),
        optimizedCompaction: byId("planner-optimized-compaction"),
        deltaLength: byId("planner-delta-length"),
        deltaCompaction: byId("planner-delta-compaction"),
        statusMessage: byId("planner-status-message")
      },
      autopilot: {
        toggleButton: byId("autopilot-toggle"),
        stateLabel:   byId("autopilot-state"),
        segmentLabel: byId("autopilot-segment"),
        typeLabel:    byId("autopilot-type")
      },
      debug: {
        overlay: byId("debug-overlay"),
        lat: byId("debug-lat"),
        lng: byId("debug-lng"),
        heading: byId("debug-heading"),
        speed: byId("debug-speed"),
        keys: byId("debug-keys"),
        cell: byId("debug-cell"),
        storage: byId("debug-storage")
      }
    };
  }

  app.registerModule("ui", "dom", {
    getDomRefs: function getDomRefs() {
      if (!cachedRefs) {
        cachedRefs = buildDomRefs();
      }
      return cachedRefs;
    }
  });
})(window);
