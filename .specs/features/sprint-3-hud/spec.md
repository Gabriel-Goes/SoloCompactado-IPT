# Sprint 3: HUD de Leitura Operacional Specification

## Problem Statement

O prototipo ja consegue navegar sobre a Fazenda Paladino com o trator centralizado e registrar amostras operacionais da missao, mas ainda nao expõe essas informacoes de forma legivel durante a demonstracao. Sem um HUD persistente e sincronizado com o estado atual da sessao, a leitura do comportamento do trator, da celula atual do terreno e do andamento da coleta fica escondida no estado interno e perde valor de apresentacao.

Esta sprint existe para transformar os dados ja produzidos nas Sprints 1 e 2 em uma camada visual operacional: um HUD lateral, fixo e legivel, capaz de mostrar em tempo real o estado atual do trator, o snapshot do terreno da celula atual e um resumo simples da missao em andamento.

## Goals

- [ ] Evoluir `prototipo/index.html` para exibir um HUD lateral fixo sem quebrar a navegacao da Sprint 1.
- [ ] Expor no HUD os blocos `Trator`, `Terreno Atual` e `Missao` usando os dados ja mantidos pelo runtime da Sprint 2.
- [ ] Garantir leitura operacional clara em desktop com divisao `2/5` HUD e `3/5` mapa.
- [ ] Exibir no HUD os campos de terreno obrigatorios mesmo quando o valor vier `null`, preservando transparencia sobre indisponibilidade de dados do BDC.

## Out of Scope

Explicitamente excluido nesta sprint para evitar desvio de escopo.

| Feature | Reason |
| --- | --- |
| Calculo de compactacao, risco e semaforo | Pertence a sprint analitica futura |
| Heatmap de impacto, perfil lateral e visualizacoes de profundidade | Dependem do motor de compactacao |
| Recomendacoes operacionais ou alertas de risco | Ainda nao ha logica de decisao nesta etapa |
| Novos controles de configuracao no HUD | O HUD desta sprint e apenas de leitura |
| Mudanca do conjunto de variaveis definido na Sprint 2 | O HUD deve refletir o schema ja contratado |
| Substituir o mapa principal por um layout dominado pelo painel | A experiencia base de navegacao continua sendo o centro da demo |

---

## Runtime Constraints

A Sprint 3 deve reaproveitar, sem alterar o contrato das sprints anteriores, o runtime ja existente em `prototipo/index.html`.

- O sistema SHALL continuar evoluindo o mesmo artefato principal `prototipo/index.html`.
- O sistema SHALL manter a navegacao da Sprint 1 e a coleta/persistencia da Sprint 2 operacionais enquanto o HUD estiver ativo.
- O sistema SHALL ler os valores do HUD a partir do estado atual da aplicacao, incluindo estado do trator, celula atual, ultima amostra e metadados da missao.
- O sistema SHALL refletir no bloco `Terreno Atual` o mesmo contrato da Sprint 2: campos obrigatorios presentes no schema, com `null` quando o BDC nao fornecer valor observavel.
- O sistema SHALL manter todos os artefatos novos ou alterados dentro da pasta `prototipo/`.

---

## User Stories

### P1: Visualizar estado atual do trator e da missao enquanto navego ⭐ MVP

**User Story**: Como demonstrador do prototipo, eu quero ver um HUD lateral fixo enquanto dirijo o trator para entender instantaneamente o estado atual da operacao sem abrir debug nem inspecionar dados internos.

**Why P1**: Sem esse painel, a navegacao continua funcionando, mas a demo nao comunica de forma clara os dados produzidos pela missao.

**Acceptance Criteria**:

1. WHEN o usuario abrir `prototipo/index.html` THEN o sistema SHALL renderizar um layout com HUD lateral e mapa no mesmo artefato principal.
2. WHEN o layout for exibido em desktop THEN o sistema SHALL reservar aproximadamente `2/5` da largura para o HUD e `3/5` para o mapa.
3. WHEN a pagina for carregada THEN o sistema SHALL manter o HUD fixo e sempre visivel ao lado do mapa.
4. WHEN a pagina for carregada THEN o sistema SHALL organizar o HUD em tres blocos visiveis: `Trator`, `Terreno Atual` e `Missao`.
5. WHEN o layout lateral estiver ativo THEN o sistema SHALL manter o trator centralizado na viewport do mapa, e nao no centro da tela inteira.
6. WHEN o bloco `Trator` for exibido THEN o sistema SHALL mostrar pelo menos `machine_preset`, `route_speed`, `heading`, `wheel_load`, `inflation_pressure`, `tyre_width` e `track_gauge`.
7. WHEN o bloco `Missao` for exibido THEN o sistema SHALL mostrar pelo menos `mission_id` resumido, total de amostras coletadas, ultimo `sampling_reason`, timestamp da ultima coleta e coordenadas atuais `lat` e `lng`.
8. WHEN o trator estiver parado na posicao inicial THEN o HUD SHALL mostrar valores coerentes com o estado atual do runtime e com a sessao restaurada ou inicializada.
9. WHEN o usuario navegar pelo mapa THEN o HUD SHALL continuar funcional sem impedir leitura do mapa nem degradar perceptivelmente a navegacao.

**Independent Test**: Abrir a demo, observar o HUD ao lado do mapa e confirmar que os blocos de `Trator` e `Missao` mostram o estado atual sem depender do debug.

---

### P2: Exibir o snapshot da celula atual do terreno sem esconder indisponibilidade de dados

**User Story**: Como usuario da demo, eu quero ver no HUD as variaveis do terreno da celula atual para relacionar a posicao do trator com os dados coletados naquela regiao.

**Why P2**: O HUD so cumpre seu papel operacional se conseguir mostrar o terreno sob o trator de forma direta e transparente.

**Acceptance Criteria**:

1. WHEN o bloco `Terreno Atual` for exibido THEN o sistema SHALL mostrar pelo menos `cell_id`, `clay_content`, `water_content`, `matric_suction`, `bulk_density`, `conc_factor` e `sigma_p`.
2. WHEN o trator entrar em uma nova celula THEN o sistema SHALL atualizar imediatamente os valores exibidos no bloco `Terreno Atual` a partir de `currentCell`.
3. WHEN existir uma ultima amostra valida para a mesma `cell_id` atual THEN o HUD SHALL poder reutilizar esse snapshot como apoio, sem atrasar a atualizacao visual do bloco `Terreno Atual`.
4. WHEN uma variavel de terreno estiver `null` por indisponibilidade do BDC THEN o HUD SHALL exibir o campo correspondente de maneira legivel, sem omitir o rotulo nem simular valor inexistente.
5. WHEN todos os campos do bloco `Terreno Atual` estiverem indisponiveis para a celula atual THEN o sistema SHALL manter o bloco visivel e coerente, deixando claro que a estrutura existe mesmo sem valor observavel.
6. WHEN a missao for restaurada a partir do `localStorage` THEN o bloco `Terreno Atual` SHALL permanecer consistente com a `cell_id` atual e com o dataset versionado restaurado.
7. WHEN o HUD exibir dados de terreno THEN o sistema SHALL usar exatamente o mesmo conjunto de variaveis contratado na Sprint 2, sem adicionar ou remover campos nesta sprint.

**Independent Test**: Navegar entre duas celulas diferentes e verificar que `cell_id` muda no HUD, enquanto campos indisponiveis continuam visiveis como ausentes e nao como valores inventados.

---

### P3: Manter densidade visual enxuta e leitura rapida para demonstracao

**User Story**: Como apresentador da demo, eu quero um HUD limpo e neutro para que a leitura seja rapida e nao pareca nem um dashboard executivo resumido demais nem um console tecnico excessivo.

**Why P3**: A utilidade do HUD depende tanto de mostrar os dados certos quanto de mostra-los com hierarquia e legibilidade adequadas.

**Acceptance Criteria**:

1. WHEN o HUD for renderizado THEN o sistema SHALL usar organizacao vertical com secoes empilhadas e hierarquia tipografica clara.
2. WHEN o HUD for renderizado THEN o sistema SHALL priorizar pares `rotulo: valor` ou cartoes curtos, evitando tabelas longas e grafos visuais complexos.
3. WHEN o HUD for renderizado THEN o sistema SHALL usar estilo neutro informativo, sem semaforo verde/amarelo/vermelho nesta sprint.
4. WHEN o HUD for renderizado THEN o sistema SHALL nao exibir mini mapa, mini trilha, graficos, perfil lateral, profundidade ou componentes analiticos futuros.
5. WHEN a navegacao estiver em andamento THEN o sistema SHALL atualizar o HUD em tempo real por frame ou por mudanca relevante de estado, sem flicker perceptivel.
6. WHEN o usuario observar a tela em resolucao desktop comum THEN o sistema SHALL manter legibilidade do HUD sem sobreposicao indevida entre painel e mapa.
7. WHEN o futuro motor de compactacao ainda nao existir THEN o HUD SHALL permanecer independente dessa logica e exibir apenas o estado operacional ja disponivel.
8. WHEN a tecla `D` ativar o debug da Sprint 1 THEN o sistema SHALL permitir coexistencia entre debug e HUD sem quebrar a apresentacao principal.

**Independent Test**: Abrir a demo em desktop, navegar por alguns segundos e verificar que o HUD continua legivel, neutro e sem componentes de risco ou analise ainda nao implementados.

---

## Edge Cases

- WHEN nao houver nenhuma amostra registrada ainda THEN o sistema SHALL exibir o bloco `Missao` de forma valida, com contagem coerente e campos vazios ou iniciais quando aplicavel.
- WHEN a missao for restaurada com historico antigo no `localStorage` THEN o HUD SHALL refletir o ultimo estado conhecido sem exigir nova coleta imediata.
- WHEN o BDC nao fornecer valores observaveis para os campos do terreno na celula atual THEN o sistema SHALL manter todos os campos visiveis, preservando `null` ou representacao equivalente sem inventar dados.
- WHEN o `localStorage` falhar ou estiver indisponivel THEN o HUD SHALL continuar operando com o estado em memoria sem quebrar a navegacao.
- WHEN o usuario alternar o debug com `D` durante a navegacao THEN o HUD SHALL continuar legivel e sem sobrepor informacao critica do mapa.
- WHEN a janela desktop tiver largura reduzida, mas ainda dentro do alvo desktop da sprint THEN o sistema SHALL manter a divisao funcional entre HUD e mapa sem colapso visual severo.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S3HUD-01 | P1: Visualizar estado atual do trator e da missao enquanto navego | Specify | Defined |
| S3HUD-02 | P1: Visualizar estado atual do trator e da missao enquanto navego | Specify | Defined |
| S3HUD-03 | P1: Visualizar estado atual do trator e da missao enquanto navego | Specify | Defined |
| S3HUD-04 | P1: Visualizar estado atual do trator e da missao enquanto navego | Specify | Defined |
| S3HUD-05 | P1: Visualizar estado atual do trator e da missao enquanto navego | Specify | Defined |
| S3HUD-06 | P1: Visualizar estado atual do trator e da missao enquanto navego | Specify | Defined |
| S3HUD-07 | P1: Visualizar estado atual do trator e da missao enquanto navego | Specify | Defined |
| S3HUD-08 | P1: Visualizar estado atual do trator e da missao enquanto navego | Specify | Defined |
| S3HUD-09 | P1: Visualizar estado atual do trator e da missao enquanto navego | Specify | Defined |
| S3HUD-10 | P2: Exibir o snapshot da celula atual do terreno sem esconder indisponibilidade de dados | Specify | Defined |
| S3HUD-11 | P2: Exibir o snapshot da celula atual do terreno sem esconder indisponibilidade de dados | Specify | Defined |
| S3HUD-12 | P2: Exibir o snapshot da celula atual do terreno sem esconder indisponibilidade de dados | Specify | Defined |
| S3HUD-13 | P2: Exibir o snapshot da celula atual do terreno sem esconder indisponibilidade de dados | Specify | Defined |
| S3HUD-14 | P2: Exibir o snapshot da celula atual do terreno sem esconder indisponibilidade de dados | Specify | Defined |
| S3HUD-15 | P2: Exibir o snapshot da celula atual do terreno sem esconder indisponibilidade de dados | Specify | Defined |
| S3HUD-16 | P2: Exibir o snapshot da celula atual do terreno sem esconder indisponibilidade de dados | Specify | Defined |
| S3HUD-17 | P3: Manter densidade visual enxuta e leitura rapida para demonstracao | Specify | Defined |
| S3HUD-18 | P3: Manter densidade visual enxuta e leitura rapida para demonstracao | Specify | Defined |
| S3HUD-19 | P3: Manter densidade visual enxuta e leitura rapida para demonstracao | Specify | Defined |
| S3HUD-20 | P3: Manter densidade visual enxuta e leitura rapida para demonstracao | Specify | Defined |
| S3HUD-21 | P3: Manter densidade visual enxuta e leitura rapida para demonstracao | Specify | Defined |
| S3HUD-22 | P3: Manter densidade visual enxuta e leitura rapida para demonstracao | Specify | Defined |
| S3HUD-23 | P3: Manter densidade visual enxuta e leitura rapida para demonstracao | Specify | Defined |
| S3HUD-24 | P3: Manter densidade visual enxuta e leitura rapida para demonstracao | Specify | Defined |

**Coverage:** 24 total, 24 defined, 0 unmapped.

---

## Success Criteria

Como saberemos que a sprint foi bem-sucedida:

- [ ] [index.html](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/index.html) continua abrindo localmente e preserva navegacao e coleta das Sprints 1 e 2.
- [ ] O layout desktop mostra HUD lateral fixo e mapa simultaneamente, com divisao aproximada `2/5` e `3/5`.
- [ ] O trator continua centralizado na viewport do mapa mesmo depois da introducao do HUD lateral.
- [ ] O HUD exibe os tres blocos `Trator`, `Terreno Atual` e `Missao`.
- [ ] O bloco `Trator` mostra os campos operacionais contratados nesta sprint.
- [ ] O bloco `Terreno Atual` mostra o conjunto fixo de variaveis da Sprint 2, inclusive quando os valores estiverem `null`.
- [ ] O bloco `Missao` mostra o resumo da sessao atual e se atualiza conforme novas amostras sao registradas.
- [ ] Mudar de celula no mapa atualiza imediatamente o bloco `Terreno Atual`.
- [ ] Registrar nova amostra atualiza imediatamente o bloco `Missao`.
- [ ] O HUD permanece legivel, enxuto e neutro, sem elementos de risco, recomendacao ou analise futura.
- [ ] O HUD convive com o debug da Sprint 1 e com a persistencia/restauracao da Sprint 2 sem quebrar a demo.

## Source Context

- Sprint base: [sprint-3-hud.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/sprint-3-hud.md)
- Dependencias concluidas:
  - [spec.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-1-mapa-trator/spec.md)
  - [spec.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-2-coleta-variaveis/spec.md)
- Base existente: [index.html](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/index.html)
- Regra vigente da Sprint 2: manter o conjunto de variaveis de terreno fixo e aceitar `null` quando o BDC nao fornecer valor observavel
