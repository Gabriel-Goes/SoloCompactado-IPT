(function (global) {
  var app = global.SoloCompactado;
  var STORAGE_KEY = "solo-compactado:mission";
  var STORAGE_KEY_DATASET_VERSION = "solo-compactado:dataset-version";
  var STORAGE_SCHEMA_VERSION = "architecture-v1";

  function detectStorageAvailability() {
    try {
      var probe = "__solo_compactado_probe__";
      global.localStorage.setItem(probe, "1");
      global.localStorage.removeItem(probe);
      return { available: true, error: null };
    } catch (_error) {
      return { available: false, error: "localStorage indisponivel" };
    }
  }

  function restoreMissionFromStorage() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { mission: null, error: null };
      }

      return { mission: JSON.parse(raw), error: null };
    } catch (_error) {
      return { mission: null, error: "Falha ao restaurar a missao persistida." };
    }
  }

  function persistMissionToStorage(mission) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(mission));
      global.localStorage.setItem(STORAGE_KEY_DATASET_VERSION, mission.dataset_version);
      return { available: true, error: null };
    } catch (_error) {
      return { available: false, error: "Falha ao persistir a missao." };
    }
  }

  function clearMissionFromStorage() {
    try {
      global.localStorage.removeItem(STORAGE_KEY);
      global.localStorage.removeItem(STORAGE_KEY_DATASET_VERSION);
      return { error: null };
    } catch (_error) {
      return { error: "Falha ao limpar a missao persistida." };
    }
  }

  function isMissionCompatible(mission, datasetVersion, sourceRef) {
    if (!mission) {
      return { compatible: false, reason: "Nenhuma missao persistida encontrada." };
    }

    if (mission.storage_schema_version !== STORAGE_SCHEMA_VERSION) {
      return {
        compatible: false,
        reason: "Missao anterior ignorada por incompatibilidade com a nova arquitetura."
      };
    }

    if (mission.dataset_version !== datasetVersion) {
      return {
        compatible: false,
        reason: "Missao anterior ignorada por incompatibilidade com dataset_version atual."
      };
    }

    if (!mission.terrain_grid_meta || mission.terrain_grid_meta.source_ref !== sourceRef) {
      return {
        compatible: false,
        reason: "Missao anterior ignorada por origem de dataset incompatível com a nova arquitetura."
      };
    }

    return { compatible: true, reason: null };
  }

  app.registerModule("core", "storage", {
    isStorageAvailable: function isStorageAvailable() {
      return detectStorageAvailability();
    },
    restoreMission: function restoreMission() {
      return restoreMissionFromStorage();
    },
    persistMission: function persistMission(mission) {
      return persistMissionToStorage(mission);
    },
    clearMission: function clearMission() {
      return clearMissionFromStorage();
    },
    isMissionCompatible: function isMissionCompatibleWrapper(mission, datasetVersion, sourceRef) {
      return isMissionCompatible(mission, datasetVersion, sourceRef);
    },
    getStorageSchemaVersion: function getStorageSchemaVersion() {
      return STORAGE_SCHEMA_VERSION;
    }
  });
})(window);
