# Sprint 7: Visualizacao do Plano e Navegacao do Planner - Tasks

**Spec**: [spec.md](spec.md)
**Design**: [design.md](design.md)
**Status**: Completed

---

## Validation Inputs Incorporated

- O foco principal da sprint e legibilidade operacional do plano, nao
  refatoracao ampla de `prototipo/index.html`.
- O provider atual de satelite sera mantido; a melhora de zoom vira por
  `stretch` local acima de `maxNativeZoom`, nao por zoom real no servico.
- O usuario deve conseguir ajustar zoom tambem durante a conducao normal, sem
  sair do `follow mode`.
- Em `follow mode`, a rota secundaria pode ser ocultada para reduzir
  sobreposicao visual; em `planner mode`, ela continua visivel em ghosted mode.
- `coveragePlanner.view.map_base` deve virar a unica origem de verdade para
  satelite vs BDC, absorvendo ou espelhando o toggle legado.
- `tileerror` da imagery deve degradar automaticamente para BDC quando houver
  raster disponivel, sem perder `coverage_plan`, zoom ou overlays.

---

## Execution Plan

### Phase 1: Camera and View-State Foundation (Sequential)

T1 -> T2 -> T3

### Phase 2: Visual Base and Overlay Legibility (Parallel OK)

Depois de T3:

- T4
- T5
- T6 [P]

T4 -> T5

T5 + T6 -> T7

### Phase 3: Runtime Compatibility and Validation (Sequential)

T7 -> T8 -> T9

---

## Task Breakdown

### T1: Preparar estado visual do planner e configuracao de zoom do mapa

**What**: Estender `coveragePlanner` com o subestado `view`, preparar `createMap()` para zoom visual fracionario e explicitar os limites `imagery_native_zoom` e `visual_max_zoom`.
**Where**: `prototipo/index.html`
**Depends on**: None
**Reuses**: `runtimeState.coveragePlanner`, `createMap()`, D2, D3 e estrutura da Sprint 6 em [design.md](design.md)
**Requirement**: S7VPN-01, S7VPN-02, S7VPN-21, S7VPN-23

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `runtimeState.coveragePlanner` inclui `view.mode`, `view.map_base`, `view.follow_zoom`, `view.planner_zoom`, `view.imagery_native_zoom`, `view.visual_max_zoom`, `view.fit_padding_px` e `view.imagery_failed`
- [x] `createMap()` usa `zoomSnap: 0.25` e `zoomDelta: 0.25`
- [x] `createMap()` explicita `maxNativeZoom: 16` e `maxZoom: 18` no fluxo final da imagery
- [x] O runtime deixa de depender apenas de `map.getZoom()` como origem implicita do zoom do usuario
- [x] O estado inicial do planner nasce em `follow` com `map_base = "imagery"`

**Commit**: `feat(prototipo): prepara estado visual e zoom fracionario do planner`

---

### T2: Implementar zoom operacional com camera seguindo o trator

**What**: Refatorar o comportamento de camera para preservar o zoom escolhido pelo usuario durante a navegacao normal, mantendo o trator no centro em `follow mode`.
**Where**: `prototipo/index.html`
**Depends on**: T1
**Reuses**: `setCameraPosition()`, gameloop, `tractorState.position`, D3 e D4 de [design.md](design.md)
**Requirement**: S7VPN-01, S7VPN-02, S7VPN-03, S7VPN-04, S7VPN-05, S7VPN-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `setPlannerZoom(directionOrValue)` com passo `0.25` e clamp entre os limites visuais definidos
- [x] `setCameraPosition()` usa `coveragePlanner.view.follow_zoom` em vez de `map.getZoom()`
- [x] Chamar `setPlannerZoom()` em `follow mode` atualiza `follow_zoom` e preserva o follow do trator
- [x] O runtime nao reseta `follow_zoom` manualmente durante a conducao
- [x] A task entrega o nucleo de camera e zoom operacional; os controles de HUD e a politica visual de imagery ficam para T5 e T7

**Commit**: `feat(prototipo): adiciona zoom operacional com follow do trator`

---

### T3: Implementar `planner view mode` e enquadramento do plano

**What**: Criar o modo livre do planner, habilitar interacoes manuais do mapa apenas nesse modo e adicionar `fitPlannerBounds()` para enquadrar talhao ou plano.
**Where**: `prototipo/index.html`
**Depends on**: T2
**Reuses**: `coveragePlanner.view`, `field_polygon`, `coverage_plan`, `updateMapInteractionPolicy()`, D4 e D9 de [design.md](design.md)
**Requirement**: S7VPN-07, S7VPN-08, S7VPN-09, S7VPN-10, S7VPN-11, S7VPN-12, S7VPN-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `setPlannerViewMode(mode)` para alternar entre `follow` e `planner`
- [x] Existe `updateMapInteractionPolicy()` habilitando `dragging`, `scrollWheelZoom`, `doubleClickZoom` e `touchZoom` apenas no `planner mode`
- [x] Existe `syncPlannerZoomFromMap()` ligado a `map.on("zoomend")` para manter estado e mapa coerentes em zoom manual
- [x] Existe `fitPlannerBounds()` usando `coverage_plan.field_polygon` ou `field_polygon`
- [x] `fitPlannerBounds()` aplica padding e clamp por `visual_max_zoom`
- [x] Entrar em `planner view mode` nao invalida `coverage_plan`, `field_polygon` nem a missao
- [x] Sair de `planner view mode` restaura o comportamento de camera operacional
- [x] Tentar entrar em `planner view mode` sem `field_polygon` nem `coverage_plan` gera diagnostico claro

**Commit**: `feat(prototipo): adiciona modo planner e enquadramento do plano`

---

### T4: Unificar a base visual do mapa e absorver o toggle BDC legado

**What**: Centralizar satelite vs BDC em `coveragePlanner.view.map_base`, fazer o toggle legado delegar ao novo fluxo e manter HUD/legenda coerentes.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: `toggleBdcOverlay()`, `btn-toggle-map`, `bdcOverlayLayer`, `coveragePlanner.view.map_base`, D5 e `setPlannerMapBase()` de [design.md](design.md)
**Requirement**: S7VPN-21, S7VPN-24, S7VPN-27, S7VPN-28, S7VPN-29

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `setPlannerMapBase(mode)` como unica funcao autorizada a trocar a base visual
- [x] O toggle legado `btn-toggle-map` delega para `setPlannerMapBase("imagery" | "bdc")`
- [x] `coveragePlanner.view.map_base` vira a origem primaria de verdade para a base atual
- [x] Botao legado, legenda BDC e HUD permanecem coerentes com a base ativa
- [x] Alternar a base visual preserva `coverage_plan`, `overlay_mode` e enquadramento atual

**Commit**: `feat(prototipo): unifica selecao de base visual do planner`

---

### T5: Implementar politica de imagery em zoom alto e fallback automatico

**What**: Aplicar a politica de stretch visual acima de `maxNativeZoom`, ajustar a opacidade da imagery quando houver plano ativo e degradar automaticamente para BDC em `tileerror`.
**Where**: `prototipo/index.html`
**Depends on**: T4
**Reuses**: `esriWorldImagery`, `tileerror`, raster BDC, `setPlannerMapBase()`, `handleImageryTileError()`, D2 e D8 de [design.md](design.md)
**Requirement**: S7VPN-21, S7VPN-22, S7VPN-23, S7VPN-24, S7VPN-25, S7VPN-26

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] A imagery continua limitada ao detalhe nativo do provider e o zoom visual adicional ocorre apenas no cliente
- [x] Aproximar acima de `imagery_native_zoom` nao produz erro visual do provider nem tela cinza
- [x] Existe `handleImageryTileError()` com `imagery_failed = true`
- [x] Se a imagery falhar e o raster BDC existir, o runtime muda automaticamente para `map_base = "bdc"` via `setPlannerMapBase()`
- [x] O fallback preserva `coverage_plan`, `field_polygon`, zoom atual e overlays do planner
- [x] A imagery tem opacidade reduzida quando houver plano ativo, sem apagar a leitura do overlay

**Commit**: `feat(prototipo): protege imagery em zoom alto e adiciona fallback para bdc`

---

### T6: Reforcar a hierarquia visual das rotas e faixas

**What**: Reestilizar o renderer do planner para dar prioridade clara a rota ativa, reduzir a competicao visual das `swaths` e esconder a rota secundaria em `follow mode`.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: `renderPlannerDrawingOverlay()`, `coverage_plan`, `overlay_mode`, D6 e D7 de [design.md](design.md)
**Requirement**: S7VPN-14, S7VPN-15, S7VPN-16, S7VPN-17, S7VPN-18, S7VPN-19, S7VPN-20

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `swaths` passam a ser renderizadas com peso e opacidade secundarios
- [x] A rota ativa usa `casing + inner stroke` ou equivalente de alto contraste
- [x] Segmentos de transicao ficam visualmente distintos dos segmentos de cobertura
- [x] Em `planner mode`, a rota secundaria permanece visivel em ghosted mode
- [x] Em `follow mode`, a rota secundaria pode ser ocultada sem afetar a leitura da rota ativa
- [x] A origem do plano permanece claramente identificavel sobre imagery e BDC
- [x] Alternar baseline/otimizada continua sendo troca puramente visual, sem recalculo do plano

**Commit**: `feat(prototipo): reforca legibilidade visual do planner`

---

### T7: Integrar HUD do planner com camera, base e zoom

**What**: Expandir o painel do planner para expor o novo modo de camera, zoom, base visual e enquadramento, refletindo o estado atual sem recriar o DOM.
**Where**: `prototipo/index.html`
**Depends on**: T4, T5, T6
**Reuses**: `buildHudViewModel()`, `renderHud()`, painel do planner atual, D5 de [design.md](design.md)
**Requirement**: S7VPN-27, S7VPN-28, S7VPN-29, S7VPN-30, S7VPN-31

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O HUD expande o planner com controles para `follow/planner`, `Zoom +`, `Zoom -`, `Enquadrar plano`, `Base: Satelite`, `Base: BDC`, `Ver baseline` e `Ver otimizada`
- [x] `buildHudViewModel()` expoe `view_mode_label`, `map_base_label`, `zoom_label` e estados de habilitacao dos controles
- [x] `renderHud()` atualiza esses controles sem recriar o DOM
- [x] O HUD indica claramente quando `planner view mode` esta ativo
- [x] Os controles dependentes de `coverage_plan` ficam desabilitados ou degradados com diagnostico quando o plano nao existe
- [x] Com apenas `field_polygon` valido, o HUD ainda permite entrar no modo planner e enquadrar o talhao

**Commit**: `feat(prototipo): integra controles de visualizacao ao hud do planner`

---

### T8: Garantir compatibilidade com runtime, missao e overlays existentes

**What**: Integrar a Sprint 7 ao loop operacional, ao overlay BDC existente e ao estado de missao sem regressao da Sprint 6.
**Where**: `prototipo/index.html`
**Depends on**: T7
**Reuses**: gameloop, `setCameraPosition()`, overlay BDC, `coverage_plan`, `field_polygon`, estado da missao
**Requirement**: S7VPN-02, S7VPN-11, S7VPN-24, S7VPN-25, S7VPN-29, S7VPN-30

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O zoom operacional funciona com o trator em movimento sem quebrar a simulacao
- [x] Entrar e sair de `planner view mode` nao perde `coverage_plan` nem `field_polygon`
- [x] A base BDC continua compativel com os overlays do planner
- [x] O fallback de imagery nao interfere em coleta, HUD, compactacao ou missao
- [x] O comportamento legado fora do planner continua consistente com as sprints anteriores

**Commit**: `feat(prototipo): integra visualizacao do planner ao runtime existente`

---

### T9: Validar a sprint contra spec, design e cenarios visuais do MVP

**What**: Validar o comportamento final da Sprint 7 em cenarios de conducao, inspecao livre, zoom acima do nativo e falha de imagery, confirmando o cumprimento dos requisitos sem regressao da Sprint 6.
**Where**: `prototipo/index.html`, `.specs/features/sprint-7-visualizacao-plano-navegacao/spec.md`, `.specs/features/sprint-7-visualizacao-plano-navegacao/design.md`
**Depends on**: T8
**Reuses**: criterios de sucesso, edge cases e validacao do design
**Requirement**: S7VPN-01 a S7VPN-31

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Em `follow mode`, o usuario consegue ajustar o zoom enquanto dirige e a camera continua seguindo o trator
- [x] Em `planner view mode`, o usuario consegue usar pan, zoom e `fitBounds` para inspecionar o talhao
- [x] A rota ativa se destaca claramente contra `swaths`, `headland` e rota secundaria
- [x] Em `follow mode`, a rota secundaria pode ser ocultada sem perda da leitura da rota ativa
- [x] Aproximar acima de `imagery_native_zoom` nao produz tiles de erro, tela cinza nem perda abrupta da base visual
- [x] Falha de imagery com raster BDC disponivel degrada automaticamente para `bdc`, preservando overlay e estado do plano
- [x] Alternar entre imagery e BDC preserva `coverage_plan`, enquadramento e destaque baseline/otimizada
- [x] HUD, missao, compactacao e overlays anteriores continuam sem regressao quando a Sprint 7 estiver ativa

---

## Validation Summary

- `prototipo/index.html` passou em `inline-script-parse-ok`
- a validacao estrutural local passou em `t9-structural-check-ok`
- o runtime fecha os contratos centrais de camera, base visual, fallback de imagery, legibilidade de overlay e compatibilidade com missao
- risco residual: a sprint ainda merece uma passada manual no browser para confirmar a UX final de zoom e leitura das rotas sobre imagery real

**Commit**: `feat(prototipo): valida sprint 7 de visualizacao e navegacao do planner`

---

## Parallel Execution Map

```text
Phase 1 (Sequential):
  T1 -> T2 -> T3

Phase 2 (Parallel):
  T3 complete, then:
    -> T4
    -> T6 [P]

  T4 -> T5

  T5 + T6 -> T7

Phase 3 (Sequential):
  T7 -> T8 -> T9
```

---

## Notes

- A Sprint 7 permanece inteiramente em `prototipo/index.html`; sem build, sem servidor e sem troca obrigatoria de provider.
- O ganho principal de legibilidade vem de camera, zoom visual local, estilos de overlay e simplificacao da leitura operacional.
- O algoritmo de cobertura e custo da Sprint 6 continua essencialmente o mesmo.
- O controle legado de BDC deve ser absorvido ou espelhado pelo novo estado `coveragePlanner.view.map_base`; nao pode haver dois estados concorrentes para a base visual.
- `tileerror` deixa de ser apenas mensagem operacional e passa a participar do fluxo de fallback visual do planner.
