# Sprint 4: Inferencia de Parametros de Solo via BDC Specification

## Problem Statement

O prototipo ja navega sobre a Fazenda Paladino, coleta amostras e exibe um HUD lateral, mas os campos de solo de todas as 49 celulas permanecem `null` com provenencia `unavailable`. O HUD mostra os rotulos corretos, mas sem valores — o que esvazia o significado da demonstracao.

Esta sprint existe para um objetivo unico: popular as variaveis de solo da grade com valores derivados dos assets oficiais do Brazil Data Cube, usando uma cadeia de inferencia documentada e rastreavel. O resultado deve ser um `terrain-grid.json` enriquecido e re-embutido no `index.html`, de forma que o HUD da Sprint 3 passe a exibir valores reais em vez de ausencias.

## Goals

- [ ] Criar o script offline `prototipo/scripts/enriquecer-grade-bdc.py` que amostra NDVI e SCL dos COGs do BDC e aplica a cadeia de inferencia por celula.
- [ ] Atualizar `terrain-grid.json` com variaveis de solo derivadas e provenencia `derived`.
- [ ] Atualizar `terrain-sources.json` com a cadeia de inferencia documentada e nova `datasetVersion`.
- [ ] Re-embutir o dataset atualizado no `index.html` para que o HUD exiba valores reais.

## Out of Scope

Explicitamente excluido nesta sprint para evitar desvio de escopo.

| Feature | Reason |
| --- | --- |
| Motor de compactacao e calculo de estresse | Pertence a sprint analitica futura |
| Semaforo de risco verde/amarelo/vermelho | Depende do motor de compactacao |
| Heatmap de risco sobre o mapa | Depende do motor de compactacao |
| Recomendacoes operacionais | Depende de logica de decisao futura |
| Calibracao de PTF com dados de campo | Exige campanha de medicao; esta sprint usa referencias bibliograficas |
| Acesso ao BDC em runtime | O dataset continua pre-processado offline; o runtime apenas le JSON local |

---

## Data Source Constraints

As variaveis de solo derivadas nesta sprint nao podem ser inventadas. Toda inferencia deve partir dos assets oficiais do BDC e seguir a cadeia documentada abaixo.

- O script SHALL ler `terrain-sources.json` e usar a observacao definida em `sources.bdc.selectedObservation` como entrada fixa do pipeline. A selecao da observacao nao e responsabilidade deste script.
- O script SHALL amostrar NDVI e SCL dos COGs correspondentes a `selectedObservation` via `rasterio`. NDVI nos COGs do BDC e armazenado como inteiro escalado por 10000 (ex: 4800 = NDVI 0.48) e deve ser dividido por 10000 antes de qualquer classificacao.
- O lookup de variaveis de solo (clay_content, water_content, bulk_density) e calibrado para a epoca da `selectedObservation`. Se a observacao for trocada por uma de epoca diferente, o lookup deve ser recalibrado. Esta dependencia e explicita e deve ser documentada no manifesto.
- O script SHALL classificar `thematic_class` por celula usando SCL e NDVI conforme a tabela de classificacao definida no design.
- O script SHALL gravar a `thematic_class` derivada em dois lugares: no campo `thematicClass.value` (nivel raiz da celula em `terrain-grid.json`) e no campo `thematic_class` dentro de `terrainSnapshotBase`.
- O script SHALL derivar `clay_content`, `water_content` e `bulk_density` a partir de lookup por `thematic_class`, calibrado para Latossolo Vermelho-Amarelo do oeste da Bahia (ref. Imhoff et al. 2004).
- O script SHALL derivar `matric_suction` via van Genuchten simplificado a partir de `water_content` (ref. Tomasella & Hodnett 1996).
- O script SHALL derivar `conc_factor` (xi de Froehlich) a partir de `matric_suction`.
- O script SHALL derivar `sigma_p` via PTF Severiano et al. 2013 a partir de `clay_content` e `matric_suction`.
- O script SHALL marcar provenencia `derived` nos campos preenchidos e `unavailable` nas celulas com SCL invalido (nuvem, sombra, sem dado) e tambem nas celulas classificadas como `water` (corpo d'agua — variaveis de solo fisicamente inaplicaveis, nao confundir com dado ausente por nuvem).
- O script SHALL atualizar `datasetVersion` para `2026-04-05-paladino-bdc-7km-v2`.
- O script SHALL documentar em `terrain-sources.json` que `fieldProvenance` descreve a intencao metodologica global do dataset; a provenencia real de cada campo e registrada por celula dentro de `terrain-grid.json`.
- O script SHALL NOT inventar valores para celulas sem dado observavel valido.

---

## User Stories

### P1: Enriquecer a grade de celulas com variaveis de solo inferidas do BDC ⭐ MVP

**User Story**: Como desenvolvedor do prototipo, eu quero rodar um script offline que popule as variaveis de solo da grade com valores derivados dos assets do BDC para que o HUD passe a exibir dados reais em vez de ausencias.

**Why P1**: O HUD da Sprint 3 ja exibe os campos corretos; falta apenas os valores. Sem essa etapa, a demonstracao nao comunica nenhum dado de solo real.

**Acceptance Criteria**:

1. WHEN o script for executado THEN o sistema SHALL ler `terrain-sources.json` e usar `sources.bdc.selectedObservation` como a observacao de referencia do pipeline.
2. WHEN a observacao for carregada THEN o sistema SHALL amostrar NDVI e SCL para o centro de cada celula da grade, dividindo os valores brutos de NDVI por 10000 antes de aplicar qualquer limiar de classificacao.
3. WHEN SCL=4 e NDVI >= 0.5 THEN o sistema SHALL classificar a celula como `vegetation_dense`.
4. WHEN SCL=4 e NDVI < 0.5 THEN o sistema SHALL classificar a celula como `vegetation_sparse`.
5. WHEN SCL=5 THEN o sistema SHALL classificar a celula como `bare_soil`.
6. WHEN SCL=6 THEN o sistema SHALL classificar a celula como `water`, manter variaveis de solo como `null` e marcar provenencia `unavailable` (corpo d'agua: variaveis de solo fisicamente inaplicaveis).
7. WHEN SCL indicar nuvem ou dado invalido THEN o sistema SHALL manter todos os campos como `null` com provenencia `unavailable`.
8. WHEN `thematic_class` for classificada THEN o sistema SHALL gravar o valor em `thematicClass.value` (nivel raiz da celula) e em `terrainSnapshotBase.thematic_class`, e derivar `clay_content`, `water_content` e `bulk_density` por lookup de Latossolo do oeste da Bahia calibrado para a epoca da `selectedObservation`.
9. WHEN `water_content` for derivado THEN o sistema SHALL calcular `matric_suction` via van Genuchten simplificado.
10. WHEN `matric_suction` for calculado THEN o sistema SHALL derivar `conc_factor` por interpolacao de suction.
11. WHEN `clay_content` e `matric_suction` forem disponiveis THEN o sistema SHALL calcular `sigma_p` via PTF Severiano 2013.
12. WHEN os valores forem calculados THEN o sistema SHALL gravar `terrain-grid.json` com provenencia `derived` nos campos preenchidos.
13. WHEN o script concluir THEN o sistema SHALL gravar `terrain-sources.json` com secao `inferenceChain` documentando cada etapa e referencia bibliografica, e registrar explicitamente que o lookup de solo e calibrado para a epoca da `selectedObservation` e deve ser recalibrado se a observacao for trocada.

**Independent Test**: Executar o script e verificar que pelo menos 80% das celulas tem `sigma_p` > 0 e provenencia `derived`.

---

### P2: Re-embutir dataset enriquecido no index.html para o HUD exibir valores reais

**User Story**: Como demonstrador do prototipo, eu quero abrir `index.html` no navegador e ver valores reais de solo no HUD da celula atual, sem que a navegacao e coleta das sprints anteriores sejam afetadas.

**Why P2**: O dataset enriquecido so tem valor se estiver disponivel no runtime. Re-embutir no HTML fecha o ciclo da sprint.

**Acceptance Criteria**:

1. WHEN o dataset v2 for re-embutido no `index.html` THEN o sistema SHALL carregar a grade com `datasetVersion` `2026-04-05-paladino-bdc-7km-v2`.
2. WHEN o HUD exibir o bloco `Terreno Atual` THEN o sistema SHALL mostrar os valores derivados de `clay_content`, `water_content`, `matric_suction`, `bulk_density`, `conc_factor` e `sigma_p` para celulas com dados validos.
3. WHEN a missao salva no `localStorage` tiver `datasetVersion` anterior THEN o sistema SHALL invalidar a sessao e iniciar uma nova, sem restaurar dados incompativeis.
4. WHEN o trator entrar em celula com SCL invalido THEN o HUD SHALL continuar exibindo os campos com indicacao de ausencia, sem valor fabricado.
5. WHEN o `index.html` for aberto localmente THEN o sistema SHALL continuar funcionando sem servidor, sem build e sem rede.

**Independent Test**: Abrir `index.html`, navegar ate uma celula classificada como `vegetation_dense` e confirmar no HUD que `sigma_p` exibe valor numerico maior que zero.

---

## Edge Cases

- WHEN o COG do BDC estiver inacessivel via HTTP durante o script THEN o script SHALL registrar erro por celula e manter o campo como `null`, sem fabricar valor.
- WHEN todas as celulas resultarem com `sigma_p` null (falha total de acesso ao COG) THEN o script SHALL encerrar com erro diagnostico claro sem gravar um `terrain-grid.json` corrompido.
- WHEN `water_content` estiver fora dos limites fisicos da curva de retencao THEN o script SHALL fixar nos extremos (`theta_r` ou `theta_s`) antes de calcular `matric_suction`.
- WHEN o trator estiver em celula com todos os campos `null` THEN o HUD SHALL continuar exibindo os rotulos sem valor, como ja faz na Sprint 3, sem regressao.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S4INF-01 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-02 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-03 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-04 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-05 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-06 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-07 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-08 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-09 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-10 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-11 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-12 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-13 | P1: Enriquecer grade via BDC | Specify | Defined |
| S4INF-14 | P2: Re-embutir dataset no HTML | Specify | Defined |
| S4INF-15 | P2: Re-embutir dataset no HTML | Specify | Defined |
| S4INF-16 | P2: Re-embutir dataset no HTML | Specify | Defined |
| S4INF-17 | P2: Re-embutir dataset no HTML | Specify | Defined |
| S4INF-18 | P2: Re-embutir dataset no HTML | Specify | Defined |

**Coverage:** 18 total, 18 definidos, 0 sem mapeamento.

> **Nota de consistencia de pipeline**: A `selectedObservation` em `terrain-sources.json` e a entrada unica e imutavel do pipeline de inferencia. Toda etapa subsequente (amostragem, classificacao, lookup, manifesto) deve referenciar a mesma observacao. Trocar a observacao exige recalibrar o lookup de solo para a nova epoca.

---

## Success Criteria

Como saberemos que a sprint foi bem-sucedida:

- [ ] O script `prototipo/scripts/enriquecer-grade-bdc.py` executa sem erro e produz `terrain-grid.json` com pelo menos 80% das celulas com `sigma_p` > 0.
- [ ] O `terrain-sources.json` documenta a cadeia de inferencia completa com referencias bibliograficas.
- [ ] O `index.html` carrega a grade com `datasetVersion` `2026-04-05-paladino-bdc-7km-v2`.
- [ ] O HUD exibe valores numericos de solo para celulas classificadas, sem `null` onde ha dado disponivel.
- [ ] Celulas com SCL invalido continuam exibindo ausencia sem valor fabricado.
- [ ] Navegacao, coleta, persistencia e HUD das Sprints 1, 2 e 3 continuam sem regressao.

## Source Context

- Sprints concluidas: Sprint 1 (navegacao), Sprint 2 (coleta), Sprint 3 (HUD de leitura)
- PTF Severiano 2013: documentada em `docs/especificacao_prototipo_visual.md`
- van Genuchten: Tomasella & Hodnett 1996, parametros para Latossolo
- Solo de referencia: Latossolo Vermelho-Amarelo, oeste da Bahia (Sao Desiderio/BA)
- Dataset BDC: `prototipo/data/bdc-paladino-7km-items.json`
- Brazil Data Cube STAC API: https://data.inpe.br/bdc/stac/v1/
