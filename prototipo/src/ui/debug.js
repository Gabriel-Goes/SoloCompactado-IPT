(function (global) {
  var app = global.SoloCompactado;
  var activeDebugUi = null;

  function createDebugUi(config) {
    activeDebugUi = {
      toggleDebug: function toggleDebug() {
        config.debugState.enabled = !config.debugState.enabled;
        config.domRefs.overlay.hidden = !config.debugState.enabled;
      },
      renderDebug: function renderDebug() {
        var tractorSnapshot;
        var inputState;
        var normalizedHeading;

        if (!config.debugState.enabled) {
          return;
        }

        tractorSnapshot = config.tractorDomain.getSnapshot();
        inputState = config.tractorDomain.getInputState();
        normalizedHeading = ((tractorSnapshot.headingDeg % 360) + 360) % 360;

        config.domRefs.lat.textContent = tractorSnapshot.position.lat.toFixed(6);
        config.domRefs.lng.textContent = tractorSnapshot.position.lng.toFixed(6);
        config.domRefs.heading.textContent = normalizedHeading.toFixed(1) + "°";
        config.domRefs.speed.textContent = tractorSnapshot.speedMps.toFixed(2) + " m/s";
        config.domRefs.keys.textContent = Object.entries(inputState)
          .filter(function (entry) {
            return entry[1];
          })
          .map(function (entry) {
            return entry[0];
          })
          .join(", ") || "nenhuma";
        config.domRefs.cell.textContent = config.runtime.currentCell ? config.runtime.currentCell.cellId : "fora";
        config.domRefs.storage.textContent = config.runtime.storageAvailable ? "ok" : "memory";
      }
    };

    return activeDebugUi;
  }

  app.registerModule("ui", "debug", {
    createDebugUi: createDebugUi,
    toggleDebug: function toggleDebug() {
      if (activeDebugUi) {
        activeDebugUi.toggleDebug();
      }
    },
    renderDebug: function renderDebug() {
      if (activeDebugUi) {
        activeDebugUi.renderDebug();
      }
    }
  });
})(window);
