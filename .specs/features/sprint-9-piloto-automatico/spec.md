# Sprint 9: Piloto Automático — Especificação

**Status:** Pending Design

---

## Problem Statement

O operador hoje precisa controlar manualmente o trator com as setas do teclado enquanto tenta acompanhar a rota do plano de cobertura no mapa. Isso divide a atenção e inviabiliza uma simulação realista de condução autônoma — exatamente o cenário que a CNH e a fazenda querem avaliar. A feature de piloto automático permite que o trator siga a rota planejada de forma autônoma, liberando o operador para observar os dados de compactação e o comportamento do sistema.

---

## Goals

- [ ] O trator segue autonomamente a rota ativa (`optimized` ou `baseline`) gerada pelo planner
- [ ] A velocidade é reduzida automaticamente nas transições (cabeceiras) para permitir curvas seguras
- [ ] O operador pode ativar, pausar e retomar o piloto com tecla `A` e botão no HUD
- [ ] Ao fim da rota, o trator para e o piloto desativa automaticamente
- [ ] O HUD exibe o estado do piloto (ativo, pausado, inativo) e o progresso na rota
- [ ] A reentrada na rota após desvio manual prioriza mínimo tráfego extra e mínima compactação fora da faixa planejada

---

## Out of Scope

| Feature | Razão |
|---|---|
| Controle de velocidade via PID real | Protótipo; proporcional simples é suficiente |
| Re-planejamento dinâmico de rota | Rota é estática após geração |
| Desvio de obstáculos | Sem sensor de obstáculos no protótipo |
| Persistência do estado do piloto em localStorage | Piloto é sessão única; rota some no reload |
| Seleção de qual rota seguir via HUD | O piloto segue a rota ativa de `overlay_mode` |
| Controle via mouse/touch | Apenas teclado e botão HUD |
| GPS real / NMEA | Simulação; GPS virá em sprint futura |
| Perfis de velocidade por tipo de máquina | Um perfil genérico único por enquanto |

---

## Perfil de Velocidade (único e genérico)

O piloto define velocidade-alvo; a física do trator (`tractor.js`) permanece responsável por aplicar aceleração, frenagem e clampar ao `maxSpeedMps` do config. Se `maxSpeedMps` for menor que `AUTOPILOT_CRUISE_SPEED_MPS`, o trator simplesmente respeita o limite físico configurado — o piloto não sobrescreve o clamp.

| Constante | Valor | Equivalente |
|---|---|---|
| `AUTOPILOT_CRUISE_SPEED_MPS` | 1.39 m/s | ≈ 5.0 km/h |
| `AUTOPILOT_HEADLAND_SPEED_MPS` | 0.65 × cruise | ≈ 3.25 km/h |
| `AUTOPILOT_WAYPOINT_RADIUS_M` | 2.0 m | acceptance radius conservador |
| `AUTOPILOT_CLOSE_THRESHOLD_M` | 15.0 m | distância máxima para reentrada direta na rota |

> A especialização por tipo de máquina (rolo, pulverizador, semeadora etc.) fica diferida para sprint futura.

## Definições

**Waypoint válido:** o próximo ponto pendente na sequência ativa da rota, respeitando a ordem dos `segments` e a ordem interna de `polyline_latlng` dentro de cada segmento. Não é o ponto geometricamente mais próximo ignorando a ordem — a sequência é sempre preservada.

**Iteração da rota:** o piloto percorre a rota segmento a segmento (`segments[i]`) e, dentro de cada segmento, ponto a ponto em `polyline_latlng` na ordem em que os pontos foram gerados. Ao esgotar todos os pontos do segmento atual, avança para `segments[i+1]`. Ao esgotar todos os segmentos, a rota está concluída.

**Rota ativa:** determinada por `runtime.coveragePlanner.overlay_mode` no momento em que o piloto é ativado (ver AP-01b e AP-01c). Não muda enquanto o piloto está ativo ou pausado, mesmo que `overlay_mode` seja alterado pelo operador.

---

## User Stories

### P1: Ativar o piloto automático com tecla A ⭐ MVP

**User Story:** Como operador, quero pressionar `A` para ativar o piloto automático quando há um plano de cobertura gerado, para que o trator siga a rota sozinho sem precisar controlar manualmente.

**Why P1:** É o comportamento central da feature. Sem isso não há piloto.

**Acceptance Criteria:**

1. QUANDO `A` é pressionado E há `coverage_plan` com rota ativa E o piloto está **inativo** ENTÃO o sistema SHALL ativar o piloto, resolver o ponto de entrada (ver regra de reacoplamento) e iniciar o movimento autônomo
2. QUANDO `A` é pressionado E não há `coverage_plan` ENTÃO o sistema SHALL exibir no HUD: "Gere um plano de cobertura antes de ativar o piloto." e permanecer inativo
3. QUANDO o piloto está **ativo** ENTÃO as teclas direcionais (setas) SHALL ser ignoradas pelo trator — o piloto controla o movimento
4. QUANDO o piloto está ativo ENTÃO o trator SHALL se mover automaticamente em direção ao waypoint atual a cada tick do game loop
5. QUANDO o piloto está ativo ENTÃO o HUD SHALL exibir indicador de estado "PILOTO ATIVO"
6. QUANDO o piloto for ativado E `runtime.coveragePlanner.overlay_mode === "optimized"` ENTÃO o sistema SHALL usar `coverage_plan.optimized_route` como rota ativa
7. QUANDO o piloto for ativado E `runtime.coveragePlanner.overlay_mode === "baseline"` ENTÃO o sistema SHALL usar `coverage_plan.baseline_route` como rota ativa

**Ciclo da tecla A:** `inativo → ativo → pausado → ativo → pausado → …`

**Independent Test:** Gerar um plano → pressionar `A` → observar o trator se mover ao longo da rota sem tocar nas setas.

---

### P1: Steering proporcional ao waypoint atual ⭐ MVP

**User Story:** Como operador, quero que o trator ajuste o heading automaticamente em direção a cada waypoint, para que siga a linha do plano com precisão adequada ao corredor planejado.

**Why P1:** Sem steering não há seguimento de rota.

**Acceptance Criteria:**

1. QUANDO o piloto está ativo ENTÃO a cada tick o sistema SHALL calcular o bearing geodésico entre a posição do trator e o waypoint atual
2. QUANDO o bearing desejado difere do heading atual ENTÃO o sistema SHALL girar o trator usando `turnRateDegPerSec` do config, na direção de menor ângulo (horário ou anti-horário), jamais excedendo o máximo por tick
3. QUANDO a distância ao waypoint atual é menor que `AUTOPILOT_WAYPOINT_RADIUS_M` (2.0 m) ENTÃO o sistema SHALL avançar para o próximo waypoint
4. QUANDO não há próximo waypoint (fim da rota) ENTÃO o sistema SHALL parar o trator, desativar o piloto e exibir "Rota concluída."

**Independent Test:** Com rota reta, o trator segue alinhado à polyline. Com transição curva, inicia a viragem antes do final do swath.

---

### P1: Controle de velocidade por tipo de segmento ⭐ MVP

**User Story:** Como operador, quero que o trator reduza a velocidade nas transições (cabeceiras) para que as curvas sejam navegáveis dentro do corredor planejado.

**Why P1:** Sem controle de velocidade o trator não consegue executar as curvas — a simulação fica irreal e gera compactação fora da faixa.

**Acceptance Criteria:**

1. QUANDO o segmento atual é `"swath"` ENTÃO o sistema SHALL usar `AUTOPILOT_CRUISE_SPEED_MPS` (1.39 m/s) como velocidade alvo
2. QUANDO o segmento atual não é `"swath"` (transição / cabeceira) ENTÃO o sistema SHALL usar `AUTOPILOT_HEADLAND_SPEED_MPS` (0.65 × cruise) como velocidade alvo
3. QUANDO a velocidade atual excede a velocidade alvo ENTÃO o sistema SHALL aplicar `brakeRateMps2` do trator para desacelerar
4. QUANDO a velocidade atual está abaixo da velocidade alvo ENTÃO o sistema SHALL aplicar `accelerationMps2` do trator para acelerar

**Independent Test:** Observar no HUD que a velocidade cai nas transições e sobe nos swaths.

---

### P1: Pausar e retomar com tecla A ⭐ MVP

**User Story:** Como operador, quero pausar e retomar o piloto pressionando `A` novamente, para inspecionar o mapa ou mover o trator sem perder o progresso na rota.

**Why P1:** Pausar é essencial para uso operacional e demonstrações.

**Acceptance Criteria:**

1. QUANDO `A` é pressionado E o piloto está **ativo** ENTÃO o sistema SHALL pausar o piloto, zerar a velocidade e exibir "PILOTO PAUSADO"
2. QUANDO `A` é pressionado E o piloto está **pausado** ENTÃO o sistema SHALL executar a regra de reacoplamento e retomar; exibir "PILOTO ATIVO"
3. QUANDO o piloto está pausado ENTÃO as teclas direcionais SHALL funcionar normalmente (controle manual temporário)

**Regra de reacoplamento ao retomar:**

| Situação | Comportamento |
|---|---|
| Trator a ≤ `AUTOPILOT_CLOSE_THRESHOLD_M` (15 m) da rota | Retoma a partir do waypoint de menor índice pendente cujo ponto está dentro do threshold — preservando a ordem dos segmentos e de `polyline_latlng` |
| Trator a > 15 m E ainda na área do plano | Retoma a partir do waypoint pendente mais próximo em distância euclidiana, respeitando a sequência ativa (sem retroceder) |
| Trator muito longe ou fora dos bounds do plano | Navega até o waypoint `[0]` da sequência ativa (`origin_latlng`) antes de seguir a ordem normal |

O objetivo da regra é sempre minimizar tráfego extra fora das faixas planejadas. Em todos os casos, a ordem da sequência ativa é preservada — o piloto nunca salta para um waypoint de índice anterior ao atual.

**Independent Test:** Ativar piloto → pressionar `A` → trator para, setas funcionam → mover trator manualmente → pressionar `A` → piloto reacoplado retoma.

---

### P2: Botão no painel do planner para ativar/pausar/retomar

**User Story:** Como operador, quero um botão visível no painel do planner para controlar o piloto além da tecla `A`, para uso em interfaces touchscreen futuras.

**Why P2:** Teclado pode não estar disponível no hardware embarcado.

**Acceptance Criteria:**

1. QUANDO há `coverage_plan` E piloto inativo ENTÃO o botão SHALL exibir "Iniciar Piloto" e estar habilitado
2. QUANDO o piloto está ativo ENTÃO o botão SHALL exibir "Pausar Piloto"
3. QUANDO o piloto está pausado ENTÃO o botão SHALL exibir "Retomar Piloto"
4. QUANDO não há `coverage_plan` ENTÃO o botão SHALL estar desabilitado

**Independent Test:** Controlar o piloto inteiro sem usar teclado.

---

### P2: Indicador de progresso na rota no HUD

**User Story:** Como operador, quero ver no HUD em qual segmento o trator está e quantos faltam, para saber o quanto falta para completar a cobertura.

**Why P2:** Melhora a legibilidade operacional sem custo de implementação alto.

**Acceptance Criteria:**

1. QUANDO o piloto está ativo ou pausado ENTÃO o HUD SHALL exibir: segmento atual / total (ex: "Seg 3 / 12")
2. QUANDO o piloto está ativo ENTÃO o HUD SHALL exibir o tipo do segmento: "Faixa" (swath) ou "Cabeceira" (transição)
3. QUANDO o piloto está inativo ENTÃO os campos de progresso SHALL exibir "—"

**Independent Test:** Observar o HUD atualizar automaticamente à medida que o trator avança.

---

### P3: Marcador visual do waypoint alvo no mapa

**User Story:** Como operador, quero ver no mapa qual é o waypoint atual de destino do trator, para entender a lógica de navegação em tempo real.

**Why P3:** Útil para debug e demonstrações; não essencial para a simulação.

**Acceptance Criteria:**

1. QUANDO o piloto está ativo ENTÃO o sistema SHALL renderizar um `L.circleMarker` no waypoint atual na layer do planner
2. QUANDO o waypoint avança ENTÃO o marcador SHALL se mover para o novo waypoint
3. QUANDO o piloto é desativado ENTÃO o marcador SHALL ser removido

**Independent Test:** Ver um marcador se mover ao longo da rota à frente do trator.

---

## Edge Cases

- QUANDO `clearPlan` é executado E o piloto está ativo ENTÃO o sistema SHALL desativar o piloto imediatamente e exibir "Plano descartado. Piloto desativado."
- QUANDO `paused_tractor` é ativado externamente (ex: modo drawing do planner) ENTÃO o piloto SHALL aguardar sem conflitar; ao liberar `paused_tractor`, o piloto aplica a regra de reacoplamento
- QUANDO o heading calculado exige giro superior ao máximo do tick (`turnRateDegPerSec × deltaSeconds`) ENTÃO o sistema SHALL clampar ao máximo — sem teleporte de heading
- QUANDO a velocidade do trator é 0 E o piloto está ativo (não pausado) ENTÃO o sistema SHALL acelerar normalmente — nunca travar em velocidade zero
- QUANDO o piloto ativa E o trator está fora dos bounds do `coverage_plan` ENTÃO aplica a mesma regra de reacoplamento: se próximo (≤ 15 m), entra pelo waypoint pendente de menor índice dentro do threshold; se longe, navega ao waypoint `[0]` da sequência ativa antes de seguir a ordem normal

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| AP-01 | P1: Ativar com tecla A — com plano | Design | Pending |
| AP-01b | P1: Rota ativa = optimized_route quando overlay_mode = "optimized" | Design | Pending |
| AP-01c | P1: Rota ativa = baseline_route quando overlay_mode = "baseline" | Design | Pending |
| AP-02 | P1: Ativar sem plano → mensagem HUD | Design | Pending |
| AP-03 | P1: Bloqueia setas quando ativo | Design | Pending |
| AP-04 | P1: Move trator a cada tick | Design | Pending |
| AP-05 | P1: HUD exibe "PILOTO ATIVO" | Design | Pending |
| AP-06 | P1: Bearing geodésico por tick | Design | Pending |
| AP-07 | P1: Giro na direção de menor ângulo, clampado | Design | Pending |
| AP-08 | P1: Acceptance radius 2.0 m → avança waypoint | Design | Pending |
| AP-09 | P1: Fim da rota → para e desativa | Design | Pending |
| AP-10 | P1: Velocidade alvo = cruise nos swaths | Design | Pending |
| AP-11 | P1: Velocidade alvo = headland nas transições | Design | Pending |
| AP-12 | P1: Desacelera com brakeRateMps2 | Design | Pending |
| AP-13 | P1: Acelera com accelerationMps2 | Design | Pending |
| AP-14 | P1: Pausar com tecla A | Design | Pending |
| AP-15 | P1: Retomar com tecla A + regra de reacoplamento | Design | Pending |
| AP-16 | P1: Setas funcionam durante pausa | Design | Pending |
| AP-17 | P1: Reacoplamento — ≤ 15 m → waypoint mais próximo | Design | Pending |
| AP-18 | P1: Reacoplamento — longe → origin_latlng | Design | Pending |
| AP-19 | P2: Botão HUD — 3 estados | Design | Pending |
| AP-20 | P2: Progresso segmento / total no HUD | Design | Pending |
| AP-21 | P2: Tipo do segmento no HUD | Design | Pending |
| AP-22 | P3: Marcador visual waypoint alvo | — | Pending |
| AP-23 | Edge: clearPlan desativa piloto | Design | Pending |
| AP-24 | Edge: paused_tractor externo → reacoplamento ao liberar | Design | Pending |
| AP-25 | Edge: heading clampado por tick | Design | Pending |
| AP-26 | Edge: velocidade 0 não trava o piloto | Design | Pending |

**Coverage:** 28 total, 0 mapeados para tasks ⚠️

---

## Success Criteria

- [ ] O trator percorre a rota gerada do início ao fim sem intervenção manual, com velocidade reduzida nas cabeceiras
- [ ] O reacoplamento após desvio manual minimiza tráfego fora das faixas planejadas
- [ ] O operador consegue pausar e retomar sem perder posição na rota
- [ ] O HUD exibe estado do piloto e progresso em tempo real
- [ ] Nenhum conflito com o planner (drawing mode, clearPlan) degrada o estado da aplicação
