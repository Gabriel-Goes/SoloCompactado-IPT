# Sprint 1: Mapa Satelital com Trator Navegavel Specification

## Problem Statement

O prototipo precisa demonstrar de forma imediata a metafora central do produto: dirigir um trator sobre uma fazenda real no navegador, com percepcao visual similar a apps de navegacao. Sem essa base de movimento, nao ha fundamento para as proximas sprints de coleta de dados, HUD e compactacao.

Esta sprint existe para validar o nucleo da experiencia interativa: mapa satelital real, trator centralizado, movimento por teclado e camera que acompanha o deslocamento deslocando o mapa por baixo do trator.

## Goals

- [x] Entregar o arquivo `prototipo/index.html` que abra diretamente no navegador sem build nem backend.
- [x] Permitir navegacao fluida sobre a Fazenda Paladino com trator centralizado e controle por setas do teclado.
- [x] Fazer a experiencia comunicar claramente a analogia com Google Maps/Waze em menos de 1 minuto de uso.

## Out of Scope

Explicitamente excluido nesta sprint para evitar desvio de escopo.

| Feature | Reason |
| --- | --- |
| HUD lateral com metricas | Pertence a Sprint 3 |
| Coleta e armazenamento de variaveis | Pertence a Sprint 2 |
| Calculo de compactacao e risco | Fica para sprint futura |
| Heatmap, semaforo e recomendacoes | Dependem do motor de risco |
| Integracao com GPS real ou telemetria | Nao e necessaria para validar a navegacao base |

---

## User Stories

### P1: Navegar uma fazenda real com o trator centralizado ⭐ MVP

**User Story**: Como demonstrador do prototipo, eu quero abrir um HTML local e dirigir um trator sobre uma fazenda real usando o teclado para validar a mecanica central da experiencia.

**Why P1**: Sem esse fluxo completo nao existe base visual nem interativa para as proximas sprints.

**Acceptance Criteria**:

1. WHEN o usuario abrir `prototipo/index.html` no navegador THEN o sistema SHALL carregar a pagina sem build nem backend.
2. WHEN o usuario abrir `prototipo/index.html` no navegador THEN o sistema SHALL carregar um mapa centrado em `[-13.098074, -45.846229]`, referente a Fazenda Paladino.
3. WHEN o mapa for exibido THEN o sistema SHALL inicializar o mapa com `zoom` `16`.
4. WHEN o mapa for exibido THEN o sistema SHALL mostrar a camada satelital `Esri World Imagery`, comunicando lugar real, com `maxNativeZoom` `16`.
5. WHEN a camada satelital nao puder ser carregada THEN o sistema SHALL exibir erro diagnostico visivel no mapa.
6. WHEN o usuario visualizar a cena THEN o sistema SHALL manter o trator visivelmente centralizado na viewport do mapa.
7. WHEN o usuario pressionar `ArrowUp` THEN o sistema SHALL avancar o trator na direcao atual e recenter o mapa continuamente.
8. WHEN o usuario pressionar `ArrowLeft` ou `ArrowRight` THEN o sistema SHALL atualizar o `heading` do trator e refletir visualmente a nova orientacao.
9. WHEN o usuario pressionar `ArrowDown` THEN o sistema SHALL reduzir a velocidade atual sem implementar movimento em re nesta sprint.
10. WHEN o usuario navegar continuamente THEN o sistema SHALL mover o mapa sob o trator sem saltos bruscos perceptiveis.

**Independent Test**: Abrir o HTML localmente, mover com as setas e verificar que o trator permanece no centro enquanto a fazenda se desloca no fundo.

---

### P2: Reforcar a legibilidade da navegacao

**User Story**: Como apresentador da demo, eu quero que a interface pareca um app de mapa para que o comportamento do prototipo seja entendido sem explicacao longa.

**Why P2**: A sprint ainda pode funcionar sem esse refinamento, mas perde clareza de demonstracao.

**Acceptance Criteria**:

1. WHEN a viewport for carregada THEN o sistema SHALL usar composicao visual com mapa ocupando praticamente toda a tela, sem paineis extras nesta sprint.
2. WHEN a viewport for carregada THEN o sistema SHALL exibir um marcador central evidente para o trator acima do mapa.
3. WHEN a viewport for carregada THEN o sistema SHALL desabilitar interacoes nativas do `Leaflet` que conflitem com a demo, incluindo drag manual, scroll zoom e teclado nativo.
4. WHEN o trator mudar de direcao THEN o sistema SHALL atualizar sua rotacao visual de forma coerente com o movimento, preservando a frente visual do trator alinhada com a direcao da navegacao.
5. WHEN o usuario permanecer parado THEN o sistema SHALL manter a cena estavel, sem drift involuntario do mapa.

**Independent Test**: Abrir a demo e verificar, sem instrucao adicional, que o elemento central parece um veiculo guiado sobre um mapa.

---

### P3: Expor debug minimo para desenvolvimento

**User Story**: Como desenvolvedor do prototipo, eu quero ter um debug leve de coordenadas e direcao para verificar a mecanica sem poluir a experiencia principal.

**Why P3**: Ajuda implementacao e validacao, mas nao e essencial para a demo.

**Acceptance Criteria**:

1. WHEN o usuario pressionar a tecla `D` THEN o sistema SHALL ativar ou desativar o modo de debug.
2. WHEN o modo de debug estiver habilitado THEN o sistema SHALL exibir pelo menos coordenadas atuais e `heading`.
3. WHEN o modo de debug estiver desabilitado THEN o sistema SHALL preservar a experiencia limpa para demonstracao.

**Independent Test**: Ativar o debug e verificar atualizacao dos valores durante a navegacao.

---

## Edge Cases

- WHEN o navegador bloquear foco do teclado na carga inicial THEN o sistema SHALL permitir recuperar o controle ao clicar na area do mapa.
- WHEN nenhuma tecla estiver pressionada THEN o sistema SHALL manter a posicao atual sem deslocamento involuntario.
- WHEN o usuario pressionar teclas de direcao simultaneas THEN o sistema SHALL aplicar uma regra deterministica de movimento sem travar a navegacao.
- WHEN o mapa atingir o limite visual dos tiles carregados THEN o sistema SHALL continuar funcionalmente estavel, sem quebrar a interface.
- WHEN o usuario pressionar `ArrowDown` com velocidade zero THEN o sistema SHALL manter o trator parado, sem entrar em re.
- WHEN o `heading` ultrapassar `360°` ou `0°` THEN o sistema SHALL manter a rotacao visual continua, sem salto perceptivel.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S1MAP-01 | P1: Navegar uma fazenda real com o trator centralizado | Execute | Completed |
| S1MAP-02 | P1: Navegar uma fazenda real com o trator centralizado | Execute | Completed |
| S1MAP-03 | P1: Navegar uma fazenda real com o trator centralizado | Execute | Completed |
| S1MAP-04 | P1: Navegar uma fazenda real com o trator centralizado | Execute | Completed |
| S1MAP-05 | P1: Navegar uma fazenda real com o trator centralizado | Execute | Completed |
| S1MAP-06 | P1: Navegar uma fazenda real com o trator centralizado | Execute | Completed |
| S1MAP-07 | P1: Navegar uma fazenda real com o trator centralizado | Execute | Completed |
| S1MAP-08 | P1: Navegar uma fazenda real com o trator centralizado | Execute | Completed |
| S1MAP-09 | P1: Navegar uma fazenda real com o trator centralizado | Execute | Completed |
| S1MAP-10 | P1: Navegar uma fazenda real com o trator centralizado | Execute | Completed |
| S1MAP-11 | P2: Reforcar a legibilidade da navegacao | Execute | Completed |
| S1MAP-12 | P2: Reforcar a legibilidade da navegacao | Execute | Completed |
| S1MAP-13 | P2: Reforcar a legibilidade da navegacao | Execute | Completed |
| S1MAP-14 | P2: Reforcar a legibilidade da navegacao | Execute | Completed |
| S1MAP-15 | P2: Reforcar a legibilidade da navegacao | Execute | Completed |
| S1MAP-16 | P3: Expor debug minimo para desenvolvimento | Execute | Completed |
| S1MAP-17 | P3: Expor debug minimo para desenvolvimento | Execute | Completed |
| S1MAP-18 | P3: Expor debug minimo para desenvolvimento | Execute | Completed |

**Coverage:** 18 total, 18 mapped to tasks, 0 unmapped.

---

## Success Criteria

Como saberemos que a sprint foi bem-sucedida:

- [x] O arquivo [index.html](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/index.html) existe dentro de `prototipo/` e abre localmente no navegador.
- [x] O mapa inicializa na Fazenda Paladino com `zoom` `16`.
- [x] O mapa carrega a camada `Esri World Imagery` ou exibe erro diagnostico visivel se ela falhar.
- [x] A camada satelital opera com `maxNativeZoom` `16`, evitando dependencia de tiles mais detalhados para a demo.
- [x] O trator permanece centralizado durante a navegacao.
- [x] As setas do teclado produzem movimento previsivel e fluido.
- [x] A demo utiliza velocidade maxima de `50 m/s` para exploracao rapida do mapa.
- [x] O mapa ocupa praticamente toda a tela e o trator aparece como marcador central evidente.
- [x] Interacoes nativas do `Leaflet` que conflitam com a demo permanecem desabilitadas.
- [x] `ArrowDown` atua como freio e nao como re.
- [x] A orientacao visual do trator permanece coerente com a direcao do movimento, inclusive apos voltas completas.
- [x] A tecla `D` alterna o modo de debug.
- [x] A experiencia ja pode ser demonstrada como base da navegacao do prototipo maior.

## Source Context

- Sprint base: [sprint-1-mapa-trator.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/sprint-1-mapa-trator.md)
- Localizacao inicial: Fazenda Paladino, Sao Desiderio/BA
- Coordenadas: `[-13.098074, -45.846229]`
