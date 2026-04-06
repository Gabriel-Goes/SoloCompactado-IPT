# Sprint 7: Visualizacao do Plano e Navegacao do Planner Specification

**Status**: Validated

## Problem Statement

A Sprint 6 introduziu o coverage planner, mas a leitura do plano ainda esta ruim
na pratica. O mapa continua centrado no trator durante a simulacao, o usuario
nao consegue navegar livremente pelo talhao enquanto analisa o plano, e a
densidade visual de `swaths`, transicoes e rotas torna dificil entender a ordem
de cobertura.

Existe tambem um problema especifico de mapa base. O prototipo usa imagery
satelital via tile provider externo com detalhe nativo limitado. Quando o
usuario aproxima alem desse limite, a experiencia degrada: o provider pode
retornar tiles ruins ou o mapa perde utilidade visual justamente quando o
usuario quer inspecionar as linhas do plano com mais precisao.

Esta sprint existe para transformar o planner da Sprint 6 em uma ferramenta de
inspecao visual utilizavel e tambem em uma ajuda de navegacao durante a
conducao do trator. O foco nao e recalcular a rota, mas sim melhorar a camera,
a navegacao do mapa, a hierarquia visual do overlay e a estrategia de zoom do
mapa base para que baseline e rota otimizada possam ser entendidas tanto na
analise do talhao quanto durante o deslocamento operacional.

## Goals

- [x] Introduzir um modo explicito de visualizacao do planner, com camera e
      navegacao de mapa independentes do seguimento do trator.
- [x] Permitir zoom operacional durante a navegacao normal, mantendo o trator e
      a rota legiveis sem exigir entrada no `planner view mode`.
- [x] Permitir inspecao do plano com `fitBounds`, pan e zoom no talhao sem
      quebrar a simulacao existente.
- [x] Melhorar a hierarquia visual de `field_polygon`, `headland`, `swaths`,
      baseline, rota otimizada e origem do plano.
- [x] Eliminar a degradacao visivel do mapa base ao aproximar o plano acima do
      limite nativo do provider.
- [x] Permitir alternar a leitura do plano sobre pelo menos duas bases visuais:
      imagery satelital e dado BDC.

## Out of Scope

Explicitamente excluido nesta sprint para evitar desvio de escopo.

| Feature | Reason |
| --- | --- |
| Refatoracao ampla de `prototipo/index.html` para multiplos modulos | A sprint quer resolver primeiro o problema de uso e legibilidade do planner |
| Recalculo do algoritmo de cobertura ou da funcao de custo da Sprint 6 | O foco aqui e visualizacao, navegacao e interpretacao do plano |
| Novo autopiloto ou execucao automatica da rota | Continua fora do recorte do prototipo |
| Novo dataset de imagery offline em alta resolucao | A sprint deve operar com providers existentes ou estrategia de stretch local |
| Persistencia do estado visual do planner em `localStorage` | O estado de camera e leitura continua efemero |
| Edicao interativa de vertices do talhao apos o fechamento | A geometria do talhao continua sendo tratada como entrada da Sprint 6 |

---

## Visualization Constraints

Esta sprint define o contrato funcional minimo do modo de visualizacao do
planner no runtime.

- O sistema SHALL introduzir um `planner view mode` explicito, separado da
  navegacao normal do trator.
- O sistema SHALL manter tambem um `operational follow mode` no qual a camera
  continua seguindo o trator, mas respeita o nivel de zoom escolhido pelo
  usuario.
- WHEN o usuario entrar no `planner view mode` THEN o mapa SHALL deixar de
  seguir automaticamente o trator e SHALL permitir pan e zoom manuais.
- WHEN o usuario sair do `planner view mode` THEN o mapa SHALL voltar ao
  comportamento operacional normal, incluindo a camera centrada no trator.
- WHEN o usuario ajustar o zoom durante o `operational follow mode` THEN o
  sistema SHALL preservar esse zoom enquanto continua acompanhando a posicao do
  trator.
- WHEN o trator estiver em deslocamento operacional THEN o overlay do planner
  SHALL permanecer legivel no zoom escolhido pelo usuario.
- WHEN existir um `field_polygon` ou `coverage_plan` valido THEN o planner
  SHALL oferecer uma acao de enquadramento automatico (`fitBounds`) com margem
  suficiente para mostrar o talhao completo.
- O sistema SHALL manter uma hierarquia visual clara entre:
  `field_polygon`, `headland`, `swaths`, `baseline_route`,
  `optimized_route` e `origin_marker`.
- A rota atualmente destacada SHALL ser visualmente dominante em relacao aos
  demais overlays do planner.
- O sistema SHALL permitir alternar pelo menos entre:
  - imagery satelital
  - dado BDC
- O runtime SHALL conhecer o `max_native_zoom` do provider de imagery ativo.
- WHEN o usuario aproximar o mapa acima de `max_native_zoom` THEN o sistema
  SHALL evitar novas requisicoes acima desse limite e SHALL preservar a leitura
  do plano por uma destas estrategias:
  - reutilizar o tile do ultimo zoom nativo e aplicar apenas stretch local, ou
  - trocar para um provider configurado com detalhe nativo suficiente
- O usuario SHALL NOT ver tiles de erro, tela cinza ou perda abrupta da base
  visual como consequencia direta do zoom acima do limite nativo.
- WHEN o provider de imagery falhar THEN o planner SHALL continuar utilizavel
  com fallback visual diagnostico, inclusive com a base BDC.
- A sprint SHALL continuar sem build e sem dependencia obrigatoria de biblioteca
  nova de mapas.

---

## User Stories

### P1: Usar zoom operacional enquanto dirige o trator

**User Story**: Como usuario da demo, eu quero aproximar ou afastar o mapa
enquanto continuo dirigindo o trator, para enxergar melhor as linhas da rota e
as faixas sem perder o contexto da conducao.

**Why P1**: A leitura do plano nao acontece so na hora de gerar o planejamento.
Ela tambem precisa funcionar durante a navegacao, quando o usuario compara a
posicao atual do trator com a rota planejada.

**Acceptance Criteria**:

1. WHEN o runtime estiver em navegacao normal THEN o usuario SHALL poder alterar
   o zoom do mapa sem precisar entrar no `planner view mode`.
2. WHEN o usuario alterar o zoom em navegacao normal THEN o sistema SHALL
   continuar seguindo o trator, preservando o zoom escolhido.
3. WHEN um `coverage_plan` estiver ativo durante a navegacao THEN a rota
   destacada SHALL permanecer legivel no zoom operacional escolhido.
4. WHEN o zoom operacional estiver muito fechado THEN o sistema SHALL manter
   visiveis ao menos o trator, a rota destacada e contexto espacial suficiente
   para navegacao.
5. WHEN o usuario retornar a um zoom mais aberto THEN o sistema SHALL preservar
   a estabilidade do overlay do planner e da base visual.
6. WHEN o usuario aproximar alem do limite nativo do provider THEN o sistema
   SHALL aplicar a mesma politica de protecao visual contra degradacao de tile
   definida para o planner.

**Independent Test**: Com um plano ativo e o trator em movimento, alterar o
zoom do mapa, verificar que a camera continua seguindo o trator e confirmar que
as linhas da rota permanecem discerniveis.

---

### P2: Entrar em modo de inspecao do planner

**User Story**: Como usuario da demo, eu quero entrar em um modo de visualizacao
do planner em que o mapa para de seguir o trator, para que eu consiga inspecionar
o talhao e o plano sem disputar a camera com a simulacao.

**Why P2**: Hoje a camera serve a navegacao do trator, nao a leitura do plano.
Sem separar esses modos, qualquer melhoria de overlay continua limitada.

**Acceptance Criteria**:

1. WHEN existir um `field_polygon` ou `coverage_plan` THEN o sistema SHALL
   permitir ativar um `planner view mode`.
2. WHEN `planner view mode` estiver ativo THEN o mapa SHALL habilitar pan manual.
3. WHEN `planner view mode` estiver ativo THEN o mapa SHALL habilitar zoom por
   scroll ou controles visuais.
4. WHEN o usuario ativar `planner view mode` THEN o sistema SHALL oferecer uma
   acao de `fitBounds` no talhao ou no plano atual.
5. WHEN `planner view mode` estiver ativo THEN o runtime SHALL suspender apenas
   o auto-follow da camera, sem invalidar a missao nem o estado do planner.
6. WHEN o usuario sair de `planner view mode` THEN a camera SHALL voltar ao
   comportamento normal de seguimento do trator.
7. WHEN nao houver plano ativo, mas houver `field_polygon` valido THEN o sistema
   SHALL ainda permitir enquadrar e inspecionar o talhao.

**Independent Test**: Gerar um talhao, entrar no modo planner, navegar livremente
com pan e zoom, aplicar `fitBounds` e depois voltar para o modo operacional com
camera seguindo o trator novamente.

---

### P3: Tornar a leitura das rotas e faixas visualmente clara

**User Story**: Como usuario da demo, eu quero distinguir rapidamente `swaths`,
baseline e rota otimizada no mapa, para entender a estrategia de cobertura sem
precisar decifrar um emaranhado de linhas.

**Why P3**: O plano da Sprint 6 existe, mas a sobreposicao atual de linhas torna
custoso entender ordem, prioridade e diferenca entre as duas rotas.

**Acceptance Criteria**:

1. WHEN o planner for renderizado THEN o sistema SHALL aplicar hierarquia visual
   diferente para:
   - contorno do talhao
   - `headland`
   - `swaths`
   - baseline
   - rota otimizada
   - origem do plano
2. WHEN a baseline nao for a rota destacada em `planner view mode` THEN ela
   SHALL permanecer legivel, mas visualmente secundaria.
3. WHEN a rota otimizada for a rota destacada THEN ela SHALL ter maior contraste,
   espessura ou destaque do que as `swaths` e a baseline.
4. WHEN as `swaths` forem exibidas THEN elas SHALL servir como malha de
   referencia e SHALL NOT competir visualmente com a rota destacada.
5. WHEN segmentos de transicao forem desenhados THEN o sistema SHALL distingui-los
   dos segmentos de cobertura em faixa.
6. WHEN o usuario alternar baseline e otimizada THEN o sistema SHALL atualizar
   apenas a apresentacao visual, sem recalcular o plano.
7. WHEN o sistema estiver em `operational follow mode` THEN a rota secundaria
   MAY ser ocultada para reduzir sobreposicao visual, desde que a rota ativa e
   a origem do plano permanecam claramente legiveis.
8. WHEN um plano denso for exibido THEN o usuario SHALL continuar capaz de
   identificar o sentido geral da rota e a origem do plano.

**Independent Test**: Gerar um plano com varias faixas, alternar entre baseline
e otimizada em `planner view mode` e confirmar que a rota destacada sempre se
destaca claramente contra as `swaths` e a outra rota. Em `follow mode`,
confirmar que a rota secundaria pode ser ocultada sem perda da leitura da rota
ativa.

---

### P4: Melhorar a base visual do planner em zoom alto

**User Story**: Como usuario da demo, eu quero aproximar o mapa para inspecionar
as linhas do plano sem perder a imagem de fundo ou receber tiles ruins, para que
o overlay continue sendo util em zoom alto.

**Why P4**: A leitura do plano depende de zoom local. Se o mapa base degrada
justamente nesse momento, o planner perde boa parte do valor demonstrativo.

**Acceptance Criteria**:

1. WHEN o usuario aproximar a visualizacao do planner acima do limite nativo do
   provider THEN o sistema SHALL manter o mapa visualmente estavel, sem tiles de
   erro ou regressao para tela cinza.
2. WHEN o provider de imagery ativo suportar detalhe nativo suficiente THEN o
   sistema MAY usa-lo para melhorar a leitura do plano.
3. WHEN o provider de imagery ativo nao suportar detalhe nativo suficiente THEN
   o sistema SHALL reutilizar o ultimo zoom nativo disponivel e aplicar apenas
   stretch local do tile.
4. WHEN o usuario quiser comparar o plano com o solo observado THEN o sistema
   SHALL permitir alternar a base visual para BDC sem perder o overlay do
   planner.
5. WHEN o provider satelital falhar ou ficar degradado THEN o sistema SHALL
   oferecer fallback claro para base BDC, mantendo a inspecao do plano.
6. WHEN o usuario alternar a base visual THEN o sistema SHALL preservar o
   `coverage_plan`, o enquadramento atual e o destaque baseline/otimizada.

**Independent Test**: Com um plano ativo, aproximar o mapa alem do `max native`
do provider atual, confirmar ausencia de erro visual, alternar entre imagery e
BDC e manter o overlay do planner estavel.

---

### P5: Expor comandos de visualizacao diretamente no HUD do planner

**User Story**: Como usuario da demo, eu quero controlar modo planner, base do
mapa, destaque da rota e enquadramento a partir do HUD, para nao depender de
comportamentos implicitos do mapa.

**Why P5**: A sprint precisa entregar um fluxo operavel e demonstravel, nao
apenas melhorias internas de render.

**Acceptance Criteria**:

1. WHEN o painel do planner for renderizado THEN o HUD SHALL expor controles
   explicitos para:
   - entrar ou sair do `planner view mode`
   - enquadrar o plano ou talhao
   - alternar a base visual do mapa
   - alternar o destaque baseline/otimizada
2. WHEN `planner view mode` estiver ativo THEN o HUD SHALL indicar isso de forma
   textual ou visual.
3. WHEN a base visual atual for alterada THEN o HUD SHALL refletir a selecao
   ativa.
4. WHEN o plano nao existir THEN os controles que dependem de `coverage_plan`
   SHALL ficar desabilitados ou degradados com diagnostico claro.
5. WHEN o usuario estiver apenas com `field_polygon` valido THEN o HUD SHALL
   permitir pelo menos enquadrar o talhao e entrar em modo planner.

**Independent Test**: Usar apenas os controles do HUD para entrar em modo
planner, enquadrar o plano, alternar base do mapa e alternar o destaque da rota.

---

## Edge Cases

- WHEN o usuario entrar em `planner view mode` sem `field_polygon` nem
  `coverage_plan` THEN o sistema SHALL recusar a acao com diagnostico claro.
- WHEN o usuario ajustar o zoom durante a navegacao operacional THEN o sistema
  SHALL continuar seguindo o trator sem resetar o zoom manualmente.
- WHEN o provider satelital falhar durante uma sessao de planejamento THEN o
  sistema SHALL preservar o overlay do planner e degradar apenas a base visual.
- WHEN o usuario aproximar alem do zoom nativo suportado THEN o sistema SHALL
  continuar exibindo overlay legivel e SHALL NOT emitir erro visual do provider.
- WHEN baseline e otimizada forem geometricamente muito proximas THEN o sistema
  SHALL manter alguma forma de destaque da rota ativa.
- WHEN existir grande densidade de `swaths` THEN o sistema SHALL evitar que a
  malha de referencia apague a leitura da rota.
- WHEN o usuario sair do `planner view mode` com o plano ainda ativo THEN o
  sistema SHALL preservar o plano e apenas restaurar a camera operacional.
- WHEN a base BDC estiver ativa THEN o planner SHALL continuar exibindo talhao,
  `headland`, `swaths` e rotas.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S7VPN-01 | P1: Usar zoom operacional enquanto dirige o trator | Specify | Defined |
| S7VPN-02 | P1: Usar zoom operacional enquanto dirige o trator | Specify | Defined |
| S7VPN-03 | P1: Usar zoom operacional enquanto dirige o trator | Specify | Defined |
| S7VPN-04 | P1: Usar zoom operacional enquanto dirige o trator | Specify | Defined |
| S7VPN-05 | P1: Usar zoom operacional enquanto dirige o trator | Specify | Defined |
| S7VPN-06 | P1: Usar zoom operacional enquanto dirige o trator | Specify | Defined |
| S7VPN-07 | P2: Entrar em modo de inspecao do planner | Specify | Defined |
| S7VPN-08 | P2: Entrar em modo de inspecao do planner | Specify | Defined |
| S7VPN-09 | P2: Entrar em modo de inspecao do planner | Specify | Defined |
| S7VPN-10 | P2: Entrar em modo de inspecao do planner | Specify | Defined |
| S7VPN-11 | P2: Entrar em modo de inspecao do planner | Specify | Defined |
| S7VPN-12 | P2: Entrar em modo de inspecao do planner | Specify | Defined |
| S7VPN-13 | P2: Entrar em modo de inspecao do planner | Specify | Defined |
| S7VPN-14 | P3: Tornar a leitura das rotas e faixas visualmente clara | Specify | Defined |
| S7VPN-15 | P3: Tornar a leitura das rotas e faixas visualmente clara | Specify | Defined |
| S7VPN-16 | P3: Tornar a leitura das rotas e faixas visualmente clara | Specify | Defined |
| S7VPN-17 | P3: Tornar a leitura das rotas e faixas visualmente clara | Specify | Defined |
| S7VPN-18 | P3: Tornar a leitura das rotas e faixas visualmente clara | Specify | Defined |
| S7VPN-19 | P3: Tornar a leitura das rotas e faixas visualmente clara | Specify | Defined |
| S7VPN-20 | P3: Tornar a leitura das rotas e faixas visualmente clara | Specify | Defined |
| S7VPN-21 | P4: Melhorar a base visual do planner em zoom alto | Specify | Defined |
| S7VPN-22 | P4: Melhorar a base visual do planner em zoom alto | Specify | Defined |
| S7VPN-23 | P4: Melhorar a base visual do planner em zoom alto | Specify | Defined |
| S7VPN-24 | P4: Melhorar a base visual do planner em zoom alto | Specify | Defined |
| S7VPN-25 | P4: Melhorar a base visual do planner em zoom alto | Specify | Defined |
| S7VPN-26 | P4: Melhorar a base visual do planner em zoom alto | Specify | Defined |
| S7VPN-27 | P5: Expor comandos de visualizacao diretamente no HUD do planner | Specify | Defined |
| S7VPN-28 | P5: Expor comandos de visualizacao diretamente no HUD do planner | Specify | Defined |
| S7VPN-29 | P5: Expor comandos de visualizacao diretamente no HUD do planner | Specify | Defined |
| S7VPN-30 | P5: Expor comandos de visualizacao diretamente no HUD do planner | Specify | Defined |
| S7VPN-31 | P5: Expor comandos de visualizacao diretamente no HUD do planner | Specify | Defined |

**Coverage:** 31 total, 31 definidos, 0 sem mapeamento.

> **Nota de recorte da Sprint 7**: esta sprint melhora a leitura e a navegacao
> do planner da Sprint 6. O algoritmo de rota, a geometria de cobertura e o
> custo agronomico permanecem essencialmente os mesmos; o foco e camera, mapa
> base, controle de zoom e hierarquia visual dos overlays, tanto na inspecao do
> talhao quanto na conducao operacional com o plano ativo.

---

## Success Criteria

Como saberemos que a sprint foi bem-sucedida:

- [x] O usuario consegue entrar em um `planner view mode` e inspecionar o talhao
      com pan, zoom e `fitBounds`.
- [x] O usuario consegue ajustar o zoom durante a navegacao normal e continua
      vendo o trator e a rota destacada com clareza.
- [x] O mapa deixa de seguir o trator enquanto o modo planner estiver ativo e
      volta ao comportamento normal ao sair desse modo.
- [x] Baseline, rota otimizada, `swaths` e `headland` passam a ser visualmente
      distinguiveis no mapa.
- [x] Aproximar o plano acima do limite nativo do provider nao produz tiles de
      erro, tela cinza nem quebra da leitura visual.
- [x] O usuario consegue alternar entre imagery satelital e base BDC mantendo o
      overlay do planner.
- [x] Os novos controles de visualizacao ficam acessiveis no HUD do planner sem
      regressao da simulacao atual.

## Validation Summary

- A Sprint 7 foi implementada e validada contra `spec.md`, `design.md` e
  `tasks.md`.
- A checagem sintatica local concluiu com `inline-script-parse-ok`.
- A checagem estrutural do runtime concluiu com `t9-structural-check-ok`.
- A validacao manual no browser confirmou:
  - zoom operacional durante a conducao sem perder o follow do trator
  - `planner view mode` com pan, zoom e enquadramento do talhao
  - melhor separacao visual entre rota ativa, rota secundaria, `swaths` e
    `headland`
  - fallback funcional entre imagery e BDC no fluxo do planner

## Source Context

- Sprint 6: `.specs/features/sprint-6-planejamento-cobertura/spec.md`
- Base do runtime: `prototipo/index.html`
- Documento de implementacao atual: `prototipo/sprint-6-planejamento-cobertura.md`
