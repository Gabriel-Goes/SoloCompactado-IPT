# Sprint 3: HUD de Leitura Operacional Tasks

**Design**: [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-3-hud/design.md)  
**Status**: Defined

---

## Execution Plan

### Phase 1: Layout Foundation (Sequential)

T1 -> T2 -> T3

### Phase 2: HUD Rendering Core (Parallel OK)

Depois de T3:

- T4 [P]
- T5 [P]
- T6 [P]

### Phase 3: Runtime Integration and Finish (Sequential)

T7 -> T8 -> T9 -> T10

---

## Task Breakdown

### T1: Refatorar o shell do `index.html` para suportar HUD lateral

**What**: Reorganizar a estrutura principal do [index.html](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/index.html) para criar uma coluna fixa de HUD e uma area dedicada ao mapa.
**Where**: `prototipo/index.html`
**Depends on**: None
**Reuses**: [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-3-hud/design.md), shell atual da Sprint 2
**Requirement**: S3HUD-01, S3HUD-02, S3HUD-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O HTML possui estrutura equivalente a `#hud-sidebar` e `#map-stage`
- [ ] O mapa deixa de dividir a mesma camada estrutural do HUD
- [ ] O arquivo principal continua sendo `prototipo/index.html`

**Commit**: `feat(prototipo): refatora shell do index para layout com hud`

---

### T2: Ajustar CSS da viewport para divisao `2/5` HUD e `3/5` mapa

**What**: Adaptar os estilos para que o HUD ocupe aproximadamente 40% da largura e o mapa 60%, mantendo legibilidade desktop.
**Where**: `prototipo/index.html`
**Depends on**: T1
**Reuses**: `Layout Strategy` de [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-3-hud/design.md)
**Requirement**: S3HUD-02, S3HUD-17, S3HUD-18, S3HUD-22

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O HUD lateral fica fixo e visivel em desktop
- [ ] O mapa ocupa a area principal restante
- [ ] A divisao lateral permanece legivel sem colapso visual severo

**Commit**: `feat(prototipo): ajusta css do layout lateral do hud`

---

### T3: Reancorar overlays e camera na area do mapa

**What**: Garantir que trator, hint, debug e overlays continuem posicionados em relacao ao mapa, e nao ao centro da tela inteira.
**Where**: `prototipo/index.html`
**Depends on**: T2
**Reuses**: `Map Stage Layout Adapter` de [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-3-hud/design.md)
**Requirement**: S3HUD-05, S3HUD-09, S3HUD-24

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O trator continua centralizado na viewport do mapa
- [ ] O debug continua funcional sem invadir o HUD principal
- [ ] O mapa segue navegavel com o layout lateral ativo

**Commit**: `feat(prototipo): ancora overlays na area do mapa`

---

### T4: Implementar o bloco `Trator` do HUD [P]

**What**: Criar o markup e o renderer do bloco `Trator` usando o estado atual do runtime.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: `Tractor Block Renderer` e `getActiveTractorConfig()`
**Requirement**: S3HUD-04, S3HUD-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O HUD exibe `machine_preset`, `route_speed`, `heading`, `wheel_load`, `inflation_pressure`, `tyre_width` e `track_gauge`
- [ ] Os valores refletem o estado ativo do trator
- [ ] O bloco continua coerente com a missao restaurada ou inicializada

**Commit**: `feat(prototipo): adiciona bloco de trator no hud`

---

### T5: Implementar o bloco `Terreno Atual` com suporte explicito a `null` [P]

**What**: Criar o markup e o renderer do bloco `Terreno Atual`, usando `currentCell` como fonte primaria e exibindo campos indisponiveis sem escondê-los.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: `Terrain Block Renderer`, `runtimeState.currentCell`, `runtimeState.latestSample`
**Requirement**: S3HUD-10, S3HUD-11, S3HUD-12, S3HUD-13, S3HUD-14, S3HUD-16

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O HUD exibe `cell_id`, `clay_content`, `water_content`, `matric_suction`, `bulk_density`, `conc_factor` e `sigma_p`
- [ ] `currentCell` e a fonte primaria do bloco
- [ ] Campos `null` aparecem de forma legivel, sem valor inventado
- [ ] O bloco nao colapsa quando todos os campos de terreno estao indisponiveis

**Commit**: `feat(prototipo): adiciona bloco de terreno atual no hud`

---

### T6: Implementar o bloco `Missao` preservando exportacao e limpeza [P]

**What**: Expandir o painel operacional atual para o bloco `Missao`, mantendo resumo da sessao e as acoes de exportar/limpar.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: `mission-panel`, exportacao JSON e limpeza da Sprint 2
**Requirement**: S3HUD-04, S3HUD-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O bloco `Missao` exibe `mission_id` resumido, total de amostras, ultimo `sampling_reason`, timestamp da ultima coleta e `lat/lng`
- [ ] Os botoes de exportar e limpar continuam acessiveis
- [ ] O status textual da missao continua funcional

**Commit**: `feat(prototipo): integra bloco de missao ao hud`

---

### T7: Criar `HudViewModel` e consolidar o renderer do HUD

**What**: Implementar o adaptador de estado do HUD e substituir o renderer fragmentado atual por um renderer consolidado dos tres blocos.
**Where**: `prototipo/index.html`
**Depends on**: T4, T5, T6
**Reuses**: `HUD State Adapter`, `HUD Renderer`
**Requirement**: S3HUD-08, S3HUD-15, S3HUD-21

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Existe um `HudViewModel` derivado de `runtimeState` e `tractorState`
- [ ] O HUD atualiza os tres blocos de forma centralizada
- [ ] O renderer substitui ou absorve `renderMissionPanel()` sem duplicar fonte de verdade

**Commit**: `feat(prototipo): consolida renderer e view model do hud`

---

### T8: Integrar atualizacao em tempo real com mudanca de celula, coleta e restore

**What**: Conectar o HUD ao fluxo do runtime para refletir imediatamente troca de celula, novas amostras e sessao restaurada.
**Where**: `prototipo/index.html`
**Depends on**: T7
**Reuses**: loop principal, `runtimeState.currentCell`, `runtimeState.latestSample`, `runtimeState.mission`
**Requirement**: S3HUD-08, S3HUD-11, S3HUD-15, S3HUD-21, S3HUD-24

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Entrar em nova celula atualiza imediatamente o bloco `Terreno Atual`
- [ ] Registrar nova amostra atualiza imediatamente o bloco `Missao`
- [ ] Reload com sessao restaurada mostra HUD coerente sem depender de nova coleta
- [ ] O debug continua coexistindo com o HUD

**Commit**: `feat(prototipo): integra hud ao fluxo de runtime e restore`

---

### T9: Refinar densidade visual, tipografia e estados de ausencia

**What**: Ajustar a apresentacao do HUD para leitura operacional enxuta, neutra e consistente com a demo.
**Where**: `prototipo/index.html`
**Depends on**: T8
**Reuses**: `CSS and UX Decisions`, estilos existentes da Sprint 1
**Requirement**: S3HUD-12, S3HUD-13, S3HUD-17, S3HUD-18, S3HUD-19, S3HUD-20, S3HUD-23

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O HUD usa composicao vertical com hierarquia clara
- [ ] O visual permanece neutro, sem semaforo nem elementos de risco
- [ ] Estados de ausencia de dado ficam legiveis
- [ ] Nao existem mini mapa, mini trilha, graficos ou componentes futuros fora de escopo

**Commit**: `feat(prototipo): refina apresentacao visual do hud`

---

### T10: Validar a sprint contra os criterios de sucesso

**What**: Revisar a implementacao final da Sprint 3 contra a spec, garantindo que layout, sincronizacao e coexistencia com navegacao/debug permaneçam corretos.
**Where**: `prototipo/index.html`, docs da sprint quando necessario
**Depends on**: T9
**Reuses**: [spec.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-3-hud/spec.md)
**Requirement**: S3HUD-01, S3HUD-02, S3HUD-05, S3HUD-06, S3HUD-07, S3HUD-10, S3HUD-17, S3HUD-24

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O HUD atende aos criterios de sucesso da sprint
- [ ] Nao ha regressao visivel da Sprint 1 na centralizacao do trator e navegacao
- [ ] Nao ha regressao visivel da Sprint 2 em exportacao, limpeza e restore

**Commit**: `feat(prototipo): valida criterios finais da sprint 3`

---

## Parallel Execution Map

```text
Phase 1 (Sequential):
  T1 -> T2 -> T3

Phase 2 (Parallel):
  T3 complete, then:
    -> T4 [P]
    -> T5 [P]
    -> T6 [P]

Phase 3 (Sequential):
  T4, T5, T6 complete, then:
    T7 -> T8 -> T9 -> T10
```

---

## Notes

- O HUD deve ser implementado como evolucao do runtime atual, nao como tela paralela.
- `currentCell` e a fonte primaria do bloco `Terreno Atual`.
- `latestSample` so pode complementar o HUD quando corresponder a mesma `cell_id`.
- Campos de terreno `null` permanecem visiveis por contrato.
