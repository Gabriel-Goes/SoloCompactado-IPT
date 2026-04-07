# Sprint 2: Coleta e Armazenagem de Variaveis Specification

## Problem Statement

O prototipo ja consegue navegar sobre a fazenda com o trator centralizado, mas ainda nao registra nenhum dado operacional da missao. Sem essa camada de coleta e persistencia, nao existe base confiavel para HUD, historico de percurso, calculo de compactacao ou exportacao de sessoes.

Esta sprint existe para transformar a navegacao em uma sessao de coleta: enquanto o trator se move, o sistema deve identificar a celula atual do terreno, associar as variaveis de solo configuradas para essa regiao e salvar isso junto com o snapshot vigente das variaveis do trator.

## Goals

- [x] Evoluir `prototipo/index.html` para coletar amostras de missao em tempo real durante a navegacao.
- [x] Identificar a celula atual do terreno e associar a ela um snapshot resumido das variaveis do solo.
- [x] Persistir a missao atual no navegador e permitir exportacao da sessao em `JSON`.
- [x] Garantir que os dados de terreno usados na sprint sejam derivados de fontes reais do Brazil Data Cube, sem valores inventados manualmente.

## Out of Scope

Explicitamente excluido nesta sprint para evitar desvio de escopo.

| Feature | Reason |
| --- | --- |
| HUD lateral executivo completo | Pertence a Sprint 3 |
| Calculo de compactacao, risco e semaforo | Depende do motor analitico futuro |
| Heatmap visual de risco | Depende do calculo de risco |
| Perfil completo do solo por profundidade | Esta sprint trabalha apenas com resumo superficial por celula |
| Integracao com GPS real, sensores ou telemetria externa | Nao e necessaria para validar a coleta local |
| Inventar ou preencher manualmente dados de terreno sem lastro geoespacial | Viola o objetivo de usar fontes reais para a regiao da fazenda |

---

## Data Source Constraints

As variaveis do terreno desta sprint nao podem ser inventadas. Elas devem ser derivadas de fontes geoespaciais reais, recortadas para a regiao usada pela demo na Fazenda Paladino.

- O sistema SHALL usar um dataset local pre-processado e versionado dentro de `prototipo/data/` como forma de entrega dos dados oficiais para o runtime da demo.
- O sistema SHALL usar o Brazil Data Cube como fonte oficial unica para imagens e series temporais de terreno, preferencialmente por STAC API.
- O recorte de dados SHALL ser limitado a um raio operacional de `7 km` em torno da regiao central da Fazenda Paladino, evitando download ou armazenamento desnecessario de dados fora da area usada na demo.
- Quando uma variavel operacional de solo nao existir diretamente no BDC, o sistema SHALL registrar essa ausencia ou usar derivacao documentada a partir dessa fonte, e SHALL NOT inventar valores arbitrarios.
- Os campos do `terrain_snapshot` SHALL existir no schema da amostra mesmo quando nao houver valor observavel direto, usando `null` com proveniencia `derived` ou `unavailable` quando aplicavel.
- Quando o `BDC` nao fornecer valor observavel para uma variavel obrigatoria do schema, o sistema SHALL manter o campo como `null`, preservando a estrutura da amostra e sem sintetizar valor substituto.
- A especificacao da implementacao SHALL deixar claro quais campos do `terrain_snapshot` sao:
  - extraidos diretamente de fonte oficial,
  - derivados a partir de fonte oficial,
  - ainda indisponiveis nesta sprint.

---

## User Stories

### P1: Registrar amostras de missao a partir da posicao atual ⭐ MVP

**User Story**: Como operador da demo, eu quero que o prototipo registre automaticamente amostras enquanto o trator se move para transformar a navegacao em uma sessao de coleta de dados.

**Why P1**: Sem amostras persistidas nao ha fundacao para as proximas sprints de HUD, analise e exportacao.

**Acceptance Criteria**:

1. WHEN o usuario abrir `prototipo/index.html` THEN o sistema SHALL manter a navegacao da Sprint 1 funcionando e inicializar uma missao de coleta em memoria.
2. WHEN a missao for inicializada THEN o sistema SHALL criar um `mission_id` unico para a sessao atual.
3. WHEN o mapa da fazenda for carregado THEN o sistema SHALL representar o terreno como uma grade espacial de celulas.
4. WHEN o trator estiver em uma posicao valida do mapa THEN o sistema SHALL resolver a `cell_id` correspondente a essa posicao.
5. WHEN o trator entrar em uma nova celula THEN o sistema SHALL criar uma amostra com `sampling_reason = cell-change`.
6. WHEN o trator permanecer em movimento dentro da mesma celula por um intervalo fixo de coleta THEN o sistema SHALL criar uma amostra com `sampling_reason = time-tick`.
7. WHEN nenhum evento valido de coleta ocorrer no frame atual THEN o sistema SHALL nao duplicar registros no mesmo frame.
8. WHEN uma amostra for criada THEN o sistema SHALL incluir `sample_id`, `timestamp`, `mission_id`, `tractor_position`, `heading`, `speed`, `cell_id`, `sampling_reason`, `terrain_snapshot` e `tractor_snapshot`.
9. WHEN a grade do terreno for inicializada THEN o sistema SHALL usar como base um recorte da area da Fazenda Paladino em vez de dados genericos de outra regiao.
10. WHEN o runtime da demo precisar acessar dados oficiais de terreno THEN o sistema SHALL faze-lo a partir do dataset local pre-processado em `prototipo/data/`, e nao por consulta remota bruta a cada frame.

**Independent Test**: Navegar por diferentes partes do mapa, inspecionar o estado salvo e verificar amostras distintas por mudanca de celula e por tempo de movimento.

---

### P2: Associar variaveis de terreno e do trator ao instante da coleta

**User Story**: Como desenvolvedor do prototipo, eu quero que cada amostra carregue os dados do solo e do trator vigentes naquele instante para que a coleta seja auditavel e reutilizavel.

**Why P2**: Sem snapshots completos, o historico perde valor para analise e HUD.

**Acceptance Criteria**:

1. WHEN uma celula do terreno existir na grade THEN o sistema SHALL associar a ela pelo menos os campos `cell_id`, `clay_content`, `water_content`, `matric_suction`, `bulk_density`, `conc_factor` e `sigma_p`, permitindo `null` quando a fonte oficial nao fornecer valor direto.
2. WHEN a missao estiver ativa THEN o sistema SHALL manter um estado ativo do trator contendo pelo menos `machine_preset`, `wheel_load`, `mass_total`, `inflation_pressure`, `tyre_width`, `track_gauge` e `route_speed`.
3. WHEN uma amostra for criada THEN o sistema SHALL copiar para `terrain_snapshot` os valores da celula atual no momento da coleta.
4. WHEN uma amostra for criada THEN o sistema SHALL copiar para `tractor_snapshot` os valores ativos do trator no momento da coleta.
5. WHEN uma variavel ativa do trator mudar durante a missao THEN o sistema SHALL refletir a mudanca apenas nas amostras criadas depois da alteracao.
6. WHEN a posicao do trator for registrada THEN o sistema SHALL armazenar `lat` e `lng` em `tractor_position`.
7. WHEN `terrain_snapshot` for preenchido THEN o sistema SHALL derivar qualquer classe, indice ou contexto tematico apenas a partir de dados oficiais do BDC disponiveis para a regiao correspondente.
8. WHEN o prototipo precisar de contexto espacial ou temporal do terreno THEN o sistema SHALL obte-lo a partir do Brazil Data Cube, preferencialmente pela STAC API do BDC.
9. WHEN um campo de terreno nao puder ser obtido diretamente das fontes oficiais THEN o sistema SHALL marcar o campo como derivado ou indisponivel, e SHALL NOT preencher valor inventado.

**Independent Test**: Alterar um parametro do trator no estado da missao, continuar navegando e verificar que apenas as novas amostras carregam o valor atualizado.

---

### P3: Persistir, recuperar e exportar a missao coletada

**User Story**: Como demonstrador da sprint, eu quero recarregar a pagina, manter a sessao salva e exportar os dados coletados para validar que a camada de armazenamento funciona de ponta a ponta.

**Why P3**: A sprint so prova valor se os dados sobreviverem ao reload e puderem ser extraidos.

**Acceptance Criteria**:

1. WHEN a missao atual sofrer alteracao THEN o sistema SHALL sincronizar os dados relevantes no `localStorage`.
2. WHEN o usuario recarregar a pagina THEN o sistema SHALL restaurar a missao persistida mais recente a partir do `localStorage`.
3. WHEN a missao for restaurada THEN o sistema SHALL preservar pelo menos `mission_id`, configuracao ativa do trator, referencia ao dataset local versionado do terreno, historico de amostras e metadados basicos da sessao.
4. WHEN o usuario acionar a exportacao THEN o sistema SHALL gerar um arquivo `JSON` contendo metadados da missao e a lista de amostras coletadas.
5. WHEN o usuario acionar a limpeza dos dados locais THEN o sistema SHALL remover a missao persistida e reiniciar a sessao local sem residuos anteriores.
6. WHEN a interface operacional minima for exibida THEN o sistema SHALL mostrar pelo menos `cell_id` atual, total de registros coletados, acao de exportar `JSON` e acao de limpar dados locais.
7. WHEN o sistema exportar a missao THEN o `JSON` SHALL incluir metadados suficientes para rastrear a origem dos dados de terreno usados na sessao, incluindo fonte oficial e identificador de colecao quando aplicavel.
8. WHEN a missao for restaurada no reload THEN o sistema SHALL restaurar a referencia ao dataset local versionado usado pela sessao e reidratar a grade correspondente a partir desse dataset.

**Independent Test**: Coletar algumas amostras, recarregar a pagina, confirmar a restauracao, exportar o JSON e limpar os dados persistidos.

---

## Edge Cases

- WHEN o trator estiver parado THEN o sistema SHALL nao gerar amostras `time-tick`.
- WHEN o trator cruzar rapidamente a fronteira entre celulas THEN o sistema SHALL registrar a nova `cell_id` correta sem travar a navegacao.
- WHEN a pagina for recarregada com `localStorage` vazio THEN o sistema SHALL iniciar uma nova missao limpa.
- WHEN o `localStorage` estiver indisponivel ou falhar THEN o sistema SHALL manter a missao em memoria e expor erro diagnostico sem quebrar a navegacao.
- WHEN o usuario exportar uma missao sem amostras THEN o sistema SHALL gerar um `JSON` valido com metadados e lista vazia.
- WHEN duas coletas forem elegiveis no mesmo instante logico THEN o sistema SHALL aplicar regra deterministica para evitar duplicacao do mesmo registro.
- WHEN a fonte oficial nao expuser um dado necessario para a celula atual THEN o sistema SHALL manter o campo como indisponivel ou derivado documentado, sem inventar valor.
- WHEN a extracao oficial retornar cobertura fora da area da Fazenda Paladino THEN o sistema SHALL descartar o dado fora de recorte.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| S2DATA-01 | P1: Registrar amostras de missao a partir da posicao atual | Specify | Defined |
| S2DATA-02 | P1: Registrar amostras de missao a partir da posicao atual | Specify | Defined |
| S2DATA-03 | P1: Registrar amostras de missao a partir da posicao atual | Specify | Defined |
| S2DATA-04 | P1: Registrar amostras de missao a partir da posicao atual | Specify | Defined |
| S2DATA-05 | P1: Registrar amostras de missao a partir da posicao atual | Specify | Defined |
| S2DATA-06 | P1: Registrar amostras de missao a partir da posicao atual | Specify | Defined |
| S2DATA-07 | P1: Registrar amostras de missao a partir da posicao atual | Specify | Defined |
| S2DATA-08 | P1: Registrar amostras de missao a partir da posicao atual | Specify | Defined |
| S2DATA-09 | P1: Registrar amostras de missao a partir da posicao atual | Specify | Defined |
| S2DATA-10 | P1: Registrar amostras de missao a partir da posicao atual | Specify | Defined |
| S2DATA-11 | P2: Associar variaveis de terreno e do trator ao instante da coleta | Specify | Defined |
| S2DATA-12 | P2: Associar variaveis de terreno e do trator ao instante da coleta | Specify | Defined |
| S2DATA-13 | P2: Associar variaveis de terreno e do trator ao instante da coleta | Specify | Defined |
| S2DATA-14 | P2: Associar variaveis de terreno e do trator ao instante da coleta | Specify | Defined |
| S2DATA-15 | P2: Associar variaveis de terreno e do trator ao instante da coleta | Specify | Defined |
| S2DATA-16 | P2: Associar variaveis de terreno e do trator ao instante da coleta | Specify | Defined |
| S2DATA-17 | P2: Associar variaveis de terreno e do trator ao instante da coleta | Specify | Defined |
| S2DATA-18 | P2: Associar variaveis de terreno e do trator ao instante da coleta | Specify | Defined |
| S2DATA-19 | P2: Associar variaveis de terreno e do trator ao instante da coleta | Specify | Defined |
| S2DATA-20 | P3: Persistir, recuperar e exportar a missao coletada | Specify | Defined |
| S2DATA-21 | P3: Persistir, recuperar e exportar a missao coletada | Specify | Defined |
| S2DATA-22 | P3: Persistir, recuperar e exportar a missao coletada | Specify | Defined |
| S2DATA-23 | P3: Persistir, recuperar e exportar a missao coletada | Specify | Defined |
| S2DATA-24 | P3: Persistir, recuperar e exportar a missao coletada | Specify | Defined |
| S2DATA-25 | P3: Persistir, recuperar e exportar a missao coletada | Specify | Defined |
| S2DATA-26 | P3: Persistir, recuperar e exportar a missao coletada | Specify | Defined |
| S2DATA-27 | P3: Persistir, recuperar e exportar a missao coletada | Specify | Defined |

**Coverage:** 27 total, 27 defined, 0 unmapped.

---

## Success Criteria

Como saberemos que a sprint foi bem-sucedida:

- [x] [index.html](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/index.html) continua abrindo localmente e preserva a navegacao base da Sprint 1.
- [x] O prototipo inicializa uma missao de coleta com `mission_id` unico.
- [x] O terreno e resolvido em grade de celulas e o sistema consegue identificar a `cell_id` atual do trator.
- [x] A grade e os snapshots de terreno usam recorte da regiao da Fazenda Paladino, e nao dados genericos de outra localizacao.
- [x] O sistema cria amostras por mudanca de celula e por intervalo de tempo enquanto houver movimento.
- [x] Cada amostra contem `terrain_snapshot` e `tractor_snapshot` completos para o escopo da sprint.
- [x] Qualquer classe, indice ou contexto espacial e temporal adicional de terreno vem do Brazil Data Cube quando disponivel.
- [x] Campos de terreno sem fonte oficial direta sao marcados como derivados ou indisponiveis, nunca inventados.
- [x] O sistema evita duplicacao de registros no mesmo frame ou instante logico.
- [x] A missao atual e sincronizada no `localStorage`.
- [x] Recarregar a pagina restaura a missao persistida mais recente.
- [x] A exportacao gera um arquivo `JSON` com metadados e lista de amostras.
- [x] A exportacao inclui metadados de origem dos dados de terreno utilizados na sessao.
- [x] A limpeza manual remove os dados persistidos e reinicia a sessao local.
- [x] A interface operacional minima exibe pelo menos celula atual, contador de registros e acoes de exportacao/limpeza.

## Source Context

- Sprint base: [sprint-2-coleta-variaveis.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/sprint-2-coleta-variaveis.md)
- Base existente: [index.html](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/index.html)
- Dependencia funcional: Sprint 1 concluida, com navegacao local sobre Fazenda Paladino
- Brazil Data Cube image collections: https://data.inpe.br/bdc/en/image-collections/
- Brazil Data Cube STAC API: https://data.inpe.br/bdc/stac/v1/
