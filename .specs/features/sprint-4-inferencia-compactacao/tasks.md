# Sprint 4: Inferencia de Parametros de Solo via BDC — Tasks

**Spec**: [spec.md](spec.md)
**Design**: [design.md](design.md)
**Status**: Draft

---

## Execution Plan

```
T1 -> T2 -> T3
```

Todas as tarefas sao sequenciais: T2 depende do output de T1, T3 valida o conjunto.

---

## Task Breakdown

### T1: Criar script `enriquecer-grade-bdc.py` com cadeia de inferencia completa

**What**: Criar o script Python que le `terrain-sources.json`, amostra NDVI e SCL dos COGs do BDC via `rasterio.sample()`, aplica a cadeia de inferencia por celula e grava `terrain-grid.json` v2 e `terrain-sources.json` v2 (com `inferenceChain`) como outputs de uma unica execucao.
**Where**: `prototipo/scripts/enriquecer-grade-bdc.py`
**Depends on**: None
**Reuses**: [design.md](design.md) — Passos 1 a 7, secao de outputs e tratamento de erros

**Done when**:

- [ ] Script le `selectedObservation` de `terrain-sources.json` sem consultar `bdc-paladino-7km-items.json`
- [ ] NDVI e SCL amostrados via `rasterio.sample()` (sem `read(1)` da banda inteira)
- [ ] NDVI dividido por 10000 antes de qualquer classificacao
- [ ] `thematic_class` classificada corretamente para SCL 4/5/6 e invalidos
- [ ] `thematic_class` gravada em `thematicClass.value` e `terrainSnapshotBase.thematic_class`
- [ ] `clay_content`, `water_content`, `bulk_density` derivados do SOIL_LOOKUP por classe
- [ ] `matric_suction` calculado via van Genuchten (valores esperados: dense≈28.4, sparse≈49.1, bare≈147.3 kPa)
- [ ] `conc_factor` derivado por faixa de succao (dense→4.0, sparse→4.0, bare→5.0)
- [ ] `sigma_p` calculado via PTF Severiano 2013 (valor esperado para dense: ≈136 kPa)
- [ ] Celulas `water`: solo `null`, provenencia `unavailable`
- [ ] Celulas com SCL invalido: todos os campos `null`, provenencia `unavailable`
- [ ] Validacao pre-gravacao: >= 80% das celulas com `sigma_p` > 0; aborta com erro diagnostico se falhar
- [ ] `datasetVersion` atualizado para `2026-04-05-paladino-bdc-7km-v2` em cada celula de `terrain-grid.json`
- [ ] `terrain-sources.json` gravado com `inferenceChain` (observation_item_id, observation_date, observation_season, assets_used, ndvi_scale_factor, classification, soil_lookup_reference, soil_lookup_epoch_note, van_genuchten_params, sigma_p_ptf, conc_factor_rule)
- [ ] `fieldProvenance` de `terrain-sources.json` atualizado para `derived` com nota de provenencia metodologica global
- [ ] `datasetVersion` de `terrain-sources.json` bate com o de `terrain-grid.json`

**Requirement**: S4INF-01 a S4INF-13
**Commit**: `feat(scripts): cria enriquecedor de grade bdc com cadeia de inferencia`

---

### T2: Re-embutir dataset v2 no `index.html`

**What**: Substituir os blocos JSON embutidos no `index.html` com os dados atualizados de `terrain-grid.json` e `terrain-sources.json` v2. Atualizar o `datasetVersion` hardcoded no runtime para que missoes com versao anterior sejam invalidadas.
**Where**: `prototipo/index.html`
**Depends on**: T1
**Reuses**: logica de embute do dataset das Sprints 2 e 3; logica de invalidacao de sessao por `datasetVersion`

**Done when**:

- [ ] Bloco JSON de `terrain-grid.json` embutido no HTML reflete os dados v2
- [ ] Bloco JSON de `terrain-sources.json` embutido no HTML reflete a `inferenceChain` v2
- [ ] `datasetVersion` hardcoded no runtime atualizado para `2026-04-05-paladino-bdc-7km-v2`
- [ ] Missoes salvas com `datasetVersion` anterior sao invalidadas e nova sessao iniciada
- [ ] `index.html` continua abrindo localmente sem servidor, sem build e sem rede

**Requirement**: S4INF-14, S4INF-15, S4INF-16, S4INF-18
**Commit**: `feat(prototipo): re-embute dataset v2 com solo inferido no index`

---

### T3: Validar a sprint contra os criterios de sucesso

**What**: Verificar manualmente que o script, o dataset e o runtime funcionam de ponta a ponta, sem regressao das sprints anteriores.
**Where**: `prototipo/index.html`, `prototipo/data/`, `prototipo/scripts/`
**Depends on**: T2
**Reuses**: [spec.md](spec.md) — Success Criteria

**Done when**:

- [ ] Script executa no ambiente `geologia` sem erro
- [ ] >= 80% das celulas tem `sigma_p` > 0 com provenencia `derived`
- [ ] Nenhuma celula com dado valido tem campo `null` onde deveria ter valor
- [ ] Celulas com SCL invalido continuam com todos os campos `null`
- [ ] Abrir `index.html` no navegador carrega grade com `datasetVersion` v2
- [ ] Navegar ate celula `vegetation_dense` mostra `sigma_p` ≈ 136 kPa no HUD
- [ ] Navegacao, coleta, persistencia e HUD das Sprints 1, 2 e 3 sem regressao

**Requirement**: S4INF-17
**Commit**: `feat(prototipo): valida criterios finais da sprint 4`

---

## Tooling

- Ambiente Python: `geologia` (pyenv) — requer `rasterio`, `numpy`, `pyproj`
- Validacao do script: rodar diretamente antes do embed
- Validacao do runtime: navegador local com `file://`
- MCPs: NONE
