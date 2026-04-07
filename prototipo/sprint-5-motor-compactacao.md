# Sprint 5: Motor de Compactacao por Camadas

**Status**: Concluida

## Resumo
A Sprint 5 fechou o primeiro ciclo analitico completo do prototipo. A partir do snapshot atual do trator e do pixel BDC corrente, o runtime passou a construir um perfil vertical fixo de `0-60 cm`, calcular tensao aplicada, resistencia mecanica, risco e deformacao por camada e expor esse resultado no HUD.

Essa sprint tambem separou leitura instantanea do ponto atual e acumulado historico da missao, permitindo que o usuario veja tanto o efeito mecanico sob o trator quanto o efeito persistido das passadas registradas.

## Objetivo da Sprint
Introduzir no `prototipo/index.html` um motor local de compactacao por camadas, com persistencia e exportacao do acumulado, sem build, sem servidor e sem abrir uma nova frente de interface alem do HUD textual.

## O Que Foi Entregue
- Novo estado instantaneo `currentCompactionProfile` no runtime.
- Helper unico `getCurrentTerrainSnapshot()` alinhado a mesma hierarquia usada pelo HUD.
- Templates verticais por `thematic_class` em `COMPACTION_PROFILE_TEMPLATES`.
- Funcoes `calcContactStress()`, `propagateStress()`, `calcSigmaP()`, `calcDeformation()` e `assessLayerRisk()`.
- Orquestrador `runCompactionMotor()` integrado ao loop de runtime.
- `compaction_snapshot` salvo em cada sample da missao.
- `compaction_accumulator` persistido por `cell_id` na missao.
- Exportacao do estado acumulado e do perfil instantaneo atual.
- Novo bloco textual `Compactacao por Camada` no HUD com 6 linhas fixas.

## Pipeline do Motor
- O motor usa o snapshot atual do trator com `wheel_load`, `inflation_pressure`, `tyre_width`, `tyre_diameter`, `track_gauge`, `route_speed` e `tyre_recommended_pressure`.
- O solo do ponto atual vem do `terrain_snapshot` resolvido para o pixel BDC corrente.
- `buildCompactionProfile()` deriva 6 camadas de `10 cm` a partir do pixel superficial, preservando `null` quando o snapshot e parcial.
- `calcContactStress()` estima a tensao maxima na superficie e a geometria equivalente do contato.
- `propagateStress()` atenua a tensao por profundidade usando `xi` e `z_mid_m`.
- `calcSigmaP()` reaproveita a mesma PTF da Sprint 4 para estimar a resistencia do solo por camada.
- `calcDeformation()` estima `delta_bulk_density` e `bulk_density_estimated`, mantendo `p = sigma_ap` por coerencia com a calibracao uniaxial adotada.
- `assessLayerRisk()` classifica cada camada em `safe`, `warning`, `critical` ou `unavailable`.

## Integracao no Runtime
- O motor roda logo apos a atualizacao de `currentTerrainPixel` e antes do `early return` por ausencia de `currentCell`.
- Isso preserva a leitura instantanea do ponto atual mesmo quando o trator esta dentro do raster BDC, mas fora da grade operacional de celulas.
- `appendSample()` passou a registrar o snapshot de compactacao e atualizar o acumulado por `cell_id`.
- `restoreOrCreateMission()` migra missoes antigas sem `compaction_accumulator`.
- `buildMissionExport()` passou a incluir `compaction_snapshot`, `compaction_accumulator` e `compaction_profile_current`.

## Resultado no HUD
- O HUD ganhou o bloco `Compactacao por Camada` sem remover os blocos `Trator`, `Terreno Atual` e `Missao`.
- As 6 camadas aparecem em ordem crescente de profundidade.
- Cada linha exibe profundidade, `risk_class`, `sigma_aplicada_kpa`, `sigma_p_kpa`, deformacao e a densidade estimada relevante para a celula.
- O DOM do bloco e preconstruido; o renderer atualiza apenas texto e classes.
- Camadas indisponiveis continuam visiveis com ausencia diagnostica, sem esconder a estrutura do perfil.

## Persistencia e Exportacao
- O acumulado de compactacao passou a morar dentro da missao, indexado por `cell_id`.
- Cada camada acumulada guarda pelo menos `pass_count` e `bulk_density_estimated`.
- O reload restaura o acumulado quando a `datasetVersion` e compativel.
- Missoes antigas continuam sendo invalidadas quando a `datasetVersion` nao bate.

## Validacao Final da Implementacao
- A sprint foi validada contra `spec.md`, `design.md` e `tasks.md`.
- O checklist de tarefas T1 a T9 foi fechado.
- A validacao integrada final passou em cenarios de pixel valido, `water`, `_invalid`, pixel fora da grade e snapshot parcial.
- O ajuste final da sprint foi bloquear `sigma_p`, risco e deformacao em camadas com entradas parciais, mantendo apenas a tensao aplicada quando possivel.
- Checagens executaveis concluidas no desenvolvimento terminaram em `t9-checks-ok`.
- O parse sintatico do script inline do `index.html` terminou em `inline-script-parse-ok`.

## Artefatos Relacionados
- `.specs/features/sprint-5-motor-compactacao/spec.md`
- `.specs/features/sprint-5-motor-compactacao/design.md`
- `.specs/features/sprint-5-motor-compactacao/tasks.md`
- `prototipo/index.html`
- `prototipo/sprint-5-motor-compactacao.md`

## Fora da Sprint
- Heatmap espacial de risco ou compactacao.
- Novo overlay cartografico alem do BDC ja existente.
- Recalibracao do pipeline BDC da Sprint 4.
- Perfil vertical configuravel alem de `0-60 cm`.
- Recomendacoes operacionais automaticas.

## Assumptions
- O motor continua operando no runtime local, sem rede e sem build.
- O perfil vertical desta sprint e um template mecanico por `thematic_class`, ancorado no pixel superficial atual.
- Refinamentos pedologicos, mapas espaciais dedicados e calibracoes mais finas ficam para sprints posteriores.
