# Sprint 5: Motor de Compactacao por Camadas — Design

## Escopo do design

Todo o codigo novo vive em `prototipo/index.html`, arquivo unico, sem build, sem
dependencias externas. O design segue os padroes ja estabelecidos no runtime:
funcoes puras com estado global em `runtimeState`, camelCase, sem classes.

---

## Arquitetura: fluxo de dados

```
[tick do gameloop]
       │
       ▼
 getCurrentTerrainSnapshot()          ← currentTerrainPixel → latestSample da mesma celula → buildTerrainSnapshot(cell)
getActiveTractorConfig()             ← inclui tyre_diameter + tyre_recommended_pressure (novos)
       │
       ▼
buildCompactionProfile(snapshot)     ← 6 camadas com gradientes por thematic_class
       │
       ▼
calcContactStress(tractorConfig)     ← sigma_max + contact_radius (Keller 2005)
       │
       ▼
[por camada z_mid em [0.05, 0.15, 0.25, 0.35, 0.45, 0.55] m]
  propagateStress(sigma_max, a, xi, z)    → sigma_aplicada_kpa  (Frohlich/Sohne)
  calcSigmaP(clay, matric_suction)        → sigma_p_kpa         (Severiano 2013)
  calcDeformation(sigma_ap, sigma_p, bd, ms) → delta_bd, bd_est (O'Sullivan&Robertson 1996)
  assessLayerRisk(sigma_ap, sigma_p)      → stress_ratio, risk_class (Stettler 2014)
       │
       ▼
compactionProfile: LayerResult[6]
       │
       ├──► runtimeState.currentCompactionProfile  (leitura instantanea → HUD)
       │
       └──► [quando appendSample() e chamado]
            updateCompactionAccumulator(cellId, profile)
            → runtimeState.mission.compaction_accumulator[cellId]
                 │
                 └──► persistMission()  (acumulado vai para localStorage automaticamente)
```

---

## Decisoes de design explicitadas

### D1 — Sem feedback de sigma_p na Sprint 5
`sigma_p_kpa` por camada e calculado a partir do perfil vertical estatico derivado
do pixel BDC (PTF Severiano 2013 + gradiente de argila do template). Ele NAO e
recalculado a partir de `bulk_density_estimated` atualizado. O feedback de estado
(solo mais compacto = maior sigma_p = menor risco nas passadas seguintes) e
tecnicamente correto mas fica explicitamente **deferido para Sprint 6**. O design
registra esta limitacao no bloco `LIMITACOES` do HUD.

### D2 — Acumulador por celula, nao global
`compaction_accumulator` e indexado por `cell_id`. Cada celula acumula
`bulk_density_estimated` por camada e `pass_count` de forma independente. Isso
preserva a informacao espacial no export e evita misturar solos diferentes.

### D3 — Classe _invalid tratada como unavailable
`deriveSoilFromThematicClass` ja retorna null para `!thematicClass || thematic === "water"`.
O motor adiciona guard explicito: se `thematic_class` for `null`, `"water"` ou
`"_invalid"`, retorna perfil indisponivel sem calculos. Compativel com a celula
`paladino-r6-c3` (SCL=8, todos os campos null).

### D4 — Hierarquia de terrain_snapshot no motor
O motor usa a mesma hierarquia ja estabelecida em `buildHudViewModel()`:
`currentTerrainPixel.snapshot` se disponivel; se nao houver pixel atual mas existir
`latestSample.terrain_snapshot` da mesma `cell_id`, reutiliza esse snapshot; so
depois faz fallback para `buildTerrainSnapshot(currentCell)`. Isso garante
consistencia entre HUD de terreno e HUD de compactacao.

### D5 — tyre_diameter e tyre_recommended_pressure
Adicionados a `getActiveTractorConfig()` com defaults:
- `tyre_diameter: 1.5` m (trator medio de 12t)
- `tyre_recommended_pressure: 100` kPa (igual a `inflation_pressure` — ln = 0,
  conservador)

### D6 — `p = sigma_ap` e a referencia normativa do design
Uma versao anterior do spec textual mencionava `p = sigma_ap / 2.3`. A validacao
fisica desta sprint corrige explicitamente a implementacao para `p = sigma_ap`,
porque a PTF de Lima et al. (2018) foi calibrada em compressao uniaxial. Enquanto
o spec nao for harmonizado, implementacao, tasks e validacao desta sprint devem
seguir o design.

---

## Estruturas de dados novas

### LayerResult
```javascript
{
  depth_range:          "0-10 cm",       // string descritiva
  depth_top_m:          0.00,            // float
  depth_bot_m:          0.10,            // float
  z_mid_m:              0.05,            // ponto de amostragem
  xi:                   5,               // fator de concentracao Frohlich
  clay_content:         0.45,            // fracao (de 0 a 1, ou null se ausente)
  bulk_density:         1.15,            // Mg/m³ (valor do perfil nesta camada, ou null se ausente)
  matric_suction:       28.4,            // kPa (ou null se ausente)
  sigma_p_kpa:          136.4,           // kPa — Severiano 2013 (ou null se ausente)
  sigma_aplicada_kpa:   159.5,           // kPa — Keller/Frohlich
  stress_ratio:         1.17,            // sigma_aplicada / sigma_p (ou null se ausente)
  risk_class:           "critical",      // "safe" | "warning" | "critical" | "unavailable"
  delta_bulk_density:   0.03,            // Mg/m³ (positivo = compactacao, ou null se indisponivel)
  bulk_density_estimated: 1.18,         // Mg/m³ (acumulado da missao ou inicial se 1a passada, ou null)
  provenance:           "derived"        // "derived" | "unavailable"
}
```

**Nota de robustez**: em snapshots parciais, o motor nunca deve confiar em coercao
numerica de `null`. Campos derivados de entradas ausentes permanecem `null` e a
camada usa `risk_class: "unavailable"` quando necessario.

### CompactionAccumulator (em runtimeState.mission)
```javascript
compaction_accumulator: {
  "paladino-r1-c1": {
    pass_count: 3,
    layers: [
      { depth_range: "0-10 cm",  bulk_density_estimated: 1.21, pass_count: 3 },
      { depth_range: "10-20 cm", bulk_density_estimated: 1.23, pass_count: 3 },
      // ... 6 camadas
    ]
  },
  "paladino-r2-c3": { ... }
}
```

---

## Templates de perfil vertical por thematic_class

Os templates definem o gradiente de `clay_content`, `bulk_density` e `xi` em
profundidade, ancorados pelos valores superficiais do pixel atual.

```javascript
const COMPACTION_PROFILE_TEMPLATES = {
  vegetation_dense: [
    // clay_delta e bd_delta sao somados ao valor superficial do snapshot
    { depth_top: 0.00, depth_bot: 0.10, clay_delta: 0.00, bd_delta: 0.00, xi: 5 },
    { depth_top: 0.10, depth_bot: 0.20, clay_delta: 0.05, bd_delta: 0.05, xi: 5 },
    { depth_top: 0.20, depth_bot: 0.30, clay_delta: 0.10, bd_delta: 0.08, xi: 4 },
    { depth_top: 0.30, depth_bot: 0.40, clay_delta: 0.13, bd_delta: 0.10, xi: 4 },
    { depth_top: 0.40, depth_bot: 0.50, clay_delta: 0.15, bd_delta: 0.12, xi: 4 },
    { depth_top: 0.50, depth_bot: 0.60, clay_delta: 0.15, bd_delta: 0.13, xi: 4 },
  ],
  vegetation_sparse: [
    { depth_top: 0.00, depth_bot: 0.10, clay_delta: 0.00, bd_delta: 0.00, xi: 5 },
    { depth_top: 0.10, depth_bot: 0.20, clay_delta: 0.04, bd_delta: 0.06, xi: 5 },
    { depth_top: 0.20, depth_bot: 0.30, clay_delta: 0.08, bd_delta: 0.10, xi: 4 },
    { depth_top: 0.30, depth_bot: 0.40, clay_delta: 0.11, bd_delta: 0.12, xi: 4 },
    { depth_top: 0.40, depth_bot: 0.50, clay_delta: 0.13, bd_delta: 0.14, xi: 4 },
    { depth_top: 0.50, depth_bot: 0.60, clay_delta: 0.13, bd_delta: 0.15, xi: 4 },
  ],
  bare_soil: [
    // superficie mais compactada (campo colhido/preparado), possivel pe de arado em 30-40 cm
    { depth_top: 0.00, depth_bot: 0.10, clay_delta: 0.00, bd_delta: 0.00, xi: 4 },
    { depth_top: 0.10, depth_bot: 0.20, clay_delta: 0.04, bd_delta: 0.07, xi: 4 },
    { depth_top: 0.20, depth_bot: 0.30, clay_delta: 0.08, bd_delta: 0.10, xi: 4 },
    { depth_top: 0.30, depth_bot: 0.40, clay_delta: 0.10, bd_delta: 0.15, xi: 3 }, // pe de arado — camada rigida, xi baixo
    { depth_top: 0.40, depth_bot: 0.50, clay_delta: 0.12, bd_delta: 0.13, xi: 4 },
    { depth_top: 0.50, depth_bot: 0.60, clay_delta: 0.12, bd_delta: 0.13, xi: 4 },
  ]
  // "water" e "_invalid" nao tem template — motor retorna unavailable
};
```

**Nota de calibracao**: os deltas sao estimativas para Latossolo Vermelho-Amarelo
do oeste da Bahia (Imhoff 2004). Refinamento futuro deve usar dados de perfil
tabulados por horizonte pedologico.

---

## Especificacoes das funcoes

### `buildCompactionProfile(terrainSnapshot)`

**Entrada**: `terrainSnapshot` (objeto com `clay_content`, `bulk_density`,
`matric_suction`, `sigma_p`, `thematic_class`)

**Saida**: array de 6 objetos de camada com propriedades interpoladas, ou `null`
se `thematic_class` for `null`, `"water"` ou `"_invalid"`. Se o snapshot vier
parcial, os campos dependentes da entrada ausente ficam `null` na camada em vez de
serem fabricados por coercao implicita.

**Algoritmo**:
```javascript
function buildCompactionProfile(snapshot) {
  const tc = snapshot.thematic_class;
  if (!tc || tc === "water" || tc === "_invalid") return null;

  const template = COMPACTION_PROFILE_TEMPLATES[tc];
  if (!template) return null;

  return template.map(function(t) {
    const clay  =
      snapshot.clay_content === null || snapshot.clay_content === undefined
        ? null
        : Math.min(0.80, snapshot.clay_content + t.clay_delta);
    const bd    =
      snapshot.bulk_density === null || snapshot.bulk_density === undefined
        ? null
        : Math.min(1.80, snapshot.bulk_density + t.bd_delta);
    // matric_suction aumenta com a profundidade (solo mais seco abaixo da zona radicular)
    // gradiente linear de profundidade: +3× por metro (ex: 0-10cm = 1×, 50-60cm = 2.5×)
    const ms    =
      snapshot.matric_suction === null || snapshot.matric_suction === undefined
        ? null
        : snapshot.matric_suction * (1 + t.depth_top * 3);
    return {
      depth_top_m: t.depth_top,
      depth_bot_m: t.depth_bot,
      depth_range: String(t.depth_top * 100 | 0) + "-" + String(t.depth_bot * 100 | 0) + " cm",
      z_mid_m: (t.depth_top + t.depth_bot) / 2,
      xi: t.xi,
      clay_content: clay === null ? null : Number(clay.toFixed(3)),
      bulk_density: bd === null ? null : Number(bd.toFixed(3)),
      matric_suction: ms === null ? null : Number(ms.toFixed(1))
    };
  });
}
```

---

### `calcContactStress(tractorConfig)`

**Modelo**: Keller (2005) Eq. 3, 4, 5

**Entradas**: `{ inflation_pressure, tyre_recommended_pressure, tyre_width, tyre_diameter, wheel_load }`

**Saidas**: `{ sigma_max_kpa, contact_radius_m, ca_length_m, ca_width_m }`

```javascript
function calcContactStress(tc) {
  const T_ip  = tc.inflation_pressure;          // kPa
  const T_rip = tc.tyre_recommended_pressure;   // kPa
  const T_w   = tc.tyre_width;                  // m
  const T_d   = tc.tyre_diameter;               // m
  const W_kN  = tc.wheel_load * 9.81 / 1000;   // kg → kN

  // Eq. 4: comprimento do patch de contato (m)
  const ca_length = 0.47 + 0.11 * T_d * T_d - 0.16 * Math.log(T_ip / T_rip);

  // CA total (m²) e raio equivalente
  const ca = T_w * ca_length;
  const a  = Math.sqrt(ca / Math.PI);  // raio equivalente do patch circular

  // Eq. 5: tensao maxima na superficie (kPa)
  const sigma_max = 34.4 + 1.13 * T_ip + 0.72 * W_kN - 33.4 * Math.log(T_ip / T_rip);

  return {
    sigma_max_kpa:    Number(sigma_max.toFixed(1)),
    contact_radius_m: Number(a.toFixed(4)),
    ca_length_m:      Number(ca_length.toFixed(3)),
    ca_width_m:       Number(T_w.toFixed(3))
  };
}
```

**Valores esperados para o trator padrao** (wheel_load=3000 kg, inflation_pressure=100 kPa,
tyre_width=0.52 m, tyre_diameter=1.5 m, tyre_recommended_pressure=100 kPa):
- `sigma_max ≈ 168.6 kPa`
- `ca_length ≈ 0.718 m`, `ca_width = 0.52 m`, `a ≈ 0.344 m`

---

### `propagateStress(sigma_max, a, xi, z)`

**Modelo**: Aproximacao analitica para carga circular uniforme com fator de
concentracao de Frohlich (1934). A implementacao exata de Lima et al. (2021) usa
integracao numerica de Sohne (1953) sobre `n` sub-cargas pontuais (Eq. 11 do
paper). Esta versao simplificada captura o comportamento qualitativo correto:
- maior xi (solo solto) → atenuacao mais rapida com profundidade ✓
- menor xi (solo rigido) → tensao transmitida mais profundamente ✓

```javascript
function propagateStress(sigma_max, a, xi, z) {
  if (z <= 0) return sigma_max;
  // sigma_z = sigma_max * (a² / (a² + z²))^(xi/2)
  // Aproximacao: nao e a Eq. 11 de Lima et al. 2021 (que integra numericamente)
  const a2 = a * a;
  const z2 = z * z;
  return sigma_max * Math.pow(a2 / (a2 + z2), xi / 2);
}
```

**Valores esperados** (sigma_max=168.6, a=0.344):

| Camada | z_mid | xi | sigma_aplicada |
|--------|-------|----|----------------|
| 0-10   | 0.05  | 5  | ~159 kPa       |
| 10-20  | 0.15  | 5  | ~104 kPa       |
| 20-30  | 0.25  | 4  | ~67 kPa        |
| 30-40  | 0.35  | 4  | ~43 kPa        |
| 40-50  | 0.45  | 4  | ~28 kPa        |
| 50-60  | 0.55  | 4  | ~19 kPa        |

---

### `calcSigmaP(clay_fraction, matric_suction_kpa)` — reutilizacao

PTF Severiano et al. (2013), ja implementada no script `enriquecer-grade-bdc.py`.
Reproduzir identicamente no runtime (mesmos coeficientes, mesmos brackets de argila):

```javascript
function calcSigmaP(clay_fraction, matric_suction_kpa) {
  const clay_pct = clay_fraction * 100;
  const h = matric_suction_kpa;
  if (clay_pct < 20)       return 129.0 * Math.pow(h, 0.15);
  else if (clay_pct < 31)  return 123.3 * Math.pow(h, 0.13);
  else if (clay_pct < 41)  return 119.2 * Math.pow(h, 0.11);
  else if (clay_pct < 52)  return 88.3  * Math.pow(h, 0.13);
  else                     return 62.7  * Math.pow(h, 0.15);
}
```

---

### `calcDeformation(sigma_aplicada, sigma_p, bulk_density, matric_suction_kpa)`

**Modelo**: O'Sullivan e Robertson (1996) via `soilDeformation()` do soilphysics
(Lima et al. 2021). PTF de Lima et al. (2018) para parametros compressivos.

**Decisoes de implementacao**:
- `p = sigma_ap` diretamente (sem divisao por 2.3): a PTF de Lima 2018 foi
  calibrada em ensaios de compressao uniaxial (tensao vertical) — mesma escala de
  sigma_ap de Frohlich e de sigma_p de Severiano. Usar `sigma_ap/2.3` desacoplaria
  risco e deformacao (deformacao plastica so ocorreria com stress_ratio > 1.5).
- Yield criterion = sigma_p: a pressao de preconsolidacao e por definicao o limite
  entre regime elastico e plastico. O parametro `m = 1.3` de O'Sullivan & Robertson
  nao e um fator multiplicador do yield — descreve a diferenca angular entre RCL e
  RCL' e e omitido nesta simplificacao.
- Zona elastica (sigma_ap <= sigma_p): sem deformacao permanente (`delta_bd = 0`).
  Isso significa que camadas em `warning` podem mostrar `delta_bd = 0` quando
  sigma_ap < sigma_p — comportamento fisicamente correto (deformacao reversivel);
  documentar no HUD como ausencia de compactacao permanente.
- Sanity check da PTF: de Lima 2018 foi calibrada para Sandy Loam (bd ~1.4-1.65
  Mg/m³). Para Latossolo com bd = 1.15 Mg/m³, a extrapolacao pode produzir N <
  v_initial (fisicamente impossivel). Guard obrigatorio com fallback empirico.
- Snapshot parcial: se `bulk_density`, `matric_suction` ou `sigma_p` necessario
  estiver ausente, a deformacao daquela camada fica indisponivel (`null`) em vez
  de ser inventada.

```javascript
function calcDeformation(sigma_ap, sigma_p, bd, ms_kpa) {
  const RHO_SOLID = 2.65;  // Mg/m³ — Latossolo

  // Usar sigma_ap diretamente (tensao vertical) — consistente com PTF de Lima 2018
  // e com sigma_p de Severiano 2013 (ambos de ensaios de compressao uniaxial)
  const p = sigma_ap;

  // pF: log10(matric_suction em hPa); 1 kPa = 10.2 hPa
  const pF = Math.log10(Math.max(ms_kpa * 10.2, 1));

  // PTF de Lima et al. 2018 — Sandy Loam (aproximacao para Latossolo)
  const N     = 4.30   - 1.697 * bd - 0.307 * pF - 0.064 * pF * pF;
  const lam_n = 0.2742 - 0.174  * bd + 0.067 * pF - 0.014 * pF * pF;

  // Zona elastica: sigma_ap <= sigma_p → sem deformacao permanente
  if (p <= sigma_p) {
    return {
      delta_bulk_density:     0,
      bulk_density_estimated: Number(bd.toFixed(4))
    };
  }

  // Zona plastica: sigma_ap > sigma_p → comprimir sobre VCL
  const v_initial = RHO_SOLID / bd;

  // Sanity check: N deve ser > v_initial para que o solo possa existir abaixo da VCL
  // Se N <= v_initial, a PTF esta fora do seu dominio de calibracao (bd muito baixo)
  // Fallback empirico: 1% de aumento de densidade por 10% de excesso sobre sigma_p
  if (N <= v_initial || lam_n <= 0) {
    const over_ratio = (p - sigma_p) / sigma_p;
    const delta_bd_fb = Math.min(bd * 0.01 * over_ratio * 10, 0.5);  // cap em 0.5 Mg/m³
    return {
      delta_bulk_density:     Number(Math.max(0, delta_bd_fb).toFixed(4)),
      bulk_density_estimated: Number((bd + delta_bd_fb).toFixed(4))
    };
  }

  // VCL: v = N - lambda_n * ln(p)
  const v_final = Math.max(N - lam_n * Math.log(Math.max(p, 0.1)), 1.01);
  const bd_final = RHO_SOLID / v_final;
  const delta_bd = Math.max(0, bd_final - bd);  // nao permite expansao

  return {
    delta_bulk_density:     Number(delta_bd.toFixed(4)),
    bulk_density_estimated: Number(bd_final.toFixed(4))
  };
}
```

**Comportamento esperado** para `vegetation_dense` camada 0-10 cm:
- sigma_ap = 159 kPa, sigma_p = 136 kPa → p > sigma_p → zona plastica
- pF = log10(28.4×10.2) ≈ 2.46, bd = 1.15: N ≈ 1.21 < v_initial = 2.30 → fallback empirico
- over_ratio = (159-136)/136 = 0.169 → delta_bd = 1.15 × 0.01 × 1.69 ≈ 0.019 Mg/m³
- Para camadas profundas (sigma_ap < sigma_p): delta_bd = 0 ✓

---

### `assessLayerRisk(sigma_aplicada, sigma_p)`

**Criterio**: Stettler et al. (2014) — Fig. 3c, Lima et al. (2021).

```javascript
function assessLayerRisk(sigma_ap, sigma_p) {
  if (!sigma_p || sigma_p <= 0) {
    return { stress_ratio: null, risk_class: "unavailable" };
  }
  const ratio = sigma_ap / sigma_p;
  let risk;
  if (ratio < 0.5)       risk = "safe";
  else if (ratio <= 1.1) risk = "warning";
  else                   risk = "critical";
  return { stress_ratio: Number(ratio.toFixed(3)), risk_class: risk };
}
```

---

### `runCompactionMotor(tractorConfig, terrainSnapshot)` — orquestrador

```javascript
function runCompactionMotor(tractorConfig, terrainSnapshot) {
  // Guard: pixel invalido, agua ou snapshot ausente
  if (!tractorConfig || !terrainSnapshot) {
    return null;
  }

  const tc = terrainSnapshot && terrainSnapshot.thematic_class;
  if (!tc || tc === "water" || tc === "_invalid") {
    return null;  // HUD exibe ausencia sem fabricar valores
  }

  const profile = buildCompactionProfile(terrainSnapshot);
  if (!profile) return null;

  const contact = calcContactStress(tractorConfig);

  return profile.map(function(layer) {
    const sigma_p   =
      layer.clay_content === null || layer.matric_suction === null
        ? null
        : calcSigmaP(layer.clay_content, layer.matric_suction);
    const sigma_ap  = propagateStress(
      contact.sigma_max_kpa,
      contact.contact_radius_m,
      layer.xi,
      layer.z_mid_m
    );
    const deform    =
      sigma_p === null || layer.bulk_density === null || layer.matric_suction === null
        ? { delta_bulk_density: null, bulk_density_estimated: null }
        : calcDeformation(sigma_ap, sigma_p, layer.bulk_density, layer.matric_suction);
    const risk      = assessLayerRisk(sigma_ap, sigma_p);
    const completeInputs =
      layer.clay_content !== null &&
      layer.bulk_density !== null &&
      layer.matric_suction !== null;

    return Object.assign({}, layer, {
      sigma_p_kpa:           sigma_p === null ? null : Number(sigma_p.toFixed(1)),
      sigma_aplicada_kpa:    Number(sigma_ap.toFixed(1)),
      stress_ratio:          risk.stress_ratio,
      risk_class:            risk.risk_class,
      delta_bulk_density:    deform.delta_bulk_density,
      bulk_density_estimated: deform.bulk_density_estimated,
      provenance:            completeInputs ? "derived" : "unavailable"
    });
  });
}
```

---

### `updateCompactionAccumulator(cellId, compactionProfile)`

Chamada dentro de `appendSample()`, logo antes de `persistMission()`.

```javascript
function updateCompactionAccumulator(cellId, profile) {
  if (!profile || !cellId) return;

  const acc = runtimeState.mission.compaction_accumulator;
  if (!acc[cellId]) {
    // Primeira passada nesta celula
    acc[cellId] = {
      pass_count: 0,
      layers: profile.map(function(l) {
        return {
          depth_range:            l.depth_range,
          bulk_density_estimated: l.bulk_density === null ? null : l.bulk_density,  // parte do valor de referencia
          pass_count:             0
        };
      })
    };
  }

  acc[cellId].pass_count += 1;
  profile.forEach(function(layer, i) {
    const accLayer = acc[cellId].layers[i];
    if (layer.delta_bulk_density === null || layer.bulk_density === null) {
      return;
    }

    if (accLayer.bulk_density_estimated === null) {
      accLayer.bulk_density_estimated = layer.bulk_density;
    }

    // Acumula o delta sobre o bulk_density_estimated da passada anterior
    accLayer.bulk_density_estimated = Number(
      (accLayer.bulk_density_estimated + layer.delta_bulk_density).toFixed(4)
    );
    accLayer.pass_count = acc[cellId].pass_count;
  });
}
```

**Integracao em `appendSample()`** — adicionar apos `runtimeState.latestSample = sample;`:
```javascript
if (runtimeState.currentCompactionProfile) {
  updateCompactionAccumulator(sample.cell_id, runtimeState.currentCompactionProfile);
}
```

---

### `getCurrentTerrainSnapshot()` — helper novo

Centraliza a hierarquia de resolucao do snapshot (D4), evitando duplicacao entre
motor e HUD:

```javascript
function getCurrentTerrainSnapshot() {
  const pixel = runtimeState.currentTerrainPixel;
  const cell  = runtimeState.currentCell;
  const latestSample = runtimeState.latestSample;

  if (pixel) return pixel.snapshot;
  if (latestSample && cell && latestSample.cell_id === cell.cellId) {
    return latestSample.terrain_snapshot;
  }
  if (cell)  return buildTerrainSnapshot(cell);
  return null;
}
```

---

## Integracao com o gameloop

O motor e chamado no loop principal, na mesma passagem que `buildHudViewModel()`.
Adicionar em `updateSampling()` imediatamente apos
`runtimeState.currentTerrainPixel = ...` e **antes** do early return de
`!runtimeState.currentCell`:

```javascript
runtimeState.currentCell = resolveCell(tractorState.position, runtimeState.terrainGrid);
runtimeState.currentTerrainPixel = resolveTerrainPixel(tractorState.position, runtimeState.terrainRaster);

const snapshot = getCurrentTerrainSnapshot();
runtimeState.currentCompactionProfile = snapshot
  ? runCompactionMotor(getActiveTractorConfig(), snapshot)
  : null;

runtimeState.mission.current_cell_id = runtimeState.currentCell ? runtimeState.currentCell.cellId : null;
runtimeState.mission.active_tractor_config = getActiveTractorConfig();

if (!runtimeState.currentCell) {
  return;
}
```

O motor e chamado em toda atualizacao de posicao — leve o suficiente para 60fps
(6 camadas, aritmetica pura, sem IO). Esta ordem preserva a leitura instantanea
mesmo quando o trator estiver dentro do raster BDC mas fora da grade operacional
de amostragem.

---

## Alteracoes em funcoes existentes

### `runtimeState` — adicionar leitura instantanea do motor
```javascript
currentCompactionProfile: null
```

### `getActiveTractorConfig()` — adicionar dois campos
```javascript
tyre_diameter:              1.50,   // m — trator medio de 12t (default)
tyre_recommended_pressure:  100,    // kPa — igual a inflation_pressure (default conservador)
```

### `createMission()` — adicionar acumulador vazio
```javascript
compaction_accumulator: {}
```

### `restoreOrCreateMission()` — garantir migracao
Ao restaurar missao persistida, adicionar guard:
```javascript
if (!runtimeState.mission.compaction_accumulator) {
  runtimeState.mission.compaction_accumulator = {};
}
```

### `buildMissionExport()` — adicionar ao payload
```javascript
compaction_accumulator: runtimeState.mission.compaction_accumulator,
compaction_profile_current: runtimeState.currentCompactionProfile
```

---

## HUD: bloco "Compactacao por Camada"

Nova `<section id="hud-compaction">` adicionada ao HUD apos `#hud-terrain`,
antes de `#mission-panel`.

### Layout textual por camada

```
Compactacao por Camada
──────────────────────
0-10 cm  ● CRITICAL   σ: 159 kPa  σp: 136 kPa  ρest: 1.169
10-20 cm ● WARNING    σ: 104 kPa  σp: 138 kPa  Δρ: 0 (elástico)
20-30 cm ○ safe       σ:  67 kPa  σp: 161 kPa  Δρ: 0 (elástico)
30-40 cm ○ safe       σ:  43 kPa  σp: 185 kPa  Δρ: 0 (elástico)
40-50 cm ○ safe       σ:  28 kPa  σp: 208 kPa  Δρ: 0 (elástico)
50-60 cm ○ safe       σ:  19 kPa  σp: 208 kPa  Δρ: 0 (elástico)
```

- `Δρ: 0 (elástico)` em camadas com sigma_ap < sigma_p: deformacao reversivel, sem
  compactacao permanente. Exibir explicitamente para evitar interpretacao de "bug".
- `ρest` (bulk_density_estimated) exibido nas camadas com deformacao real: valor
  vem de `runtimeState.mission.compaction_accumulator[cellId].layers[i].bulk_density_estimated`
  — **nao** de `currentCompactionProfile[i].bulk_density_estimated` (que reflete
  apenas a passada atual). Se celula ainda nao esta no acumulador, exibir o valor
  do perfil como baseline.
- Snapshot parcial: `σ` pode ser exibido normalmente, mas `σp`, `risk_class`, `Δρ`
  e `ρest` ficam como ausencia quando faltarem entradas de solo para aquela camada.
- `●` colorido: critical = vermelho-acento, warning = amarelo-acento, safe = verde
- Pixel invalido: todas as linhas substituidas por `—` (estrutura permanece visivel)
- Update sem flicker: atualizar `textContent` de elementos pre-existentes (nao
  recriar DOM a cada frame)

### Cores por risk_class (CSS)

```css
.risk-critical { color: #e05c5c; }
.risk-warning  { color: var(--accent); }   /* amarelo ja definido */
.risk-safe     { color: #6dbf67; }
.risk-unavailable { color: var(--muted); }
```

---

## Integracao com persistencia e export (P2)

| Requisito | Mecanismo |
|---|---|
| Acumulado persiste no localStorage | `compaction_accumulator` dentro de `runtimeState.mission` — `persistMission()` ja serializa o objeto inteiro |
| Restauracao com dataset_version compativel | `restoreOrCreateMission()` ja valida `dataset_version`; acumulador e restaurado junto |
| Invalidacao em dataset_version incompativel | Ja tratada — cria nova missao com `compaction_accumulator: {}` |
| Export inclui snapshots por amostra | `compaction_snapshot` adicionado em `createSample()` |
| Export inclui acumulado | `compaction_accumulator` adicionado em `buildMissionExport()` |

Para incluir `compaction_snapshot` por amostra, adicionar em `createSample()`:
```javascript
compaction_snapshot: runtimeState.currentCompactionProfile
  ? runtimeState.currentCompactionProfile.map(function(l) {
      return {
        depth_range:         l.depth_range,
        sigma_aplicada_kpa:  l.sigma_aplicada_kpa,
        sigma_p_kpa:         l.sigma_p_kpa,
        risk_class:          l.risk_class,
        delta_bulk_density:  l.delta_bulk_density
      };
    })
  : null
```

---

## Arquivo modificado

| Arquivo | Tipo | Descricao |
|---|---|---|
| `prototipo/index.html` | MODIFICAR | Unico arquivo — todas as mudancas aqui |

**Secoes a modificar dentro do HTML:**
1. CSS (antes de `@media`) — adicionar estilos de risk_class e `#hud-compaction`
2. HTML (HUD) — adicionar `<section id="hud-compaction">` com 6 linhas de camada
3. JS — adicionar constante `COMPACTION_PROFILE_TEMPLATES` e as funcoes novas do motor
4. JS — modificar `getActiveTractorConfig()`, `createMission()`,
   `restoreOrCreateMission()`, `appendSample()`, `buildMissionExport()`, `createSample()`,
   `runtimeState`
5. JS — adicionar chamada ao motor no loop de update

---

## Verificacao do design contra a spec

| Req | Satisfeito por |
|---|---|
| S5CMP-01..05 | `runCompactionMotor()` + `buildCompactionProfile()` |
| S5CMP-06..08 | `assessLayerRisk()` com limiares Stettler 2014 |
| S5CMP-09 | Guard de `thematic_class` null/water/_invalid em `runCompactionMotor()` |
| S5CMP-10..11 | HUD `#hud-compaction` + operacao offline |
| S5CMP-12..18 | `updateCompactionAccumulator()` + `persistMission()` + `restoreOrCreateMission()` |
| S5CMP-19..24 | Secao `#hud-compaction` no HUD existente |

---

## Limitacoes documentadas (para HUD de debug e STATE.md)

- **PTF fora do dominio**: de Lima 2018 calibrada para Sandy Loam (bd ~1.4-1.65
  Mg/m³). Para Latossolo com bd = 1.15 Mg/m³, N < v_initial → fallback empirico
  ativado. Deformacoes sao estimativas de ordem de grandeza, nao valores precisos.
- **Feedback de sigma_p deferido** (D1): sigma_p e calculado do perfil estatico.
  Solo mais compacto apos multiplas passadas nao aumenta sua resistencia no motor.
  Isso superestima risco progressivamente a partir da 2a passada. Corrigir na Sprint 6.
- **Delta por passada constante**: cada passada sobre a mesma celula gera o mesmo
  delta_bulk_density porque o motor usa o perfil estatico. Fisicamente incorreto
  (rendimentos decrescentes de compactacao), mas aceitavel para o prototipo.
- **Zona elastica sem deformacao permanente**: camadas com sigma_ap <= sigma_p
  mostram delta_bd = 0. Isso e correto (deformacao reversivel), mas pode parecer
  contraintuitivo quando risk_class = "warning". Explicar no HUD.
- **sigma_p pode diminuir com profundidade em vegetation_dense**: ao cruzar o
  bracket de 52% de argila (PTF Severiano), o coeficiente cai de 88.3 para 62.7,
  reduzindo sigma_p nas camadas mais profundas. Comportamento esperado da PTF.
- **Propagacao de stress e aproximacao analitica**: formula `sigma_max*(a²/(a²+z²))^(xi/2)`
  nao e a Eq. 11 de Lima 2021 (integracao numerica). Erros de ~10-20% vs. modelo
  completo — aceitavel para o prototipo.
- **Motor usa roda equivalente unica**: nao modela duas trilhas separadas.
  Geometria lateral detalhada deferida para sprint posterior.
