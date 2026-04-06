# Sprint 5: Motor de Compactacao por Camadas Specification

## Problem Statement

O prototipo ja navega pela Fazenda Paladino, coleta amostras, resolve o pixel BDC corrente e exibe no HUD as variaveis derivadas de solo e do trator. Ainda falta, porem, o nucleo analitico da demo: transformar essas entradas em resposta mecanica do solo por profundidade. Sem esse motor, o prototipo para na leitura de insumos e ainda nao demonstra como o trafego gera risco e compactacao acumulada ao longo das camadas.

Esta sprint existe para introduzir o primeiro slice operacional completo do gemeo digital de compactacao: um motor local, executado no runtime do `index.html`, que use o snapshot do trator e o solo do pixel atual para calcular tensao aplicada, resistencia do solo, risco e deformacao por camada, acumulando o efeito das passadas registradas na missao.

## Goals

- [ ] Calcular um perfil vertical fixo de `0-60 cm` em 6 camadas de `10 cm`.
- [ ] Usar o snapshot atual do trator e o snapshot do pixel BDC corrente como entradas primarias do motor.
- [ ] Produzir por camada `sigma_aplicada_kpa`, `sigma_p_kpa`, `stress_ratio`, `risk_class`, `delta_bulk_density` e `bulk_density_estimated`.
- [ ] Acumular o efeito de compactacao ao longo da missao sem perder a leitura instantanea sob o trator.
- [ ] Exibir o resultado do motor no HUD atual em formato textual, sem depender de novo mapa tematico nesta sprint.
- [ ] Persistir e exportar o estado acumulado de compactacao junto com os dados da missao.

## Out of Scope

Explicitamente excluido nesta sprint para evitar desvio de escopo.

| Feature | Reason |
| --- | --- |
| Heatmap espacial de risco ou compactacao | Requer visualizacao espacial dedicada e sai do recorte enxuto desta sprint |
| Novo overlay no mapa alem do BDC ja existente | A meta aqui e o motor local, nao uma nova camada cartografica |
| Recalibracao do pipeline BDC ou troca de `selectedObservation` | A Sprint 5 consome o dado ja derivado na Sprint 4 |
| Controles interativos novos de maquina, solo ou profundidade | O motor deve reutilizar o estado ja contratado no runtime |
| Geometria lateral detalhada das duas rodas no mapa | Nesta sprint o motor opera com uma roda equivalente sob a posicao atual |
| Perfil vertical configuravel alem de `0-60 cm` | A profundidade fica fixa para manter comparabilidade e simplicidade |

---

## Motor Constraints

Esta sprint define o contrato funcional minimo do motor de compactacao no runtime.

- O sistema SHALL consumir como entrada do lado do solo o `terrain_snapshot` do pixel BDC corrente, ja derivado pela Sprint 4.
- O sistema SHALL consumir como entrada do lado da maquina o snapshot ativo do trator, incluindo no minimo `wheel_load`, `inflation_pressure`, `tyre_width`, `tyre_diameter`, `track_gauge` e `route_speed`. O campo `tyre_recommended_pressure` SHALL estar presente no config do trator com valor padrao igual a `inflation_pressure` quando nao disponivel; ele e necessario para o calculo de `sigma_max` via Keller (2005) Eq. 5.
- O sistema SHALL construir um perfil vertical de 6 camadas a partir de templates por `thematic_class`, ancorados pelos valores superficiais do pixel atual (`clay_content`, `water_content`, `bulk_density`, `matric_suction`, `conc_factor`, `sigma_p`). Cada camada do template define: gradiente de `clay_content` e `bulk_density` com a profundidade (tipico de Latossolo: +5% argila e +0.05 Mg/m³ por camada abaixo de 10 cm) e valor de concentracao de carga `xi` (xi=5 nas camadas superficiais umidas, xi=4 nas camadas intermediarias e de subsolo rigido), parametrizado por `thematic_class`.
- O sistema SHALL calcular `sigma_aplicada_kpa` por camada usando o modelo de Keller (2005) + Sohne (1953)/Frohlich (1934): (1) `sigma_max` na superficie via Eq. 5 de Keller (2005), com `wheel_load` convertido de kg para kN internamente (`W_kN = wheel_load * 9.81 / 1000`); (2) propagacao em profundidade via formula de Frohlich, usando `xi` da camada e raio equivalente do patch de contato calculado a partir de `tyre_width` e comprimento de contato (Keller 2005 Eq. 3-4).
- O sistema SHALL calcular `sigma_p_kpa` por camada a partir do perfil vertical derivado do pixel atual, sem inventar valores quando a camada estiver marcada como indisponivel.
- O sistema SHALL comparar `sigma_aplicada_kpa` e `sigma_p_kpa` para obter `stress_ratio` e `risk_class` por camada usando os limiares de Stettler et al. (2014): `stress_ratio < 0.5` → `safe`; `0.5 <= stress_ratio <= 1.1` → `warning`; `stress_ratio > 1.1` → `critical`.
- O sistema SHALL estimar deformacao por camada como `delta_bulk_density` usando o modelo de compressao de O'Sullivan e Robertson (1996): VCL (`v = N - lambda_n * ln(p)`) e RCL (`v = v_i - kappa * ln(p/p_i)`), com `p = sigma_aplicada` diretamente, porque a PTF de Lima et al. (2018) foi calibrada em compressao uniaxial na mesma escala de tensao vertical usada pelo motor nesta sprint. Os parametros compressivos sao estimados via PTF de Lima et al. (2018) a partir de `bulk_density` e `matric_suction` da camada. `bulk_density_estimated` e atualizado como `rho_solid / v_final`, onde `rho_solid = 2.65 Mg/m³` (Latossolo) e `m = 1.3` (O'Sullivan e Robertson 1996). A PTF de Lima et al. (2018) e uma aproximacao para Sandy Loam aplicada ao Latossolo por ausencia de PTF calibrada para Oxisol nesta fase.
- O sistema SHALL separar leitura instantanea do ponto atual de acumulado historico da missao; mover o trator nao pode apagar o acumulado ja registrado.
- O sistema SHALL atualizar a leitura instantanea de compactacao sempre que houver `terrain_snapshot` resolvido no pixel BDC corrente, mesmo quando o trator estiver dentro do raster BDC mas fora da grade operacional de celulas; nesse caso o sistema SHALL nao registrar nova amostra de missao.
- O sistema SHALL manter operacao offline em `index.html`, sem build, sem servidor e sem consulta de rede.

---

## User Stories

### P1: Calcular o perfil de compactacao sob o trator ⭐ MVP

**User Story**: Como demonstrador do prototipo, eu quero que o sistema calcule a compactacao por camada usando o trator ativo e o solo do pixel atual, para que eu veja no HUD o efeito mecanico do trafego naquele ponto.

**Why P1**: Sem esse calculo, a demo continua mostrando apenas insumos de solo e maquina, mas nao entrega a resposta analitica que justifica o gemeo digital.

**Acceptance Criteria**:

1. WHEN o runtime estiver posicionado sobre um pixel com `terrain_snapshot` valido THEN o sistema SHALL construir um perfil vertical com 6 camadas: `0-10`, `10-20`, `20-30`, `30-40`, `40-50` e `50-60 cm`.
2. WHEN o perfil vertical for construido THEN o sistema SHALL usar templates por `thematic_class` para distribuir as propriedades em profundidade, mantendo ancoragem nos valores superficiais do pixel atual.
3. WHEN o motor executar o lado da carga THEN o sistema SHALL usar o snapshot atual do trator para calcular `sigma_aplicada_kpa` em cada camada.
4. WHEN o motor executar o lado da resistencia THEN o sistema SHALL obter `sigma_p_kpa` por camada a partir do perfil vertical derivado do pixel atual.
5. WHEN uma camada for avaliada THEN o sistema SHALL produzir pelo menos `sigma_aplicada_kpa`, `sigma_p_kpa`, `stress_ratio`, `risk_class`, `delta_bulk_density` e `bulk_density_estimated`.
6. WHEN `sigma_aplicada_kpa` estiver muito abaixo de `sigma_p_kpa` THEN o sistema SHALL classificar a camada como `safe`.
7. WHEN `sigma_aplicada_kpa` estiver proxima de `sigma_p_kpa` THEN o sistema SHALL classificar a camada como `warning`.
8. WHEN `sigma_aplicada_kpa` exceder `sigma_p_kpa` THEN o sistema SHALL classificar a camada como `critical`.
9. WHEN o pixel atual estiver com `thematic_class` `water`, `_invalid` ou campos de solo indisponiveis THEN o sistema SHALL retornar um perfil sem valores fabricados, com proveniencia `unavailable`.
10. WHEN o HUD for atualizado THEN o sistema SHALL exibir um bloco textual de `Compactacao por Camada` para o ponto atual, sem exigir novo mapa.
11. WHEN o `index.html` for aberto localmente THEN o motor SHALL continuar funcional sem servidor, build ou rede.

**Independent Test**: Abrir `prototipo/index.html`, mover o trator para um pixel valido e confirmar no HUD a presenca de 6 linhas de camadas com resultados mecanicos; mover para pixel invalido e confirmar que o bloco permanece visivel sem numeros inventados.

---

### P2: Acumular o efeito das passadas na missao

**User Story**: Como operador da demo, eu quero que as passadas registradas na missao acumulem o efeito de compactacao por camada, para que o prototipo represente historico de trafego e nao apenas uma leitura estatica.

**Why P2**: O valor operacional do prototipo depende do acumulo por passadas; sem isso, cada leitura seria descartavel e nao mostraria degradacao progressiva do solo.

**Acceptance Criteria**:

1. WHEN uma nova amostra de missao for criada THEN o sistema SHALL calcular tambem um `compaction_snapshot` por camada para aquele instante.
2. WHEN multiplas amostras forem registradas na mesma missao THEN o sistema SHALL acumular o efeito por camada em um estado de missao separado da leitura instantanea do ponto atual.
3. WHEN o trator se mover para outro pixel THEN o sistema SHALL recalcular a leitura instantanea do novo ponto sem perder o historico acumulado ja registrado.
4. WHEN a missao for persistida no `localStorage` THEN o sistema SHALL persistir tambem o estado acumulado de compactacao.
5. WHEN a missao for restaurada com a mesma `datasetVersion` THEN o sistema SHALL restaurar o acumulado de compactacao junto com os samples.
6. WHEN a `datasetVersion` persistida for diferente da atual THEN o sistema SHALL invalidar a missao anterior sem tentar reaproveitar o acumulado.
7. WHEN a missao for exportada THEN o JSON SHALL incluir `compaction_snapshot` por amostra e o acumulado atual por camada.

**Independent Test**: Rodar uma missao com varias amostras, exportar o JSON e confirmar a presenca de snapshots por amostra e de um acumulado por camada; recarregar a pagina e verificar que o acumulado restaurado permanece coerente.

---

### P3: Expor o motor no HUD sem abrir nova frente de interface

**User Story**: Como apresentador da demo, eu quero que o resultado do motor apareca no HUD atual de forma textual e enxuta, para que a sprint entregue valor analitico sem se transformar em uma sprint de redesign.

**Why P3**: A sprint precisa continuar enxuta; o ganho principal vem do motor, nao de uma interface nova.

**Acceptance Criteria**:

1. WHEN o HUD renderizar o resultado do motor THEN o sistema SHALL adicionar um bloco textual `Compactacao por Camada` sem remover os blocos `Trator`, `Terreno Atual` e `Missao`.
2. WHEN o bloco `Compactacao por Camada` for exibido THEN o sistema SHALL mostrar as 6 camadas em ordem crescente de profundidade.
3. WHEN uma camada tiver resultado valido THEN o HUD SHALL mostrar pelo menos profundidade, `risk_class`, `sigma_aplicada_kpa`, `sigma_p_kpa` e `delta_bulk_density`.
4. WHEN uma camada nao tiver dado valido THEN o HUD SHALL manter a linha visivel com indicacao de ausencia, sem esconder a estrutura do perfil.
5. WHEN o motor recalcular por mudanca de posicao ou por nova amostra THEN o bloco SHALL atualizar sem flicker perceptivel e sem quebrar a navegacao do mapa.
6. WHEN a tecla `D` ativar o debug existente THEN o novo bloco SHALL coexistir com o restante do HUD sem comprometer a leitura principal.

**Independent Test**: Abrir a demo em desktop, navegar por varios pixels e verificar que o novo bloco textual atualiza com o restante do HUD, sem alterar a experiencia base de navegacao.

---

## Edge Cases

- WHEN o pixel atual estiver fora do raster BDC ou sem `terrain_snapshot` resolvivel THEN o sistema SHALL nao calcular perfil de compactacao e SHALL exibir ausencia sem erro.
- WHEN o trator estiver dentro do raster BDC, mas fora da grade operacional de celulas, THEN o sistema SHALL continuar exibindo a leitura instantanea do pixel atual sem registrar nova amostra de missao.
- WHEN o pixel atual tiver `terrain_snapshot` parcial, com alguns campos `null` e outros preenchidos THEN o sistema SHALL bloquear apenas as camadas ou campos dependentes dos dados ausentes, sem fabricar interpolacao silenciosa.
- WHEN o trator estiver parado e nao houver nova amostra de missao THEN o sistema SHALL continuar exibindo a leitura instantanea do ponto atual, sem incrementar acumulado por engano.
- WHEN a missao comecar sem nenhuma amostra registrada THEN o HUD SHALL conseguir mostrar o perfil instantaneo do ponto atual mesmo antes do primeiro sample persistido.
- WHEN o acumulado de compactacao for restaurado do `localStorage` THEN o sistema SHALL manter compatibilidade com a persistencia ja existente das Sprints 2 e 4.
- WHEN o motor falhar por inconsistencias numericas em uma camada THEN o sistema SHALL degradar essa camada para ausencia diagnostica sem quebrar o runtime inteiro.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S5CMP-01 | P1: Calcular o perfil de compactacao sob o trator | Specify | Defined |
| S5CMP-02 | P1: Calcular o perfil de compactacao sob o trator | Specify | Defined |
| S5CMP-03 | P1: Calcular o perfil de compactacao sob o trator | Specify | Defined |
| S5CMP-04 | P1: Calcular o perfil de compactacao sob o trator | Specify | Defined |
| S5CMP-05 | P1: Calcular o perfil de compactacao sob o trator | Specify | Defined |
| S5CMP-06 | P1: Calcular o perfil de compactacao sob o trator | Specify | Defined |
| S5CMP-07 | P1: Calcular o perfil de compactacao sob o trator | Specify | Defined |
| S5CMP-08 | P1: Calcular o perfil de compactacao sob o trator | Specify | Defined |
| S5CMP-09 | P1: Calcular o perfil de compactacao sob o trator | Specify | Defined |
| S5CMP-10 | P1: Calcular o perfil de compactacao sob o trator | Specify | Defined |
| S5CMP-11 | P1: Calcular o perfil de compactacao sob o trator | Specify | Defined |
| S5CMP-12 | P2: Acumular o efeito das passadas na missao | Specify | Defined |
| S5CMP-13 | P2: Acumular o efeito das passadas na missao | Specify | Defined |
| S5CMP-14 | P2: Acumular o efeito das passadas na missao | Specify | Defined |
| S5CMP-15 | P2: Acumular o efeito das passadas na missao | Specify | Defined |
| S5CMP-16 | P2: Acumular o efeito das passadas na missao | Specify | Defined |
| S5CMP-17 | P2: Acumular o efeito das passadas na missao | Specify | Defined |
| S5CMP-18 | P2: Acumular o efeito das passadas na missao | Specify | Defined |
| S5CMP-19 | P3: Expor o motor no HUD sem abrir nova frente de interface | Specify | Defined |
| S5CMP-20 | P3: Expor o motor no HUD sem abrir nova frente de interface | Specify | Defined |
| S5CMP-21 | P3: Expor o motor no HUD sem abrir nova frente de interface | Specify | Defined |
| S5CMP-22 | P3: Expor o motor no HUD sem abrir nova frente de interface | Specify | Defined |
| S5CMP-23 | P3: Expor o motor no HUD sem abrir nova frente de interface | Specify | Defined |
| S5CMP-24 | P3: Expor o motor no HUD sem abrir nova frente de interface | Specify | Defined |

**Coverage:** 24 total, 24 definidos, 0 sem mapeamento.

> **Nota de escopo da Sprint 5**: o motor desta sprint usa um perfil vertical template por `thematic_class`, ancorado pelos valores superficiais do pixel atual. O objetivo e fechar o primeiro ciclo mecanico completo no runtime. Refinamentos de calibracao pedologica, variacao lateral detalhada das rodas e mapas espaciais de risco ficam para sprints posteriores.

---

## Success Criteria

Como saberemos que a sprint foi bem-sucedida:

- [ ] O runtime passa a calcular um perfil de compactacao em 6 camadas para o ponto atual sob o trator.
- [ ] O resultado por camada inclui `sigma_aplicada_kpa`, `sigma_p_kpa`, `stress_ratio`, `risk_class`, `delta_bulk_density` e `bulk_density_estimated`.
- [ ] O HUD atual exibe um bloco textual `Compactacao por Camada` sem quebrar os blocos existentes.
- [ ] O motor lida corretamente com pixels `water`, `_invalid` ou indisponiveis sem fabricar valores.
- [ ] A missao passa a acumular compactacao por camada ao longo das amostras registradas.
- [ ] O `localStorage` restaura o acumulado quando a `datasetVersion` for compativel e invalida corretamente quando nao for.
- [ ] O export da missao inclui snapshots e acumulado de compactacao.
- [ ] `prototipo/index.html` continua operando localmente, offline e sem build.

## Final Validation

- [ ] Implementacao revisada.
- [ ] Testes manuais executados em navegador.
- [ ] Resultado validado com missao nova, missao restaurada e pixel invalido.

## Source Context

- Sprint 4: `.specs/features/sprint-4-inferencia-compactacao/spec.md`
- Base do runtime: `prototipo/index.html`
- Referencia conceitual do motor: `docs/fundamentos_fisica_compactacao_2026-04-03.tex`
- Referencia de saidas esperadas: `docs/especificacao_prototipo_visual.md`
- **Motor de compactacao (pipeline completo)**: Lima, R.P. de, da Silva, A.R., da Silva, A.P. (2021). *soilphysics*: An R package for simulation of soil compaction induced by agricultural field traffic. Soil & Tillage Research 206:104824. DOI 10.1016/j.still.2020.104824. Arquivo local: `docs/1-s2.0-S0167198720306061-main.pdf`
  - Modelo de area de contato e sigma_max: Keller (2005) Eq. 3-5
  - Propagacao de tensao: Sohne (1953) / Frohlich (1934) Eq. 10-11
  - Deformacao (delta_bulk_density): O'Sullivan e Robertson (1996) — VCL/RCL, Eq. 17-20
  - PTF parametros compressivos: Lima et al. (2018) — Table 2 do paper
  - Limiares de risco: Stettler et al. (2014) — Fig. 3c do paper
