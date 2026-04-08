(function (global) {
  var app = global.SoloCompactado;
  var activePlannerDomain = null;

  function clearPlannerLayers(layers) {
    layers.draftVertices.clearLayers();
    layers.fieldPolygon.clearLayers();
    layers.headland.clearLayers();
    layers.swaths.clearLayers();
    layers.baselineRoute.clearLayers();
    layers.optimizedRoute.clearLayers();
    layers.originMarker.clearLayers();
  }

  function getPlannerSwathCollection(plannerState) {
    if (plannerState.coverage_plan && Array.isArray(plannerState.coverage_plan.swaths)) {
      return plannerState.coverage_plan.swaths;
    }
    if (plannerState.coverage_preview && Array.isArray(plannerState.coverage_preview.swaths)) {
      return plannerState.coverage_preview.swaths;
    }
    return [];
  }

  function getPlannerHeadlandGeometry(plannerState) {
    if (plannerState.coverage_plan && plannerState.coverage_plan.headland) {
      return plannerState.coverage_plan.headland;
    }
    if (plannerState.coverage_preview && plannerState.coverage_preview.headland) {
      return plannerState.coverage_preview.headland;
    }
    return null;
  }

  function drawPlannerRouteSegment(layer, polylineLatLng, style) {
    if (!Array.isArray(polylineLatLng) || polylineLatLng.length < 2) {
      return;
    }

    global.L.polyline(polylineLatLng, {
      color: style.color,
      weight: style.weight,
      opacity: style.opacity,
      dashArray: style.dashArray || null,
      lineCap: style.lineCap || "round",
      lineJoin: style.lineJoin || "round",
      interactive: false,
      pane: "plannerPane"
    }).addTo(layer);
  }

  function drawPlannerActiveRoute(layer, route, innerColor) {
    if (!route || !Array.isArray(route.segments)) {
      return;
    }

    route.segments.forEach(function (segment) {
      var isTransition;
      if (!Array.isArray(segment.polyline_latlng) || segment.polyline_latlng.length < 2) {
        return;
      }

      isTransition = segment.type !== "swath";
      drawPlannerRouteSegment(layer, segment.polyline_latlng, {
        color: "#f7f7f7",
        weight: isTransition ? 6.5 : 7.5,
        opacity: 0.95,
        dashArray: isTransition ? "12 8" : null
      });
      drawPlannerRouteSegment(layer, segment.polyline_latlng, {
        color: innerColor,
        weight: isTransition ? 2.6 : 3.8,
        opacity: 0.98,
        dashArray: isTransition ? "12 8" : null
      });
    });
  }

  function drawPlannerGhostRoute(layer, route, color) {
    if (!route || !Array.isArray(route.segments)) {
      return;
    }

    route.segments.forEach(function (segment) {
      var isTransition;
      if (!Array.isArray(segment.polyline_latlng) || segment.polyline_latlng.length < 2) {
        return;
      }

      isTransition = segment.type !== "swath";
      drawPlannerRouteSegment(layer, segment.polyline_latlng, {
        color: color,
        weight: isTransition ? 1.4 : 1.8,
        opacity: 0.32,
        dashArray: isTransition ? "7 7" : "5 9"
      });
    });
  }

  function createPlannerDomain(config) {
    var runtime = config.runtime;
    var mapDomain = config.mapDomain;
    var map = mapDomain.getMap();
    var layers = mapDomain.getPlannerLayers();

    function renderOverlay() {
      var plannerState = runtime.coveragePlanner;
      var headlandGeometry;

      mapDomain.syncImageryVisualState();
      clearPlannerLayers(layers);

      if (plannerState.field_polygon && Array.isArray(plannerState.field_polygon.vertices_latlng)) {
        global.L.polygon(plannerState.field_polygon.vertices_latlng, {
          color: "#ffd166",
          weight: 1.5,
          fillColor: "#ffd166",
          fillOpacity: 0.08,
          interactive: false,
          pane: "plannerPane"
        }).addTo(layers.fieldPolygon);
      }

      headlandGeometry = getPlannerHeadlandGeometry(plannerState);
      if (headlandGeometry) {
        if (headlandGeometry.render_mode === "band" && headlandGeometry.inner_ring_latlng) {
          global.L.polygon(
            [headlandGeometry.outer_ring_latlng, headlandGeometry.inner_ring_latlng],
            {
              color: "#ffb347",
              weight: 1.2,
              fillColor: "#ffb347",
              fillOpacity: 0.12,
              interactive: false,
              pane: "plannerPane"
            }
          ).addTo(layers.headland);
          global.L.polyline(headlandGeometry.inner_ring_latlng.concat([headlandGeometry.inner_ring_latlng[0]]), {
            color: "#ffb347",
            weight: 1.2,
            opacity: 0.45,
            dashArray: "8 7",
            interactive: false,
            pane: "plannerPane"
          }).addTo(layers.headland);
        } else {
          global.L.polyline(headlandGeometry.outer_ring_latlng.concat([headlandGeometry.outer_ring_latlng[0]]), {
            color: "#ffb347",
            weight: 8,
            opacity: 0.32,
            interactive: false,
            pane: "plannerPane"
          }).addTo(layers.headland);
        }
      }

      getPlannerSwathCollection(plannerState).forEach(function (swath) {
        global.L.polyline([swath.start_latlng, swath.end_latlng], {
          color: "#9cd9f7",
          weight: 1.2,
          opacity: 0.34,
          interactive: false,
          pane: "plannerPane"
        }).addTo(layers.swaths);
      });

      if (plannerState.coverage_plan) {
        var plan = plannerState.coverage_plan;
        var overlayMode = plannerState.overlay_mode;
        var plannerViewMode = plannerState.view.mode;
        var activeRouteKey = overlayMode === "baseline" ? "baseline_route" : "optimized_route";
        var secondaryRouteKey = activeRouteKey === "baseline_route" ? "optimized_route" : "baseline_route";
        var activeLayer = activeRouteKey === "baseline_route" ? layers.baselineRoute : layers.optimizedRoute;
        var secondaryLayer = secondaryRouteKey === "baseline_route" ? layers.baselineRoute : layers.optimizedRoute;
        var activeInnerColor = activeRouteKey === "baseline_route" ? "#2f4858" : "#ef8c1e";
        var secondaryColor = secondaryRouteKey === "baseline_route" ? "#5f6b76" : "#c9832b";

        global.L.circleMarker(plan.origin_latlng, {
          radius: 12,
          color: "#f7f7f7",
          weight: 0,
          fillColor: "#f7f7f7",
          fillOpacity: 0.72,
          interactive: false,
          pane: "plannerPane"
        }).addTo(layers.originMarker);
        global.L.circleMarker(plan.origin_latlng, {
          radius: 7,
          color: "#06d6a0",
          weight: 2,
          fillColor: "#06d6a0",
          fillOpacity: 0.9,
          interactive: false,
          pane: "plannerPane"
        }).addTo(layers.originMarker);

        drawPlannerActiveRoute(activeLayer, plan[activeRouteKey], activeInnerColor);
        if (plannerViewMode === "planner") {
          drawPlannerGhostRoute(secondaryLayer, plan[secondaryRouteKey], secondaryColor);
        }
      }

      if (plannerState.mode !== "drawing" || !plannerState.draft_vertices.length) {
        return;
      }

      plannerState.draft_vertices.forEach(function (vertex) {
        global.L.circleMarker(vertex, {
          radius: 5,
          color: "#ffd166",
          weight: 2,
          fillColor: "#ffd166",
          fillOpacity: 0.9,
          interactive: false,
          pane: "plannerPane"
        }).addTo(layers.draftVertices);
      });

      if (plannerState.draft_vertices.length > 1) {
        global.L.polyline(plannerState.draft_vertices, {
          color: "#ffd166",
          weight: 2,
          dashArray: "6 6",
          interactive: false,
          pane: "plannerPane"
        }).addTo(layers.draftVertices);
      }
    }

    function clearPlan() {
      config.clearCoveragePlanArtifacts();
      config.clearCoveragePreviewArtifacts();
      runtime.coveragePlanner.mode = runtime.coveragePlanner.field_polygon ? "polygon-ready" : "idle";
      runtime.coveragePlanner.status_message = runtime.coveragePlanner.field_polygon
        ? "Plano descartado. Talhao preservado para nova geracao."
        : "Plano descartado.";
      renderOverlay();
      config.renderHud();
    }

    function generatePlan() {
      if (!runtime.coveragePlanner.field_polygon) {
        runtime.coveragePlanner.status_message = "Desenhe e feche um talhao valido antes de gerar o plano.";
        config.renderHud();
        return;
      }

      try {
        runtime.coveragePlanner.coverage_plan = config.buildCoveragePlan(
          runtime.coveragePlanner.field_polygon,
          runtime.coveragePlanner.working_width_m
        );
        runtime.coveragePlanner.mode = "planned";
        runtime.coveragePlanner.status_message =
          "Plano gerado. Baseline e rota otimizada prontas para comparacao.";
      } catch (error) {
        console.error("[generateCoveragePlan]", error);
        runtime.coveragePlanner.status_message = error.message;
      }

      renderOverlay();
      config.renderHud();
    }

    function setOverlayMode(mode) {
      runtime.coveragePlanner.overlay_mode = mode === "baseline" ? "baseline" : "optimized";
      renderOverlay();
      config.renderHud();
    }

    function setZoom(directionOrValue) {
      var plannerView = runtime.coveragePlanner.view;
      var minZoom = plannerView.imagery_native_zoom - 1;
      var maxZoom = plannerView.visual_max_zoom;
      var step = 0.25;
      var currentZoom = plannerView.mode === "planner" ? plannerView.planner_zoom : plannerView.follow_zoom;
      var targetZoom;
      var nextZoom;

      if (directionOrValue === "in") {
        targetZoom = currentZoom + step;
      } else if (directionOrValue === "out") {
        targetZoom = currentZoom - step;
      } else if (typeof directionOrValue === "number" && Number.isFinite(directionOrValue)) {
        targetZoom = directionOrValue;
      } else {
        return;
      }

      nextZoom = config.clamp(Math.round(targetZoom / step) * step, minZoom, maxZoom);
      if (Math.abs(nextZoom - currentZoom) <= 1e-9) {
        return;
      }

      if (plannerView.mode === "planner") {
        plannerView.planner_zoom = nextZoom;
      } else {
        plannerView.follow_zoom = nextZoom;
      }

      map.setZoom(nextZoom, { animate: false });
    }

    function getBounds() {
      var plannerState = runtime.coveragePlanner;
      var targetPolygon =
        plannerState.coverage_plan &&
        plannerState.coverage_plan.field_polygon &&
        Array.isArray(plannerState.coverage_plan.field_polygon.vertices_latlng)
          ? plannerState.coverage_plan.field_polygon
          : plannerState.field_polygon &&
              Array.isArray(plannerState.field_polygon.vertices_latlng)
            ? plannerState.field_polygon
            : null;

      if (!targetPolygon || targetPolygon.vertices_latlng.length < 3) {
        return null;
      }

      return global.L.latLngBounds(targetPolygon.vertices_latlng);
    }

    function fitBounds() {
      var bounds = getBounds();

      if (!bounds) {
        runtime.coveragePlanner.status_message =
          "Nao ha talhao ou plano valido para enquadrar.";
        config.renderHud();
        return;
      }

      mapDomain.fitPlannerBounds(bounds);
      config.renderHud();
    }

    function setViewMode(mode) {
      var plannerState = runtime.coveragePlanner;
      var plannerView = plannerState.view;
      var nextMode = mode === "planner" ? "planner" : "follow";
      var currentZoom = map.getZoom();

      if (nextMode === "planner" && !plannerState.field_polygon && !plannerState.coverage_plan) {
        plannerState.status_message =
          "Desenhe um talhao ou gere um plano antes de entrar no modo planner.";
        config.renderHud();
        return;
      }

      if (plannerView.mode === nextMode) {
        return;
      }

      if (nextMode === "planner") {
        plannerView.planner_zoom = currentZoom;
        plannerView.mode = "planner";
        plannerState.status_message = "Modo planner ativo. Pan e zoom manuais liberados.";
        mapDomain.updateInteractionPolicy();
        map.setZoom(plannerView.planner_zoom, { animate: false });
      } else {
        plannerView.follow_zoom = currentZoom;
        plannerView.mode = "follow";
        plannerState.status_message = plannerState.coverage_plan
          ? "Modo follow ativo. Camera acompanhando o trator."
          : plannerState.field_polygon
            ? "Modo follow ativo. Talhao preservado."
            : "Modo follow ativo.";
        mapDomain.updateInteractionPolicy();
        mapDomain.setCameraPosition(config.tractorState.position);
      }

      renderOverlay();
      config.renderHud();
    }

    function setWorkingWidth(value) {
      var parsed = parseFloat(value);
      var rounded;

      if (!Number.isFinite(parsed) || parsed <= 0) {
        runtime.coveragePlanner.status_message =
          "Working width invalida. Informe um valor numerico positivo.";
        config.renderHud();
        return;
      }

      rounded = Math.round(parsed * 10) / 10;
      if (Math.abs(rounded - runtime.coveragePlanner.working_width_m) < 1e-6) {
        return;
      }

      runtime.coveragePlanner.working_width_m = rounded;
      config.clearCoveragePlanArtifacts();
      config.clearCoveragePreviewArtifacts();
      runtime.coveragePlanner.mode = config.inferStablePlannerMode();

      if (runtime.coveragePlanner.field_polygon) {
        try {
          runtime.coveragePlanner.coverage_preview = config.buildCoveragePreview(
            runtime.coveragePlanner.field_polygon,
            rounded
          );
          runtime.coveragePlanner.status_message =
            "Working width alterada. Preview recalculado. Gere um novo plano.";
        } catch (previewError) {
          config.clearCoveragePreviewArtifacts();
          runtime.coveragePlanner.status_message = previewError.message;
        }
      } else {
        runtime.coveragePlanner.status_message =
          "Working width alterada. Desenhe um talhao para gerar o plano.";
      }

      renderOverlay();
      config.renderHud();
    }

    function startDrawing() {
      if (!runtime.datasetReady) {
        runtime.coveragePlanner.status_message = "Dataset indisponivel para iniciar o desenho.";
        config.renderHud();
        return;
      }

      config.clearDriveInputs();
      config.tractorState.speedMps = 0;
      runtime.coveragePlanner.mode = "drawing";
      runtime.coveragePlanner.paused_tractor = true;
      runtime.coveragePlanner.draft_vertices = [];
      runtime.coveragePlanner.status_message = "Clique no mapa para adicionar vertices ao talhao.";
      mapDomain.updateInteractionPolicy();
      renderOverlay();
      config.renderHud();
    }

    function finishDrawing() {
      var fieldPolygon;

      if (runtime.coveragePlanner.mode !== "drawing") {
        return;
      }

      try {
        fieldPolygon = config.buildFieldPolygon(
          runtime.coveragePlanner.draft_vertices,
          runtime.coveragePlanner.working_width_m
        );
        runtime.coveragePlanner.field_polygon = fieldPolygon;
        runtime.coveragePlanner.draft_vertices = [];
        config.clearCoveragePlanArtifacts();
        runtime.coveragePlanner.mode = "polygon-ready";
        runtime.coveragePlanner.paused_tractor = false;
        try {
          runtime.coveragePlanner.coverage_preview = config.buildCoveragePreview(
            fieldPolygon,
            runtime.coveragePlanner.working_width_m
          );
          runtime.coveragePlanner.status_message =
            "Talhao valido. Headland e swaths gerados para o preview do planner.";
        } catch (previewError) {
          console.error("[finishFieldDrawing/preview]", previewError);
          config.clearCoveragePreviewArtifacts();
          runtime.coveragePlanner.status_message = previewError.message;
        }
      } catch (error) {
        console.error("[finishFieldDrawing]", error);
        runtime.coveragePlanner.status_message = error.message;
      }

      mapDomain.updateInteractionPolicy();
      renderOverlay();
      config.renderHud();
    }

    function cancelDrawing() {
      if (runtime.coveragePlanner.mode !== "drawing") {
        return;
      }

      runtime.coveragePlanner.draft_vertices = [];
      runtime.coveragePlanner.mode = config.inferStablePlannerMode();
      runtime.coveragePlanner.paused_tractor = false;
      runtime.coveragePlanner.status_message = runtime.coveragePlanner.field_polygon
        ? "Rascunho descartado. Talhao anterior preservado."
        : "Desenho cancelado.";
      mapDomain.updateInteractionPolicy();
      renderOverlay();
      config.renderHud();
    }

    function addDraftVertex(latlng) {
      if (runtime.coveragePlanner.mode !== "drawing") {
        return;
      }

      runtime.coveragePlanner.draft_vertices = runtime.coveragePlanner.draft_vertices.concat({
        lat: latlng.lat,
        lng: latlng.lng
      });
      runtime.coveragePlanner.status_message =
        "Vertice " +
        runtime.coveragePlanner.draft_vertices.length +
        " registrado. Continue clicando ou feche o talhao.";
      renderOverlay();
      config.renderHud();
    }

    activePlannerDomain = {
      clearPlan: clearPlan,
      generatePlan: generatePlan,
      setOverlayMode: setOverlayMode,
      setZoom: setZoom,
      fitBounds: fitBounds,
      setViewMode: setViewMode,
      setWorkingWidth: setWorkingWidth,
      startDrawing: startDrawing,
      finishDrawing: finishDrawing,
      cancelDrawing: cancelDrawing,
      addDraftVertex: addDraftVertex,
      renderOverlay: renderOverlay,
      isDrawingActive: function isDrawingActive() {
        return runtime.coveragePlanner.mode === "drawing";
      }
    };

    return activePlannerDomain;
  }

  app.registerModule("domains", "planner", {
    createPlannerDomain: createPlannerDomain,
    isDrawingActive: function isDrawingActive() {
      return activePlannerDomain ? activePlannerDomain.isDrawingActive() : false;
    }
  });
})(window);
