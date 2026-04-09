(function (global) {
  var app = global.SoloCompactado;

  function createPanelsUi(config) {
    var domRefs = config.domRefs;

    return {
      bindMissionPanel: function bindMissionPanel(actions) {
        domRefs.mission.exportButton.addEventListener("click", function () {
          actions.onExport();
        });

        domRefs.mission.clearButton.addEventListener("click", function () {
          actions.onReset();
        });
      },
      bindPlannerPanel: function bindPlannerPanel(actions) {
        domRefs.planner.workingWidthInput.addEventListener("change", function () {
          actions.onWorkingWidthChange(domRefs.planner.workingWidthInput.value);
        });
        domRefs.planner.startDrawingButton.addEventListener("click", function () {
          actions.onStartDrawing();
        });
        domRefs.planner.finishDrawingButton.addEventListener("click", function () {
          actions.onFinishDrawing();
        });
        domRefs.planner.cancelDrawingButton.addEventListener("click", function () {
          actions.onCancelDrawing();
        });
        domRefs.planner.generatePlanButton.addEventListener("click", function () {
          actions.onGeneratePlan();
        });
        domRefs.planner.clearPlanButton.addEventListener("click", function () {
          actions.onClearPlan();
        });
        domRefs.planner.viewModeToggleButton.addEventListener("click", function () {
          actions.onToggleViewMode();
        });
        domRefs.planner.fitPlanButton.addEventListener("click", function () {
          actions.onFitPlan();
        });
        domRefs.planner.zoomOutButton.addEventListener("click", function () {
          actions.onZoomOut();
        });
        domRefs.planner.zoomInButton.addEventListener("click", function () {
          actions.onZoomIn();
        });
        domRefs.planner.baseImageryButton.addEventListener("click", function () {
          actions.onSetImageryBase();
        });
        domRefs.planner.baseBdcButton.addEventListener("click", function () {
          actions.onSetBdcBase();
        });
        domRefs.planner.overlayBaselineButton.addEventListener("click", function () {
          actions.onSetBaselineOverlay();
        });
        domRefs.planner.overlayOptimizedButton.addEventListener("click", function () {
          actions.onSetOptimizedOverlay();
        });

        if (domRefs.autopilot && domRefs.autopilot.toggleButton) {
          domRefs.autopilot.toggleButton.addEventListener("click", function () {
            actions.onAutopilotToggle();
          });
        }
      }
    };
  }

  app.registerModule("ui", "panels", {
    createPanelsUi: createPanelsUi,
    bindMissionPanel: function bindMissionPanel() {},
    bindPlannerPanel: function bindPlannerPanel() {},
    renderMissionPanel: function renderMissionPanel() {},
    renderPlannerPanel: function renderPlannerPanel() {}
  });
})(window);
