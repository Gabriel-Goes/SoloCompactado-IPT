(function (global) {
  var app = global.SoloCompactado;

  app.startApp = function startApp() {
    return app.bootstrapApp();
  };

  function runWhenReady() {
    app.startApp();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runWhenReady, { once: true });
  } else {
    runWhenReady();
  }
})(window);
