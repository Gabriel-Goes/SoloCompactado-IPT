# Sprint 1: Mapa Satelital Navegavel com Trator Controlado por Teclado

## Resumo
A Sprint 1 tem uma missao unica e clara: entregar um prototipo minimo em HTML + JavaScript, aberto direto no navegador, que mostra uma fazenda real em mapa satelital e um trator controlavel pelas setas do teclado.

**Status atual**: Concluida.

Nesta fase, o foco nao e HUD, calculo de compactacao ou telemetria. O objetivo e validar a base visual e a mecanica principal de navegacao: trator centralizado, mapa se movendo por baixo dele e sensacao de deslocamento sobre uma fazenda real.

## Objetivo da Sprint
Criar um arquivo `.html` autonomo que:
- exiba um mapa com imagem satelital,
- use uma localizacao real de fazenda no Brasil,
- mostre um trator no centro da tela,
- permita movimentacao com as setas do teclado,
- mova o mapa em vez do trator, no estilo Google Maps/Waze.

## Localizacao Inicial da Demo
- Fazenda escolhida: `Fazenda Paladino`
- Municipio/estado: `Sao Desiderio, Bahia, Brasil`
- Coordenadas iniciais: `[-13.098074, -45.846229]`
- Link de referencia no Google Maps:
  `https://www.google.com/maps?q=-13.098074,-45.846229`

## Stack
- `HTML`
- `CSS`
- `JavaScript`
- `Leaflet`

## Justificativa Tecnica
- `Leaflet` funciona normalmente no Brasil, pois aceita coordenadas GPS globais.
- A biblioteca e adequada para um prototipo em arquivo unico, com integracao simples em `HTML + JavaScript`.
- O mapa deve usar tiles compativeis com `Leaflet` e com visual satelital.
- Nao usar tiles do Google Maps/Waze diretamente sem API/licenciamento apropriados.

## Entregavel
- Um unico arquivo `HTML` com `CSS` e `JavaScript` embutidos.
- Inclusao do `Leaflet` via CDN.
- Abertura local no navegador sem backend nem build.
- Cena jogavel minima com:
  - mapa satelital centralizado na Fazenda Paladino,
  - trator centralizado,
  - navegacao por teclado,
  - movimento fluido do mapa.

## Arquitetura de Arquivos
- Todos os arquivos gerados para o prototipo devem ficar dentro da pasta `prototipo/`.
- O artefato principal desta sprint deve ser criado dentro de `prototipo/`.
- Estrutura minima esperada:
  - `prototipo/sprint-1-mapa-trator.md`
  - `prototipo/index.html`
- Se houver assets locais desta sprint, eles tambem devem ficar organizados sob `prototipo/`.

## Implementacao
- Estruturar a tela inicialmente com foco total no mapa, sem HUD funcional nesta sprint.
- Criar uma viewport principal que simula um app de navegacao.
- Inicializar o `Leaflet` com centro em `[-13.098074, -45.846229]`.
- Configurar uma camada de tiles satelitais compativel com uso no navegador.
- Definir `zoom` inicial fixo em `16`.
- Usar `Esri World Imagery` como camada satelital principal.
- Configurar `maxNativeZoom` em `16` para permitir ampliacao visual sem solicitar tiles inexistentes acima da disponibilidade nativa.
- Nao usar `detectRetina` nesta sprint, para evitar requisicoes mais agressivas de tiles em regioes rurais.
- Se a camada satelital falhar, exibir estado de erro visivel no mapa, sem fallback automatico para outro provedor nesta sprint.
- Manter o trator fixo no centro da viewport como elemento visual sobreposto ao mapa.
- Implementar estado de navegacao em JavaScript:
  - latitude/longitude logica ou posicao equivalente no mapa,
  - direcao `heading`,
  - velocidade atual,
  - velocidade maxima de demonstracao em `50 m/s`,
  - flags de teclas pressionadas.
- Mapear controles:
  - `ArrowUp` para avancar,
  - `ArrowLeft` para virar a esquerda,
  - `ArrowRight` para virar a direita,
  - `ArrowDown` para frear/desacelerar, sem implementacao de re nesta sprint.
- Mapear a tecla `D` para ativar/desativar o painel de debug.
- Atualizar a cena com loop de animacao usando `requestAnimationFrame`.
- Recentrar o mapa continuamente conforme o movimento do trator, preservando o trator visualmente fixo.
- Aplicar rotacao no icone/emoji do trator para refletir a direcao atual, com compensacao da orientacao nativa do emoji.
- Manter a rotacao do trator continua ao ultrapassar `360°`, sem reset visual perceptivel.
- Posicionar o indicador visual de heading na frente real do trator, acompanhando a mesma rotacao do conjunto.
- Manter a rotacao do mapa desabilitada na v1 para reduzir complexidade.

## Interfaces e artefatos
- Arquivo sugerido:
  - `prototipo/index.html`
- Estrutura interna minima:
  - container do mapa `Leaflet`,
  - camada visual do trator sobre o centro,
  - camada opcional de debug leve para coordenadas e heading.
- Dependencias externas permitidas:
  - `Leaflet CSS`
  - `Leaflet JS`
  - `Esri World Imagery`

## Criterios de aceitacao
- [x] O arquivo abre diretamente no navegador.
- [x] O mapa inicia na regiao da Fazenda Paladino.
- [x] O fundo visual e satelital e comunica lugar real.
- [x] O trator permanece centralizado o tempo todo.
- [x] As setas do teclado controlam o deslocamento de forma estavel.
- [x] O trator responde com velocidade suficiente para uma demo exploratoria em area aberta.
- [x] A frente visual do trator fica coerente com a direcao do movimento.
- [x] O mapa se move sob o trator com fluidez perceptivel.
- [x] A navegacao funciona sem travamentos ou saltos bruscos.
- [x] A experiencia ja comunica claramente a metafora de dirigir o trator por uma fazenda real.

## Fora da Sprint
- HUD lateral com metricas.
- Calculo de compactacao.
- Heatmap de risco.
- Trilha acumulada com semaforo.
- Recomendacoes operacionais.
- Integracao com dados reais de telemetria.

## Assumptions
- A Sprint 1 prioriza validar navegacao e linguagem visual.
- A localizacao padrao sera fixa na Fazenda Paladino.
- O `zoom` inicial padrao sera `16`.
- A camada `Esri World Imagery` sera usada com `maxNativeZoom` `16`.
- `detectRetina` nao sera usado nesta sprint.
- O prototipo sera desktop-first com controle por teclado.
- `ArrowDown` sera usado apenas como freio nesta sprint.
- O painel de debug sera alternado pela tecla `D`.
- A velocidade maxima da demo sera `50 m/s`.
- O `heading` interno sera continuo, e o debug exibira o valor normalizado apenas para leitura.
- O primeiro objetivo e acertar movimento, centralizacao e percepcao de mapa real antes de adicionar dados agronomicos.
