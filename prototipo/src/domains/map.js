(function (global) {
  var app = global.SoloCompactado;
  var BDC_THEMATIC_COLORS = {
    vegetation_dense: { color: "#2d7d2d", fillOpacity: 0.55 },
    vegetation_sparse: { color: "#92c736", fillOpacity: 0.55 },
    bare_soil: { color: "#c89a2e", fillOpacity: 0.55 },
    water: { color: "#2684c8", fillOpacity: 0.55 },
    _invalid: { color: "#888888", fillOpacity: 0.35 }
  };

  function hexToRgb(hex) {
    var normalized = hex.replace("#", "");
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16)
    };
  }

  function buildBdcOverlay(raster) {
    var canvas = document.createElement("canvas");
    var context;
    var imageData;
    var index;

    canvas.width = raster.width;
    canvas.height = raster.height;
    context = canvas.getContext("2d");
    imageData = context.createImageData(raster.width, raster.height);

    for (index = 0; index < raster.classCodes.length; index += 1) {
      var code = raster.classCodes[index];
      var thematic = code === 1 ? "vegetation_dense" : code === 2 ? "vegetation_sparse" : code === 3 ? "bare_soil" : code === 4 ? "water" : "_invalid";
      var style = BDC_THEMATIC_COLORS[thematic] || BDC_THEMATIC_COLORS._invalid;
      var rgb = hexToRgb(style.color);
      var pixelIndex = index * 4;
      imageData.data[pixelIndex] = rgb.r;
      imageData.data[pixelIndex + 1] = rgb.g;
      imageData.data[pixelIndex + 2] = rgb.b;
      imageData.data[pixelIndex + 3] = Math.round(style.fillOpacity * 255);
    }

    context.putImageData(imageData, 0, 0);
    return global.L.imageOverlay(
      canvas.toDataURL("image/png"),
      [[raster.bounds.south, raster.bounds.west], [raster.bounds.north, raster.bounds.east]],
      { interactive: false, opacity: 1 }
    );
  }

  function createMapDomain(config) {
    var runtime = config.runtime;
    var plannerView = runtime.coveragePlanner.view;
    var map = global.L.map("map", {
      center: [config.farmCenter.lat, config.farmCenter.lng],
      zoom: plannerView.follow_zoom,
      zoomControl: false,
      attributionControl: false,
      maxZoom: plannerView.visual_max_zoom,
      zoomSnap: 0.25,
      zoomDelta: 0.25,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
      touchZoom: false
    });
    var imageryBaseLayer = global.L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: plannerView.visual_max_zoom,
        maxNativeZoom: plannerView.imagery_native_zoom
      }
    );
    var bdcOverlayLayer = null;
    var plannerOverlayLayer;
    var plannerLayers;
    var domain;

    imageryBaseLayer.addTo(map);
    map.createPane("plannerPane");
    map.getPane("plannerPane").style.zIndex = 450;
    plannerOverlayLayer = global.L.layerGroup().addTo(map);
    plannerLayers = {
      draftVertices: global.L.layerGroup(),
      fieldPolygon: global.L.layerGroup(),
      headland: global.L.layerGroup(),
      swaths: global.L.layerGroup(),
      baselineRoute: global.L.layerGroup(),
      optimizedRoute: global.L.layerGroup(),
      originMarker: global.L.layerGroup()
    };

    Object.keys(plannerLayers).forEach(function (key) {
      plannerOverlayLayer.addLayer(plannerLayers[key]);
    });

    function syncLegacyMapBaseUi() {
      var mapBase = runtime.coveragePlanner.view.map_base;
      var bdcActive = mapBase === "bdc";
      config.domRefs.toggleButton.textContent = bdcActive ? "Ver satelite" : "Ver dado BDC";
      config.domRefs.toggleButton.classList.toggle("bdc-active", bdcActive);
      config.domRefs.legend.classList.toggle("visible", bdcActive);
    }

    function syncImageryVisualState() {
      var plannerState;
      var imageryActive;
      var planActive;
      var plannerModeActive;

      if (!imageryBaseLayer) {
        return;
      }

      plannerState = runtime.coveragePlanner;
      imageryActive = plannerState.view.map_base === "imagery";
      planActive = Boolean(plannerState.coverage_plan);
      plannerModeActive = plannerState.view.mode === "planner";

      imageryBaseLayer.setOpacity(
        imageryActive && planActive
          ? plannerModeActive
            ? 0.72
            : 0.78
          : 1
      );
    }

    function setMapBase(mode) {
      var nextMode = mode === "bdc" ? "bdc" : "imagery";
      var raster = runtime.terrainRaster;

      if (nextMode === "bdc" && (!raster || !raster.classCodes || !raster.classCodes.length)) {
        config.pushUiMessage("Camada BDC indisponivel ate o carregamento do dataset.", 2200);
        config.renderHud();
        return;
      }

      if (nextMode === "bdc") {
        if (!bdcOverlayLayer && raster) {
          bdcOverlayLayer = buildBdcOverlay(raster);
        }
        if (imageryBaseLayer && map.hasLayer(imageryBaseLayer)) {
          map.removeLayer(imageryBaseLayer);
        }
        if (bdcOverlayLayer && !map.hasLayer(bdcOverlayLayer)) {
          bdcOverlayLayer.addTo(map);
        }
      } else {
        if (bdcOverlayLayer && map.hasLayer(bdcOverlayLayer)) {
          map.removeLayer(bdcOverlayLayer);
        }
        if (imageryBaseLayer && !map.hasLayer(imageryBaseLayer)) {
          imageryBaseLayer.addTo(map);
        }
      }

      runtime.coveragePlanner.view.map_base = nextMode;
      syncLegacyMapBaseUi();
      syncImageryVisualState();
      config.renderHud();
    }

    function handleImageryTileError() {
      var plannerState = runtime.coveragePlanner;
      var plannerView = plannerState.view;
      var firstFailure = !plannerView.imagery_failed;
      var rasterReady;

      plannerView.imagery_failed = true;
      runtime.mapTileFailed = true;

      rasterReady = Boolean(
        runtime.terrainRaster &&
          runtime.terrainRaster.classCodes &&
          runtime.terrainRaster.classCodes.length
      );

      if (plannerView.map_base === "imagery" && rasterReady) {
        setMapBase("bdc");
        if (firstFailure) {
          plannerState.status_message =
            "Imagery indisponivel. Base BDC ativada automaticamente para manter a leitura do plano.";
          config.pushUiMessage("Falha na imagery. Fallback automatico para BDC ativado.", 3200);
          if (!runtime.datasetError) {
            config.setMissionStatus("warning", "Fallback para BDC");
          }
        }
        config.renderHud();
        return;
      }

      if (!firstFailure) {
        return;
      }

      plannerState.status_message =
        "Imagery indisponivel. O planner continua aberto, mas a base visual esta degradada.";
      config.pushUiMessage("Falha na imagery detectada.", 2800);
      if (!runtime.datasetError) {
        config.setMissionStatus("warning", "Mapa com falha");
      }
      config.showOperationalError(
        "Nao foi possivel carregar a camada Esri World Imagery. A demo permanece aberta para diagnostico."
      );
      config.renderHud();
    }

    function toggleMapBase() {
      setMapBase(runtime.coveragePlanner.view.map_base === "bdc" ? "imagery" : "bdc");
    }

    function setCameraPosition(position) {
      if (runtime.coveragePlanner.view.mode !== "follow") {
        return;
      }

      map.setView([position.lat, position.lng], runtime.coveragePlanner.view.follow_zoom, {
        animate: false,
        pan: { animate: false }
      });
    }

    function fitPlannerBounds(bounds) {
      var plannerView = runtime.coveragePlanner.view;
      var padding = plannerView.fit_padding_px;
      map.fitBounds(bounds, {
        animate: false,
        padding: [padding, padding],
        maxZoom: plannerView.visual_max_zoom
      });

      if (plannerView.mode === "planner") {
        plannerView.planner_zoom = map.getZoom();
      } else {
        plannerView.follow_zoom = map.getZoom();
      }
    }

    function updateInteractionPolicy() {
      var plannerState = runtime.coveragePlanner;
      var plannerModeActive = plannerState.view.mode === "planner" && plannerState.mode !== "drawing";

      if (plannerModeActive) {
        map.dragging.enable();
        map.scrollWheelZoom.enable();
        map.doubleClickZoom.enable();
        map.touchZoom.enable();
      } else {
        map.dragging.disable();
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.touchZoom.disable();
      }
    }

    function syncPlannerZoomFromMap() {
      var currentZoom = map.getZoom();
      if (runtime.coveragePlanner.view.mode === "planner") {
        runtime.coveragePlanner.view.planner_zoom = currentZoom;
      } else {
        runtime.coveragePlanner.view.follow_zoom = currentZoom;
      }
      config.renderHud();
    }

    imageryBaseLayer.on("tileerror", function () {
      handleImageryTileError();
    });

    domain = {
      getMap: function getMap() {
        return map;
      },
      getPlannerLayers: function getPlannerLayers() {
        return plannerLayers;
      },
      syncLegacyMapBaseUi: syncLegacyMapBaseUi,
      syncImageryVisualState: syncImageryVisualState,
      setMapBase: setMapBase,
      toggleMapBase: toggleMapBase,
      handleImageryTileError: handleImageryTileError,
      setCameraPosition: setCameraPosition,
      fitPlannerBounds: fitPlannerBounds,
      updateInteractionPolicy: updateInteractionPolicy,
      syncPlannerZoomFromMap: syncPlannerZoomFromMap,
      invalidateSize: function invalidateSize() {
        map.invalidateSize(false);
      }
    };

    return domain;
  }

  app.registerModule("domains", "map", {
    createMapDomain: createMapDomain
  });
})(window);
