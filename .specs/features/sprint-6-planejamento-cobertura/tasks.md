# Sprint 6: Planejamento de Cobertura com Custo de Compactacao - Tasks

**Spec**: [spec.md](spec.md)
**Design**: [design.md](design.md)
**Status**: Completed

---

## Validation Inputs Incorporated

- O planner deve manter o desenho manual por clique em vertices com Leaflet nativo; `leaflet-draw` fica explicitamente fora do MVP.
- O `headland` deve existir como geometria explicita e renderizavel (`HeadlandGeometry`), nao apenas como `headland_width_m`.
- Mudar `working_width_m` ou concluir um novo `field_polygon` deve invalidar imediatamente o `coverage_plan` anterior.
- `buildFieldPolygon()` deve rejeitar vertices fora do recorte operacional no proprio pseudocodigo de referencia.
- `attachSwathAnchors()` deve usar `headland.path_ring`, nao o contorno bruto do `field_polygon`.

---

## Execution Plan

### Phase 1: Planner Foundation (Sequential)

T1 -> T2 -> T3 -> T4 -> T5

### Phase 2: Runtime Integration (Parallel OK)

Depois de T5:

- T6 [P]
- T7 [P]

T6 + T7 -> T8

### Phase 3: Validation (Sequential)

T8 -> T9

---

## Task Breakdown

### T1: Preparar contratos base do runtime e shell do planner

**What**: Preparar `prototipo/index.html` para a Sprint 6 adicionando o estado `coveragePlanner`, o novo contrato `working_width_m`, o shell visual do planner no HUD e um `L.layerGroup()` dedicado aos overlays do plano.
**Where**: `prototipo/index.html`
**Depends on**: None
**Reuses**: `runtimeState`, `getActiveTractorConfig()`, HUD atual, decisoes D1, D2 e D3 de [design.md](design.md)
**Requirement**: S6CPP-01, S6CPP-03, S6CPP-17, S6CPP-18

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `runtimeState` inclui `coveragePlanner` com `mode`, `overlay_mode`, `working_width_m`, `draft_vertices`, `field_polygon`, `coverage_plan`, `status_message` e `paused_tractor`
- [x] `getActiveTractorConfig()` expoe `working_width_m`
- [x] O valor default de `working_width_m` fica definido em `6.0`
- [x] O HTML pre-constroi o bloco do planner com `input[type=number]` para `working_width_m`, botoes `Iniciar talhao`, `Fechar talhao`, `Cancelar desenho`, `Gerar plano`, `Limpar plano`, toggle `Ver baseline` / `Ver otimizada`, area de `status_message` e placeholders de metricas
- [x] Existe `plannerOverlayLayer` com subcamadas dedicadas para rascunho, talhao, headland, swaths, rotas e origem

**Commit**: `feat(prototipo): prepara contratos e shell do planner de cobertura`

---

### T2: Implementar desenho manual do talhao e validacao de entrada

**What**: Implementar a interacao de desenho manual por clique, o ciclo de vida `idle -> drawing -> polygon-ready`, e a funcao `buildFieldPolygon()` com validacao de bounds, auto-interseccao e area minima.
**Where**: `prototipo/index.html`
**Depends on**: T1
**Reuses**: `map.on("click")`, `attachKeyboardControls()`, `FieldPolygon`, `buildFieldPolygon()` e D10, D11 de [design.md](design.md)
**Requirement**: S6CPP-01, S6CPP-02, S6CPP-06, S6CPP-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `startFieldDrawing()`, `finishFieldDrawing()` e `cancelFieldDrawing()`
- [x] Durante `mode === "drawing"`, a navegacao do trator e pausada e o input por setas e ignorado
- [x] Cliques no mapa adicionam vertices ao rascunho via `draft_vertices`
- [x] `buildFieldPolygon()` rejeita vertices fora do recorte operacional
- [x] `buildFieldPolygon()` rejeita auto-interseccao, vertices insuficientes e area abaixo do minimo
- [x] `finishFieldDrawing()` normaliza o poligono, substitui o `field_polygon` anterior e deixa o planner em `polygon-ready`

**Commit**: `feat(prototipo): adiciona desenho manual e validacao de talhao`

---

### T3: Implementar geometria local, `headland` explicito e geracao de `swaths`

**What**: Criar os helpers geometricos em XY local, derivar a orientacao das faixas, construir `HeadlandGeometry` e gerar as `swaths` paralelas podadas pela largura do `headland`.
**Where**: `prototipo/index.html`
**Depends on**: T2
**Reuses**: `projectLatLng()`, `unprojectXY()`, `deriveSwathOrientation()`, `buildHeadlandGeometry()`, `buildSwaths()` e D4, D5 de [design.md](design.md)
**Requirement**: S6CPP-03, S6CPP-04, S6CPP-05, S6CPP-17

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] A geometria do planner e calculada em XY local metrico
- [x] `deriveSwathOrientation()` escolhe automaticamente o maior eixo do talhao
- [x] Existe `buildHeadlandGeometry()` retornando `outer_ring`, `inner_ring`, `path_ring` e `render_mode`
- [x] O fallback do `headland` usa `outer-stroke-fallback` quando a contracao interna falhar
- [x] `buildSwaths()` gera faixas paralelas dentro do talhao com espacamento `working_width_m`
- [x] Poligonos concavos podem gerar multiplos intervalos validos no mesmo `scan_index`

**Commit**: `feat(prototipo): deriva headland e swaths do talhao desenhado`

---

### T4: Implementar anchors, amostragem espacial e indice de custo agronomico

**What**: Conectar as `swaths` ao `headland.path_ring`, amostrar segmentos por celula e precomputar o `PlannerCellCost` usando terreno base e `compaction_accumulator`.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: `attachSwathAnchors()`, `sampleSegmentCells()`, `hydratePlannerCellCostIndex()`, `runCompactionMotor()`, `compaction_accumulator` de [design.md](design.md)
**Requirement**: S6CPP-10, S6CPP-11, S6CPP-12, S6CPP-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `attachSwathAnchors()` ancora endpoints em `headland.path_ring`
- [x] `sampleSegmentCells()` consolida comprimento por `cell_id` com passo fixo do MVP
- [x] `hydratePlannerCellCostIndex()` usa a camada `20-30 cm` como referencia do proxy
- [x] O indice de custo combina terreno base e acumulado historico da missao
- [x] Celulas `water` ou `unavailable` recebem penalidade alta, mas finita
- [x] O planner continua funcionando quando a missao ainda nao tiver `compaction_accumulator`

**Commit**: `feat(prototipo): precomputa custo agronomico e anchors do planner`

---

### T5: Implementar transicoes e heuristicas de rota baseline e otimizada

**What**: Implementar `buildBoundaryArc()`, `buildTransitionPolyline()`, `estimatePolylineCompactionCost()`, `planCoverageRoute()` e `buildCoveragePlan()` para gerar baseline e rota otimizada sobre o mesmo conjunto de `swaths`.
**Where**: `prototipo/index.html`
**Depends on**: T4
**Reuses**: `headland.path_ring`, `RoutePlan`, `CoveragePlan`, D8 e D9 de [design.md](design.md)
**Requirement**: S6CPP-08, S6CPP-09, S6CPP-10, S6CPP-13, S6CPP-15, S6CPP-16

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `buildBoundaryArc()` compara os dois arcos possiveis do `headland.path_ring`
- [x] `buildTransitionPolyline()` monta entrada + arco + conexao ao anchor da `swath`
- [x] `estimatePolylineCompactionCost()` penaliza retrafego dentro da rota corrente
- [x] `planCoverageRoute(..., "baseline")` minimiza principalmente comprimento
- [x] `planCoverageRoute(..., "optimized")` usa `distancia + compactacao` com escalas normalizadas
- [x] `buildCoveragePlan()` retorna `field_polygon`, `working_width_m`, `headland_width_m`, `swath_orientation_deg`, `headland`, `swaths`, `baseline_route`, `optimized_route` e `metrics`

**Commit**: `feat(prototipo): gera rotas baseline e otimizada para cobertura`

---

### T6: Integrar o planner ao HUD e ao ciclo de invalidacao das entradas

**What**: Integrar os controles do planner ao HUD, aplicar a regra de invalidacao do `coverage_plan` quando mudarem as entradas e expor o estado do planner no `buildHudViewModel()` e `renderHud()`.
**Where**: `prototipo/index.html`
**Depends on**: T5
**Reuses**: bloco do planner no HUD, `setPlannerWorkingWidth()`, D11 de [design.md](design.md)
**Requirement**: S6CPP-07, S6CPP-18, S6CPP-19, S6CPP-20, S6CPP-22

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `setPlannerWorkingWidth(value)` com validacao numerica
- [x] Mudar `working_width_m` limpa `coverage_plan`, metricas e overlays, preservando o `field_polygon`
- [x] Concluir um novo `field_polygon` invalida o plano anterior
- [x] `cancelFieldDrawing()` descarta so o rascunho em andamento
- [x] `buildHudViewModel()` expande o bloco `planner` com status e metricas resumidas
- [x] `renderHud()` atualiza os controles e metricas do planner sem recriar o DOM

**Commit**: `feat(prototipo): integra controles e metricas do planner ao hud`

---

### T7: Renderizar overlays do planner no mapa sem interferir no runtime atual

**What**: Renderizar o rascunho, o talhao, o `headland`, as `swaths`, a origem e as rotas baseline/otimizada em `plannerOverlayLayer`, com suporte a alternancia de destaque visual.
**Where**: `prototipo/index.html`
**Depends on**: T5
**Reuses**: `plannerOverlayLayer`, `HeadlandGeometry`, `CoveragePlan`, decisoes de overlay de [design.md](design.md)
**Requirement**: S6CPP-04, S6CPP-17, S6CPP-18, S6CPP-21

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O rascunho do desenho usa `L.circleMarker` + `L.polyline`
- [x] O talhao final usa `L.polygon`
- [x] O `headland` usa banda ou `outer-stroke-fallback` conforme `render_mode`
- [x] As `swaths` sao desenhadas em camada separada
- [x] A origem logica do plano e desenhada em camada dedicada
- [x] Baseline e otimizada podem ser destacadas por `overlay_mode` sem recalculo
- [x] Limpar o plano remove apenas overlays do planner, sem tocar no overlay BDC nem no resto do mapa

**Commit**: `feat(prototipo): adiciona overlays do planner de cobertura`

---

### T8: Integrar o planner ao loop do runtime e preservar compatibilidade com missao

**What**: Garantir que o planner conviva corretamente com navegacao, sampling, reset de missao e export, sem persistir `coverage_plan` no `localStorage` e sem regressao nas Sprints 1 a 5.
**Where**: `prototipo/index.html`
**Depends on**: T6, T7
**Reuses**: `attachKeyboardControls()`, gameloop, `createMission()`, `buildMissionExport()`, `resetMission()`
**Requirement**: S6CPP-01, S6CPP-12, S6CPP-18, S6CPP-21, S6CPP-22

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Durante `mode === "drawing"`, o trator permanece pausado e nao amostra a missao
- [x] Fora do modo de desenho, navegacao e missao continuam como nas sprints anteriores
- [x] `coveragePlanner` permanece runtime-only e nao entra no schema da missao
- [x] `working_width_m` entra em `active_tractor_config` e nos snapshots do trator
- [x] `resetMission()` limpa o planner via `clearCoveragePlan()` sem afetar a estrutura existente da missao
- [x] `buildMissionExport()` permanece compativel e nao exporta o plano da Sprint 6

**Commit**: `feat(prototipo): integra planner ao runtime sem persistencia extra`

---

### T9: Validar a sprint contra spec, design e cenarios do MVP

**What**: Revisar o comportamento final do planner em cenarios validos, invalidos, com e sem historico acumulado, confirmando que a implementacao cumpre os requisitos da Sprint 6 sem regredir o prototipo.
**Where**: `prototipo/index.html`, `.specs/features/sprint-6-planejamento-cobertura/spec.md`, `.specs/features/sprint-6-planejamento-cobertura/design.md`
**Depends on**: T8
**Reuses**: criterios de sucesso da sprint e validacao do design
**Requirement**: S6CPP-01 a S6CPP-22

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Desenhar um talhao simples gera `field_polygon`, `headland` e `swaths` visiveis no mapa
- [x] Poligono auto-intersectante ou fora do recorte e rejeitado com erro diagnostico
- [x] Mudar `working_width_m` invalida o plano anterior e exige novo calculo
- [x] O planner gera baseline e rota otimizada cobrindo o mesmo conjunto de `swaths`
- [x] A rota otimizada usa custo agronomico com terreno base + `compaction_accumulator` quando disponivel
- [x] Missao sem acumulado continua produzindo plano valido com fallback para terreno base
- [x] Alternar visualizacao baseline/otimizada nao recalcula o plano nem quebra o HUD
- [x] Navegacao, coleta, HUD, overlay BDC e compactacao continuam sem regressao quando nao houver plano ativo

**Commit**: `feat(prototipo): valida sprint 6 de planejamento de cobertura`

---

## Parallel Execution Map

```text
Phase 1 (Sequential):
  T1 -> T2 -> T3 -> T4 -> T5

Phase 2 (Parallel):
  T5 complete, then:
    -> T6 [P]
    -> T7 [P]

  T6 + T7 -> T8

Phase 3 (Sequential):
  T8 -> T9
```

---

## Notes

- O MVP continua inteiro em `prototipo/index.html`; sem build, sem servidor e sem dependencia externa nova.
- O `headland` desta sprint e uma geometria explicita, mas ainda simplificada; nao e um buffer poligonal cientifico completo.
- O planner usa a grade operacional como suporte espacial do custo agronomico, mesmo quando o solo base vem do pipeline BDC da Sprint 4 e do acumulado da Sprint 5.
- O desenho por clique em vertices foi mantido de proposito para reduzir custo de integracao e validacao do MVP.

---

## Validation Summary

**Date**: 2026-04-06

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | Shell do planner, `coveragePlanner` e overlays dedicados |
| T2 | ✅ Done | Desenho manual por clique, validacao de bounds e pausa do trator |
| T3 | ✅ Done | Geometria local, `headland` explicito e `swaths` |
| T4 | ✅ Done | Anchors, amostragem por celula e custo agronomico |
| T5 | ✅ Done | Baseline, otimizada e correcoes no arco do `headland` |
| T6 | ✅ Done | HUD, invalidacao por entrada e controles do planner |
| T7 | ✅ Done | Overlays de preview, origem e rotas com destaque visual |
| T8 | ✅ Done | Integracao ao runtime sem persistir `coverage_plan` |
| T9 | ✅ Done | Validacao final contra spec, design e cenarios do MVP |

## Validation Results

- `inline-script-parse-ok`
- Validacao sintetica do planner confirmou:
  - cobertura equivalente entre baseline e otimizada
  - repetibilidade deterministica para a mesma entrada
  - erros diagnosticos para auto-interseccao e fora do recorte
  - aumento de custo com `compaction_accumulator`
  - fallback funcional sem acumulado
- Validacao manual no browser confirmou:
  - preview do talhao com `headland` e `swaths`
  - geracao do plano apos a correcao do `Invalid array length`

## Quality Check

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches runtime patterns | ✅ |
