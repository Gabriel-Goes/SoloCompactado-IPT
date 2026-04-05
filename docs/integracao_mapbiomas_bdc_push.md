# Integração MapBiomas + BDC para o modelo de compactação

## Objetivo
Integrar dados de uso e cobertura do solo do MapBiomas e do Brazil Data Cube (BDC) ao modelo de compactação por tráfego de máquinas agrícolas, de modo que o computador de bordo do trator possa usar esse contexto espacial em tempo real, sem depender de consulta online durante a operação.

## Motivação
O modelo de compactação já considera variáveis físicas e operacionais como:

- número de passadas;
- carga por roda/eixo;
- pressão e geometria do pneu;
- umidade do solo;
- profundidade de interesse.

A inclusão de uso e cobertura do solo adiciona uma camada relevante de contexto espacial, permitindo:

- segmentar melhor diferentes ambientes operacionais;
- aplicar calibração distinta conforme o ambiente percorrido;
- melhorar a interpretação do risco acumulado de compactação ao longo do trajeto.

## Papel de cada fonte

### MapBiomas
- Fonte mais direta para obter classes temáticas prontas de uso e cobertura do solo.
- Útil como variável categórica estável no modelo.
- Exemplos: lavoura, pastagem, formação florestal, solo exposto, área alagada.

### BDC
- Complementa o contexto do MapBiomas com classificações próprias e possibilidade de evolução futura para mosaicos e séries temporais.
- Pode ser usado como segunda referência temática ou como base para futuras features espectrais/temporais.

## Estratégia de integração
O desenho adotado evita dependência de API durante a operação do trator.

Fluxo proposto:

1. Baixar e recortar previamente rasters do MapBiomas e do BDC para a área operacional.
2. Armazenar esses rasters localmente no pipeline ou no ambiente embarcado.
3. Cruzar cada ponto do trajeto GPS/RTK com os rasters.
4. Gerar uma tabela enriquecida com classes e transições ao longo da rota.
5. Alimentar o modelo de compactação com essas features.

## Estratégia para o computador de bordo
- O lookup deve ser local.
- O trator não deve consultar MapBiomas ou BDC pela internet durante a operação.
- A atualização das camadas deve ser feita fora da janela operacional.
- O dado geoespacial deve entrar no bordo já preparado para consulta rápida.

## Implementação adicionada no repositório

### Script novo
- `src/enriquecer_uso_cobertura.py`

Esse script faz o enriquecimento offline de um CSV de trajeto com rasters locais do MapBiomas e do BDC.

### Funções principais
- leitura da trilha GPS/RTK em CSV;
- reprojeção das coordenadas para o CRS do raster;
- leitura da classe do pixel no ponto;
- cálculo da classe modal em uma vizinhança configurável;
- identificação de mudança de classe ao longo do percurso;
- cálculo de distância por segmento e distância acumulada.

## Features geradas
Exemplos de colunas produzidas:

- `mapbiomas_class_id_point`
- `mapbiomas_class_id_mode`
- `bdc_class_id_point`
- `bdc_class_id_mode`
- `mapbiomas_class_change`
- `bdc_class_change`
- `segment_length_m`
- `cumulative_distance_m`

Se houver legenda de classes, o script também adiciona:

- `mapbiomas_class_name_point`
- `mapbiomas_class_name_mode`
- `bdc_class_name_point`
- `bdc_class_name_mode`

## Exemplo de uso

```bash
python3 src/enriquecer_uso_cobertura.py \
  --route-csv data/exemplo_rota_rtk.csv \
  --output-csv outputs/rota_enriquecida.csv \
  --x-col x_m \
  --y-col y_m \
  --route-crs EPSG:31983 \
  --window-radius-m 15 \
  --mapbiomas mapbiomas::data/mapbiomas_uso_cobertura_2024.tif \
  --bdc bdc::data/bdc_lulc_2024.tif
```

Exemplo com legenda:

```bash
python3 src/enriquecer_uso_cobertura.py \
  --route-csv data/exemplo_rota_rtk.csv \
  --output-csv outputs/rota_enriquecida.csv \
  --x-col x_m \
  --y-col y_m \
  --route-crs EPSG:31983 \
  --mapbiomas mapbiomas::data/mapbiomas_uso_cobertura_2024.tif::data/mapbiomas_legenda.csv \
  --bdc bdc::data/bdc_lulc_2024.tif::data/bdc_legenda.csv
```

## Uso no modelo de compactação
As variáveis de uso/cobertura não substituem as variáveis físicas do modelo. Elas entram como contexto auxiliar para:

- diferenciar trechos com ambientes distintos;
- ajustar envelopes de risco;
- permitir calibração específica por classe temática;
- suportar alertas mais coerentes com o ambiente operacional.

## Recomendação de evolução
O próximo passo natural é conectar a saída do enriquecimento ao pipeline do simulador de trajeto, para permitir:

- limiares distintos de `sigma_crit` por classe de uso/cobertura;
- regras de alerta por ambiente;
- comparação entre trajetos em diferentes classes temáticas;
- futura incorporação de variáveis contínuas derivadas do BDC.

## Arquivos relacionados
- `src/enriquecer_uso_cobertura.py`
- `docs/integracao_mapbiomas_bdc.md`
- `sphinx/integracao_geoespacial.rst`
- `README.md`

## Observação operacional
Para uso real, ainda será necessário:

- disponibilizar os rasters do MapBiomas e do BDC no ambiente de processamento;
- instalar a dependência `rasterio`;
- definir quais coleções e anos serão adotados como referência operacional;
- decidir se o lookup em bordo será por raster embarcado direto ou por base intermediária otimizada.
