# Sprint 2: Coleta e Armazenagem de Variaveis Tasks

**Design**: [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/design.md)  
**Status**: Draft

---

## Execution Plan

### Phase 1: Dataset Foundation (Sequential)

T1 -> T2 -> T3

### Phase 2: Runtime Foundation (Parallel OK)

Depois de T3:

- T4 [P]
- T5 [P]
- T6 [P]
- T7 [P]

### Phase 3: Mission Flow Integration (Sequential)

T8 -> T9 -> T10

### Phase 4: Finish and Verification (Sequential)

T11 -> T12

---

## Task Breakdown

### T1: Criar a estrutura de dados canonica da Sprint 2

**What**: Criar a pasta `prototipo/data/` e definir os artefatos canonicos do dataset local da Fazenda Paladino.
**Where**: `prototipo/data/`
**Depends on**: None
**Reuses**: [sprint-2-coleta-variaveis.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/sprint-2-coleta-variaveis.md), [spec.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/spec.md)
**Requirement**: S2DATA-09, S2DATA-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] A pasta `prototipo/data/` existe
- [ ] Os arquivos `terrain-grid.json` e `terrain-sources.json` foram definidos como artefatos canonicos
- [ ] O contrato de `datasetVersion` e referencia da Fazenda Paladino esta presente nesses artefatos

**Commit**: `feat(prototipo): cria estrutura canonica do dataset da sprint 2`

---

### T2: Preparar o manifesto de proveniencia das fontes oficiais

**What**: Montar `terrain-sources.json` com metadados de origem do `MapBiomas` e do `BDC`, incluindo colecoes, assets, area de recorte e proveniencia por campo.
**Where**: `prototipo/data/terrain-sources.json`
**Depends on**: T1
**Reuses**: `TerrainSourceManifest` definido em [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/design.md)
**Requirement**: S2DATA-17, S2DATA-19, S2DATA-26

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O manifesto identifica a fonte primaria `MapBiomas`
- [ ] O manifesto identifica o complemento `BDC`
- [ ] O manifesto inclui `datasetVersion`
- [ ] O manifesto explicita a proveniencia de cada campo de terreno

**Commit**: `feat(prototipo): adiciona manifesto de fontes do terreno`

---

### T3: Gerar a grade local de celulas da Fazenda Paladino

**What**: Construir `terrain-grid.json` com grade regular recortada para a area da demo, incluindo `cell_id`, limites, classe tematica e campos de snapshot com suporte a `null`.
**Where**: `prototipo/data/terrain-grid.json`
**Depends on**: T2
**Reuses**: `TerrainGrid` e `TerrainCell` de [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/design.md)
**Requirement**: S2DATA-03, S2DATA-04, S2DATA-11, S2DATA-17, S2DATA-18, S2DATA-19

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O dataset cobre apenas o recorte da regiao da Fazenda Paladino usada na demo
- [ ] Cada celula possui `cell_id` deterministico e limites espaciais
- [ ] Cada celula inclui classe tematica oficial do `MapBiomas`
- [ ] Campos sem valor oficial direto aparecem como `null`, nunca inventados

**Commit**: `feat(prototipo): gera grade local de celulas da fazenda`

---

### T4: Estender o HTML com o painel operacional minimo [P]

**What**: Adicionar ao `index.html` o painel operacional da Sprint 2 com celula atual, contador de amostras e acoes de exportar/limpar.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: estrutura visual da Sprint 1 e `HTML Shell Extension` do [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/design.md)
**Requirement**: S2DATA-25

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O painel operacional existe no `index.html`
- [ ] O painel exibe `cell_id` atual
- [ ] O painel exibe contador de amostras
- [ ] O painel expõe acoes de exportar e limpar dados

**Commit**: `feat(prototipo): adiciona painel operacional da missao`

---

### T5: Implementar o carregamento do dataset local no runtime [P]

**What**: Carregar no runtime a representacao local do dataset de terreno e validar consistencia entre grade e manifesto.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: `Terrain Dataset Loader` do [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/design.md)
**Requirement**: S2DATA-03, S2DATA-10, S2DATA-17, S2DATA-19

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O runtime carrega o dataset local sem depender de consulta remota por frame
- [ ] O runtime valida `datasetVersion`
- [ ] O runtime falha de forma diagnostica se o dataset estiver ausente ou invalido

**Commit**: `feat(prototipo): carrega dataset local do terreno no runtime`

---

### T6: Embutir o dataset canonico no index para abertura local [P]

**What**: Transformar os artefatos canonicos de `prototipo/data/` na representacao embutida consumida pelo `index.html`, evitando dependencia obrigatoria de `fetch` em `file://`.
**Where**: `prototipo/index.html`, `prototipo/data/`
**Depends on**: T3
**Reuses**: estrategia de entrega do dataset definida em [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/design.md)
**Requirement**: S2DATA-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O `index.html` contem blocos de dados ou representacao equivalente compativel com abertura local
- [ ] O runtime nao depende de consulta remota para obter o dataset da sprint
- [ ] O dataset embutido preserva `datasetVersion`

**Commit**: `feat(prototipo): embute dataset local no index`

---

### T7: Introduzir Mission Store, configuracao ativa do trator e persistencia base [P]

**What**: Criar o estado central da missao, com `mission_id`, configuracao ativa do trator, metadados do dataset e adaptador inicial de `localStorage`.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: `MissionState`, `ActiveTractorConfig` e `Persistence Adapter` do [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/design.md)
**Requirement**: S2DATA-01, S2DATA-02, S2DATA-12, S2DATA-15, S2DATA-20

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] A missao nasce com `mission_id` unico
- [ ] O estado da missao guarda a configuracao ativa do trator
- [ ] O estado da missao referencia `dataset_version`
- [ ] Existe persistencia inicial no `localStorage`

**Commit**: `feat(prototipo): adiciona mission store e persistencia base`

---

### T8: Implementar resolucao de celula e motor de coleta

**What**: Resolver a celula atual a partir de `lat/lng`, detectar `cell-change` e `time-tick`, criar amostras e impedir duplicacao no mesmo instante logico.
**Where**: `prototipo/index.html`
**Depends on**: T4, T5, T6, T7
**Reuses**: `Cell Resolver` e `Sampling Engine` do [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/design.md)
**Requirement**: S2DATA-04, S2DATA-05, S2DATA-06, S2DATA-07, S2DATA-08, S2DATA-13, S2DATA-14, S2DATA-16

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O runtime resolve a `cell_id` atual a partir da posicao do trator
- [ ] Entrar em nova celula gera amostra `cell-change`
- [ ] Movimento continuado na mesma celula gera amostra `time-tick`
- [ ] O sistema nao duplica amostras no mesmo frame ou instante logico

**Commit**: `feat(prototipo): implementa resolucao de celula e coleta`

---

### T9: Completar snapshots de terreno e trator nas amostras

**What**: Garantir que cada amostra carregue `terrain_snapshot` e `tractor_snapshot` completos, incluindo classe tematica e proveniencia por campo.
**Where**: `prototipo/index.html`
**Depends on**: T8
**Reuses**: `MissionSample` do [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/design.md)
**Requirement**: S2DATA-08, S2DATA-11, S2DATA-12, S2DATA-13, S2DATA-14, S2DATA-17, S2DATA-18, S2DATA-19

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Cada amostra inclui todos os campos previstos em `terrain_snapshot`
- [ ] Campos indisponiveis usam `null` com proveniencia coerente
- [ ] Cada amostra inclui o snapshot vigente do trator
- [ ] Mudancas na configuracao do trator afetam apenas amostras posteriores

**Commit**: `feat(prototipo): completa snapshots da coleta`

---

### T10: Implementar restauracao, compatibilidade por versao e limpeza

**What**: Restaurar a missao salva no reload, validar compatibilidade com `dataset_version` atual e implementar limpeza completa da sessao local.
**Where**: `prototipo/index.html`
**Depends on**: T9
**Reuses**: `Mission Store` e `Persistence Adapter` do [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/design.md)
**Requirement**: S2DATA-21, S2DATA-22, S2DATA-24, S2DATA-27

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Recarregar a pagina restaura a missao persistida compativel
- [ ] Missoes com `dataset_version` incompativel nao sao restauradas silenciosamente
- [ ] A limpeza remove a sessao persistida e reinicia a missao

**Commit**: `feat(prototipo): restaura e limpa sessao de coleta`

---

### T11: Implementar exportacao JSON com proveniencia dos dados

**What**: Gerar e baixar o `JSON` exportado da missao, com metadados, amostras e informacoes de origem do `MapBiomas` e do `BDC`.
**Where**: `prototipo/index.html`
**Depends on**: T10
**Reuses**: `JSON Exporter` do [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/design.md)
**Requirement**: S2DATA-23, S2DATA-26

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O usuario consegue baixar um arquivo `JSON` da sessao
- [ ] O export inclui metadados da missao
- [ ] O export inclui lista de amostras
- [ ] O export inclui origem dos dados e versao do dataset

**Commit**: `feat(prototipo): adiciona exportacao json da missao`

---

### T12: Refinar UX operacional e validar a sprint

**What**: Ajustar mensagens operacionais, estados de erro e validar manualmente a sprint contra os criterios de sucesso.
**Where**: `prototipo/index.html`, `prototipo/data/`
**Depends on**: T11
**Reuses**: [spec.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/spec.md)
**Requirement**: S2DATA-20, S2DATA-24, S2DATA-25, S2DATA-26

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Estados de erro do dataset, `localStorage` e exportacao sao legiveis
- [ ] O painel operacional reflete o estado real da missao
- [ ] A sprint pode ser verificada manualmente contra os criterios de sucesso

**Commit**: `feat(prototipo): finaliza ux operacional da sprint 2`

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
    -> T7 [P]

Phase 3 (Sequential):
  T4, T5, T6, T7 complete, then:
    T8 -> T9 -> T10

Phase 4 (Sequential):
  T11 -> T12
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Criar a estrutura de dados canonica da Sprint 2 | 1 estrutura de dados | Granular |
| T2: Preparar o manifesto de proveniencia das fontes oficiais | 1 manifesto | Granular |
| T3: Gerar a grade local de celulas da Fazenda Paladino | 1 dataset principal | Aceitavel |
| T4: Estender o HTML com o painel operacional minimo | 1 componente visual | Granular |
| T5: Implementar o carregamento do dataset local no runtime | 1 integracao coesa | Aceitavel |
| T6: Embutir o dataset canonico no index para abertura local | 1 responsabilidade de entrega local | Granular |
| T7: Introduzir Mission Store, configuracao ativa do trator e persistencia base | 1 bloco coeso de estado | Aceitavel |
| T8: Implementar resolucao de celula e motor de coleta | 1 motor coeso | Aceitavel |
| T9: Completar snapshots de terreno e trator nas amostras | 1 refinamento de payload | Granular |
| T10: Implementar restauracao, compatibilidade por versao e limpeza | 1 responsabilidade de persistencia | Aceitavel |
| T11: Implementar exportacao JSON com proveniencia dos dados | 1 responsabilidade de saida | Granular |
| T12: Refinar UX operacional e validar a sprint | 1 fase de acabamento | Aceitavel |

---

## Tooling Note

Para esta sprint, o caminho mais direto de execucao e:

- MCPs: nenhum obrigatorio
- Skills: `tlc-spec-driven`

Se quisermos validar a coleta, a persistencia e a exportacao no navegador durante a execucao, o proximo passo pode usar `playwright-skill`.
