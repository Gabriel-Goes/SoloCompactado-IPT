(function (global) {
  var existing = global.SoloCompactado || {};
  var modules = existing.modules || { core: {}, domains: {}, ui: {} };

  function ensureBucket(path) {
    var cursor = modules;
    for (var i = 0; i < path.length; i += 1) {
      var key = path[i];
      if (!cursor[key]) {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }
    return cursor;
  }

  function registerModule(layer, name, api) {
    if (!modules[layer]) {
      modules[layer] = {};
    }
    modules[layer][name] = api || {};
    return modules[layer][name];
  }

  function getModule(layer, name) {
    return modules[layer] && modules[layer][name] ? modules[layer][name] : null;
  }

  function bootstrapApp() {
    if (global.SoloCompactado.state.bootstrapped) {
      return global.SoloCompactado.state.appContext || global.SoloCompactado;
    }

    if (typeof global.SoloCompactado.bootstrapLegacyRuntime === "function") {
      global.SoloCompactado.state.appContext = global.SoloCompactado.bootstrapLegacyRuntime();
    } else {
      global.SoloCompactado.state.appContext = global.SoloCompactado;
    }

    global.SoloCompactado.state.bootstrapped = true;
    return global.SoloCompactado.state.appContext;
  }

  global.SoloCompactado = {
    version: "architecture-bootstrap",
    modules: modules,
    state: existing.state || {},
    ensureBucket: ensureBucket,
    registerModule: registerModule,
    getModule: getModule,
    bootstrapApp: bootstrapApp,
    bootstrapLegacyRuntime: existing.bootstrapLegacyRuntime || null
  };
})(window);
