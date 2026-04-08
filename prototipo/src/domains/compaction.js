(function (global) {
  var app = global.SoloCompactado;
  var COMPACTION_DEPTH_RANGES = [
    "0-10 cm",
    "10-20 cm",
    "20-30 cm",
    "30-40 cm",
    "40-50 cm",
    "50-60 cm"
  ];
  var COMPACTION_PROFILE_TEMPLATES = {
    vegetation_dense: [
      { depth_top: 0.00, depth_bot: 0.10, clay_delta: 0.00, bd_delta: 0.00, xi: 5 },
      { depth_top: 0.10, depth_bot: 0.20, clay_delta: 0.05, bd_delta: 0.05, xi: 5 },
      { depth_top: 0.20, depth_bot: 0.30, clay_delta: 0.10, bd_delta: 0.08, xi: 4 },
      { depth_top: 0.30, depth_bot: 0.40, clay_delta: 0.13, bd_delta: 0.10, xi: 4 },
      { depth_top: 0.40, depth_bot: 0.50, clay_delta: 0.15, bd_delta: 0.12, xi: 4 },
      { depth_top: 0.50, depth_bot: 0.60, clay_delta: 0.15, bd_delta: 0.13, xi: 4 }
    ],
    vegetation_sparse: [
      { depth_top: 0.00, depth_bot: 0.10, clay_delta: 0.00, bd_delta: 0.00, xi: 5 },
      { depth_top: 0.10, depth_bot: 0.20, clay_delta: 0.04, bd_delta: 0.06, xi: 5 },
      { depth_top: 0.20, depth_bot: 0.30, clay_delta: 0.08, bd_delta: 0.10, xi: 4 },
      { depth_top: 0.30, depth_bot: 0.40, clay_delta: 0.11, bd_delta: 0.12, xi: 4 },
      { depth_top: 0.40, depth_bot: 0.50, clay_delta: 0.13, bd_delta: 0.14, xi: 4 },
      { depth_top: 0.50, depth_bot: 0.60, clay_delta: 0.13, bd_delta: 0.15, xi: 4 }
    ],
    bare_soil: [
      { depth_top: 0.00, depth_bot: 0.10, clay_delta: 0.00, bd_delta: 0.00, xi: 4 },
      { depth_top: 0.10, depth_bot: 0.20, clay_delta: 0.04, bd_delta: 0.07, xi: 4 },
      { depth_top: 0.20, depth_bot: 0.30, clay_delta: 0.08, bd_delta: 0.10, xi: 4 },
      { depth_top: 0.30, depth_bot: 0.40, clay_delta: 0.10, bd_delta: 0.15, xi: 3 },
      { depth_top: 0.40, depth_bot: 0.50, clay_delta: 0.12, bd_delta: 0.13, xi: 4 },
      { depth_top: 0.50, depth_bot: 0.60, clay_delta: 0.12, bd_delta: 0.13, xi: 4 }
    ]
  };

  function buildCompactionProfile(snapshot) {
    var thematicClass = snapshot && snapshot.thematic_class;
    var template;

    if (!thematicClass || thematicClass === "water" || thematicClass === "_invalid") {
      return null;
    }

    template = COMPACTION_PROFILE_TEMPLATES[thematicClass];
    if (!template) {
      return null;
    }

    return template.map(function (layerTemplate) {
      var clayContent =
        snapshot.clay_content === null || snapshot.clay_content === undefined
          ? null
          : Math.min(0.80, snapshot.clay_content + layerTemplate.clay_delta);
      var bulkDensity =
        snapshot.bulk_density === null || snapshot.bulk_density === undefined
          ? null
          : Math.min(1.80, snapshot.bulk_density + layerTemplate.bd_delta);
      var matricSuction =
        snapshot.matric_suction === null || snapshot.matric_suction === undefined
          ? null
          : snapshot.matric_suction * (1 + layerTemplate.depth_top * 3);

      return {
        depth_top_m: layerTemplate.depth_top,
        depth_bot_m: layerTemplate.depth_bot,
        depth_range:
          String((layerTemplate.depth_top * 100) | 0) +
          "-" +
          String((layerTemplate.depth_bot * 100) | 0) +
          " cm",
        z_mid_m: (layerTemplate.depth_top + layerTemplate.depth_bot) / 2,
        xi: layerTemplate.xi,
        clay_content: clayContent === null ? null : Number(clayContent.toFixed(3)),
        bulk_density: bulkDensity === null ? null : Number(bulkDensity.toFixed(3)),
        matric_suction: matricSuction === null ? null : Number(matricSuction.toFixed(1))
      };
    });
  }

  function calcContactStress(tractorConfig) {
    var inflationPressure = tractorConfig.inflation_pressure;
    var recommendedPressure = tractorConfig.tyre_recommended_pressure;
    var tyreWidth = tractorConfig.tyre_width;
    var tyreDiameter = tractorConfig.tyre_diameter;
    var wheelLoadKn = tractorConfig.wheel_load * 9.81 / 1000;
    var contactLength =
      0.47 + 0.11 * tyreDiameter * tyreDiameter - 0.16 * Math.log(inflationPressure / recommendedPressure);
    var contactArea = tyreWidth * contactLength;
    var contactRadius = Math.sqrt(contactArea / Math.PI);
    var sigmaMax =
      34.4 + 1.13 * inflationPressure + 0.72 * wheelLoadKn - 33.4 * Math.log(inflationPressure / recommendedPressure);

    return {
      sigma_max_kpa: Number(sigmaMax.toFixed(1)),
      contact_radius_m: Number(contactRadius.toFixed(4)),
      ca_length_m: Number(contactLength.toFixed(3)),
      ca_width_m: Number(tyreWidth.toFixed(3))
    };
  }

  function propagateStress(sigmaMax, contactRadius, xi, zMid) {
    if (zMid <= 0) {
      return sigmaMax;
    }

    var radiusSquared = contactRadius * contactRadius;
    var depthSquared = zMid * zMid;
    return sigmaMax * Math.pow(radiusSquared / (radiusSquared + depthSquared), xi / 2);
  }

  function calcSigmaP(clayFraction, matricSuctionKpa) {
    var clayPercent = clayFraction * 100;
    if (clayPercent < 20) {
      return 129.0 * Math.pow(matricSuctionKpa, 0.15);
    }
    if (clayPercent < 31) {
      return 123.3 * Math.pow(matricSuctionKpa, 0.13);
    }
    if (clayPercent < 41) {
      return 119.2 * Math.pow(matricSuctionKpa, 0.11);
    }
    if (clayPercent < 52) {
      return 88.3 * Math.pow(matricSuctionKpa, 0.13);
    }
    return 62.7 * Math.pow(matricSuctionKpa, 0.15);
  }

  function assessLayerRisk(sigmaAplicada, sigmaP) {
    var ratio;
    var riskClass = "critical";

    if (!sigmaP || sigmaP <= 0) {
      return { stress_ratio: null, risk_class: "unavailable" };
    }

    ratio = sigmaAplicada / sigmaP;
    if (ratio < 0.5) {
      riskClass = "safe";
    } else if (ratio <= 1.1) {
      riskClass = "warning";
    }

    return {
      stress_ratio: Number(ratio.toFixed(3)),
      risk_class: riskClass
    };
  }

  function calcDeformation(sigmaAplicada, sigmaP, bulkDensity, matricSuctionKpa) {
    var rhoSolid = 2.65;
    var p;
    var pF;
    var n;
    var lambdaN;
    var vInitial;
    var vFinal;
    var bulkDensityFinal;
    var deltaBulkDensity;
    var overRatio;
    var deltaBulkDensityFallback;

    if (
      sigmaAplicada === null ||
      sigmaAplicada === undefined ||
      sigmaP === null ||
      sigmaP === undefined ||
      bulkDensity === null ||
      bulkDensity === undefined ||
      matricSuctionKpa === null ||
      matricSuctionKpa === undefined
    ) {
      return {
        delta_bulk_density: null,
        bulk_density_estimated: null
      };
    }

    p = sigmaAplicada;
    pF = Math.log10(Math.max(matricSuctionKpa * 10.2, 1));
    n = 4.30 - 1.697 * bulkDensity - 0.307 * pF - 0.064 * pF * pF;
    lambdaN = 0.2742 - 0.174 * bulkDensity + 0.067 * pF - 0.014 * pF * pF;

    if (p <= sigmaP) {
      return {
        delta_bulk_density: 0,
        bulk_density_estimated: Number(bulkDensity.toFixed(4))
      };
    }

    vInitial = rhoSolid / bulkDensity;
    if (n <= vInitial || lambdaN <= 0) {
      overRatio = (p - sigmaP) / sigmaP;
      deltaBulkDensityFallback = Math.min(bulkDensity * 0.01 * overRatio * 10, 0.5);
      return {
        delta_bulk_density: Number(Math.max(0, deltaBulkDensityFallback).toFixed(4)),
        bulk_density_estimated: Number((bulkDensity + deltaBulkDensityFallback).toFixed(4))
      };
    }

    vFinal = Math.max(n - lambdaN * Math.log(Math.max(p, 0.1)), 1.01);
    bulkDensityFinal = rhoSolid / vFinal;
    deltaBulkDensity = Math.max(0, bulkDensityFinal - bulkDensity);

    return {
      delta_bulk_density: Number(deltaBulkDensity.toFixed(4)),
      bulk_density_estimated: Number(bulkDensityFinal.toFixed(4))
    };
  }

  function runCompaction(tractorConfig, terrainSnapshot) {
    var thematicClass;
    var profile;
    var contact;

    if (!tractorConfig || !terrainSnapshot) {
      return null;
    }

    thematicClass = terrainSnapshot.thematic_class;
    if (!thematicClass || thematicClass === "water" || thematicClass === "_invalid") {
      return null;
    }

    profile = buildCompactionProfile(terrainSnapshot);
    if (!profile) {
      return null;
    }

    contact = calcContactStress(tractorConfig);

    return profile.map(function (layer) {
      var completeInputs =
        layer.clay_content !== null &&
        layer.bulk_density !== null &&
        layer.matric_suction !== null;
      var sigmaP = completeInputs ? calcSigmaP(layer.clay_content, layer.matric_suction) : null;
      var sigmaAplicada = propagateStress(
        contact.sigma_max_kpa,
        contact.contact_radius_m,
        layer.xi,
        layer.z_mid_m
      );
      var deformation = completeInputs
        ? calcDeformation(sigmaAplicada, sigmaP, layer.bulk_density, layer.matric_suction)
        : { delta_bulk_density: null, bulk_density_estimated: null };
      var risk = completeInputs
        ? assessLayerRisk(sigmaAplicada, sigmaP)
        : { stress_ratio: null, risk_class: "unavailable" };

      return Object.assign({}, layer, {
        sigma_p_kpa: sigmaP === null ? null : Number(sigmaP.toFixed(1)),
        sigma_aplicada_kpa: Number(sigmaAplicada.toFixed(1)),
        stress_ratio: risk.stress_ratio,
        risk_class: risk.risk_class,
        delta_bulk_density: deformation.delta_bulk_density,
        bulk_density_estimated: deformation.bulk_density_estimated,
        provenance: completeInputs ? "derived" : "unavailable"
      });
    });
  }

  app.registerModule("domains", "compaction", {
    getDepthRanges: function getDepthRanges() {
      return COMPACTION_DEPTH_RANGES.slice();
    },
    runCompaction: runCompaction
  });
})(window);
