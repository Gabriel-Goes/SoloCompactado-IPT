# Sprint 6: Planejamento de Cobertura com Custo de Compactacao Specification

**Status**: Validated

## Problem Statement

O prototipo ja navega pela Fazenda Paladino, resolve o pixel BDC corrente, exibe o HUD operacional e calcula compactacao por camada no ponto atual, incluindo o acumulado historico por celula ao longo da missao. Ainda falta, porem, transformar esse conhecimento local em uma estrategia global de trafego: o sistema nao sabe planejar como o trator deve cobrir um talhao inteiro minimizando repeticao de passadas em areas sensiveis.

Esta sprint existe para introduzir o primeiro planejador de cobertura do prototipo, inspirado no Soil2Cover, mas adaptado ao runtime atual. O objetivo e permitir que o usuario desenhe um talhao no mapa, gere faixas paralelas de cobertura e compare uma rota baseline focada em distancia com uma rota otimizada por distancia mais custo de compactacao.

## Goals

- [x] Permitir que o usuario desenhe um talhao simples no mapa e gere uma cobertura completa por faixas paralelas.
- [x] Introduzir `working_width_m` como largura operacional do conjunto trator + implemento, separada de `tyre_width`.
- [x] Gerar duas rotas comparaveis para o mesmo talhao e a mesma cobertura: uma baseline por distancia e outra otimizada por `compactacao + distancia`.
- [x] Usar como base de custo o terreno derivado da Sprint 4 combinado ao `compaction_accumulator` atual da Sprint 5.
- [x] Exibir o plano no mapa com overlay e metricas comparativas, mantendo o prototipo offline em `index.html`.

## Out of Scope

Explicitamente excluido nesta sprint para evitar desvio de escopo.

| Feature | Reason |
| --- | --- |
| Autopiloto ou seguimento automatico da rota planejada | A meta aqui e planejar e comparar rotas, nao executar controle autonomo |
| Importacao de GeoJSON ou shapefiles | O MVP usa desenho manual no mapa para manter o prototipo autocontido |
| Planejamento diretamente no raster BDC fino | O custo agronomico pode usar o estado do solo, mas o grafo do planner permanece simplificado |
| Multi-trator, multi-implemento ou intercropping | A sprint cobre apenas um trator, um talhao e uma cobertura simples |
| Obstaculos internos complexos, buracos ou talhoes multipoligono | O MVP trabalha com um poligono simples sem holes |
| Replanejamento continuo em tempo real enquanto o trator se move | O planejamento e gerado sob demanda e permanece estatico ate novo pedido |
| Replicacao cientifica completa do Soil2Cover / Fields2Cover | A sprint e inspirada no paper, mas adaptada ao runtime e aos dados ja existentes |

---

## Planning Constraints

Esta sprint define o contrato funcional minimo do planejador de cobertura no runtime.

- O sistema SHALL permitir exatamente um `field_polygon` ativo por vez, desenhado manualmente no mapa pelo usuario durante uma sessao.
- O `field_polygon` SHALL ser um poligono simples, fechado, sem auto-interseccao e totalmente contido no recorte operacional carregado pela demo.
- O sistema SHALL introduzir `working_width_m` como largura operacional da cobertura; esse campo SHALL ser separado de `tyre_width` porque representa o conjunto trator + implemento, nao apenas o pneu.
- O sistema SHALL gerar uma cobertura por faixas paralelas (`swaths`) dentro do `field_polygon`, usando `working_width_m` como espacamento entre faixas.
- O sistema SHALL escolher automaticamente a orientacao inicial das faixas a partir do maior eixo do `field_polygon`, sem exigir configuracao manual no MVP.
- O sistema SHALL reservar um `headland` simplificado com largura de `1 x working_width_m` ao longo do contorno interno do talhao para suportar manobras e transicoes entre faixas.
- O sistema SHALL usar a posicao atual do trator como origem logica do planejamento; quando o trator estiver fora do talhao, a origem SHALL ser projetada para o ponto de entrada viavel mais proximo no `headland`.
- O sistema SHALL gerar uma rota baseline que minimize principalmente o comprimento total da rota, sujeita a cobertura completa das faixas.
- O sistema SHALL gerar uma rota otimizada que minimize uma funcao de custo composta `J = alpha * distancia + beta * compactacao`, onde ambos os termos contribuem materialmente para o resultado.
- O custo de compactacao SHALL combinar o terreno base derivado da Sprint 4 com o `compaction_accumulator` atual da missao para estimar penalidades prospectivas sobre faixas e transicoes.
- O sistema SHALL usar a grade operacional como suporte espacial minimo para agregar custo agronomico do planner; o grafo de planejamento SHALL NOT operar no raster BDC completo no MVP.
- O sistema SHALL produzir um artefato logico `coverage_plan` contendo no minimo: `field_polygon`, `working_width_m`, `headland_width_m`, `swath_orientation_deg`, `swaths`, `baseline_route`, `optimized_route` e `metrics`.
- O sistema SHALL manter operacao offline em `index.html`, sem build, sem servidor e sem consulta de rede.

---

## User Stories

### P1: Desenhar o talhao e gerar a cobertura por faixas MVP

**User Story**: Como demonstrador do prototipo, eu quero desenhar um talhao no mapa e gerar faixas paralelas de cobertura, para que o sistema tenha uma malha operacional concreta sobre a qual planejar o trafego.

**Why P1**: Sem o talhao desenhado e sem as faixas, nao existe problema de cobertura real para o planner resolver.

**Acceptance Criteria**:

1. WHEN o usuario ativar o modo de planejamento THEN o sistema SHALL permitir desenhar um unico `field_polygon` simples no mapa.
2. WHEN o usuario concluir um poligono valido THEN o sistema SHALL armazenar esse `field_polygon` como entrada ativa do planner.
3. WHEN `working_width_m` estiver disponivel e o `field_polygon` for valido THEN o sistema SHALL gerar uma cobertura por faixas paralelas dentro do talhao.
4. WHEN a cobertura for gerada THEN o sistema SHALL criar tambem um `headland` simplificado interno com largura de `1 x working_width_m`.
5. WHEN a orientacao das faixas for necessaria THEN o sistema SHALL seleciona-la automaticamente com base no maior eixo do poligono.
6. WHEN o talhao nao comportar ao menos uma faixa util THEN o sistema SHALL recusar o planejamento com mensagem diagnostica clara.
7. WHEN o usuario redesenhar o poligono ou alterar `working_width_m` THEN o sistema SHALL invalidar o plano anterior e exigir novo calculo.
8. WHEN a cobertura for exibida THEN o sistema SHALL mostrar o contorno do talhao, o `headland` e as faixas no mapa, sem alterar a missao de coleta atual.

**Independent Test**: Desenhar um talhao simples dentro do recorte, definir `working_width_m` e confirmar que o mapa passa a exibir contorno, `headland` e faixas paralelas sem interferir no restante do runtime.

---

### P2: Calcular uma rota baseline e uma rota otimizada por compactacao

**User Story**: Como apresentador da demo, eu quero comparar uma rota curta com uma rota otimizada por distancia e compactacao, para demonstrar que o motor da Sprint 5 pode orientar o trafego em escala de talhao.

**Why P2**: O valor do planejador aparece somente quando o sistema compara duas estrategias de cobertura sobre a mesma geometria e o mesmo estado do solo.

**Acceptance Criteria**:

1. WHEN um `field_polygon` valido e uma cobertura por faixas existirem THEN o sistema SHALL gerar uma rota baseline cobrindo todas as faixas uma vez, com foco principal em minimizar distancia.
2. WHEN o plano otimizado for solicitado THEN o sistema SHALL gerar uma rota cobrindo o mesmo conjunto de faixas usando a funcao de custo composta `J = alpha * distancia + beta * compactacao`.
3. WHEN o custo de compactacao de uma faixa ou transicao for calculado THEN o sistema SHALL usar o estado do solo disponivel no runtime, combinando terreno base e `compaction_accumulator` atual da missao.
4. WHEN a missao ainda nao tiver `compaction_accumulator` relevante THEN o sistema SHALL degradar o custo prospectivo para o terreno base, sem bloquear o planejamento.
5. WHEN a origem da rota for definida THEN o sistema SHALL usar a posicao atual do trator, projetando-a para a entrada viavel mais proxima no `headland` quando necessario.
6. WHEN uma transicao entre faixas for planejada THEN o sistema SHALL privilegiar deslocamentos dentro do `headland`, evitando cruzamentos laterais arbitrarios sobre a area ainda nao coberta.
7. WHEN as duas rotas forem concluidas THEN o sistema SHALL produzir metricas comparativas de comprimento total, custo total de compactacao e numero de passadas ou repassadas.
8. WHEN o planner for executado duas vezes com o mesmo `field_polygon`, `working_width_m`, estado da missao e origem THEN o sistema SHALL produzir o mesmo resultado de rota e metricas.

**Independent Test**: Com um talhao desenhado e um estado de missao definido, gerar baseline e rota otimizada e verificar que ambas cobrem todas as faixas, mas retornam custos e comprimentos distintos.

---

### P3: Expor o plano no mapa com overlay e metricas comparativas

**User Story**: Como usuario da demo, eu quero ver a rota planejada e os ganhos esperados no proprio prototipo, para entender o tradeoff entre eficiencia operacional e protecao do solo sem depender de autopiloto.

**Why P3**: A sprint so entrega valor demonstravel se o plano puder ser interpretado visualmente e comparado dentro da interface ja existente.

**Acceptance Criteria**:

1. WHEN um `coverage_plan` existir THEN o sistema SHALL desenhar no mapa o `field_polygon`, o `headland`, as `swaths`, a rota baseline e a rota otimizada.
2. WHEN o usuario alternar a visualizacao do overlay THEN o sistema SHALL permitir destacar baseline ou otimizada sem recalcular o plano.
3. WHEN as metricas do plano forem exibidas THEN o sistema SHALL mostrar pelo menos `working_width_m`, numero de faixas, comprimento baseline, comprimento otimizado, custo baseline e custo otimizado.
4. WHEN as metricas comparativas forem calculadas THEN o sistema SHALL mostrar a variacao percentual de comprimento e de custo de compactacao entre baseline e otimizada.
5. WHEN nao houver `coverage_plan` ativo THEN o sistema SHALL manter o mapa, o HUD e a missao operando como nas Sprints 1 a 5, sem regressao.
6. WHEN o plano ativo for descartado THEN o sistema SHALL remover apenas os overlays e metricas do planejamento, preservando o restante do estado da missao.

**Independent Test**: Gerar um plano, alternar a rota destacada no mapa, confirmar que as metricas continuam coerentes e remover o plano sem quebrar a navegacao nem o HUD.

---

## Edge Cases

- WHEN o usuario desenhar um poligono auto-intersectante THEN o sistema SHALL rejeitar o `field_polygon` com erro diagnostico claro.
- WHEN qualquer vertice do `field_polygon` estiver fora do recorte operacional da demo THEN o sistema SHALL rejeitar o planejamento em vez de cortar o talhao silenciosamente.
- WHEN `working_width_m` for nulo, zero, negativo ou numericamente invalido THEN o sistema SHALL bloquear a geracao de cobertura.
- WHEN `working_width_m` for maior que a menor dimensao util do talhao THEN o sistema SHALL recusar o planejamento com mensagem diagnostica apropriada.
- WHEN parte do talhao incidir sobre areas `water` ou `_invalid` THEN o sistema SHALL refletir isso no custo e nas metricas, sem fabricar solo observavel inexistente.
- WHEN a missao nao tiver amostras nem `compaction_accumulator` THEN o sistema SHALL continuar capaz de planejar usando apenas o terreno base.
- WHEN a posicao atual do trator estiver muito distante do talhao THEN o sistema SHALL ainda usar essa posicao como origem logica e conecta-la ao ponto de entrada viavel mais proximo.
- WHEN o usuario tentar gerar mais de um talhao simultaneamente THEN o sistema SHALL manter apenas um `field_polygon` ativo no MVP.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S6CPP-01 | P1: Desenhar o talhao e gerar a cobertura por faixas | Specify | Defined |
| S6CPP-02 | P1: Desenhar o talhao e gerar a cobertura por faixas | Specify | Defined |
| S6CPP-03 | P1: Desenhar o talhao e gerar a cobertura por faixas | Specify | Defined |
| S6CPP-04 | P1: Desenhar o talhao e gerar a cobertura por faixas | Specify | Defined |
| S6CPP-05 | P1: Desenhar o talhao e gerar a cobertura por faixas | Specify | Defined |
| S6CPP-06 | P1: Desenhar o talhao e gerar a cobertura por faixas | Specify | Defined |
| S6CPP-07 | P1: Desenhar o talhao e gerar a cobertura por faixas | Specify | Defined |
| S6CPP-08 | P1: Desenhar o talhao e gerar a cobertura por faixas | Specify | Defined |
| S6CPP-09 | P2: Calcular uma rota baseline e uma rota otimizada por compactacao | Specify | Defined |
| S6CPP-10 | P2: Calcular uma rota baseline e uma rota otimizada por compactacao | Specify | Defined |
| S6CPP-11 | P2: Calcular uma rota baseline e uma rota otimizada por compactacao | Specify | Defined |
| S6CPP-12 | P2: Calcular uma rota baseline e uma rota otimizada por compactacao | Specify | Defined |
| S6CPP-13 | P2: Calcular uma rota baseline e uma rota otimizada por compactacao | Specify | Defined |
| S6CPP-14 | P2: Calcular uma rota baseline e uma rota otimizada por compactacao | Specify | Defined |
| S6CPP-15 | P2: Calcular uma rota baseline e uma rota otimizada por compactacao | Specify | Defined |
| S6CPP-16 | P2: Calcular uma rota baseline e uma rota otimizada por compactacao | Specify | Defined |
| S6CPP-17 | P3: Expor o plano no mapa com overlay e metricas comparativas | Specify | Defined |
| S6CPP-18 | P3: Expor o plano no mapa com overlay e metricas comparativas | Specify | Defined |
| S6CPP-19 | P3: Expor o plano no mapa com overlay e metricas comparativas | Specify | Defined |
| S6CPP-20 | P3: Expor o plano no mapa com overlay e metricas comparativas | Specify | Defined |
| S6CPP-21 | P3: Expor o plano no mapa com overlay e metricas comparativas | Specify | Defined |
| S6CPP-22 | P3: Expor o plano no mapa com overlay e metricas comparativas | Specify | Defined |

**Coverage:** 22 total, 22 definidos, 0 sem mapeamento.

> **Nota de recorte da Sprint 6**: o planner desta sprint e inspirado no Soil2Cover, mas trabalha com um modelo simplificado para o prototipo: um unico talhao desenhado manualmente, faixas paralelas, `headland` simplificado, custo agronomico agregado na grade operacional e comparacao entre rota baseline e rota otimizada.

---

## Success Criteria

Como saberemos que a sprint foi bem-sucedida:

- [x] O usuario consegue desenhar um talhao simples no mapa e gerar uma cobertura completa por faixas paralelas.
- [x] O runtime passa a expor `working_width_m` como largura operacional distinta de `tyre_width`.
- [x] O sistema gera para o mesmo talhao uma rota baseline e uma rota otimizada por `compactacao + distancia`.
- [x] O custo da rota otimizada usa o terreno base e o `compaction_accumulator` atual quando disponivel.
- [x] O mapa exibe o plano com `field_polygon`, `headland`, `swaths` e rotas comparaveis sem quebrar o HUD atual.
- [x] As metricas comparativas deixam claro o tradeoff entre comprimento total e custo de compactacao.
- [x] O prototipo continua operando localmente, offline e sem build.

## Validation Summary

**Date**: 2026-04-06

- A implementacao final em `prototipo/index.html` foi validada contra os requisitos
  `S6CPP-01..22`.
- A validacao sintetica confirmou `sameCoverage = true` entre baseline e otimizada,
  repetibilidade deterministica para a mesma entrada e fallback correto para
  missao sem `compaction_accumulator`.
- Os casos invalidos de poligono auto-intersectante e vertices fora do recorte
  retornaram erros diagnosticos esperados.
- A troca de `working_width_m` invalida o plano anterior, preserva o
  `field_polygon` e exige novo calculo.
- O bug de browser `RangeError: Invalid array length` durante `Gerar plano`
  foi corrigido em `buildForwardRingArc()` e o fluxo foi confirmado em validacao
  manual posterior.
- Checagens locais executadas no fechamento da sprint:
  - `inline-script-parse-ok`
  - validacao sintetica do planner em runtime isolado

## Source Context

- Sprint 4: `.specs/features/sprint-4-inferencia-compactacao/spec.md`
- Sprint 5: `.specs/features/sprint-5-motor-compactacao/spec.md`
- Base do runtime: `prototipo/index.html`
- Referencia conceitual: `docs/Soil2Cover_Coverage_path_planning_minimizing_soil_.pdf`
- Dado de suporte espacial: `prototipo/data/terrain-grid.json`, `prototipo/data/terrain-bdc-raster.json`
