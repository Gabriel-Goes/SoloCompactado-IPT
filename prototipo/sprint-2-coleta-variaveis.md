# Sprint 2: Coleta e Armazenagem de Variaveis em Tempo Real

## Resumo
A Sprint 2 deve adicionar a camada de dados ao prototipo de navegacao: enquanto o trator se move pelo mapa, o sistema identifica a regiao/celula atual, extrai as variaveis do terreno dessa area e registra junto com as variaveis vigentes do trator.

O foco desta sprint e exclusivamente a captura, estruturacao e persistencia desses dados. Nao inclui HUD analitico, calculo de compactacao, semaforo de risco ou recomendacao operacional.

## Objetivo da Sprint
Criar um arquivo `.html` autonomo que:
- mantenha o mapa satelital navegavel com o trator centralizado,
- identifique em tempo real a celula atual do terreno,
- associe a essa celula as variaveis do solo configuradas,
- registre essas variaveis junto com as variaveis ativas do trator,
- armazene a coleta da sessao no navegador.

## Escopo Funcional
- Manter a base da Sprint 1: mapa satelital navegavel com trator controlado por teclado.
- Representar o terreno como uma grade espacial de celulas sobre a fazenda.
- Associar a cada celula um pacote resumido de variaveis de superficie do solo.
- Permitir que as variaveis do trator existam como configuracao ativa em runtime.
- Registrar amostras de dados enquanto o trator se move.
- Persistir essas amostras no `localStorage`.
- Permitir exportacao da sessao em `JSON`.

## Arquitetura de Arquivos
- Todos os arquivos gerados para o prototipo devem ficar dentro da pasta `prototipo/`.
- A Sprint 2 deve evoluir a arquitetura criada na Sprint 1 sem criar arquivos principais fora de `prototipo/`.
- Estrutura minima esperada:
  - `prototipo/sprint-2-coleta-variaveis.md`
  - `prototipo/index.html`
  - `prototipo/data/` para arquivos exportados ou exemplos de sessao, se necessario
- Se houver exemplos de `JSON` exportado ou arquivos auxiliares de grade/celulas, eles devem ficar dentro de `prototipo/`.

## Variaveis de Terreno por Celula
Cada celula deve armazenar um resumo operacional do solo:
- `cell_id`
- `clay_content`
- `water_content`
- `matric_suction`
- `bulk_density`
- `conc_factor`
- `sigma_p`

## Variaveis do Trator na Sessao
As variaveis do trator devem existir como estado ativo e ser salvas a cada coleta:
- `machine_preset`
- `wheel_load`
- `mass_total`
- `inflation_pressure`
- `tyre_width`
- `track_gauge`
- `route_speed`

## Modelo de Coleta
- A coleta deve ser hibrida.
- Criar registro quando o trator entrar em uma nova celula.
- Criar registro tambem em intervalo fixo de tempo enquanto houver movimento.
- Nao gravar registros duplicados no mesmo frame.
- Cada registro deve indicar o motivo da coleta:
  - `cell-change`
  - `time-tick`

## Estrutura de Dados da Missao
O estado da missao deve conter:
- `mission_id`
- configuracao ativa do trator
- grade do terreno
- historico de amostras coletadas
- contadores e metadados da sessao

Cada amostra coletada deve conter:
- `sample_id`
- `timestamp`
- `mission_id`
- `tractor_position`
- `heading`
- `speed`
- `cell_id`
- `sampling_reason`
- `terrain_snapshot`
- `tractor_snapshot`

## Estrutura de Campos do Registro
- `tractor_position`
  - `lat`
  - `lng`
- `terrain_snapshot`
  - resumo da celula atual do mapa
- `tractor_snapshot`
  - valores vigentes do trator no instante da coleta

## Persistencia
- Salvar a missao atual no `localStorage`.
- Preservar os dados em caso de reload da pagina.
- Permitir limpeza manual dos dados salvos.
- Permitir exportacao da missao e das amostras para um arquivo `JSON`.

## Interface Minima da Sprint
Esta sprint nao deve introduzir painel analitico completo.
Se houver interface adicional, ela deve ser apenas operacional:
- indicador leve da celula atual,
- contador de registros coletados,
- botao de exportar `JSON`,
- botao de limpar dados locais.

## Implementacao
- Manter o `Leaflet` como base do mapa.
- Inicializar a area da fazenda com uma grade de celulas de tamanho fixo cobrindo um raio operacional de `7 km`.
- Resolver, a cada atualizacao do trator, em qual celula ele esta.
- Buscar os dados do terreno vinculados a essa celula a partir do `BDC`.
- Montar o snapshot completo da coleta.
- Preencher com dado real do `BDC` o que estiver disponivel e manter `null` com proveniencia adequada para o que o `BDC` nao fornecer.
- Acrescentar a coleta no historico em memoria.
- Sincronizar o historico com o `localStorage`.
- Expor a exportacao da sessao em formato `JSON`.
- Manter o codigo-fonte principal do prototipo dentro de `prototipo/`.

## Criterios de Aceitacao
- [x] Navegar entre duas ou mais celulas distintas deve gerar registros com `cell_id` diferentes.
- [x] Permanecer em movimento dentro da mesma celula deve gerar registros por tempo.
- [x] Alterar uma variavel do trator durante a missao deve refletir apenas nos registros posteriores a mudanca.
- [x] Recarregar a pagina deve manter a missao salva no `localStorage`.
- [x] Exportar os dados deve gerar um `JSON` com metadados da missao e lista de amostras.
- [x] Limpar os dados deve reiniciar a sessao local sem residuos.
- [x] Ao final da sprint, deve estar demonstrado que o sistema consegue:
  - [x] localizar o trator no mapa,
  - [x] identificar a regiao atual,
  - [x] extrair as variaveis do terreno dessa regiao com dado real do `BDC` quando disponivel e `null` quando indisponivel,
  - [x] salvar junto as variaveis vigentes do trator.

## Fora da Sprint
- HUD lateral com visualizacao executiva.
- Calculo de compactacao.
- Heatmap de risco.
- Perfil de solo por profundidade.
- Recomendacoes operacionais.
- Integracao com telemetria real.

## Assumptions
- O terreno sera modelado por grade de celulas, nao por poligonos manuais.
- As variaveis do solo nesta sprint serao um resumo por superficie, nao perfil completo por camada.
- O `BDC` sera a unica fonte oficial de dados de terreno desta sprint.
- O armazenamento principal sera no `localStorage`.
- A exportacao em `JSON` sera usada como artefato de validacao da sprint.
- A coleta sera hibrida: por mudanca de celula e por tempo.
