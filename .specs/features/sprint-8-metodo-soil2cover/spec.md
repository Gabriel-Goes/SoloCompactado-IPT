# Sprint 8: Metodo Soil2Cover Specification

**Status**: Validated

## Problem Statement

As Sprints 6 e 7 introduziram um planner funcional de cobertura e melhoraram a
legibilidade da rota no mapa. No entanto, o algoritmo atual ainda nao reproduz
o metodo descrito no artigo
`docs/Soil2Cover_Coverage_path_planning_minimizing_soil_.pdf`.

Hoje o prototipo:

- usa `headland_width_m = 1 x working_width_m`
- deriva a orientacao das faixas por PCA
- escolhe a ordem de cobertura com heuristica gulosa
- calcula custo agronomico com agregacao por celula da grade operacional
- nao modela explicitamente um `Path Graph (GP)` e um `Coverage Graph (GC)`
- nao atualiza iterativamente os pesos de rota a partir do numero de passagens
  por aresta
- nao usa a curva `B_rho(n)` do SoilFlex como nucleo do custo iterativo

O artigo Soil2Cover segue outra formulacao:

- `headland` por buffer interno de `3 x robot_width`
- otimizacao do angulo das `swaths` por busca exaustiva em passos de `1 grau`
- `Path Graph (GP)` para circular no `headland ring`
- `Coverage Graph (GC)` para escolher a ordem das `swaths`
- custo de compactacao por segmento `f_c(n) = Omega_L * B_rho(n)`
- reponderacao iterativa de `GP` com base em `n_ij`, o numero de passagens por
  aresta
- parada quando duas iteracoes consecutivas produzem a mesma rota

Esta sprint existe para introduzir no prototipo um nucleo de planejamento que
replique o processo do artigo no caso de `single crop`, usando a mesma logica
de selecao de rota otima por compactacao e a mesma familia de insumos fisicos e
geometricos. O objetivo nao e apenas "melhorar" a rota atual, mas trocar o
metodo de escolha por um equivalente ao Soil2Cover.

## Goals

- [ ] Substituir o planner de rota da Sprint 6 por um metodo Soil2Cover para o
      caso de `single crop`.
- [ ] Estruturar o algoritmo em modulos explicitos consistentes com a familia
      Fields2Cover:
      - `headland generation`
      - `swath generation`
      - `route planning`
      - `path expansion`
- [ ] Introduzir um modelo explicito de custo por passagem repetida
      `B_rho(n)` derivado do SoilFlex em profundidade de referencia de `20 cm`.
- [ ] Gerar `headland` e `headland ring` de acordo com o artigo, usando
      `3 x robot_width_m`.
- [ ] Otimizar o angulo das `swaths` com busca exaustiva em passos de `1 grau`
      para maximizar a qualidade da cobertura interna.
- [ ] Construir `Path Graph (GP)` e `Coverage Graph (GC)` como estruturas
      explicitas do algoritmo.
- [ ] Resolver a ordem de cobertura como problema equivalente a TSP/Hamiltonian
      path sobre `GC`.
- [ ] Aplicar reponderacao iterativa das arestas de `GP` a partir de `n_ij`
      ate convergencia de rota.
- [ ] Preservar a UX e os overlays das Sprints 6 e 7, trocando apenas o nucleo
      de geracao da rota e das metricas.
- [ ] Expor diagnosticos suficientes para comparar:
      - baseline por distancia
      - rota Soil2Cover por compactacao
      - convergencia do loop iterativo

## Out of Scope

Para manter a sprint executavel, os itens abaixo ficam explicitamente fora.

| Feature | Reason |
| --- | --- |
| Strip cropping com multiplas culturas e multiplos `GC_i` | O artigo cobre esse caso, mas o prototipo atual ainda e mono-cultura e mono-trator |
| Multi-robot simultaneo | O runtime atual opera com um unico trator |
| Curved swaths | O artigo menciona isso como trabalho futuro |
| Nova UI para desenhar ou editar `internal_obstacles` | A codebase atual so desenha um `field_polygon` simples; obstaculos ficam para evolucao geometrica futura |
| Planejador de curvas com curvatura continua por clothoids para cobertura completa do `headland` | O artigo de headland e complementar ao Soil2Cover, mas este sprint foca a escolha de rota otima, nao a geracao de curvas fisicamente factiveis |
| Garantia cinematica completa de nao cruzar o bordo via geometria detalhada de robo + implemento | Isto exige um path planner fisico adicional, mais proximo do artigo de `Continuous Curvature Path Planning for Headland Coverage` |
| Sensoriamento em tempo real de solo e clima para replanning dinamico | Exigiria nova infraestrutura de dados |
| Novo modelo visual ou nova UX do planner | A Sprint 7 ja fechou esse recorte |
| Refatoracao ampla de `prototipo/index.html` | A sprint e algoritmica, nao estrutural |
| Validacao cientifica contra 1000 talhoes | A sprint deve entregar metodo e cenarios de validacao local, nao reproduzir o benchmark inteiro do artigo |

---

## Method Scope

Esta sprint contrata paridade metodologica com o Soil2Cover no caso de
`single crop` e `single robot`.

- O sistema SHALL decompor o workflow em etapas equivalentes a:
  - `headland generation`
  - `swath generation`
  - `route planning`
  - `path expansion` da rota sobre o `Path Graph`
- O sistema SHALL representar o custo de compactacao por segmento em funcao do
  numero de passadas sobre a mesma aresta.
- O sistema SHALL usar a curva `B_rho(n)` como o nucleo da penalizacao de
  compactacao acumulada.
- O sistema SHALL tratar a circulacao no `headland` separadamente da cobertura
  das `swaths`, via dois grafos distintos.
- O sistema SHALL atualizar os pesos do `Path Graph` iterativamente de acordo
  com a rota obtida na iteracao anterior.
- O sistema SHALL parar quando a rota resultante estabilizar por duas
  iteracoes consecutivas, ou quando atingir um limite maximo explicitamente
  diagnosticado.
- O sistema SHALL manter uma rota baseline de comprimento minimo para fins de
  comparacao.
- O sistema SHALL usar por default `entry_point = tractorState.position` no
  runtime atual.
- O sistema SHALL tratar `exit_point` como opcional e SHALL NOT exigir nova UI
  de definicao de destino nesta sprint.

---

## Required Inputs

O artigo depende de insumos geometricos, mecanicos e de solo. Esta sprint
formaliza esses contratos de entrada.

### Geometry Inputs

- `field_polygon`
- `working_width_m`
- `robot_width_m`, derivado da configuracao atual do trator no runtime
- `entry_point`, default `tractorState.position`
- `exit_point`, opcional; quando ausente, o termino da rota e livre ou coincide
  com a entrada segundo a configuracao do problema
- `internal_obstacles`, apenas quando vierem de uma estrutura geometrica ja
  disponivel no runtime; nao ha autoria nova de obstaculos nesta sprint
- `swath_angle_search_step_deg`, default `1`
- `start_end_snap_policy`, default `closest-point-on-ring`

### Machine Inputs

- `running_gear_type`: `wheel` ou `track`
- `contact_width_m`
- `contact_length_m`
- `tyre_or_track_parameters`
- `load_distribution_model`

### Optional Machine Calibration Inputs

Esses insumos sao uteis para reproduzir quantitativamente o exemplo do artigo,
mas SHALL NOT ser tratados como pre-condicao absoluta para calcular a escolha de
rota quando a curva `B_rho(n)` puder ser derivada por outros meios equivalentes.

- `total_vehicle_mass_kg`

### Track-Specific Inputs

Obrigatorios quando `running_gear_type = "track"`.

- `track_width_m`
- `track_length_m`
- `idlers_per_track`
- `idler_radius_m`
- `rollers_per_track`
- `roller_radius_m`
- `wheel_load_fractions`

### SoilFlex Inputs

- `bulk_density_initial`
- `specific_volume_initial`
- `density_of_solids`
- `N_specific_volume_at_1kPa`
- `compression_index_lambda_n`
- `recompression_index_kappa`
- `yield_line_specific_volume`
- `stress_concentration_factor_xi`
- `target_depth_m`, default `0.20`

### Stress Distribution Inputs

- para `wheel`:
  - `CA`
  - `gamma`
  - `alpha`
- para `track`:
  - `a`

### Operational Inputs

- `operations_per_crop_cycle`, default `1`
- `route_reuse_policy` para operacoes repetidas na mesma cultura
- `max_route_iterations`
- `graph_split_tolerance_m`

### Path Realization Inputs

Nao sao obrigatorios para escolher a rota Soil2Cover, mas devem entrar no contrato
de dados para permitir evolucao posterior rumo a um path planner fisicamente
factivel, consistente com a familia Fields2Cover e com o artigo de `headland
coverage`.

- `robot_width_m`
- `robot_length_m`
- `implement_width_m`
- `implement_length_m`
- `implement_offset_m`
- `max_curvature_with_implement_on`
- `max_curvature_with_implement_off`
- `max_curvature_change_rate`

### Input Validity Rules

- WHEN insumos obrigatorios do SoilFlex estiverem ausentes THEN o sistema SHALL
  recusar a geracao da rota Soil2Cover com mensagem diagnostica.
- WHEN os insumos permitirem apenas baseline por distancia THEN o sistema SHALL
  explicitar que a rota Soil2Cover nao pode ser calculada.
- WHEN o tipo de rodado for `track` THEN o sistema SHALL exigir os parametros
  de distribuicao de carga por idlers e rollers.
- WHEN `internal_obstacles` nao estiverem disponiveis na representacao geometrica
  atual THEN o sistema SHALL continuar suportando o caso base de talhao simples
  sem obstaculos.

---

## User Stories

### P1: Construir a curva de compactacao repetida do Soil2Cover

**User Story**: Como desenvolvedor do prototipo, eu quero calcular a curva
`B_rho(n)` para um conjunto fixo de insumos de solo e maquina, para que o custo
de compactacao das arestas siga a mesma logica do artigo.

**Why P1**: Sem `B_rho(n)`, a rota ainda sera guiada por uma heuristica de custo
agregado, nao pelo metodo Soil2Cover.

**Acceptance Criteria**:

1. O sistema SHALL introduzir uma funcao equivalente a `T_rho(rho_init)`,
   capaz de produzir a densidade aparente apos uma passagem do conjunto de
   rodagem.
2. O sistema SHALL introduzir uma funcao equivalente a `B_rho(n)`, que devolve
   a variacao acumulada de densidade apos `n` passadas.
3. WHEN `operations_per_crop_cycle > 1` THEN o sistema SHALL conseguir
   agregar o custo de operacoes repetidas sobre a mesma infraestrutura de
   passagens.
4. O sistema SHALL avaliar a compactacao na profundidade de referencia de
   `20 cm`, consistente com o artigo.
5. O sistema SHALL diferenciar explicitamente:
   - custo incremental de uma passagem adicional
   - custo acumulado apos `n` passadas
6. O sistema SHALL expor diagnosticos suficientes para inspecionar a curva
   `B_rho(n)` ao menos para os primeiros `n` relevantes do planejamento.

**Independent Test**: Para um conjunto fixo de parametros de solo e maquina,
calcular `B_rho(1..N)` e verificar crescimento nao linear com saturacao
progressiva.

---

### P2: Gerar headland e swaths no formato do artigo

**User Story**: Como usuario tecnico, eu quero que o talhao seja convertido em
`headland` e `swaths` como no Soil2Cover, para que a rota otima seja calculada
sobre a mesma geometria operacional do artigo.

**Why P2**: O artigo separa nitidamente manobras no `headland` e cobertura no
campo interno. O planner atual usa uma aproximacao mais simples.

**Acceptance Criteria**:

1. WHEN um `field_polygon` valido existir THEN o sistema SHALL gerar o
   `headland` por buffer interno de `3 x robot_width_m`.
2. O sistema SHALL gerar um ou mais `headland rings` explicitos entre o bordo
   externo e o bordo interno do `headland`.
3. O sistema SHALL gerar `swaths` apenas na area interna ao `headland`.
4. O sistema SHALL otimizar o angulo das `swaths` por busca exaustiva com passo
   de `1 grau`.
5. A funcao objetivo da orientacao das `swaths` SHALL ser consistente com o
   artigo, baseada na soma dos comprimentos das faixas.
6. WHEN houver empate entre angulos THEN o sistema SHALL usar regra de
   desempate deterministica.
7. Os endpoints das `swaths` SHALL ser conectados ao `headland ring` pelo ponto
   mais proximo no anel valido correspondente.
8. WHEN existirem `internal_obstacles` em uma estrutura geometrica suportada
   pelo runtime THEN o sistema SHALL representar aneis internos adicionais e
   SHALL considerar esses aneis na navegacao do `headland`.

**Independent Test**: Para um mesmo talhao, gerar o `headland`, buscar o angulo
otimo e confirmar que `swaths` e `headland ring` sao consistentes e
deterministicos.

---

### P3: Construir Path Graph e Coverage Graph

**User Story**: Como desenvolvedor do planner, eu quero modelar explicitamente
`GP` e `GC`, para que a escolha da ordem de cobertura e a circulacao no
`headland` reproduzam a formulacao do Soil2Cover.

**Why P3**: Esta e a principal diferenca estrutural entre o planner atual e o
artigo.

**Acceptance Criteria**:

1. O sistema SHALL criar um `Path Graph (GP)` com:
   - pontos dos `headland rings`
   - endpoints das `swaths`
   - conexoes ao anel
   - ponto de entrada
   - ponto de saida, quando especificado
2. O sistema SHALL quebrar arestas sobrepostas em segmentos atomicos para que o
   numero de passagens por aresta possa ser contado sem ambiguidade.
3. O sistema SHALL criar um `Coverage Graph (GC)` cujos vertices sejam os
   endpoints das `swaths` e o ponto de entrada.
4. O sistema SHALL atribuir custo zero entre os dois endpoints da mesma `swath`.
5. O sistema SHALL atribuir aos demais pares em `GC` o custo do menor caminho em
   `GP`.
6. O sistema SHALL tratar vertices desconectados com custo infinito ou
   equivalente diagnostico.
7. O sistema SHALL computar menores caminhos em `GP` por um algoritmo all-pairs
   shortest path equivalente ao usado no artigo, como Floyd-Warshall.
8. WHEN `exit_point` estiver especificado THEN o sistema SHALL expandir a rota
   final ate esse ponto via `GP`, sem alterar a ordem de cobertura escolhida em
   `GC`.

**Independent Test**: Para um talhao com varias faixas, inspecionar `GP` e
`GC`, confirmar que todos os endpoints pertencem a `GP` e que os custos de `GC`
derivam dos menores caminhos em `GP`.

---

### P4: Resolver a ordem de cobertura como TSP equivalente

**User Story**: Como usuario tecnico, eu quero que a ordem de cobertura das
`swaths` seja resolvida como problema equivalente a TSP, para que o metodo de
escolha da rota seja o mesmo do Soil2Cover e nao uma heuristica gulosa.

**Why P4**: A paridade com o artigo depende de resolver o problema de ordem de
visita sobre `GC`, nao apenas de pontuar candidatos locais.

**Acceptance Criteria**:

1. O sistema SHALL resolver a rota baseline de menor comprimento sobre `GC`.
2. O sistema SHALL resolver a rota Soil2Cover sobre `GC` usando os pesos
   correntes derivados de `GP`.
3. A ordem retornada SHALL visitar todos os vertices exigidos para cobrir todas
   as `swaths`.
4. O sistema SHALL ser deterministico para os mesmos insumos.
5. O sistema SHALL expor a ordem das `swaths` escolhida pelo otimizador.

**Independent Test**: Com um conjunto fixo de `swaths`, gerar baseline e ordem
Soil2Cover e verificar que ambas cobrem todas as faixas com ordem deterministica.

---

### P5: Reponderar iterativamente o Path Graph ate convergencia

**User Story**: Como pesquisador do metodo, eu quero iterar sobre a rota e os
pesos das arestas de `GP`, para que a escolha final minimize compactacao
acumulada por passagens repetidas, como no artigo.

**Why P5**: Esta iteracao e o coracao do Soil2Cover.

**Acceptance Criteria**:

1. Na primeira iteracao, o sistema SHALL inicializar `GP` com pesos
   proporcionais a distancia.
2. Apos gerar uma rota completa, o sistema SHALL atualizar `n_ij` para cada
   aresta de `GP` atraves de toda a rota expandida.
3. O novo peso de cada aresta SHALL refletir o custo de uma passagem adicional
   sobre a aresta, em funcao de `d_ij` e `B_rho(n_ij)`.
4. O sistema SHALL recalcular `GC` a cada iteracao usando os novos menores
   caminhos em `GP`.
5. O sistema SHALL repetir o processo ate que a rota obtida seja identica a da
   iteracao anterior por duas iteracoes consecutivas, ou ate o limite maximo de
   iteracoes.
6. WHEN o limite maximo de iteracoes for atingido THEN o sistema SHALL retornar
   a melhor rota encontrada e SHALL explicitar que houve parada por limite.
7. O sistema SHALL registrar metricas por iteracao, incluindo ao menos:
   - iteracao
   - custo total
   - comprimento total
   - rota sintetizada
   - criterio de parada

**Independent Test**: Gerar uma rota Soil2Cover para um talhao fixo, observar
as iteracoes e confirmar que o processo converge ou para com diagnostico
explito.

---

### P6: Comparar baseline e rota Soil2Cover no prototipo

**User Story**: Como usuario da demo tecnica, eu quero comparar a baseline e a
rota Soil2Cover usando os mesmos overlays e metricas do prototipo, para entender
o ganho real da troca de algoritmo.

**Why P6**: A sprint precisa resultar em um comportamento observavel e
comparavel, nao apenas em um modulo matematico isolado.

**Acceptance Criteria**:

1. O sistema SHALL continuar exibindo baseline e rota otimizada no mapa.
2. O sistema SHALL expor no HUD ou painel tecnico:
   - comprimento baseline
   - comprimento Soil2Cover
   - custo de compactacao baseline
   - custo de compactacao Soil2Cover
   - numero de iteracoes ate convergencia
   - motivo da parada
3. O sistema SHALL permitir inspecionar o `headland ring` e a origem da rota
   gerada.
4. O sistema SHALL preservar a visualizacao da Sprint 7 durante a troca do
   algoritmo.
5. WHEN os insumos do SoilFlex forem invalidos THEN o sistema SHALL manter a
   baseline disponivel e SHALL diagnosticar a indisponibilidade da rota
   Soil2Cover.

**Independent Test**: Gerar baseline e Soil2Cover para um talhao valido e
confirmar que o prototipo mostra ambas as rotas e as metricas comparativas.

---

## Edge Cases

- `field_polygon` pequeno demais para acomodar `headland = 3 x robot_width_m`
- `headland` invalido ou campo interno vazio apos o buffer
- angulos diferentes produzindo o mesmo conjunto de `swaths`
- `GP` desconectado para certos endpoints
- `internal_obstacles` presentes em dados futuros exigindo multiplos
  `headland rings`
- `exit_point` desconectado do `GP`
- arestas sobrepostas sem segmentacao atomica
- `B_rho(n)` saturando cedo e gerando empates frequentes
- falta de parametros `lambda_n`, `kappa`, `N`, `rho_s` ou `xi`
- `running_gear_type = track` sem distribuicao de carga por idler/roller
- entrada e saida coincidindo
- obstaculos internos fragmentando a navegacao
- limite maximo de iteracoes sem convergencia
- repeticao de operacoes por ciclo (`operations_per_crop_cycle > 1`)
- talhao com solo heterogeneo onde a hipoteses de homogeneidade precise ser
  explicitamente diagnosticada

---

## Success Criteria

- O prototipo passa a gerar uma rota Soil2Cover baseada em `GP + GC + B_rho(n)`
  para o caso `single crop`.
- A baseline de distancia continua disponivel para comparacao.
- O algoritmo deixa de depender de heuristica gulosa para a ordem de cobertura.
- O `headland` passa a seguir a regra de `3 x robot_width_m`.
- A orientacao das `swaths` passa a ser obtida por busca exaustiva de `1 grau`.
- O runtime consegue explicar por iteracao como a rota convergiu.
- A estrutura logica do planner fica alinhada com a decomposicao modular da
  familia Fields2Cover, mesmo que o path planner fisico avancado ainda fique
  para sprint futura.
- Os insumos necessarios para reproduzir o artigo ficam contratados de forma
  explicita no prototipo.

---

## Traceability

| Requirement ID | Description |
| --- | --- |
| S8MSC-01 | Introduzir `B_rho(n)` como curva de compactacao por passadas |
| S8MSC-02 | Calcular custo incremental por passagem adicional |
| S8MSC-03 | Exigir insumos SoilFlex obrigatorios |
| S8MSC-04 | Exigir insumos especificos para `track` |
| S8MSC-05 | Gerar `headland` por `3 x robot_width_m` |
| S8MSC-06 | Gerar um ou mais `headland rings` explicitos |
| S8MSC-07 | Gerar `swaths` na area interna do talhao |
| S8MSC-08 | Otimizar angulo das `swaths` com passo de `1 grau` |
| S8MSC-09 | Conectar endpoints das `swaths` ao ponto mais proximo do `headland ring` valido |
| S8MSC-10 | Representar aneis adicionais quando houver `internal_obstacles` |
| S8MSC-11 | Segmentar arestas sobrepostas em segmentos atomicos |
| S8MSC-12 | Construir `Coverage Graph (GC)` |
| S8MSC-13 | Usar menores caminhos de `GP` para pesar `GC` |
| S8MSC-14 | Resolver baseline de distancia sobre `GC` |
| S8MSC-15 | Resolver rota Soil2Cover sem heuristica gulosa local |
| S8MSC-16 | Atualizar `n_ij` por aresta a cada iteracao |
| S8MSC-17 | Reponderar `GP` por custo de passagem adicional |
| S8MSC-18 | Recalcular `GC` a cada iteracao |
| S8MSC-19 | Parar por convergencia de rota ou limite maximo |
| S8MSC-20 | Registrar metricas por iteracao |
| S8MSC-21 | Comparar baseline e Soil2Cover no runtime |
| S8MSC-22 | Preservar overlays e UX da Sprint 7 |
| S8MSC-23 | Diagnosticar indisponibilidade da rota Soil2Cover |
| S8MSC-24 | Suportar operacoes repetidas por ciclo |
| S8MSC-25 | Suportar `exit_point` opcional na expansao final da rota |
| S8MSC-26 | Ser deterministico para os mesmos insumos |
| S8MSC-27 | Contratar insumos de geometria fisica para evolucao futura do path planner |
