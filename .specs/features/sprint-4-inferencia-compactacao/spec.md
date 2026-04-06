# Sprint 4: Inferencia de Parametros de Solo via BDC Specification

## Problem Statement

O prototipo ja navega sobre a Fazenda Paladino, coleta amostras e exibe um HUD lateral, mas o runtime ainda reduz o dado fino do Brazil Data Cube a patches operacionais grandes demais. O efeito pratico e incorreto: ao clicar em "Ver dado BDC", o mapa mostra blocos quilometricos e o HUD de terreno nao muda dentro do mesmo patch, mesmo quando o raster original tem resolucao muito mais fina.

Esta sprint existe para um objetivo unico: popular as variaveis de solo da demo com valores derivados dos assets oficiais do Brazil Data Cube, preservando a granularidade espacial do raster. O resultado deve incluir um produto rasterizado local do BDC para overlay e consulta no HUD, alem do `terrain-grid.json` operacional, de forma que o mapa e o HUD deixem de operar em patches de 2 km quando o dado original tem resolucao muito mais fina.

## Goals

- [ ] Criar o script offline `prototipo/scripts/enriquecer-grade-bdc.py` que processa os pixels do raster BDC dentro do recorte operacional e deriva a classificacao tematica pixel a pixel.
- [ ] Gerar um produto raster local compactado para o runtime consultar o BDC em granularidade fina, sem resumir a cena em patches de 2 km.
- [ ] Atualizar `terrain-grid.json` operacional a partir do produto raster, preservando compatibilidade com a malha de missao.
- [ ] Atualizar `terrain-sources.json` com a cadeia de inferencia documentada e nova `datasetVersion`.
- [ ] Re-embutir os datasets atualizados no `index.html` para que o overlay e o HUD exibam o dado BDC em granularidade fina.

## Out of Scope

Explicitamente excluido nesta sprint para evitar desvio de escopo.

| Feature | Reason |
| --- | --- |
| Motor de compactacao e calculo de estresse mecanico continuo | Pertence a sprint analitica futura |
| Semaforo de risco verde/amarelo/vermelho | Depende do motor de compactacao |
| Recomendacoes operacionais | Depende de logica de decisao futura |
| Calibracao de PTF com dados de campo | Exige campanha de medicao; esta sprint usa referencias bibliograficas |
| Consulta online ao BDC em runtime | O runtime continua offline; todo preprocessamento ocorre antes do embed |

---

## Data Source Constraints

As variaveis de solo derivadas nesta sprint nao podem ser inventadas. Toda inferencia deve partir dos assets oficiais do BDC e seguir a cadeia documentada abaixo.

- O script SHALL ler `terrain-sources.json` e usar a observacao definida em `sources.bdc.selectedObservation` como entrada fixa do pipeline. A selecao da observacao nao e responsabilidade deste script.
- O script SHALL ler NDVI e SCL dos COGs correspondentes a `selectedObservation` via `rasterio`, processando todos os pixels do recorte operacional usado pela demo.
- O script SHALL dividir NDVI por 10000 antes de qualquer classificacao.
- O script SHALL classificar `thematic_class` pixel a pixel a partir de SCL e NDVI, sem reduzir a cena a um unico valor medio, mediano ou dominante antes da inferencia pixelar.
- O script SHALL produzir um dataset raster local compactado, com georreferenciamento suficiente para que o runtime consulte a classe tematica do pixel sob o trator e desenhe o overlay do mapa em granularidade fina.
- O lookup de variaveis de solo (`clay_content`, `water_content`, `bulk_density`) e calibrado para a epoca da `selectedObservation`. Se a observacao for trocada por uma de epoca diferente, o lookup deve ser recalibrado. Esta dependencia e explicita e deve ser documentada no manifesto.
- O script SHALL derivar o `terrain-grid.json` operacional a partir do raster pixelado, apenas como malha de compatibilidade para missao/exportacao. O `terrain-grid.json` SHALL NOT ser a fonte primaria do overlay BDC nem do HUD.
- O script SHALL gravar a `thematic_class` derivada em dois niveis: no produto raster pixelado e no campo agregado de compatibilidade (`thematicClass.value` e `terrainSnapshotBase.thematic_class`) do `terrain-grid.json`.
- O script SHALL derivar `clay_content`, `water_content` e `bulk_density` a partir de lookup por `thematic_class`, calibrado para Latossolo Vermelho-Amarelo do oeste da Bahia (ref. Imhoff et al. 2004).
- O script SHALL derivar `matric_suction` via van Genuchten simplificado a partir de `water_content` (ref. Tomasella & Hodnett 1996).
- O script SHALL derivar `conc_factor` (xi de Froehlich) a partir de `matric_suction`.
- O script SHALL derivar `sigma_p` via PTF Severiano et al. 2013 a partir de `clay_content` e `matric_suction`.
- O script SHALL marcar proveniencia `derived` nos campos preenchidos e `unavailable` nos pixels com SCL invalido (nuvem, sombra, sem dado) e tambem nos pixels classificados como `water` (corpo d'agua — variaveis de solo fisicamente inaplicaveis).
- O script SHALL atualizar `datasetVersion` para `2026-04-05-paladino-bdc-7km-v2`.
- O script SHALL documentar em `terrain-sources.json` que `fieldProvenance` descreve a intencao metodologica global do dataset; a proveniencia real de cada campo e registrada por pixel no produto raster e, em nivel agregado, por celula no `terrain-grid.json`.
- O script SHALL NOT inventar valores para pixels sem dado observavel valido.

---

## User Stories

### P1: Gerar um produto BDC pixelado para inferencia de solo ⭐ MVP

**User Story**: Como desenvolvedor do prototipo, eu quero rodar um script offline que derive a classificacao e os parametros de solo a partir dos pixels do BDC, para que o mapa e o HUD reflitam a variacao espacial real do raster e nao um patch inteiro resumido.

**Why P1**: O HUD da Sprint 3 ja exibe os campos corretos, mas hoje o runtime reduz o dado fino do BDC a patches operacionais grandes demais. Sem preservar a granularidade do raster, a demonstracao comunica um artefato de agregacao e nao o dado observado.

**Acceptance Criteria**:

1. WHEN o script for executado THEN o sistema SHALL ler `terrain-sources.json` e usar `sources.bdc.selectedObservation` como a observacao de referencia do pipeline.
2. WHEN a observacao for carregada THEN o sistema SHALL processar todos os pixels do recorte operacional e dividir os valores brutos de NDVI por 10000 antes de aplicar qualquer limiar de classificacao.
3. WHEN SCL=4 e NDVI >= 0.5 em um pixel THEN o sistema SHALL classificar esse pixel como `vegetation_dense`.
4. WHEN SCL=4 e NDVI < 0.5 em um pixel THEN o sistema SHALL classificar esse pixel como `vegetation_sparse`.
5. WHEN SCL=5 em um pixel THEN o sistema SHALL classificar esse pixel como `bare_soil`.
6. WHEN SCL=6 em um pixel THEN o sistema SHALL classificar esse pixel como `water`, manter variaveis de solo como `null` e marcar proveniencia `unavailable` para esse pixel.
7. WHEN SCL indicar nuvem ou dado invalido em um pixel THEN o sistema SHALL manter todos os campos desse pixel como `null` com proveniencia `unavailable`.
8. WHEN o raster tematico for classificado THEN o sistema SHALL gravar um produto raster local compactado com georreferenciamento e classe por pixel, suficiente para consulta espacial no runtime.
9. WHEN o runtime consultar a posicao atual do trator THEN o sistema SHALL usar o pixel do raster BDC sob a posicao atual como fonte primaria das variaveis de solo exibidas no HUD.
10. WHEN `thematic_class` pixelar for conhecida THEN o sistema SHALL derivar `clay_content`, `water_content` e `bulk_density` por lookup de Latossolo do oeste da Bahia calibrado para a epoca da `selectedObservation`.
11. WHEN `water_content` for derivado THEN o sistema SHALL calcular `matric_suction` via van Genuchten simplificado.
12. WHEN `matric_suction` for calculado THEN o sistema SHALL derivar `conc_factor` por interpolacao de suction.
13. WHEN `clay_content` e `matric_suction` forem disponiveis THEN o sistema SHALL calcular `sigma_p` via PTF Severiano 2013.
14. WHEN os valores pixel a pixel forem calculados THEN o sistema SHALL derivar `terrain-grid.json` apenas como malha operacional de compatibilidade, sem que isso substitua a fonte raster do runtime.
15. WHEN o script concluir THEN o sistema SHALL gravar `terrain-sources.json` com secao `inferenceChain` documentando cada etapa e referencia bibliografica, e registrar explicitamente que o lookup de solo e calibrado para a epoca da `selectedObservation` e deve ser recalibrado se a observacao for trocada.

**Independent Test**: Executar o script e verificar que o produto raster local foi gerado, que a posicao do trator pode resolver pixels diferentes dentro de uma mesma celula operacional e que o `terrain-grid.json` continua consistente como malha de compatibilidade.

---

### P2: Usar o raster pixelado no overlay e no HUD

**User Story**: Como demonstrador do prototipo, eu quero abrir `index.html`, clicar em "Ver dado BDC" e ver um overlay com granularidade fina e um HUD que muda dentro do mesmo patch operacional quando o pixel BDC muda.

**Why P2**: O dado enriquecido so tem valor demonstrativo se o runtime usar o produto raster como fonte primaria para o mapa e para o HUD.

**Acceptance Criteria**:

1. WHEN o dataset v2 for re-embutido no `index.html` THEN o sistema SHALL carregar a grade operacional e tambem o raster BDC local com `datasetVersion` `2026-04-05-paladino-bdc-7km-v2`.
2. WHEN o usuario clicar em "Ver dado BDC" THEN o sistema SHALL desenhar o overlay a partir do raster local, sem retangulos de 2 km como unidade visual.
3. WHEN o HUD exibir o bloco `Terreno Atual` THEN o sistema SHALL mostrar os valores derivados do pixel BDC corrente (`clay_content`, `water_content`, `matric_suction`, `bulk_density`, `conc_factor`, `sigma_p`) para a posicao atual do trator.
4. WHEN o trator se mover dentro da mesma celula operacional de 2 km mas cruzar pixels BDC com classes diferentes THEN o HUD SHALL atualizar as variaveis de solo conforme o pixel corrente.
5. WHEN a missao salva no `localStorage` tiver `datasetVersion` anterior THEN o sistema SHALL invalidar a sessao e iniciar uma nova, sem restaurar dados incompativeis.
6. WHEN o trator entrar em pixel com SCL invalido THEN o HUD SHALL continuar exibindo os campos com indicacao de ausencia, sem valor fabricado.
7. WHEN o `index.html` for aberto localmente THEN o sistema SHALL continuar funcionando sem servidor, sem build e sem rede.

**Independent Test**: Abrir `index.html`, ativar "Ver dado BDC", atravessar uma fronteira interna do raster dentro de um mesmo patch operacional e confirmar mudanca visual no overlay e atualizacao do HUD sem troca de celula de 2 km.

---

## Edge Cases

- WHEN o COG do BDC estiver inacessivel via HTTP durante o script THEN o script SHALL encerrar com erro diagnostico claro sem fabricar raster local invalido.
- WHEN o raster local nao puder ser decodificado no runtime THEN o overlay BDC SHALL falhar de forma diagnostica e o HUD SHALL degradar para ausencia, sem fabricar valor.
- WHEN `water_content` estiver fora dos limites fisicos da curva de retencao THEN o sistema SHALL fixar nos extremos (`theta_r` ou `theta_s`) antes de calcular `matric_suction`.
- WHEN o trator estiver em pixel com todos os campos `null` THEN o HUD SHALL continuar exibindo os rotulos sem valor, como ja faz na Sprint 3, sem regressao.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S4INF-01 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-02 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-03 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-04 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-05 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-06 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-07 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-08 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-09 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-10 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-11 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-12 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-13 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-14 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-15 | P1: Produto BDC pixelado | Specify | Defined |
| S4INF-16 | P2: Overlay e HUD pixelados | Specify | Defined |
| S4INF-17 | P2: Overlay e HUD pixelados | Specify | Defined |
| S4INF-18 | P2: Overlay e HUD pixelados | Specify | Defined |
| S4INF-19 | P2: Overlay e HUD pixelados | Specify | Defined |
| S4INF-20 | P2: Overlay e HUD pixelados | Specify | Defined |
| S4INF-21 | P2: Overlay e HUD pixelados | Specify | Defined |
| S4INF-22 | P2: Overlay e HUD pixelados | Specify | Defined |

**Coverage:** 22 total, 22 definidos, 0 sem mapeamento.

> **Nota de consistencia de pipeline**: A `selectedObservation` em `terrain-sources.json` e a entrada unica e imutavel do pipeline de inferencia. Toda etapa subsequente (classificacao pixelar, lookup, manifesto, produto raster e grade operacional) deve referenciar a mesma observacao. Trocar a observacao exige recalibrar o lookup de solo para a nova epoca.

---

## Success Criteria

Como saberemos que a sprint foi bem-sucedida:

- [ ] O script `prototipo/scripts/enriquecer-grade-bdc.py` executa sem erro e produz um raster BDC local pixelado para o recorte operacional.
- [ ] O `terrain-sources.json` documenta a cadeia de inferencia completa com referencias bibliograficas.
- [ ] O `index.html` carrega a grade operacional e o raster pixelado com `datasetVersion` `2026-04-05-paladino-bdc-7km-v2`.
- [ ] O overlay BDC exibe granularidade fina do raster, sem patches de 2 km.
- [ ] O HUD exibe valores numericos de solo para o pixel corrente, sem ficar congelado em toda a celula operacional.
- [ ] Pixels com SCL invalido continuam exibindo ausencia sem valor fabricado.
- [ ] Navegacao, coleta, persistencia e HUD das Sprints 1, 2 e 3 continuam sem regressao.

## Source Context

- Sprints concluidas: Sprint 1 (navegacao), Sprint 2 (coleta), Sprint 3 (HUD de leitura)
- PTF Severiano 2013: documentada em `docs/especificacao_prototipo_visual.md`
- van Genuchten: Tomasella & Hodnett 1996, parametros para Latossolo
- Solo de referencia: Latossolo Vermelho-Amarelo, oeste da Bahia (Sao Desiderio/BA)
- Dataset BDC: `prototipo/data/bdc-paladino-7km-items.json`
- Brazil Data Cube STAC API: https://data.inpe.br/bdc/stac/v1/
