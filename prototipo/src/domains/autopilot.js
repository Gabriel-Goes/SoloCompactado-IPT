(function (global) {
  var app = global.SoloCompactado;
  var activeAutopilotDomain = null;

  // --- Constantes ---
  var AUTOPILOT_CRUISE_SPEED_MPS    = 1.39;
  var AUTOPILOT_HEADLAND_SPEED_MPS  = AUTOPILOT_CRUISE_SPEED_MPS * 0.65;
  var AUTOPILOT_WAYPOINT_RADIUS_M   = 2.0;
  var AUTOPILOT_CLOSE_THRESHOLD_M   = 15.0;

  // --- Funções puras ---

  // Bearing geodésico de `from` para `to`, em graus [0, 360)
  function calcBearing(from, to) {
    var lat1 = from.lat * Math.PI / 180;
    var lat2 = to.lat  * Math.PI / 180;
    var dLng = (to.lng - from.lng) * Math.PI / 180;
    var x = Math.sin(dLng) * Math.cos(lat2);
    var y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
  }

  // Menor delta angular de `current` para `target`, em graus [-180, 180]
  function calcHeadingDelta(current, target) {
    var delta = ((target - current) % 360 + 360) % 360;
    return delta > 180 ? delta - 360 : delta;
  }

  // Distância euclidiana planar em metros (suficiente para < 100 m)
  function calcDistanceM(a, b) {
    var dLat = (b.lat - a.lat) * 111320;
    var dLng = (b.lng - a.lng) * 111320 * Math.cos(a.lat * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
  }

  // Achata os segments da rota em array flat de waypoints enriquecidos
  function flattenRoute(route) {
    var waypoints = [];
    var totalSegments = route.segments.length;
    var i, j, segment, polyline, point;

    for (i = 0; i < totalSegments; i++) {
      segment = route.segments[i];
      polyline = segment.polyline_latlng;
      for (j = 0; j < polyline.length; j++) {
        point = polyline[j];
        waypoints.push({
          lat:           point.lat,
          lng:           point.lng,
          segmentIndex:  i,
          segmentType:   segment.type,
          totalSegments: totalSegments
        });
      }
    }

    return waypoints;
  }

  // Resolve ponto de entrada/reacoplamento na rota.
  // Nunca retorna índice menor que currentIndex, exceto reset a 0
  // quando nenhum waypoint pendente está dentro do threshold.
  function resolveWaypointEntry(waypoints, position, currentIndex) {
    var i, dist;
    // Busca o waypoint de menor índice (>= currentIndex) dentro do threshold
    for (i = currentIndex; i < waypoints.length; i++) {
      dist = calcDistanceM(position, waypoints[i]);
      if (dist <= AUTOPILOT_CLOSE_THRESHOLD_M) {
        return i;
      }
    }
    // Nenhum ponto pendente dentro do threshold → navega até a origem
    return 0;
  }

  // --- Domain factory ---

  function createAutopilotDomain(config) {
    var autopilotState = {
      state:             "inactive",
      waypoints:         [],
      waypointIndex:     0,
      routeSnapshot:     null,
      _wasPausedExternal: false
    };

    // Sincroniza o espelho mínimo de debug no runtime
    function syncRuntime() {
      config.runtime.autopilot.state = autopilotState.state;
    }

    // Reset completo do autopilotState + espelho runtime
    function resetState() {
      autopilotState.state             = "inactive";
      autopilotState.waypoints         = [];
      autopilotState.waypointIndex     = 0;
      autopilotState.routeSnapshot     = null;
      autopilotState._wasPausedExternal = false;
      syncRuntime();
    }

    // Atualiza o marcador visual do waypoint alvo (P3)
    function updateMarker(wp) {
      config.mapLayers.autopilotWaypoint.clearLayers();
      if (wp) {
        global.L.circleMarker([wp.lat, wp.lng], {
          radius:      6,
          color:       "#00aaff",
          fillColor:   "#00aaff",
          fillOpacity: 0.8,
          weight:      2
        }).addTo(config.mapLayers.autopilotWaypoint);
      }
    }

    // Desativa o piloto (chamado internamente e por clearPlan)
    function deactivateDomain(message) {
      resetState();
      config.mapLayers.autopilotWaypoint.clearLayers();
      if (message) {
        config.pushUiMessage(message);
      }
      config.renderHud();
    }

    activeAutopilotDomain = {

      toggle: function toggle() {
        var plan = config.runtime.coveragePlanner.coverage_plan;
        var overlayMode, route;

        if (autopilotState.state === "inactive") {
          // AP-02: sem plano → mensagem e permanece inativo
          if (!plan) {
            config.pushUiMessage("Gere um plano de cobertura antes de ativar o piloto.");
            return;
          }

          // AP-01b / AP-01c: rota ativa pelo overlay_mode no momento da ativação
          overlayMode = config.runtime.coveragePlanner.overlay_mode;
          route = overlayMode === "baseline"
            ? plan.baseline_route
            : plan.optimized_route;

          if (!route || !route.segments || route.segments.length === 0) {
            config.pushUiMessage("Rota inválida. Gere um novo plano.");
            return;
          }

          autopilotState.routeSnapshot = route;
          autopilotState.waypoints     = flattenRoute(route);
          autopilotState.waypointIndex = resolveWaypointEntry(
            autopilotState.waypoints,
            config.tractorState.position,
            0
          );
          autopilotState.state = "active";
          syncRuntime();
          config.renderHud();
          return;
        }

        // AP-14: ativo → pausado
        if (autopilotState.state === "active") {
          autopilotState.state = "paused";
          config.tractorState.speedMps = 0;
          syncRuntime();
          config.renderHud();
          return;
        }

        // AP-15: pausado → ativo (reacoplamento)
        if (autopilotState.state === "paused") {
          autopilotState.waypointIndex = resolveWaypointEntry(
            autopilotState.waypoints,
            config.tractorState.position,
            autopilotState.waypointIndex
          );
          autopilotState.state = "active";
          syncRuntime();
          config.renderHud();
        }
      },

      deactivate: function deactivate(message) {
        deactivateDomain(message);
      },

      update: function update(deltaMs) {
        var ap = autopilotState;
        var tractorState = config.tractorState;
        var deltaSeconds, wp, bearing, delta, maxTurn, targetSpeed, dist;

        // AP-24: paused_tractor externo
        if (config.runtime.coveragePlanner.paused_tractor) {
          ap._wasPausedExternal = true;
          return;
        }

        // AP-24: liberação de paused_tractor → reacoplamento
        if (ap._wasPausedExternal) {
          ap._wasPausedExternal = false;
          ap.waypointIndex = resolveWaypointEntry(
            ap.waypoints, tractorState.position, ap.waypointIndex
          );
        }

        if (ap.state !== "active") {
          return;
        }

        // Guard fim de rota (estado inconsistente)
        if (ap.waypointIndex >= ap.waypoints.length) {
          deactivateDomain("Rota concluída.");
          return;
        }

        deltaSeconds = deltaMs / 1000;
        wp = ap.waypoints[ap.waypointIndex];

        // AP-06 / AP-07: steering geodésico clampado por tick
        bearing  = calcBearing(tractorState.position, wp);
        delta    = calcHeadingDelta(tractorState.headingDeg, bearing);
        maxTurn  = tractorState.turnRateDegPerSec * deltaSeconds;
        tractorState.headingDeg = tractorState.headingDeg +
          config.clamp(delta, -maxTurn, maxTurn);
        // Normaliza heading para [0, 360)
        tractorState.headingDeg = ((tractorState.headingDeg % 360) + 360) % 360;

        // AP-10 / AP-11 / AP-12 / AP-13: controle de velocidade por segmento
        targetSpeed = (wp.segmentType === "swath")
          ? AUTOPILOT_CRUISE_SPEED_MPS
          : AUTOPILOT_HEADLAND_SPEED_MPS;

        if (tractorState.speedMps > targetSpeed) {
          tractorState.speedMps = config.clamp(
            tractorState.speedMps - tractorState.brakeRateMps2 * deltaSeconds,
            targetSpeed,
            tractorState.maxSpeedMps
          );
        } else if (tractorState.speedMps < targetSpeed) {
          tractorState.speedMps = config.clamp(
            tractorState.speedMps + tractorState.accelerationMps2 * deltaSeconds,
            0,
            targetSpeed
          );
        }

        // AP-08: acceptance radius → avança waypoint
        dist = calcDistanceM(tractorState.position, wp);
        if (dist < AUTOPILOT_WAYPOINT_RADIUS_M) {
          ap.waypointIndex++;
          // AP-09: fim da rota
          if (ap.waypointIndex >= ap.waypoints.length) {
            deactivateDomain("Rota concluída.");
            return;
          }
          wp = ap.waypoints[ap.waypointIndex];
        }

        // AP-22: marcador visual do waypoint alvo
        updateMarker(wp);
      },

      isActive: function isActive() {
        return autopilotState.state === "active";
      },

      getSnapshot: function getSnapshot() {
        var ap = autopilotState;
        var wp;
        if (ap.state === "inactive" || ap.waypoints.length === 0) {
          return { state: "inactive", segmentIndex: 0, segmentCount: 0, segmentType: null };
        }
        wp = ap.waypoints[Math.min(ap.waypointIndex, ap.waypoints.length - 1)];
        return {
          state:        ap.state,
          segmentIndex: wp.segmentIndex,
          segmentCount: wp.totalSegments,
          segmentType:  wp.segmentType
        };
      }
    };

    return activeAutopilotDomain;
  }

  app.registerModule("domains", "autopilot", {
    createAutopilotDomain: createAutopilotDomain,
    getActiveDomain: function getActiveDomain() {
      return activeAutopilotDomain;
    }
  });

})(window);
