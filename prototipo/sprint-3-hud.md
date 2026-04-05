# Sprint 3: HUD de Leitura Operacional

## Resumo
A Sprint 3 deve introduzir o HUD visivel do prototipo, mantendo o mapa navegavel da Sprint 1 e os dados coletados da Sprint 2. O papel do HUD nesta fase e exclusivamente mostrar, em tempo real, o estado atual do trator, o resumo do terreno da celula atual e um resumo simples da missao de coleta.

O HUD sera uma barra lateral fixa ocupando `2/5` da tela, com visual enxuto, leitura rapida e sem controles novos. Nesta sprint nao entram analise de compactacao, semaforo de risco nem recomendacoes operacionais.

## Objetivo da Sprint
Criar a camada visual do HUD para acompanhar a navegacao e a coleta de dados em tempo real, exibindo apenas o que estiver visivel e operacionalmente util durante a missao.

## Escopo Funcional
- Manter o mapa satelital navegavel com o trator centralizado.
- Manter a coleta e armazenagem de variaveis da Sprint 2.
- Adicionar um HUD lateral fixo com foco em leitura operacional.
- Exibir em tempo real as variaveis atuais do trator.
- Exibir em tempo real as variaveis do terreno da celula atual.
- Exibir um resumo da missao em andamento.
- Nao adicionar novos controles de configuracao nesta sprint.

## Arquitetura de Arquivos
- Todos os arquivos gerados para o prototipo devem ficar dentro da pasta `prototipo/`.
- A Sprint 3 deve continuar evoluindo o mesmo artefato principal criado nas sprints anteriores.
- Estrutura minima esperada:
  - `prototipo/sprint-3-hud.md`
  - `prototipo/index.html`
  - `prototipo/data/` para exemplos exportados, se forem mantidos no repositorio
- O HUD nao deve ser planejado como arquivo solto fora de `prototipo/`; a implementacao deve permanecer concentrada nessa pasta.

## Layout
- O layout principal deve ser dividido em duas areas:
  - HUD lateral ocupando `2/5` da largura.
  - mapa ocupando `3/5` da largura.
- O HUD deve permanecer fixo e sempre visivel.
- O mapa continua sendo a area principal de navegacao.
- O HUD deve usar organizacao vertical com secoes empilhadas.

## Papel do HUD
- O HUD deve atuar como painel de leitura operacional.
- O HUD nao deve ser um painel executivo resumido demais.
- O HUD nao deve ser um console tecnico denso.
- O objetivo e permitir que o usuario entenda rapidamente:
  - o estado atual do trator,
  - o estado atual do terreno sob o trator,
  - o andamento da missao de coleta.

## Blocos Visiveis do HUD
O HUD deve ser organizado em tres blocos:

### 1. Trator
Campos visiveis:
- `machine_preset`
- `route_speed`
- `heading`
- `wheel_load`
- `inflation_pressure`
- `tyre_width`
- `track_gauge`

### 2. Terreno Atual
Campos visiveis:
- `cell_id`
- `clay_content`
- `water_content`
- `matric_suction`
- `bulk_density`
- `conc_factor`
- `sigma_p`

### 3. Missao
Campos visiveis:
- `mission_id` resumido
- total de amostras coletadas
- ultimo `sampling_reason`
- timestamp da ultima coleta
- coordenadas atuais do trator:
  - `lat`
  - `lng`

## Densidade Visual
- O HUD deve ser enxuto.
- Usar poucos cartoes ou pares `rotulo: valor`.
- Priorizar tipografia clara e valores legiveis.
- Evitar tabelas longas.
- Evitar excesso de informacao por bloco.
- Nao incluir mini mapa, mini trilha ou graficos nesta sprint.

## Estilo Visual
- O HUD deve usar estilo neutro informativo.
- Nao utilizar semaforo verde/amarelo/vermelho nesta sprint.
- Nao sugerir risco, alerta ou recomendacao operacional ainda.
- O destaque visual deve ser dado por contraste, espacamento e hierarquia tipografica.

## Comportamento
- O HUD deve atualizar em tempo real durante a navegacao.
- Ao entrar em nova celula, o bloco `Terreno Atual` deve ser atualizado imediatamente.
- Ao registrar nova amostra, o bloco `Missao` deve refletir os dados mais recentes.
- As variaveis do bloco `Trator` devem refletir o estado ativo atual.
- O HUD deve permanecer legivel enquanto o mapa continua navegavel.

## Implementacao
- Manter o layout em um unico arquivo `HTML` com `CSS` e `JavaScript`.
- Adicionar a estrutura HTML do HUD lateral.
- Mapear os dados do estado da aplicacao para os campos visiveis do HUD.
- Atualizar os elementos do HUD a cada frame ou a cada mudanca relevante de estado.
- Reaproveitar os dados ja mantidos em memoria e no `localStorage` pela Sprint 2.
- Garantir que o HUD seja independente do motor futuro de compactacao.
- Manter o artefato principal e quaisquer arquivos auxiliares dentro de `prototipo/`.

## Criterios de Aceitacao
- O HUD aparece de forma fixa ao lado do mapa.
- A divisao `2/5` HUD e `3/5` mapa fica legivel em desktop.
- Com o trator parado, o HUD mostra os valores atuais coerentes com a posicao inicial e a configuracao ativa.
- Ao mover o trator para outra celula, os dados do bloco `Terreno Atual` mudam corretamente.
- Ao gerar nova coleta, os dados do bloco `Missao` sao atualizados.
- O contador de amostras cresce durante a missao.
- O HUD permanece funcional sem travar ou prejudicar a navegacao do mapa.
- Ao final da sprint, deve ser possivel demonstrar:
  - o estado do trator,
  - o estado do terreno atual,
  - o andamento basico da missao.

## Fora da Sprint
- Semaforo de risco.
- Calculo de compactacao.
- Heatmap de impacto.
- Recomendacoes operacionais.
- Graficos, cortes de perfil ou visualizacoes de profundidade.
- Controles de configuracao no HUD.

## Assumptions
- O HUD sera apenas de visualizacao nesta sprint.
- O visual sera lateral, fixo e enxuto.
- O conteudo sera limitado a trator, terreno atual e missao.
- O tom visual sera neutro, sem cores de risco.
