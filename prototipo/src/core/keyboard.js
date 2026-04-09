(function (global) {
  var app = global.SoloCompactado;
  var keyboardBound = false;

  function bindKeyboard(config) {
    if (keyboardBound) {
      return;
    }

    keyboardBound = true;

    global.addEventListener("keydown", function (event) {
      var drawingActive = config.plannerDomain.isDrawingActive();
      var blocked = drawingActive || (config.isAutopilotActive && config.isAutopilotActive());
      var handledDirectional = config.tractorDomain.applyDirectionalInput(
        "keydown",
        event.key,
        blocked
      );

      if (handledDirectional) {
        event.preventDefault();
        return;
      }

      if (event.key === "a" || event.key === "A") {
        if (config.autopilotDomain) {
          config.autopilotDomain.toggle();
        }
        event.preventDefault();
        return;
      }

      if (event.key === "d" || event.key === "D") {
        config.debugUi.toggleDebug();
        event.preventDefault();
      }
    });

    global.addEventListener("keyup", function (event) {
      var handledDirectional = config.tractorDomain.applyDirectionalInput(
        "keyup",
        event.key,
        false
      );

      if (handledDirectional) {
        event.preventDefault();
      }
    });

    config.appElement.addEventListener("pointerdown", function () {
      global.focus();
    });
  }

  app.registerModule("core", "keyboard", {
    bindKeyboard: bindKeyboard
  });
})(window);
