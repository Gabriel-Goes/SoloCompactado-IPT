# Sprint 5: Motor de Compactacao por Camadas - Tasks

**Spec**: [spec.md](spec.md)
**Design**: [design.md](design.md)
**Status**: Draft

---

## Validation Inputs Incorporated

- `calcDeformation()` deve aplicar o cap no `delta_bulk_density` final do fallback empirico: `Math.min(bd * 0.01 * over_ratio * 10, 0.5)`.
- `runtimeState` deve inicializar `currentCompactionProfile: null`.
- A chamada do motor em `updateSampling()` deve acontecer logo apos `runtimeState.currentTerrainPixel = ...` e antes do `if (!runtimeState.currentCell) return;`.
- `getCurrentTerrainSnapshot()` deve reproduzir a mesma hierarquia efetiva do HUD: `currentTerrainPixel.snapshot` -> `latestSample.terrain_snapshot` da mesma `cell_id` -> `buildTerrainSnapshot(currentCell)` -> `null`.
- `calcDeformation()` deve manter `p = sigma_ap` por coerencia com a calibracao uniaxial de Lima 2018; nao dividir por `2.3`.

---

## Execution Plan

### Phase 1: Motor Foundation (Sequential)

T1 -> T2 -> T3 -> T4 -> T5

### Phase 2: Runtime Integration (Parallel OK)

Depois de T5:

- T6 [P]
- T8 [P]

T6 -> T7

### Phase 3: Validation (Sequential)

T7 + T8 -> T9

---

## Task Breakdown

### T1: Ajustar contratos base do runtime para o motor

**What**: Preparar `prototipo/index.html` para a Sprint 5 inicializando o estado instantaneo de compactacao, ampliando o contrato do snapshot do trator e centralizando a resolucao do terreno atual em um helper reutilizavel.
**Where**: `prototipo/index.html`
**Depends on**: None
**Reuses**: `runtimeState`, `getActiveTractorConfig()`, `buildHudViewModel()`, `buildTerrainSnapshot()`, decisoes D4 e D5 de [design.md](design.md)
**Requirement**: S5CMP-02, S5CMP-03, S5CMP-09, S5CMP-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `runtimeState` inclui `currentCompactionProfile: null`
- [x] `getActiveTractorConfig()` expoe `tyre_diameter` e `tyre_recommended_pressure`
- [x] `tyre_recommended_pressure` usa `inflation_pressure` como default conservador
- [x] Existe `getCurrentTerrainSnapshot()` como helper unico para motor e HUD
- [x] O helper usa a ordem `currentTerrainPixel` -> `latestSample.terrain_snapshot` da mesma celula -> `buildTerrainSnapshot(currentCell)` -> `null`

**Commit**: `feat(prototipo): prepara contratos base do motor de compactacao`

---

### T2: Implementar templates do perfil vertical e `buildCompactionProfile()`

**What**: Criar `COMPACTION_PROFILE_TEMPLATES` e a funcao que deriva as 6 camadas a partir do `terrain_snapshot`, preservando gradientes por `thematic_class` e guardas para `water`, `_invalid` e ausencia de dados.
**Where**: `prototipo/index.html`
**Depends on**: T1
**Reuses**: secao `Templates de perfil vertical por thematic_class` e `buildCompactionProfile()` de [design.md](design.md)
**Requirement**: S5CMP-01, S5CMP-02, S5CMP-04, S5CMP-05, S5CMP-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existem templates para `vegetation_dense`, `vegetation_sparse` e `bare_soil`
- [x] O perfil sempre gera 6 camadas de `0-60 cm` com `depth_range`, `z_mid_m`, `xi`, `clay_content`, `bulk_density` e `matric_suction`
- [x] `clay_content` e `bulk_density` sao ancorados no snapshot superficial e ajustados pelos deltas do template
- [x] `matric_suction` aumenta com profundidade conforme o design
- [x] `thematic_class` `null`, `water` e `_invalid` retornam ausencia sem fabricar valores
- [x] Snapshot parcial preserva `null` nos campos dependentes ausentes, sem coercao implicita nem interpolacao silenciosa

**Commit**: `feat(prototipo): deriva perfil vertical de compactacao por thematic class`

---

### T3: Implementar o nucleo mecanico de carga, resistencia e risco

**What**: Adicionar `calcContactStress()`, `propagateStress()`, `calcSigmaP()` e `assessLayerRisk()` para calcular tensao aplicada, resistencia por camada e classificacao de risco conforme as referencias da sprint.
**Where**: `prototipo/index.html`
**Depends on**: T2
**Reuses**: `calcSigmaP()` do pipeline BDC da Sprint 4, secoes `calcContactStress()`, `propagateStress()` e `assessLayerRisk()` de [design.md](design.md)
**Requirement**: S5CMP-03, S5CMP-04, S5CMP-06, S5CMP-07, S5CMP-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `calcContactStress()` converte `wheel_load` de kg para kN internamente
- [x] `calcContactStress()` retorna `sigma_max_kpa`, `contact_radius_m`, `ca_length_m` e `ca_width_m`
- [x] `propagateStress()` usa `sigma_max`, `a`, `xi` e `z_mid_m` para atenuacao com profundidade
- [x] `calcSigmaP()` replica os mesmos brackets e coeficientes da Sprint 4
- [x] `assessLayerRisk()` aplica os limiares `safe`, `warning` e `critical` definidos no spec

**Commit**: `feat(prototipo): adiciona nucleo mecanico de carga e risco por camada`

---

### T4: Implementar `calcDeformation()` com fallback corrigido

**What**: Adicionar a estimativa de deformacao permanente por camada usando a PTF de Lima 2018 e o fallback empirico documentado, preservando a decisao fisica de usar `p = sigma_ap`.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: secao `calcDeformation()` de [design.md](design.md) e relatorio de validacao da Sprint 5
**Requirement**: S5CMP-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `calcDeformation()` usa `p = sigma_ap` diretamente, sem divisao por `2.3`
- [x] `sigma_ap <= sigma_p` retorna `delta_bulk_density = 0`
- [x] O guard de dominio invalido da PTF dispara o fallback empirico quando `N <= v_initial` ou `lam_n <= 0`
- [x] O fallback corrige o cap na saida final: `Math.min(bd * 0.01 * over_ratio * 10, 0.5)`
- [x] O retorno inclui `delta_bulk_density` e `bulk_density_estimated` sem permitir expansao negativa

**Commit**: `feat(prototipo): implementa deformacao por camada com fallback validado`

---

### T5: Orquestrar `runCompactionMotor()` e integrar no loop antes do early return

**What**: Encadear o pipeline completo do motor, atualizar `runtimeState.currentCompactionProfile` em toda mudanca de posicao e garantir que a leitura instantanea continue funcionando mesmo quando houver pixel BDC valido fora da grade de celulas.
**Where**: `prototipo/index.html`
**Depends on**: T4
**Reuses**: fluxo `buildCompactionProfile -> calcContactStress -> propagateStress -> calcSigmaP -> calcDeformation -> assessLayerRisk` de [design.md](design.md), `updateSampling()`
**Requirement**: S5CMP-01 a S5CMP-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe `runCompactionMotor()` retornando `LayerResult[6]` ou `null`
- [x] Cada camada retorna `sigma_aplicada_kpa`, `sigma_p_kpa`, `stress_ratio`, `risk_class`, `delta_bulk_density`, `bulk_density_estimated` e `provenance`
- [x] `updateSampling()` calcula `currentCompactionProfile` logo apos atualizar `currentTerrainPixel`
- [x] O calculo do motor acontece antes de `if (!runtimeState.currentCell) return;`
- [x] Fora da grade operacional, mas ainda dentro do raster BDC, o perfil instantaneo continua sendo atualizado sem gerar sample indevido

**Commit**: `feat(prototipo): integra motor de compactacao ao loop de runtime`

---

### T6: Anexar `compaction_snapshot` e acumular passadas por celula

**What**: Fazer o fluxo de amostragem registrar o snapshot de compactacao em cada sample e atualizar um acumulador por `cell_id` quando `appendSample()` for chamado.
**Where**: `prototipo/index.html`
**Depends on**: T5
**Reuses**: `createSample()`, `appendSample()`, `updateCompactionAccumulator()` de [design.md](design.md)
**Requirement**: S5CMP-12, S5CMP-13, S5CMP-14, S5CMP-18

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `createSample()` inclui `compaction_snapshot` com as 6 camadas ou `null`
- [x] Existe `updateCompactionAccumulator(cellId, profile)` indexado por `cell_id`
- [x] O acumulador armazena `pass_count` e `bulk_density_estimated` por camada
- [x] `appendSample()` chama o acumulador apos `runtimeState.latestSample = sample`
- [x] Nao ha acumulacao quando `currentCompactionProfile` estiver ausente
- [x] Camadas indisponiveis nao corrompem o acumulador; `null` nao e somado por coercao implicita

**Commit**: `feat(prototipo): registra snapshot e acumulado de compactacao por celula`

---

### T7: Persistir, restaurar e exportar o acumulado de compactacao

**What**: Integrar o novo estado de compactacao ao ciclo de vida da missao para que novas sessoes, missoes restauradas e exportacao JSON preservem o acumulado por camada sem quebrar a compatibilidade com dados antigos.
**Where**: `prototipo/index.html`
**Depends on**: T6
**Reuses**: `createMission()`, `restoreOrCreateMission()`, `persistMission()`, `resetMission()`, `buildMissionExport()`
**Requirement**: S5CMP-15, S5CMP-16, S5CMP-17, S5CMP-18

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `createMission()` inicializa `compaction_accumulator: {}`
- [x] `restoreOrCreateMission()` migra missoes antigas sem esse campo
- [x] `resetMission()` volta a um estado limpo sem manter acumulado obsoleto
- [x] `buildMissionExport()` inclui `compaction_accumulator` e `compaction_profile_current`
- [x] A validacao de `dataset_version` continua invalidando sessoes antigas sem reaproveitar acumulado

**Commit**: `feat(prototipo): persiste e exporta acumulado de compactacao`

---

### T8: Expor o motor no HUD com bloco textual estavel

**What**: Adicionar `#hud-compaction` ao shell do HUD, aplicar estilos por `risk_class` e estender o renderer para mostrar as 6 camadas em ordem, inclusive nos estados de ausencia e deformacao elastica.
**Where**: `prototipo/index.html`
**Depends on**: T5
**Reuses**: `buildHudViewModel()`, `renderHud()`, HUD da Sprint 3 e layout textual de [design.md](design.md)
**Requirement**: S5CMP-10, S5CMP-19, S5CMP-20, S5CMP-21, S5CMP-22, S5CMP-23, S5CMP-24

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O HTML pre-constroi o bloco `Compactacao por Camada` com 6 linhas
- [x] O CSS define estados `risk-critical`, `risk-warning`, `risk-safe` e `risk-unavailable`
- [x] O renderer atualiza texto e classes sem recriar o DOM a cada frame
- [x] Cada linha mostra profundidade, `risk_class`, `sigma_aplicada_kpa`, `sigma_p_kpa` e deformacao
- [x] Quando houver deformacao real, o HUD mostra `bulk_density_estimated` do acumulador da celula; sem acumulador, usa o baseline do perfil
- [x] Quando nao houver dado valido, a estrutura continua visivel com placeholders e sem numeros inventados

**Commit**: `feat(prototipo): adiciona bloco de compactacao por camada ao hud`

---

### T9: Validar a sprint contra spec, design e relatorio de validacao

**What**: Revisar o comportamento final do runtime em cenarios validos, invalidos, parciais, restaurados e exportados, confirmando que a implementacao cumpre os requisitos da sprint e os ajustes validados no design.
**Where**: `prototipo/index.html`, `.specs/features/sprint-5-motor-compactacao/spec.md`, `.specs/features/sprint-5-motor-compactacao/design.md`
**Depends on**: T7, T8
**Reuses**: criterios de sucesso da sprint, relatorio de validacao fornecido nesta sessao
**Requirement**: S5CMP-01 a S5CMP-24

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Pixel valido exibe 6 camadas com valores mecanicos coerentes
- [x] Pixel `water`, `_invalid` ou com campos nulos exibe ausencia sem quebrar o HUD
- [x] Pixel raster valido fora da grade continua atualizando a leitura instantanea sem registrar sample
- [x] Snapshot parcial bloqueia apenas campos/camadas dependentes, sem fabricar `sigma_p`, risco ou deformacao
- [x] Export JSON inclui `compaction_snapshot` por sample e `compaction_accumulator`
- [x] Reload com `dataset_version` compativel restaura o acumulado corretamente
- [x] O exemplo do fallback de `calcDeformation()` produz ordem de grandeza compativel com `delta_bd ~= 0.019 Mg/m3`

**Commit**: `feat(prototipo): valida sprint 5 do motor de compactacao`

---

## Parallel Execution Map

```text
Phase 1 (Sequential):
  T1 -> T2 -> T3 -> T4 -> T5

Phase 2 (Parallel):
  T5 complete, then:
    -> T6 [P] -> T7
    -> T8 [P]

Phase 3 (Sequential):
  T7 + T8 -> T9
```

---

## Notes

- O motor continua restrito a `prototipo/index.html`; nao ha build, servidor ou dependencia externa nova.
- `p = sigma_ap` e uma decisao intencional de calibracao uniaxial. Quem implementar nao deve "corrigir" isso para `sigma_ap / 2.3`.
- A hierarquia do snapshot do motor deve permanecer alinhada com o HUD para evitar divergencia entre `Terreno Atual` e `Compactacao por Camada`.
