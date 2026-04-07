# Sprint 8: Metodo Soil2Cover - Tasks

**Spec**: [spec.md](spec.md)
**Design**: [design.md](design.md)
**Status**: Completed

---

## Validation Inputs Incorporated

- A Sprint 8 troca apenas o nucleo algoritmico do planner e preserva a casca
  visual, HUD e overlays da Sprint 7.
- `robot_width_m` sera derivado do trator atual e, se estiver indisponivel, o
  preview e o plano ficam indisponiveis com diagnostico claro.
- `representative_soil_context` usa solo homogeneo representativo por area
  amostrada dentro do talhao e sua falha nao deve invalidar a geometria do
  preview.
- `headland` e `swaths` precisam permanecer compativeis com o renderer atual,
  inclusive com `render_mode`, `outer_ring_latlng`, `inner_ring_latlng`,
  `start_latlng` e `end_latlng`.
- baseline e Soil2Cover passam pelo mesmo pipeline `GP -> GC`, mudando apenas a
  politica de pesos.
- a reponderacao do `GP` deve seguir `d_ij * B_rho(n_ij)` e nao uma variante
  diferente.
- `coverage_plan` precisa continuar entregando `origin_latlng`, `origin_xy` e
  as chaves de `metrics` ja consumidas pelo HUD atual.
- quando a rota Soil2Cover falhar, a baseline deve continuar disponivel e o
  `overlay_mode` efetivo deve cair para `baseline`.

---

## Execution Plan

### Phase 1: Foundation and Preview Geometry (Sequential)

T1 -> T2

### Phase 2: Graph Core and Soil2Cover Method (Parallel OK)

Depois de T2:

- T3 [P]
- T4

T4 -> T5 -> T6

T3 + T6 -> T7

### Phase 3: Runtime Integration and Validation (Sequential)

T7 -> T8 -> T9

---

## Task Breakdown

### T1: Preparar contexto Soil2Cover de maquina e templates SoilFlex

**What**: Estender o runtime com os campos minimos de contexto Soil2Cover do trator atual e introduzir o catalogo local de templates SoilFlex.
**Where**: `prototipo/index.html`
**Depends on**: None
**Reuses**: `getActiveTractorConfig()`, presets atuais do trator, snapshots de terreno, D2 e D4 de [design.md](design.md)
**Requirement**: S8MSC-01, S8MSC-03, S8MSC-04, S8MSC-27

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `deriveRobotWidthM(activeTractorConfig)` usando a regra `track_gauge + tyre_width`
- [x] `getActiveTractorConfig()` passa a expor `running_gear_type`, `contact_width_m`, `contact_length_m`, `robot_width_m` e `load_distribution_model`
- [x] Existe um catalogo local `SOIL2COVER_SOILFLEX_TEMPLATES`
- [x] Os templates cobrem os parametros obrigatorios do SoilFlex contratados no spec
- [x] Os templates fixam explicitamente a regra de `specific_volume_initial`: valor informado no template ou derivado deterministicamente de `bulk_density_initial` e `density_of_solids`
- [x] O contexto de maquina ou validacao associada cobre o caso `track`, incluindo ao menos o contrato/placeholder diagnostico para `track_width_m`, `track_length_m`, `idlers_per_track`, `idler_radius_m`, `rollers_per_track`, `roller_radius_m` e `wheel_load_fractions`
- [x] Falta de `robot_width_m` gera diagnostico claro para indisponibilidade do preview/plano

**Commit**: `feat(prototipo): prepara contexto de maquina e templates soilflex`

---

### T2: Substituir o preview por geometria Soil2Cover de `headland` e `swaths`

**What**: Implementar `headland = 3 x robot_width_m`, geometria do campo interno e busca exaustiva do angulo das `swaths`, mantendo o preview compativel com o renderer atual.
**Where**: `prototipo/index.html`
**Depends on**: T1
**Reuses**: `projectLatLng()`, helpers XY locais, `renderPlannerDrawingOverlay()`, D5, D6 e D7 de [design.md](design.md)
**Requirement**: S8MSC-05, S8MSC-06, S8MSC-07, S8MSC-08, S8MSC-09, S8MSC-26

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `buildSoil2CoverHeadland(fieldPolygon, robotWidthM, internalObstacles)`
- [x] O `headland_width_m` passa a ser `3 * robot_width_m`
- [x] Existe `searchBestSwathOrientation(..., stepDeg)` com passo padrao de `1`
- [x] A orientacao deixa de usar PCA e passa a usar a soma dos comprimentos das `swaths`
- [x] O preview continua entregando `headland.render_mode`, `outer_ring_latlng`, `inner_ring_latlng`, `swath.start_latlng` e `swath.end_latlng`
- [x] O resultado e deterministico para o mesmo talhao e mesma `working_width_m`

**Commit**: `feat(prototipo): gera preview soil2cover com headland e swaths`

---

### T3: Resolver `representative_soil_context` e diagnosticos de homogeneidade [P]

**What**: Construir o contexto de solo homogeneo representativo do talhao a partir da area amostrada e acoplar seus diagnosticos ao preview sem bloquear a geometria.
**Where**: `prototipo/index.html`
**Depends on**: T2
**Reuses**: raster BDC, snapshots de terreno, `field_polygon`, D3 e D4 de [design.md](design.md)
**Requirement**: S8MSC-01, S8MSC-03, S8MSC-23, S8MSC-26

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `resolveRepresentativeSoilContext(fieldPolygon)`
- [x] A selecao do template dominante usa area amostrada dentro do talhao como regra unica
- [x] `representative_soil_context` pode ser `null` quando os insumos do SoilFlex forem insuficientes
- [x] Falha em `representative_soil_context` nao invalida `headland` nem `swaths`
- [x] O preview registra `homogeneity_status` e diagnosticos de mistura relevante do solo

**Commit**: `feat(prototipo): adiciona contexto de solo representativo para soil2cover`

---

### T4: Construir o `Path Graph (GP)` e segmentar arestas atomicas

**What**: Implementar o `Path Graph` do Soil2Cover com `path_rings`, endpoints snapped e segmentacao de arestas sobrepostas em segmentos atomicos.
**Where**: `prototipo/index.html`
**Depends on**: T2
**Reuses**: `path_rings_xy`, snap ao anel, XY local, D9 e D10 de [design.md](design.md)
**Requirement**: S8MSC-09, S8MSC-10, S8MSC-11, S8MSC-25, S8MSC-26

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `buildPathGraph(preview, entryPoint, exitPoint)`
- [x] `GP` inclui vertices dos `path_rings`, endpoints das `swaths`, pontos snapped, `entry_point` e `exit_point` opcional
- [x] Existe `splitPathGraphOverlaps(pathGraph, toleranceM)`
- [x] Arestas sobrepostas sao quebradas em segmentos atomicos sem ambiguidade de contagem
- [x] `GP` preserva identificadores estaveis de vertices e arestas para rastrear `n_ij`

**Commit**: `feat(prototipo): implementa path graph soil2cover`

---

### T5: Implementar menores caminhos em `GP` e construir o `Coverage Graph (GC)`

**What**: Calcular menores caminhos all-pairs em `GP`, montar `GC` e reconstruir caminhos via predecessor ou `next-hop`.
**Where**: `prototipo/index.html`
**Depends on**: T4
**Reuses**: `GP`, endpoints das `swaths`, D10 de [design.md](design.md)
**Requirement**: S8MSC-12, S8MSC-13, S8MSC-25, S8MSC-26

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `computePathGraphShortestPaths(pathGraph)` por Floyd-Warshall ou equivalente
- [x] Existe `buildCoverageGraph(pathGraph, swaths, entryPoint)`
- [x] `GC` usa custo zero entre endpoints da mesma `swath`
- [x] Os demais custos de `GC` derivam dos menores caminhos de `GP`
- [x] `exit_point`, quando existir, nao altera a ordem de cobertura em `GC`
- [x] Vertices desconectados ficam com custo infinito ou diagnostico equivalente

**Commit**: `feat(prototipo): adiciona coverage graph e menores caminhos`

---

### T6: Resolver baseline e ordem de cobertura como TSP equivalente

**What**: Implementar o solver deterministico da ordem de cobertura sobre `GC` e gerar a baseline por distancia expandida via `GP`.
**Where**: `prototipo/index.html`
**Depends on**: T5
**Reuses**: `GC`, `expandCoverageOrderViaGp()`, formatos de rota da Sprint 7, D11 e D14 de [design.md](design.md)
**Requirement**: S8MSC-14, S8MSC-15, S8MSC-21, S8MSC-25, S8MSC-26

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `solveCoverageOrderGc(...)` com comportamento deterministico
- [x] O solver retorna a ordem completa das `swaths` e a orientacao de cada uma
- [x] Existe `buildBaselineCoverageRoute(preview, entryPointLatLng, exitPointLatLng)`
- [x] A baseline passa a ser gerada sobre `GP -> GC`, sem heuristica gulosa local
- [x] A rota expandida continua compativel com `renderPlannerDrawingOverlay()`

**Commit**: `feat(prototipo): resolve baseline soil2cover sobre coverage graph`

---

### T7: Implementar `B_rho(n)` e a iteracao Soil2Cover sobre `GP`

**What**: Construir a curva `B_rho(n)`, reponderar `GP` por `d_ij * B_rho(n_ij)` e gerar a rota otimizada iterativa com trace de convergencia.
**Where**: `prototipo/index.html`
**Depends on**: T3, T6
**Reuses**: templates SoilFlex, `GP`, `GC`, `solveCoverageOrderGc()`, D12 e D13 de [design.md](design.md)
**Requirement**: S8MSC-01, S8MSC-02, S8MSC-16, S8MSC-17, S8MSC-18, S8MSC-19, S8MSC-20, S8MSC-24, S8MSC-26

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `buildBrhoCurve(soilContext, machineContext, maxPasses)`
- [x] Existe `buildSoil2CoverCoverageRoute(preview, entryPointLatLng, exitPointLatLng, options)`
- [x] A primeira iteracao usa pesos de distancia em `GP`
- [x] Iteracoes seguintes usam `d_ij * B_rho(n_ij)` conforme o spec
- [x] O algoritmo atualiza `n_ij` pelas arestas atomicas da rota expandida
- [x] O trace registra `iteration`, `route_signature`, `total_length_m`, `total_compaction_cost` e `stop_criterion`
- [x] O processo para por convergencia ou por limite maximo explicitamente diagnosticado

**Commit**: `feat(prototipo): implementa iteracao soil2cover por brho e nij`

---

### T8: Integrar `coverage_plan`, HUD e degradacao para baseline

**What**: Integrar o novo planner ao runtime atual, compor `coverage_plan` e `metrics` no contrato da Sprint 7 e garantir fallback operacional quando a rota Soil2Cover falhar.
**Where**: `prototipo/index.html`
**Depends on**: T7
**Reuses**: `buildCoveragePlan()`, `coverage_preview`, `renderPlannerDrawingOverlay()`, `buildHudViewModel()`, D1, D14 e politica de falha de [design.md](design.md)
**Requirement**: S8MSC-21, S8MSC-22, S8MSC-23, S8MSC-25, S8MSC-26, S8MSC-27

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `buildCoveragePlan()` passa a retornar `origin_latlng`, `origin_xy`, `baseline_route`, `optimized_route`, `metrics`, `soil2cover_trace` e `diagnostics`
- [x] `metrics` inclui `baseline_length_m`, `optimized_length_m`, `baseline_compaction_cost`, `optimized_compaction_cost`, `delta_length_pct`, `delta_compaction_pct`, `soil2cover_iterations`, `soil2cover_stop_reason`, `soil_homogeneity_status` e `solver_strategy`
- [x] `renderPlannerDrawingOverlay()` continua funcionando sem reescrita estrutural
- [x] Quando `optimized_route = null`, a baseline permanece desenhavel e o `overlay_mode` efetivo cai para `baseline`
- [x] O HUD mostra diagnosticos e metricas novas sem quebrar o painel existente

**Commit**: `feat(prototipo): integra plano soil2cover ao runtime e ao hud`

---

### T9: Validar a Sprint 8 contra spec, design e cenarios do artigo

**What**: Validar o comportamento final da Sprint 8 no prototipo, confirmando a troca do metodo, a preservacao da UX da Sprint 7 e os principais edge cases do Soil2Cover.
**Where**: `prototipo/index.html`, `.specs/features/sprint-8-metodo-soil2cover/spec.md`, `.specs/features/sprint-8-metodo-soil2cover/design.md`
**Depends on**: T8
**Reuses**: criterios de sucesso, edge cases, artigos-base e validacao do design
**Requirement**: S8MSC-01 a S8MSC-27

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O `headland` passa a usar `3 x robot_width_m`
- [x] A orientacao das `swaths` deixa de usar PCA e passa a vir da busca exaustiva de `1 grau`
- [x] Baseline e Soil2Cover usam `GP + GC` em vez da heuristica gulosa local
- [x] A iteracao Soil2Cover converge ou para por limite com diagnostico claro
- [x] `B_rho(n)` e `n_ij` influenciam a rota otimizada de forma observavel
- [x] O runtime preserva os overlays e a UX da Sprint 7
- [x] Falha de SoilFlex mantem baseline disponivel e explicita a indisponibilidade da rota otimizada
- [x] O comportamento final permanece deterministico para os mesmos insumos

**Commit**: `feat(prototipo): valida sprint 8 do metodo soil2cover`

---

## Parallel Execution Map

```text
Phase 1 (Sequential):
  T1 -> T2

Phase 2 (Mixed):
  T2 complete, then:
    -> T3 [P]
    -> T4

  T4 -> T5 -> T6

  T3 + T6 -> T7

Phase 3 (Sequential):
  T7 -> T8 -> T9
```

---

## Notes

- A Sprint 8 continua inteiramente em `prototipo/index.html`, sem build, sem servidor e sem dependencias externas novas.
- A UX e os overlays da Sprint 7 sao preservados; a troca principal e no pipeline de geracao da rota.
- `internal_obstacles` entram apenas se vierem de estrutura geometrica ja disponivel no runtime; nao ha nova UI para autoria nessa sprint.
- O solver de `GC` precisa ser deterministico e explicitamente rastreavel, mesmo sem OR-Tools no browser.
- O custo Soil2Cover desta sprint deixa de usar o agregador espacial do planner atual e passa a usar `B_rho(n)` sobre um contexto de solo homogeneo representativo do talhao.

---

## Validation Summary

- `headland = 3 x robot_width_m` confirmado no pipeline geometrico
- orientacao das `swaths` por busca exaustiva de `1 grau`
- baseline e rota Soil2Cover usando `GP + GC`
- `B_rho(n)` e `n_ij` integrados na reponderacao iterativa de `GP`
- fallback para baseline quando a rota Soil2Cover fica indisponivel
- `soil2cover_trace`, metricas novas e diagnosticos integrados ao `coverage_plan`
- UX, overlays e HUD da Sprint 7 preservados
