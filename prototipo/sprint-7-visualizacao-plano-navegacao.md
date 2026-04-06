# Sprint 7: Visualizacao do Plano e Navegacao do Planner

**Status**: Concluida

## Resumo
A Sprint 7 transformou o coverage planner da Sprint 6 em uma ferramenta visual
mais utilizavel durante dois contextos reais de uso:

- inspecao livre do talhao e do plano
- conducao operacional com o trator em movimento

O foco da sprint nao foi recalcular rotas nem refatorar o prototipo em modulos.
O trabalho concentrou-se em camera, zoom, base visual e hierarquia dos vetores
para que o usuario consiga distinguir baseline, rota otimizada, `swaths` e
`headland` mesmo quando as linhas ficam muito proximas.

## Objetivo da Sprint
Entregar no `prototipo/index.html` um modo de visualizacao do planner com:

- `follow mode` operacional, mantendo o trator no centro mas respeitando o zoom
  escolhido pelo usuario
- `planner view mode` com pan, zoom e `fitBounds`
- overlays mais legiveis
- selecao coerente entre imagery satelital e base BDC
- protecao contra degradacao da imagery acima do zoom nativo do provider

## O Que Foi Entregue
- Novo subestado `coveragePlanner.view` no runtime.
- Zoom fracionario no mapa com `zoomSnap = 0.25` e `zoomDelta = 0.25`.
- Separacao explicita entre `follow_zoom` e `planner_zoom`.
- `planner view mode` com interacoes manuais de mapa.
- `fitPlannerBounds()` para enquadrar talhao ou plano.
- Origem unica de verdade para a base visual em `coveragePlanner.view.map_base`.
- Delegacao do botao legado `Ver dado BDC` para o novo fluxo de base visual.
- Fallback automatico de imagery para BDC em `tileerror`.
- Reducao controlada de opacidade da imagery quando existe plano ativo.
- Renderer do planner com hierarquia visual forte:
  - `swaths` discretas
  - rota ativa com `casing + inner stroke`
  - transicoes destacadas com `dashArray`
  - rota secundaria oculta em `follow mode`
  - rota secundaria em ghosted mode no `planner mode`
  - origem com halo claro
- HUD do planner ampliado com controles de camera, zoom, base, enquadramento e
  destaque baseline/otimizada.

## Fluxo de Visualizacao Entregue
- Em `follow mode`:
  - a camera continua acompanhando o trator
  - o usuario pode ajustar `Zoom +` e `Zoom -`
  - a rota ativa permanece dominante
  - a rota secundaria sai de cena para reduzir sobreposicao
- Em `planner mode`:
  - a camera deixa de seguir o trator
  - pan e zoom manuais ficam liberados
  - `Enquadrar plano` usa o talhao ou o plano como envelope logico
  - a rota secundaria volta em ghosted mode para comparacao

## Integracao no Runtime
- `setCameraPosition()` agora so atua em `follow mode`.
- `syncPlannerZoomFromMap()` mantem o estado coerente com zoom manual do mapa.
- `setPlannerMapBase()` centraliza imagery vs BDC sem estados concorrentes.
- `handleImageryTileError()` faz degrade automatico para BDC quando possivel.
- `renderPlannerDrawingOverlay()` passou a reagir tambem ao modo visual
  corrente, para esconder ou reexibir a rota secundaria sem recalculo.
- `working_width_m` continua circulando em `active_tractor_config` e
  `tractor_snapshot`.
- `coveragePlanner` continua runtime-only e nao entra no export da missao.

## Resultado no HUD e no Mapa
- O painel do planner agora mostra:
  - camera ativa
  - base ativa
  - zoom atual
  - botoes para `follow/planner`
  - `Zoom +` e `Zoom -`
  - `Enquadrar plano`
  - `Base: Satelite` e `Base: BDC`
  - `Ver baseline` e `Ver otimizada`
- O mapa agora responde melhor ao uso operacional:
  - zoom pode ser alterado sem perder o follow do trator
  - o plano pode ser inspecionado livremente
  - a leitura da rota ativa fica mais clara sobre imagery e BDC

## Validacao Final da Implementacao
- A sprint foi validada contra `spec.md`, `design.md` e `tasks.md`.
- O checklist T1 a T9 foi fechado.
- Checagem local de sintaxe concluida com `inline-script-parse-ok`.
- Checagem estrutural local concluida com `t9-structural-check-ok`.
- Validacao manual no browser confirmou:
  - zoom operacional durante a conducao
  - `planner view mode` com pan, zoom e enquadramento
  - melhora perceptivel de legibilidade das rotas
  - alternancia entre imagery e BDC mantendo o overlay do planner

## Artefatos Relacionados
- `.specs/features/sprint-7-visualizacao-plano-navegacao/spec.md`
- `.specs/features/sprint-7-visualizacao-plano-navegacao/design.md`
- `.specs/features/sprint-7-visualizacao-plano-navegacao/tasks.md`
- `prototipo/index.html`
- `prototipo/sprint-7-visualizacao-plano-navegacao.md`

## Fora da Sprint
- Refatoracao ampla de `prototipo/index.html`.
- Mudanca do algoritmo de cobertura ou custo da Sprint 6.
- Novo provider obrigatorio de imagery.
- Persistencia do estado visual do planner em `localStorage`.
- Autopiloto ou execucao automatica da rota.

## Assumptions
- O ganho principal veio de camera, zoom visual local e renderer, nao de nova
  geometria.
- O provider atual de imagery foi mantido.
- O stretch visual continua limitado por `visual_max_zoom = 18`.
- O planner continua offline, sem build e sem novas dependencias obrigatorias.
