(function (global) {
  var app = global.SoloCompactado;

  function setHudMetric(element, value, isEmpty) {
    element.textContent = value;
    element.classList.toggle("hud-empty", Boolean(isEmpty));
  }

  function setCompactionRisk(element, value, riskClass) {
    element.textContent = value;
    element.classList.remove("risk-critical", "risk-warning", "risk-safe", "risk-unavailable");
    element.classList.add("risk-" + (riskClass || "unavailable"));
  }

  function createHudUi(config) {
    var domRefs = config.domRefs;

    return {
      renderHud: function renderHud(viewModel) {
        setHudMetric(domRefs.tractor.machinePreset, viewModel.tractor.machine_preset, false);
        setHudMetric(domRefs.tractor.routeSpeed, viewModel.tractor.route_speed, false);
        setHudMetric(domRefs.tractor.heading, viewModel.tractor.heading, false);
        setHudMetric(domRefs.tractor.wheelLoad, viewModel.tractor.wheel_load, false);
        setHudMetric(domRefs.tractor.inflationPressure, viewModel.tractor.inflation_pressure, false);
        setHudMetric(domRefs.tractor.tyreWidth, viewModel.tractor.tyre_width, false);
        setHudMetric(domRefs.tractor.trackGauge, viewModel.tractor.track_gauge, false);

        setHudMetric(domRefs.terrain.cellId, viewModel.terrain.cell_id, false);
        setHudMetric(domRefs.terrain.clayContent, viewModel.terrain.clay_content, viewModel.terrain.clay_content === "Nao disponivel");
        setHudMetric(domRefs.terrain.waterContent, viewModel.terrain.water_content, viewModel.terrain.water_content === "Nao disponivel");
        setHudMetric(domRefs.terrain.matricSuction, viewModel.terrain.matric_suction, viewModel.terrain.matric_suction === "Nao disponivel");
        setHudMetric(domRefs.terrain.bulkDensity, viewModel.terrain.bulk_density, viewModel.terrain.bulk_density === "Nao disponivel");
        setHudMetric(domRefs.terrain.concFactor, viewModel.terrain.conc_factor, viewModel.terrain.conc_factor === "Nao disponivel");
        setHudMetric(domRefs.terrain.sigmaP, viewModel.terrain.sigma_p, viewModel.terrain.sigma_p === "Nao disponivel");

        viewModel.compaction.forEach(function (layerViewModel, index) {
          var row = domRefs.compaction.rows[index];
          if (!row) {
            return;
          }

          row.depth.textContent = layerViewModel.depth_range;
          setCompactionRisk(row.risk, layerViewModel.risk_text, layerViewModel.risk_class);
          row.sigma.textContent = layerViewModel.sigma_aplicada;
          row.sigmaP.textContent = layerViewModel.sigma_p;
          row.deformation.textContent = layerViewModel.deformation;
        });

        setHudMetric(domRefs.mission.id, viewModel.mission.mission_id, viewModel.mission.mission_id === "-");
        setHudMetric(domRefs.mission.sampleCount, viewModel.mission.sample_count, false);
        setHudMetric(domRefs.mission.lastReason, viewModel.mission.last_sampling_reason, viewModel.mission.last_sampling_reason === "-");
        setHudMetric(domRefs.mission.lastTimestamp, viewModel.mission.last_sample_timestamp, viewModel.mission.last_sample_timestamp === "-");
        setHudMetric(domRefs.mission.lat, viewModel.mission.lat, false);
        setHudMetric(domRefs.mission.lng, viewModel.mission.lng, false);
        setHudMetric(domRefs.mission.cellId, viewModel.mission.cell_id, false);
        setHudMetric(domRefs.mission.storage, viewModel.mission.storage, false);

        domRefs.planner.workingWidthInput.value = viewModel.planner.working_width_m_input;
        domRefs.planner.workingWidthInput.disabled = viewModel.planner.controls.working_width_disabled;
        domRefs.planner.statusMessage.textContent = viewModel.planner.status;
        setHudMetric(domRefs.planner.viewMode, viewModel.planner.view_mode_label, false);
        setHudMetric(domRefs.planner.mapBase, viewModel.planner.map_base_label, false);
        setHudMetric(domRefs.planner.zoomLevel, viewModel.planner.zoom_label, viewModel.planner.zoom_label === "—");
        setHudMetric(domRefs.planner.swathCount, viewModel.planner.swath_count, viewModel.planner.swath_count === "—");
        setHudMetric(domRefs.planner.overlayMode, viewModel.planner.overlay_mode, false);
        setHudMetric(domRefs.planner.baselineLength, viewModel.planner.baseline_length, viewModel.planner.baseline_length === "—");
        setHudMetric(domRefs.planner.optimizedLength, viewModel.planner.optimized_length, viewModel.planner.optimized_length === "—");
        setHudMetric(domRefs.planner.baselineCompaction, viewModel.planner.baseline_compaction, viewModel.planner.baseline_compaction === "—");
        setHudMetric(domRefs.planner.optimizedCompaction, viewModel.planner.optimized_compaction, viewModel.planner.optimized_compaction === "—");
        setHudMetric(domRefs.planner.deltaLength, viewModel.planner.delta_length, viewModel.planner.delta_length === "—");
        setHudMetric(domRefs.planner.deltaCompaction, viewModel.planner.delta_compaction, viewModel.planner.delta_compaction === "—");

        domRefs.planner.startDrawingButton.disabled = viewModel.planner.controls.start_drawing_disabled;
        domRefs.planner.finishDrawingButton.disabled = viewModel.planner.controls.finish_drawing_disabled;
        domRefs.planner.cancelDrawingButton.disabled = viewModel.planner.controls.cancel_drawing_disabled;
        domRefs.planner.generatePlanButton.disabled = viewModel.planner.controls.generate_plan_disabled;
        domRefs.planner.clearPlanButton.disabled = viewModel.planner.controls.clear_plan_disabled;
        domRefs.planner.viewModeToggleButton.disabled = viewModel.planner.controls.toggle_view_mode_disabled;
        domRefs.planner.viewModeToggleButton.textContent = viewModel.planner.toggle_view_mode_label;
        domRefs.planner.fitPlanButton.disabled = viewModel.planner.controls.fit_plan_disabled;
        domRefs.planner.zoomOutButton.disabled = viewModel.planner.controls.zoom_out_disabled;
        domRefs.planner.zoomInButton.disabled = viewModel.planner.controls.zoom_in_disabled;
        domRefs.planner.baseImageryButton.disabled = viewModel.planner.controls.base_imagery_disabled;
        domRefs.planner.baseBdcButton.disabled = viewModel.planner.controls.base_bdc_disabled;
        domRefs.planner.overlayBaselineButton.disabled = viewModel.planner.controls.overlay_baseline_disabled;
        domRefs.planner.overlayOptimizedButton.disabled = viewModel.planner.controls.overlay_optimized_disabled;
      },
      setMissionStatus: function setMissionStatus(type, text) {
        domRefs.mission.status.className = "panel-status";
        domRefs.mission.status.classList.add(
          type === "error" ? "status-error" : type === "warning" ? "status-warning" : "status-ok"
        );
        domRefs.mission.status.textContent = text;
      },
      setMissionMessage: function setMissionMessage(message) {
        domRefs.mission.message.textContent = message;
      },
      setPlannerButtonStates: function setPlannerButtonStates(runtimeState, viewModel) {
        domRefs.planner.viewModeToggleButton.classList.toggle(
          "is-active",
          runtimeState.coveragePlanner.view.mode === "planner"
        );
        domRefs.planner.baseImageryButton.classList.toggle(
          "is-active",
          runtimeState.coveragePlanner.view.map_base === "imagery"
        );
        domRefs.planner.baseBdcButton.classList.toggle(
          "is-active",
          runtimeState.coveragePlanner.view.map_base === "bdc"
        );
        domRefs.planner.overlayBaselineButton.classList.toggle(
          "is-active",
          runtimeState.coveragePlanner.overlay_mode === "baseline"
        );
        domRefs.planner.overlayOptimizedButton.classList.toggle(
          "is-active",
          runtimeState.coveragePlanner.overlay_mode === "optimized"
        );
      }
    };
  }

  app.registerModule("ui", "hud", {
    createHudUi: createHudUi,
    renderHud: function renderHud() {}
  });
})(window);
