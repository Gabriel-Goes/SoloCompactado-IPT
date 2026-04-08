(function (global) {
  var app = global.SoloCompactado;

  function isMissingNumber(value) {
    return value === null || value === undefined || Number.isNaN(value);
  }

  function formatHudNumber(value, suffix, fractionDigits) {
    if (isMissingNumber(value)) {
      return "Nao disponivel";
    }

    var formatted =
      typeof fractionDigits === "number" ? Number(value).toFixed(fractionDigits) : String(value);

    return suffix ? formatted + " " + suffix : formatted;
  }

  function formatHudLatLng(value) {
    if (isMissingNumber(value)) {
      return "-";
    }

    return Number(value).toFixed(6);
  }

  function summarizeMissionId(value) {
    if (!value) {
      return "-";
    }

    return value.length > 18 ? value.slice(0, 18) + "..." : value;
  }

  function formatTimestamp(value) {
    if (!value) {
      return "-";
    }

    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("pt-BR", {
      hour12: false,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function formatCompactionStress(value) {
    if (isMissingNumber(value)) {
      return "—";
    }

    return Number(value).toFixed(0) + " kPa";
  }

  function formatCompactionDensity(value) {
    if (isMissingNumber(value)) {
      return "—";
    }

    return Number(value).toFixed(3);
  }

  function formatPlannerMetric(value, suffix, fractionDigits) {
    if (isMissingNumber(value)) {
      return "—";
    }

    var digits = typeof fractionDigits === "number" ? fractionDigits : 0;
    var formatted = Number(value).toFixed(digits);
    return suffix ? formatted + " " + suffix : formatted;
  }

  function formatPlannerDelta(value) {
    if (isMissingNumber(value)) {
      return "—";
    }

    return (value >= 0 ? "+" : "") + Number(value).toFixed(1) + "%";
  }

  function formatPlannerOverlayMode(mode) {
    if (mode === "baseline") {
      return "Rota baseline";
    }
    if (mode === "both") {
      return "Ambas";
    }
    return "Rota otimizada";
  }

  function formatPlannerViewMode(mode) {
    return mode === "planner" ? "Planner livre" : "Follow operacional";
  }

  function formatPlannerMapBase(mode) {
    return mode === "bdc" ? "BDC" : "Satelite";
  }

  function formatPlannerZoom(value) {
    if (isMissingNumber(value)) {
      return "—";
    }

    return Number(value).toFixed(2).replace(/\.?0+$/, "");
  }

  app.registerModule("core", "formatters", {
    formatHudNumber: formatHudNumber,
    formatHudLatLng: formatHudLatLng,
    summarizeMissionId: summarizeMissionId,
    formatTimestamp: formatTimestamp,
    formatCompactionStress: formatCompactionStress,
    formatCompactionDensity: formatCompactionDensity,
    formatPlannerMetric: formatPlannerMetric,
    formatPlannerDelta: formatPlannerDelta,
    formatPlannerOverlayMode: formatPlannerOverlayMode,
    formatPlannerViewMode: formatPlannerViewMode,
    formatPlannerMapBase: formatPlannerMapBase,
    formatPlannerZoom: formatPlannerZoom
  });
})(window);
