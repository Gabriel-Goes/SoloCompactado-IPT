(function (global) {
  var app = global.SoloCompactado;
  var activeMissionDomain = null;

  function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createMission(params) {
    var now = new Date().toISOString();

    return {
      storage_schema_version: params.storageSchemaVersion,
      mission_id: params.createId("mission"),
      started_at: now,
      updated_at: now,
      farm_id: params.terrainManifest.farmId,
      dataset_version: params.terrainManifest.datasetVersion,
      active_tractor_config: params.getActiveTractorConfig(),
      terrain_manifest: params.terrainManifest,
      terrain_grid_meta: {
        cell_size_meters: params.terrainGrid.cellSizeMeters,
        bounds: params.terrainGrid.bounds,
        source_ref: params.terrainGridSourceRef
      },
      current_cell_id: null,
      samples: [],
      counters: {
        sample_count: 0
      },
      compaction_accumulator: {},
      sampling: {
        last_sample_at_ms: 0,
        last_sample_cell_id: null,
        last_logical_key: null
      }
    };
  }

  function restoreOrCreateMission(params) {
    var restored = params.storage.restoreMission();
    var persisted = restored.mission;
    var compatibility;

    if (restored.error) {
      return {
        mission: createMission(params),
        latestSample: null,
        storageError: restored.error,
        shouldPersist: true
      };
    }

    if (!persisted) {
      return {
        mission: createMission(params),
        latestSample: null,
        storageError: null,
        shouldPersist: true
      };
    }

    compatibility = params.storage.isMissionCompatible(
      persisted,
      params.terrainManifest.datasetVersion,
      params.terrainGridSourceRef
    );

    if (!compatibility.compatible) {
      return {
        mission: createMission(params),
        latestSample: null,
        storageError: compatibility.reason,
        shouldPersist: true
      };
    }

    if (!persisted.compaction_accumulator) {
      persisted.compaction_accumulator = {};
    }

    return {
      mission: persisted,
      latestSample:
        persisted.samples && persisted.samples.length > 0
          ? persisted.samples[persisted.samples.length - 1]
          : null,
      storageError: null,
      shouldPersist: false
    };
  }

  function createMissionDomain(config) {
    var runtime = config.runtime;

    function detectStorageAvailability() {
      var result = config.storage.isStorageAvailable();
      runtime.storageAvailable = result.available;
      runtime.storageError = result.error;
    }

    function persistMission() {
      var result;

      if (!runtime.mission) {
        return;
      }

      runtime.mission.active_tractor_config = config.getActiveTractorConfig();
      runtime.mission.updated_at = new Date().toISOString();

      if (!runtime.storageAvailable) {
        return;
      }

      result = config.storage.persistMission(runtime.mission);
      runtime.storageAvailable = result.available;
      runtime.storageError = result.error;
    }

    function clearPersistedMission() {
      var result;

      if (!runtime.storageAvailable) {
        return;
      }

      result = config.storage.clearMission();
      runtime.storageError = result.error;
    }

    function restoreMissionState() {
      var resolution = restoreOrCreateMission({
        createId: config.createId,
        storage: config.storage,
        storageSchemaVersion: config.storage.getStorageSchemaVersion(),
        terrainManifest: runtime.terrainManifest,
        terrainGrid: runtime.terrainGrid,
        terrainGridSourceRef: config.terrainModule.getTerrainGridSourceRef(),
        getActiveTractorConfig: config.getActiveTractorConfig
      });

      runtime.mission = resolution.mission;
      runtime.latestSample = resolution.latestSample;
      runtime.storageError = resolution.storageError;

      if (resolution.shouldPersist) {
        persistMission();
      }
    }

    function updateCompactionAccumulator(cellId, profile) {
      var accumulator;

      if (!runtime.mission || !cellId || !profile || !Array.isArray(profile)) {
        return;
      }

      accumulator =
        runtime.mission.compaction_accumulator ||
        (runtime.mission.compaction_accumulator = {});

      if (!accumulator[cellId]) {
        accumulator[cellId] = {
          pass_count: 0,
          layers: profile.map(function (layer) {
            return {
              depth_range: layer.depth_range,
              bulk_density_estimated:
                layer.bulk_density === null || layer.bulk_density === undefined
                  ? null
                  : layer.bulk_density,
              pass_count: 0
            };
          })
        };
      }

      accumulator[cellId].pass_count += 1;
      profile.forEach(function (layer, index) {
        var accumulatorLayer = accumulator[cellId].layers[index];

        if (!accumulatorLayer) {
          return;
        }

        if (
          layer.delta_bulk_density === null ||
          layer.delta_bulk_density === undefined ||
          layer.bulk_density === null ||
          layer.bulk_density === undefined
        ) {
          return;
        }

        if (
          accumulatorLayer.bulk_density_estimated === null ||
          accumulatorLayer.bulk_density_estimated === undefined
        ) {
          accumulatorLayer.bulk_density_estimated = layer.bulk_density;
        }

        accumulatorLayer.bulk_density_estimated = Number(
          (accumulatorLayer.bulk_density_estimated + layer.delta_bulk_density).toFixed(4)
        );
        accumulatorLayer.pass_count = accumulator[cellId].pass_count;
      });
    }

    function appendSample(sample) {
      runtime.mission.samples.push(sample);
      runtime.mission.counters.sample_count = runtime.mission.samples.length;
      runtime.mission.updated_at = sample.timestamp;
      runtime.mission.current_cell_id = sample.cell_id;
      runtime.mission.sampling.last_sample_cell_id = sample.cell_id;
      runtime.latestSample = sample;
      if (sample.compaction_snapshot) {
        updateCompactionAccumulator(sample.cell_id, sample.compaction_snapshot);
      }
      persistMission();
    }

    function createSample(reason, currentCell, currentTerrainPixel, logicalNowMs) {
      var tractorSnapshot = config.tractorDomain.getSnapshot();

      return {
        sample_id: config.createId("sample"),
        timestamp: new Date().toISOString(),
        mission_id: runtime.mission.mission_id,
        tractor_position: {
          lat: Number(tractorSnapshot.position.lat.toFixed(6)),
          lng: Number(tractorSnapshot.position.lng.toFixed(6))
        },
        heading: Number(tractorSnapshot.headingDeg.toFixed(2)),
        speed: Number(tractorSnapshot.speedMps.toFixed(2)),
        cell_id: currentCell.cellId,
        sampling_reason: reason,
        terrain_snapshot: currentTerrainPixel
          ? currentTerrainPixel.snapshot
          : config.terrainModule.buildTerrainSnapshot(currentCell),
        compaction_snapshot: runtime.currentCompactionProfile
          ? cloneValue(runtime.currentCompactionProfile)
          : null,
        tractor_snapshot: config.getActiveTractorConfig(),
        logical_time_ms: logicalNowMs
      };
    }

    function updateSampling(_deltaMs, timestamp) {
      var activeTractorConfig;
      var currentTerrainSnapshot;
      var moving;
      var samplingState;
      var sampleReason = null;
      var currentCellId;
      var logicalKey;
      var sample;

      if (!runtime.datasetReady || !runtime.mission) {
        return;
      }

      activeTractorConfig = config.getActiveTractorConfig();
      runtime.currentCell = config.terrainModule.resolveCell(
        config.tractorState.position,
        runtime.terrainGrid
      );
      runtime.currentTerrainPixel = config.terrainModule.resolveTerrainPixel(
        config.tractorState.position,
        runtime.terrainRaster
      );
      currentTerrainSnapshot = config.getCurrentTerrainSnapshot();
      runtime.currentCompactionProfile = currentTerrainSnapshot
        ? config.compactionModule.runCompaction(activeTractorConfig, currentTerrainSnapshot)
        : null;
      runtime.mission.current_cell_id = runtime.currentCell ? runtime.currentCell.cellId : null;
      runtime.mission.active_tractor_config = activeTractorConfig;

      if (runtime.coveragePlanner.paused_tractor) {
        return;
      }

      if (!runtime.currentCell) {
        return;
      }

      moving = config.tractorState.speedMps > 0;
      samplingState = runtime.mission.sampling;
      currentCellId = runtime.currentCell.cellId;

      if (moving && samplingState.last_sample_cell_id !== currentCellId) {
        sampleReason = "cell-change";
      } else if (
        moving &&
        samplingState.last_sample_cell_id === currentCellId &&
        timestamp - samplingState.last_sample_at_ms >= config.sampleIntervalMs
      ) {
        sampleReason = "time-tick";
      }

      if (!sampleReason) {
        return;
      }

      logicalKey =
        sampleReason + ":" + currentCellId + ":" + Math.floor(timestamp / config.sampleIntervalMs);
      if (samplingState.last_logical_key === logicalKey) {
        return;
      }

      sample = createSample(
        sampleReason,
        runtime.currentCell,
        runtime.currentTerrainPixel,
        timestamp
      );
      samplingState.last_sample_at_ms = timestamp;
      samplingState.last_logical_key = logicalKey;
      appendSample(sample);
    }

    function buildMissionExport() {
      return {
        mission: {
          mission_id: runtime.mission.mission_id,
          started_at: runtime.mission.started_at,
          updated_at: runtime.mission.updated_at,
          farm_id: runtime.mission.farm_id,
          dataset_version: runtime.mission.dataset_version,
          counters: runtime.mission.counters,
          current_cell_id: runtime.mission.current_cell_id
        },
        terrain_manifest: runtime.terrainManifest,
        terrain_grid_meta: runtime.mission.terrain_grid_meta,
        active_tractor_config: runtime.mission.active_tractor_config,
        samples: runtime.mission.samples,
        compaction_accumulator: runtime.mission.compaction_accumulator,
        compaction_profile_current: runtime.currentCompactionProfile
      };
    }

    function exportMission() {
      var payload;
      var blob;
      var url;
      var link;

      if (!runtime.mission) {
        config.setMissionStatus("warning", "Sem missao");
        config.setMissionMessage("Nao ha missao ativa para exportar.");
        return;
      }

      try {
        payload = buildMissionExport();
        blob = new global.Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json"
        });
        url = global.URL.createObjectURL(blob);
        link = document.createElement("a");
        link.href = url;
        link.download = "missao-" + runtime.mission.mission_id + ".json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        global.URL.revokeObjectURL(url);
        config.pushUiMessage("Exportacao concluida com sucesso.", 2500);
      } catch (_error) {
        config.setMissionStatus("error", "Falha ao exportar");
        config.pushUiMessage("Nao foi possivel exportar o JSON da missao.", 3000);
      }
    }

    function resetMission() {
      var currentTerrainSnapshot;

      if (
        !runtime.datasetReady ||
        !runtime.terrainManifest ||
        !runtime.terrainGrid ||
        !runtime.terrainRaster
      ) {
        config.setMissionStatus("error", "Sem dataset");
        config.setMissionMessage("Nao e possivel reiniciar a missao sem dataset valido.");
        return;
      }

      clearPersistedMission();
      runtime.latestSample = null;
      runtime.currentCell = config.terrainModule.resolveCell(
        config.tractorState.position,
        runtime.terrainGrid
      );
      runtime.currentTerrainPixel = config.terrainModule.resolveTerrainPixel(
        config.tractorState.position,
        runtime.terrainRaster
      );
      currentTerrainSnapshot = config.getCurrentTerrainSnapshot();
      runtime.currentCompactionProfile = currentTerrainSnapshot
        ? config.compactionModule.runCompaction(config.getActiveTractorConfig(), currentTerrainSnapshot)
        : null;
      runtime.mission = createMission({
        createId: config.createId,
        storageSchemaVersion: config.storage.getStorageSchemaVersion(),
        terrainManifest: runtime.terrainManifest,
        terrainGrid: runtime.terrainGrid,
        terrainGridSourceRef: config.terrainModule.getTerrainGridSourceRef(),
        getActiveTractorConfig: config.getActiveTractorConfig
      });
      runtime.mission.current_cell_id = runtime.currentCell ? runtime.currentCell.cellId : null;
      persistMission();
      config.clearCoveragePlan();
      config.pushUiMessage("Sessao local reiniciada.", 2500);
    }

    activeMissionDomain = {
      detectStorageAvailability: detectStorageAvailability,
      persistMission: persistMission,
      clearPersistedMission: clearPersistedMission,
      restoreOrCreateMission: restoreMissionState,
      updateSampling: updateSampling,
      buildMissionExport: buildMissionExport,
      exportMission: exportMission,
      resetMission: resetMission,
      getMissionView: function getMissionView() {
        return runtime.mission;
      }
    };

    return activeMissionDomain;
  }

  app.registerModule("domains", "mission", {
    createMissionDomain: createMissionDomain,
    createMission: function createMissionWrapper(params) {
      return createMission(params);
    },
    restoreOrCreateMission: function restoreOrCreateMissionWrapper(params) {
      return restoreOrCreateMission(params);
    },
    getActiveDomain: function getActiveDomain() {
      return activeMissionDomain;
    }
  });
})(window);
