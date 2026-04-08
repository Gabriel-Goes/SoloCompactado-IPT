# Sprint 9: Piloto Automático — Tasks

**Design:** `.specs/features/sprint-9-piloto-automatico/design.md`
**Status:** Approved

---

## Execution Plan

### Fase 1 — Fundação (sequencial)

Sem dependências externas. Cada tarefa pode ser verificada isoladamente.

```
T1 → T2 → T3
```

- **T1:** Criar `autopilot.js` com funções puras e `createAutopilotDomain`
- **T2:** Atualizar `runtime.js` — adicionar `autopilot` ao estado
- **T3:** Atualizar `tractor.js` — bypass de autopilot em `update()`

### Fase 2 — Integração de Input e UI (paralelo após T1+T2+T3)

```
T3 completo, então:
  ├── T4  (keyboard.js)
  ├── T5  (map.js — layer)
  └── T6  (dom.js + hud.js + panels.js)
```

### Fase 3 — Wiring final (sequencial, após T4+T5+T6)

```
T4, T5, T6 completos, então:
  T7 → T8 → T9
```

- **T7:** Atualizar `planner.js` — `clearPlannerLayers` + `clearPlan`
- **T8:** Atualizar `index.html` — DOM, script tag, bootstrap, `buildHudViewModel`
- **T9:** Validação end-to-end

---

## Task Breakdown

### T1: Criar `autopilot.js` — funções puras e domain

**O que:** Criar o arquivo `autopilot.js` completo com todas as funções puras e `createAutopilotDomain(config)`
**Onde:** `prototipo/src/domains/autopilot.js`
**Depende de:** Nenhuma
**Reusa:** Padrão IIFE + `registerModule` de qualquer domain existente (ex: `tractor.js`)

**Funções puras a implementar:**
- `calcBearing(from, to)` — bearing geodésico [0–360°] (design D4)
- `calcHeadingDelta(current, target)` — menor ângulo [-180, 180] (design D4)
- `calcDistanceM(a, b)` — distância euclidiana planar em metros (design D5)
- `flattenRoute(route)` — achata `segments` em array flat de `{lat, lng, segmentIndex, segmentType, totalSegments}`
- `resolveWaypointEntry(waypoints, position, currentIndex)` — reacoplamento com preservação de ordem (design D7)

**`createAutopilotDomain(config)` expõe:**
- `toggle()` — ciclo inactive → active → paused → active; usa `resolveWaypointEntry` em ambas as transições para active
- `deactivate(message)` — desativa sem ciclar; reseta **somente** `autopilotState` local (state→"inactive", waypoints→[], waypointIndex→0, routeSnapshot→null, _wasPausedExternal→false); sincroniza **apenas** `config.runtime.autopilot.state = "inactive"` como espelho de debug; limpa marcador visual; se `message` for fornecido, chama `config.pushUiMessage(message)` — o runtime não é fonte de verdade do piloto
- `update(deltaMs)` — tick completo: bearing, heading delta clampado, velocidade alvo por tipo de segmento (D6), acceptance radius, fim de rota
- `isActive()` — retorna `state === "active"`
- `getSnapshot()` — retorna `{ state, segmentIndex, segmentCount, segmentType }` para HUD

**Constantes internas:**
```js
var AUTOPILOT_CRUISE_SPEED_MPS = 1.39;
var AUTOPILOT_HEADLAND_SPEED_MPS = AUTOPILOT_CRUISE_SPEED_MPS * 0.65;
var AUTOPILOT_WAYPOINT_RADIUS_M = 2.0;
var AUTOPILOT_CLOSE_THRESHOLD_M = 15.0;
```

**Mapeamento `segmentType` → `type_label` (para `getSnapshot`):**
- `"swath"` → tipo operacional swath
- `"transition"` → tipo cabeceira
- `"entry"` → tratado como cabeceira (velocidade `HEADLAND`)

**Requisitos cobertos:** AP-01, AP-01b, AP-01c, AP-02, AP-04, AP-06, AP-07, AP-08, AP-09, AP-10, AP-11, AP-12, AP-13, AP-14, AP-15, AP-17, AP-18, AP-22, AP-23, AP-24, AP-25, AP-26

**Done when:**
- [ ] Arquivo criado em `prototipo/src/domains/autopilot.js`
- [ ] `calcBearing` retorna valor em [0, 360) para qualquer par de coordenadas
- [ ] `calcHeadingDelta` retorna valor em [-180, 180]
- [ ] `calcDistanceM` retorna distância em metros (testável: dois pontos ~1° de lat apart ≈ 111320 m)
- [ ] `flattenRoute` preserva a ordem dos segments e de `polyline_latlng`; cada waypoint tem `segmentType` correto incluindo `"entry"`
- [ ] `resolveWaypointEntry` nunca retorna índice menor que `currentIndex` salvo reset a 0
- [ ] `toggle()` quando inativo sem `coverage_plan` → permanece inativo **e** chama `config.pushUiMessage("Gere um plano de cobertura antes de ativar o piloto.")` (AP-02)
- [ ] `getSnapshot()` após `deactivate()` retorna `{ state: "inactive", segmentIndex: 0, segmentCount: 0, segmentType: null }` — sem `undefined` em nenhum campo
- [ ] `update(deltaMs)` retorna imediatamente quando `paused_tractor` é true ou `state !== "active"`
- [ ] `autopilot.js` declara var local `autopilotState` com todos os campos: `state`, `waypoints`, `waypointIndex`, `routeSnapshot`, `_wasPausedExternal`
- [ ] `autopilot.js` sincroniza `config.runtime.autopilot.state` sempre que `autopilotState.state` muda (para debug via `getRuntimeSnapshot()`)
- [ ] `update(deltaMs)` detecta liberação de `paused_tractor` via `autopilotState._wasPausedExternal` e reaplica `resolveWaypointEntry` antes de continuar (AP-24)
- [ ] `deactivate(message)` reseta `autopilotState` completo (state→"inactive", waypoints→[], waypointIndex→0, routeSnapshot→null, _wasPausedExternal→false) e sincroniza `config.runtime.autopilot.state`
- [ ] `deactivate(message)` chama `config.pushUiMessage(message)` quando `message` é fornecido (AP-23: "Plano descartado. Piloto desativado."; AP-09: "Rota concluída.")
- [ ] `deactivate(message)` chama `config.mapLayers.autopilotWaypoint.clearLayers()` para remover o marcador P3
- [ ] `app.registerModule("domains", "autopilot", {...})` no final do arquivo

**Commit:** `feat(autopilot): criar domain autopilot.js com funções puras e ciclo de estado`

---

### T2: Atualizar `runtime.js` — estado `autopilot`

**O que:** Adicionar sub-objeto `autopilot` ao `createRuntime()` e incluí-lo em `getRuntimeSnapshot()`
**Onde:** `prototipo/src/core/runtime.js`
**Depende de:** Nenhuma (pode rodar em paralelo com T1, mas T3 depende de T2)

**Mudança em `createRuntime()`:**
```js
autopilot: {
  state: "inactive"   // espelho mínimo — atualizado por autopilot.js; apenas para debug
}
```

> O estado completo do piloto (`waypoints`, `waypointIndex`, `routeSnapshot`, `_wasPausedExternal`) vive em var local em `autopilot.js`. Mesmo padrão de `tractorState` em `tractor.js`. O runtime só expõe `state` para `getRuntimeSnapshot()`.

**Mudança em `getRuntimeSnapshot()`:**
```js
autopilotState: runtimeState.autopilot.state
```

**Requisitos cobertos:** AP-01, AP-04 (infraestrutura de estado)

**Done when:**
- [ ] `createRuntime()` retorna objeto com `autopilot: { state: "inactive" }`
- [ ] `getRuntimeSnapshot()` inclui `autopilotState`
- [ ] Nenhuma outra função de `runtime.js` foi alterada

**Commit:** `feat(runtime): adicionar estado autopilot ao createRuntime`

---

### T3: Atualizar `tractor.js` — bypass de autopilot em `update()`

**O que:** Modificar `createTractorDomain(config)` para receber `config.isAutopilotActive` e adicionar o bypass após o gate de `paused_tractor`
**Onde:** `prototipo/src/domains/tractor.js`
**Depende de:** T2 (para que o estado do autopilot exista no runtime)

**Ordem dos gates em `update(deltaMs)` após a mudança:**
```js
// 1. paused_tractor (já existe — sem mudança)
if (config.runtime.coveragePlanner.paused_tractor) {
  tractorState.speedMps = 0;
  return;
}
// 2. deltaSeconds (já existe — sem mudança; precede o bypass obrigatoriamente)
deltaSeconds = deltaMs / 1000;
// 3. bypass autopilot (NOVO — APÓS deltaSeconds, para evitar NaN)
if (config.isAutopilotActive()) {
  distanceMeters = tractorState.speedMps * deltaSeconds;
  if (distanceMeters > 0) {
    tractorState.position = config.moveForward(
      tractorState.position, tractorState.headingDeg, distanceMeters
    );
  }
  return;
}
// 4. lógica de teclado (já existe — sem mudança)
```

> **Atenção:** em ES5, `var deltaSeconds` é içado ao topo da função com valor `undefined`. O bypass **deve** ficar APÓS a atribuição `deltaSeconds = deltaMs / 1000`, caso contrário `tractorState.speedMps * deltaSeconds` produz `NaN` e o trator não se move.

**Requisitos cobertos:** AP-03, AP-04, AP-16

**Done when:**
- [ ] O bypass é inserido APÓS a atribuição `deltaSeconds = deltaMs / 1000` (não antes)
- [ ] `config.isAutopilotActive` é consultado na posição correta (após `paused_tractor` e `deltaSeconds`, antes do teclado)
- [ ] Quando `isAutopilotActive()` é `true`, apenas `moveForward()` é executado
- [ ] Quando `isAutopilotActive()` é `false`, toda a lógica existente de teclado continua inalterada
- [ ] Nenhuma outra função de `tractor.js` foi alterada

**Commit:** `feat(tractor): bypass de input de teclado quando autopilot está ativo`

---

### T4: Atualizar `keyboard.js` — bloquear setas e handler tecla A [P]

**O que:** Modificar `bindKeyboard(config)` para receber `config.isAutopilotActive` e `config.autopilotDomain`; bloquear setas direcionais quando piloto ativo; adicionar handler para tecla `A`
**Onde:** `prototipo/src/core/keyboard.js`
**Depende de:** T3
**[P] Pode rodar em paralelo com T5 e T6**

**Mudança no handler `keydown` para setas:**
```js
var blocked = drawingActive || config.isAutopilotActive();
var handledDirectional = config.tractorDomain.applyDirectionalInput("keydown", event.key, blocked);
```

**Novo handler para tecla A:**
```js
if (event.key === "a" || event.key === "A") {
  config.autopilotDomain.toggle();
  event.preventDefault();
}
```

**Requisitos cobertos:** AP-01, AP-03, AP-14, AP-15, AP-16

**Done when:**
- [ ] Tecla `A` (maiúscula e minúscula) chama `autopilotDomain.toggle()`
- [ ] Setas direcionais são bloqueadas (`blocked = true`) quando `isAutopilotActive()` retorna `true`
- [ ] Setas funcionam normalmente quando piloto inativo ou pausado
- [ ] Tecla `D` (debug) continua funcionando sem interferência

**Commit:** `feat(keyboard): handler tecla A para autopilot e bloqueio de setas`

---

### T5: Atualizar `map.js` — layer `autopilotWaypoint` [P]

**O que:** Adicionar `autopilotWaypoint: L.layerGroup()` ao objeto `plannerLayers` em `createMapDomain()`
**Onde:** `prototipo/src/domains/map.js`
**Depende de:** T3
**[P] Pode rodar em paralelo com T4 e T6**

**Mudança em `plannerLayers`:**
```js
autopilotWaypoint: global.L.layerGroup()
```

A layer é adicionada automaticamente ao `plannerOverlayLayer` pelo loop `Object.keys` existente — sem outras mudanças em `map.js`.

**Requisitos cobertos:** AP-22 (infraestrutura para marcador P3)

**Done when:**
- [ ] `plannerLayers` contém `autopilotWaypoint`
- [ ] Layer é adicionada ao mapa via `plannerOverlayLayer` (confirmado pelo loop `Object.keys` existente)
- [ ] Nenhuma outra função de `map.js` foi alterada

**Commit:** `feat(map): adicionar layer autopilotWaypoint a plannerLayers`

---

### T6: Atualizar `dom.js`, `hud.js` e `panels.js` — UI do piloto [P]

**O que:** Adicionar refs DOM, renderização do HUD e binding do botão do piloto
**Onde:** `prototipo/src/ui/dom.js`, `prototipo/src/ui/hud.js`, `prototipo/src/ui/panels.js`
**Depende de:** T3
**[P] Pode rodar em paralelo com T4 e T5**

**`dom.js` — adicionar ao `buildDomRefs()`:**
```js
autopilot: {
  toggleButton: byId("autopilot-toggle"),
  stateLabel:   byId("autopilot-state"),
  segmentLabel: byId("autopilot-segment"),
  typeLabel:    byId("autopilot-type")
}
```

**`hud.js` — adicionar ao bloco de `renderHud(viewModel)`:**
```js
setHudMetric(domRefs.autopilot.stateLabel,   viewModel.autopilot.state_label, false);
setHudMetric(domRefs.autopilot.segmentLabel, viewModel.autopilot.segment_label,
  viewModel.autopilot.segment_label === "—");
setHudMetric(domRefs.autopilot.typeLabel,    viewModel.autopilot.type_label,
  viewModel.autopilot.type_label === "—");
domRefs.autopilot.toggleButton.textContent = viewModel.autopilot.button_label;
domRefs.autopilot.toggleButton.disabled    = viewModel.autopilot.button_disabled;
```

**`panels.js` — adicionar ao `bindPlannerPanel(actions)`:**
```js
domRefs.autopilot.toggleButton.addEventListener("click", function () {
  actions.onAutopilotToggle();
});
```

**Requisitos cobertos:** AP-02, AP-05, AP-19, AP-20, AP-21

**Done when:**
- [ ] `dom.js` retorna refs válidas para os 4 elementos autopilot (os elementos existirão após T8)
- [ ] `hud.js` renderiza `state_label`, `segment_label`, `type_label`, `button_label` e `button_disabled`
- [ ] `panels.js` chama `actions.onAutopilotToggle()` no clique do botão
- [ ] Nenhum elemento existente de dom/hud/panels foi alterado

**Commit:** `feat(ui): dom refs, hud e panels para controle do autopilot`

---

### T7: Atualizar `planner.js` — `clearPlannerLayers` e `clearPlan` [P]

**O que:** Duas mudanças em `planner.js`: (1) adicionar `layers.autopilotWaypoint.clearLayers()` em `clearPlannerLayers()`; (2) chamar `config.autopilotDomain.deactivate()` em `clearPlan()`
**Onde:** `prototipo/src/domains/planner.js`
**Depende de:** T4, T5, T6

**Mudança 1 — `clearPlannerLayers(layers)` (linha 5):**
```js
layers.autopilotWaypoint.clearLayers();
```
Adicionar junto com as demais chamadas existentes.

**Mudança 2 — `clearPlan()` — antes de limpar artefatos:**
```js
if (config.autopilotDomain) {
  config.autopilotDomain.deactivate("Plano descartado. Piloto desativado.");
}
```

**Requisitos cobertos:** AP-22 (limpeza do marcador), AP-23 (clearPlan desativa piloto + mensagem HUD)

**Done when:**
- [ ] `clearPlannerLayers` inclui `layers.autopilotWaypoint.clearLayers()`
- [ ] `clearPlan()` chama `deactivate("Plano descartado. Piloto desativado.")` antes de qualquer outra operação de limpeza
- [ ] Nenhuma outra função de `planner.js` foi alterada

> **Risco de integração:** T7 está correto em si, mas `config.autopilotDomain` só existe depois que T8 passa `autopilotDomain` a `createPlannerDomain()` no bootstrap. O guard `if (config.autopilotDomain)` protege contra erro em runtime, mas o fluxo completo `clearPlan → deactivate → mensagem HUD` só é exercitável após T8 estar concluído. Validar em T9, não em T7 isoladamente.

**Commit:** `feat(planner): clearPlannerLayers inclui autopilotWaypoint; clearPlan desativa piloto`

---

### T8: Atualizar `index.html` — DOM, script tag, bootstrap e `buildHudViewModel`

**O que:** 4 mudanças em `index.html`: (1) tag `<script>`; (2) DOM do piloto no painel; (3) wiring no `bootstrapLegacyRuntime`; (4) sub-objeto `autopilot` em `buildHudViewModel()`
**Onde:** `prototipo/index.html`
**Depende de:** T7

**1. Tag `<script>` — após `planner.js`:**
```html
<script src="src/domains/autopilot.js"></script>
```

**2. DOM — dentro do painel do planner, após controles de rota:**
```html
<div class="panel-section">
  <span class="panel-title">Piloto Automático</span>
  <div class="panel-grid">
    <span class="panel-label">Estado</span>
    <span id="autopilot-state">—</span>
    <span class="panel-label">Segmento</span>
    <span id="autopilot-segment">—</span>
    <span class="panel-label">Tipo</span>
    <span id="autopilot-type">—</span>
  </div>
  <button id="autopilot-toggle" disabled>Iniciar Piloto</button>
</div>
```

**3. `bootstrapLegacyRuntime` — wiring:**
```js
var autopilotDomain = app.getModule("domains", "autopilot").createAutopilotDomain({
  tractorState: tractorState,
  runtime: runtimeState,
  clamp: clamp,
  pushUiMessage: function(text, ttl) { pushUiMessage(runtimeState, text, ttl); },
  renderHud: renderHud,
  mapLayers: mapDomain.getPlannerLayers()
});

// plannerDomain recebe autopilotDomain para que clearPlan() possa chamar deactivate()
var plannerDomain = app.getModule("domains", "planner").createPlannerDomain({
  // ... configs existentes ...
  autopilotDomain: autopilotDomain   // ← OBRIGATÓRIO para T7 funcionar
});

// tractorDomain e keyboardModule recebem isAutopilotActive
// No game loop, antes de tractorDomain.update(deltaMs):
//   autopilotDomain.update(deltaMs);
// Adicionar onAutopilotToggle nas actions do painel:
//   onAutopilotToggle: function() { autopilotDomain.toggle(); }
```

**4. `buildHudViewModel()` — sub-objeto `autopilot`:**
```js
autopilot: (function() {
  var snap = autopilotDomain.getSnapshot();
  var hasPlan = Boolean(runtimeState.coveragePlanner.coverage_plan);
  var stateLabel = snap.state === "active" ? "PILOTO ATIVO"
    : snap.state === "paused" ? "PILOTO PAUSADO" : "—";
  var typeLabel = snap.segmentType === "swath" ? "Faixa"
    : (snap.segmentType === "transition" || snap.segmentType === "entry") ? "Cabeceira" : "—";
  var segLabel = snap.state !== "inactive"
    ? "Seg " + (snap.segmentIndex + 1) + " / " + snap.segmentCount : "—";
  var btnLabel = snap.state === "active" ? "Pausar Piloto"
    : snap.state === "paused" ? "Retomar Piloto" : "Iniciar Piloto";
  return {
    state_label:     stateLabel,
    segment_label:   segLabel,
    type_label:      typeLabel,
    button_label:    btnLabel,
    button_disabled: !hasPlan
  };
})()
```

**Requisitos cobertos:** AP-01, AP-01b, AP-01c, AP-05, AP-19, AP-20, AP-21, AP-22

**Done when:**
- [ ] `<script src="src/domains/autopilot.js">` presente após `planner.js`
- [ ] Elementos `#autopilot-state`, `#autopilot-segment`, `#autopilot-type`, `#autopilot-toggle` existem no DOM
- [ ] `autopilotDomain` é criado no bootstrap com todos os campos de config
- [ ] `autopilotDomain.update(deltaMs)` é chamado antes de `tractorDomain.update(deltaMs)` no game loop
- [ ] `isAutopilotActive` passado para `tractorDomain` e `keyboardModule`
- [ ] `autopilotDomain` passado a `createPlannerDomain(config)` no bootstrap (para que `clearPlan()` em T7 consiga chamar `deactivate()`)
- [ ] `buildHudViewModel()` retorna sub-objeto `autopilot` com os 5 campos
- [ ] `"entry"` mapeia para `"Cabeceira"` no `type_label`

**Commit:** `feat(index): DOM, bootstrap e viewModel do piloto automático`

---

### T9: Validação end-to-end

**O que:** Verificar manualmente todos os fluxos críticos no browser
**Onde:** `prototipo/index.html` aberto no browser
**Depende de:** T8

**Fluxos a verificar:**

1. **Sem plano** — pressionar `A` → HUD exibe mensagem de erro; piloto permanece inativo
2. **Ativação** — gerar plano → pressionar `A` → trator inicia movimento autônomo; HUD mostra "PILOTO ATIVO"
3. **Velocidade** — observar HUD: velocidade cai nas cabeceiras (`"entry"` e `"transition"`), sobe nos swaths
4. **Progresso** — HUD atualiza "Seg X / Y" e tipo "Faixa" / "Cabeceira" a cada avanço de segmento
5. **Setas bloqueadas** — durante piloto ativo, setas não movem o trator; tecla `D` ainda funciona
6. **Pausar/retomar** — pressionar `A` → "PILOTO PAUSADO", trator para, setas funcionam → pressionar `A` → reacoplamento, piloto retoma
7. **Botão HUD** — controlar piloto inteiro pelo botão sem usar teclado
8. **clearPlan** — com piloto ativo → descartar plano → piloto desativa; HUD exibe mensagem
9. **Drawing mode** — ativar piloto → entrar em drawing mode (`paused_tractor` externo) → trator para → fechar drawing → piloto reacoplado retoma
10. **Fim de rota** — piloto completa toda a rota → para, "Rota concluída.", estado volta a inativo

**Requisitos cobertos:** Todos os 28 AP-xx

**Done when:**
- [ ] Todos os 10 fluxos acima passam sem erros no console
- [ ] Nenhum loop infinito ou travamento de tela detectado
- [ ] HUD nunca exibe `undefined` ou campos vazios durante o piloto

**Commit:** N/A (apenas validação — sem mudanças de código)

---

## Parallel Execution Map

```
Fase 1 (Sequencial):
  T1 ──→ T2 ──→ T3

Fase 2 (Paralelo após T3):
  T3 completo, então:
    ├── T4 [P]  keyboard.js
    ├── T5 [P]  map.js
    └── T6 [P]  dom + hud + panels

Fase 3 (Sequencial):
  T4 + T5 + T6 completos, então:
    T7 ──→ T8 ──→ T9
```

---

## Requirement Traceability — atualização

| Requirement ID | Task | Status |
|---|---|---|
| AP-01, AP-01b, AP-01c | T1, T4, T8 | Pending |
| AP-02 | T1, T6 | Pending |
| AP-03 | T3, T4 | Pending |
| AP-04 | T1, T3 | Pending |
| AP-05 | T6, T8 | Pending |
| AP-06, AP-07 | T1 | Pending |
| AP-08, AP-09 | T1 | Pending |
| AP-10, AP-11, AP-12, AP-13 | T1 | Pending |
| AP-14, AP-15 | T1, T4 | Pending |
| AP-16 | T3, T4 | Pending |
| AP-17, AP-18 | T1 | Pending |
| AP-19 | T6, T8 | Pending |
| AP-20, AP-21 | T1, T6, T8 | Pending |
| AP-22 | T1, T5, T7 | Pending |
| AP-23 | T7 | Pending |
| AP-24 | T1 | Pending |
| AP-25 | T1 | Pending |
| AP-26 | T1 | Pending |

**Coverage:** 28 requisitos → 9 tasks → todos mapeados ✅
