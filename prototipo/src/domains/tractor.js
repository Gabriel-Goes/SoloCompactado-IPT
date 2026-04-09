(function (global) {
  var app = global.SoloCompactado;
  var activeTractorDomain = null;

  function normalizeDirectionalKey(key) {
    if (key === "ArrowUp") {
      return "up";
    }
    if (key === "ArrowDown") {
      return "down";
    }
    if (key === "ArrowLeft") {
      return "left";
    }
    if (key === "ArrowRight") {
      return "right";
    }
    return null;
  }

  function createTractorDomain(config) {
    var tractorState = config.tractorState;
    var inputState = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    activeTractorDomain = {
      applyDirectionalInput: function applyDirectionalInput(eventType, key, blocked) {
        var normalizedKey = normalizeDirectionalKey(key);
        if (!normalizedKey) {
          return false;
        }

        if (blocked) {
          inputState[normalizedKey] = false;
          return true;
        }

        inputState[normalizedKey] = eventType === "keydown";
        return true;
      },
      clearInputs: function clearInputs() {
        inputState.up = false;
        inputState.down = false;
        inputState.left = false;
        inputState.right = false;
      },
      update: function update(deltaMs) {
        var deltaSeconds;
        var turningLeft;
        var turningRight;
        var distanceMeters;

        if (config.runtime.coveragePlanner.paused_tractor) {
          tractorState.speedMps = 0;
          return;
        }

        deltaSeconds = deltaMs / 1000;

        // Bypass autopilot: heading e speed já definidos por autopilotDomain.update()
        if (config.isAutopilotActive && config.isAutopilotActive()) {
          distanceMeters = tractorState.speedMps * deltaSeconds;
          if (distanceMeters > 0) {
            tractorState.position = config.moveForward(
              tractorState.position,
              tractorState.headingDeg,
              distanceMeters
            );
          }
          return;
        }

        turningLeft = inputState.left && !inputState.right;
        turningRight = inputState.right && !inputState.left;

        if (turningLeft) {
          tractorState.headingDeg =
            tractorState.headingDeg - tractorState.turnRateDegPerSec * deltaSeconds;
        } else if (turningRight) {
          tractorState.headingDeg =
            tractorState.headingDeg + tractorState.turnRateDegPerSec * deltaSeconds;
        }

        if (inputState.up) {
          tractorState.speedMps = config.clamp(
            tractorState.speedMps + tractorState.accelerationMps2 * deltaSeconds,
            0,
            tractorState.maxSpeedMps
          );
        } else if (inputState.down) {
          tractorState.speedMps = config.clamp(
            tractorState.speedMps - tractorState.brakeRateMps2 * deltaSeconds,
            0,
            tractorState.maxSpeedMps
          );
        } else {
          tractorState.speedMps = config.clamp(
            tractorState.speedMps - 0.55 * deltaSeconds,
            0,
            tractorState.maxSpeedMps
          );
        }

        distanceMeters = tractorState.speedMps * deltaSeconds;
        if (distanceMeters > 0) {
          tractorState.position = config.moveForward(
            tractorState.position,
            tractorState.headingDeg,
            distanceMeters
          );
        }
      },
      getInputState: function getInputState() {
        return inputState;
      },
      getSnapshot: function getSnapshot() {
        return {
          position: {
            lat: tractorState.position.lat,
            lng: tractorState.position.lng
          },
          headingDeg: tractorState.headingDeg,
          speedMps: tractorState.speedMps
        };
      }
    };

    return activeTractorDomain;
  }

  app.registerModule("domains", "tractor", {
    createTractorDomain: createTractorDomain,
    getActiveDomain: function getActiveDomain() {
      return activeTractorDomain;
    }
  });
})(window);
