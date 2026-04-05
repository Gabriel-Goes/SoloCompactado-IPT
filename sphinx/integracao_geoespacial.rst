Integração Geoespacial
======================

Objetivo
--------

O protótipo passa a considerar uma camada adicional de contexto geoespacial para o modelo de compactação:

- classe de uso e cobertura do solo do MapBiomas;
- classe de uso e cobertura do solo ou classificação equivalente do BDC.

A meta não é consultar serviços remotos em campo, mas sim preparar bases locais para lookup rápido no computador de bordo.

Desenho recomendado
-------------------

O fluxo operacional proposto é:

1. recortar previamente os rasters temáticos para a área operacional;
2. enriquecer trilhas GPS/RTK com as classes desses rasters;
3. persistir a tabela enriquecida para treino e inferência;
4. usar a classe local como feature auxiliar do modelo de compactação.

Papel do MapBiomas e do BDC
---------------------------

MapBiomas
~~~~~~~~~

- fornece classe temática pronta de uso e cobertura do solo;
- é a fonte mais direta para uma variável categórica estável;
- tende a ser a melhor base inicial para distinguir ambientes de tráfego.

BDC
~~~

- pode fornecer classificações próprias de uso/cobertura do solo;
- permite evolução futura para mosaicos e séries temporais;
- pode complementar o contexto do MapBiomas com outra coleção, resolução ou janela temporal.

Features geoespaciais sugeridas
-------------------------------

- `mapbiomas_class_id_point`
- `mapbiomas_class_id_mode`
- `bdc_class_id_point`
- `bdc_class_id_mode`
- `mapbiomas_class_change`
- `bdc_class_change`
- `segment_length_m`
- `cumulative_distance_m`

Uso no modelo de compactação
----------------------------

As classes geoespaciais entram como variáveis auxiliares e não substituem as variáveis físicas e operacionais principais.

As features mais importantes continuam sendo:

- umidade do solo;
- carga por roda ou eixo;
- pressão do pneu;
- número de passadas;
- profundidade de interesse;
- tipo de solo e textura, quando disponíveis.

As classes de uso/cobertura ajudam a:

- contextualizar o ambiente percorrido;
- segmentar diferentes envelopes de operação;
- aplicar calibrações distintas por ambiente.

Script de enriquecimento incluído
---------------------------------

Foi adicionado o script:

- `src/enriquecer_uso_cobertura.py`

Esse utilitário recebe um CSV de trajeto e rasters locais do MapBiomas e do BDC e devolve uma tabela pronta para alimentar o modelo.

Exemplo de execução:

.. code-block:: bash

   python3 src/enriquecer_uso_cobertura.py \
     --route-csv data/exemplo_rota_rtk.csv \
     --output-csv outputs/rota_enriquecida.csv \
     --x-col x_m \
     --y-col y_m \
     --route-crs EPSG:31983 \
     --window-radius-m 15 \
     --mapbiomas mapbiomas::data/mapbiomas_uso_cobertura_2024.tif \
     --bdc bdc::data/bdc_lulc_2024.tif

Estratégia embarcada
--------------------

- pré-processar os rasters fora da operação;
- manter apenas a área relevante no armazenamento local;
- consultar a classe local por ponto ou por segmento;
- alimentar o modelo sem dependência de rede.

Próxima evolução
----------------

O passo seguinte recomendado é conectar a tabela enriquecida ao simulador 3D para permitir:

- parâmetros distintos de resistência por classe temática;
- alertas de compactação ajustados ao ambiente;
- análise comparativa entre trajetos em ambientes diferentes.
