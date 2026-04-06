# Sprint 6: Planejamento de Cobertura com Custo de Compactacao

**Status**: Concluida

## Resumo
A Sprint 6 introduziu o primeiro planejador de cobertura do prototipo. O runtime
passou a permitir que o usuario desenhe manualmente um talhao no mapa, gere um
`headland` simplificado, derive `swaths` paralelas e compare duas rotas sobre a
mesma cobertura: uma baseline orientada por distancia e outra otimizada por
distancia mais custo agronomico.

Essa sprint reutiliza os fundamentos das Sprints 4 e 5. O custo prospectivo da
rota considera o solo base derivado do BDC e o `compaction_accumulator` atual da
missao, transformando o conhecimento local de compactacao em uma estrategia
global de trafego no talhao.

## Objetivo da Sprint
Adicionar ao `prototipo/index.html` um coverage planner offline, sem build e sem
dependencias externas novas, capaz de:

- desenhar um unico `field_polygon` por clique em vertices
- derivar `headland` e `swaths`
- gerar uma rota baseline e uma rota otimizada
- exibir overlays e metricas comparativas no proprio HUD

## O Que Foi Entregue
- Novo estado `runtimeState.coveragePlanner` no runtime.
- Novo contrato `working_width_m` integrado ao trator ativo.
- Painel `Planejamento de Cobertura` no HUD com controles, status e metricas.
- Desenho manual de talhao com `Iniciar talhao`, `Fechar talhao` e `Cancelar desenho`.
- Validacao de talhao simples, bounds, auto-interseccao e area minima.
- Geometria local em XY metrico.
- `HeadlandGeometry` explicito com `outer_ring`, `inner_ring`, `path_ring` e fallback.
- Geracao de `swaths` paralelas por varredura rotacionada.
- Anchors de entrada e saida das faixas no `headland.path_ring`.
- Amostragem espacial por celula operacional e `PlannerCellCost`.
- Geracao de `baseline_route` e `optimized_route` sobre o mesmo conjunto de faixas.
- Overlays de preview, origem logica e rotas no mapa.
- Integracao ao runtime sem persistir `coverage_plan` na missao.

## Pipeline do Planner
- O usuario desenha um talhao por clique no mapa.
- `buildFieldPolygon()` valida e normaliza o poligono no recorte operacional.
- `deriveSwathOrientation()` escolhe automaticamente o maior eixo do talhao.
- `buildHeadlandGeometry()` cria o `headland` simplificado.
- `buildSwaths()` gera faixas paralelas com espacamento `working_width_m`.
- `attachSwathAnchors()` conecta as faixas ao anel de transicao do `headland`.
- `hydratePlannerCellCostIndex()` calcula o custo agronomico por celula usando a
  camada `20-30 cm`, o solo base e o `compaction_accumulator`.
- `planCoverageRoute(..., "baseline")` minimiza principalmente comprimento.
- `planCoverageRoute(..., "optimized")` usa custo composto
  `distancia + compactacao`.
- `buildCoveragePlan()` monta o artefato logico final com geometrias, rotas e
  metricas.

## Integracao no Runtime
- Durante `mode === "drawing"`, o trator e pausado e a missao nao amostra.
- Fora do modo de desenho, navegacao, HUD, overlay BDC e compactacao continuam
  operando como nas sprints anteriores.
- `working_width_m` passou a circular em `active_tractor_config` e
  `tractor_snapshot`.
- `coveragePlanner` continua runtime-only e nao entra no schema persistido da
  missao.
- `resetMission()` limpa o planner via `clearCoveragePlan()`.
- `buildMissionExport()` permanece compativel e nao exporta o plano da Sprint 6.

## Resultado no Mapa e no HUD
- O mapa agora mostra:
  - rascunho do talhao com `L.circleMarker` e `L.polyline`
  - talhao final com `L.polygon`
  - `headland`
  - `swaths`
  - origem logica do plano
  - rota baseline
  - rota otimizada
- O HUD passou a mostrar:
  - `working_width_m`
  - numero de faixas
  - comprimento baseline
  - comprimento otimizado
  - custo baseline
  - custo otimizado
  - delta percentual de comprimento
  - delta percentual de compactacao

## Correcao Importante no Fechamento da Sprint
Durante a validacao final, a geracao do plano ainda falhava no browser com:

`RangeError: Invalid array length`

A causa estava no loop de `buildForwardRingArc()` ao percorrer o
`headland.path_ring`. O controle de wrap no anel foi corrigido, eliminando o
erro e estabilizando a geracao da baseline e da rota otimizada.

## Validacao Final da Implementacao
- A sprint foi validada contra `spec.md`, `design.md` e `tasks.md`.
- O checklist T1 a T9 foi fechado.
- A validacao sintetica confirmou:
  - cobertura equivalente entre baseline e otimizada
  - repetibilidade deterministica para a mesma entrada
  - erro diagnostico para poligono auto-intersectante
  - erro diagnostico para vertices fora do recorte
  - invalidadacao correta por mudanca de `working_width_m`
  - aumento de custo quando existe `compaction_accumulator`
  - fallback funcional quando nao existe acumulado
- A validacao manual confirmou no browser:
  - preview do talhao com `headland` e `swaths`
  - geracao do plano sem regressao apos a correcao do arco
- Checagem local de sintaxe concluida com `inline-script-parse-ok`.

## Artefatos Relacionados
- `.specs/features/sprint-6-planejamento-cobertura/spec.md`
- `.specs/features/sprint-6-planejamento-cobertura/design.md`
- `.specs/features/sprint-6-planejamento-cobertura/tasks.md`
- `prototipo/index.html`
- `prototipo/sprint-6-planejamento-cobertura.md`

## Fora da Sprint
- Autopiloto ou seguimento automatico da rota.
- Importacao de GeoJSON ou shapefiles.
- Planejamento sobre raster BDC fino.
- Obstaculos internos complexos ou talhoes multipoligono.
- Otimizador global com solver externo.
- Persistencia de `coverage_plan` em `localStorage`.

## Assumptions
- O planner continua local, offline e sem build.
- O `headland` desta sprint e explicito, mas ainda simplificado.
- O custo agronomico continua agregado na grade operacional, nao no raster fino.
- O MVP cobre um unico talhao por vez, desenhado manualmente no mapa.
