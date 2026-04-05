# Integração MapBiomas + BDC no modelo de compactação

## Objetivo
Adicionar contexto espacial de uso e cobertura do solo ao modelo de compactação por tráfego, sem depender de consulta online durante a operação do trator.

O desenho recomendado é:

1. Baixar e recortar previamente rasters temáticos do MapBiomas e do BDC para a área operacional.
2. Enriquecer as trilhas GPS/RTK com as classes locais desses rasters.
3. Persistir as features resultantes em uma base local para uso em tempo real no computador de bordo.
4. Alimentar o modelo de compactação com essas classes junto com telemetria, umidade e parâmetros do equipamento.

## Papel de cada fonte

### MapBiomas
- Melhor para classe temática pronta de uso e cobertura do solo.
- Tipicamente mais estável e interpretável para o modelo.
- Útil como variável categórica do tipo `lavoura`, `pastagem`, `formação florestal`, `solo exposto`, `área alagada`.

### BDC
- Melhor para complementar o contexto com resolução espacial e/ou temporal diferente.
- Pode fornecer classificações próprias de uso/cobertura do solo e também mosaicos/séries temporais, conforme a coleção escolhida.
- Útil para agregar variáveis contínuas no futuro, como índices espectrais e histórico recente.

## Arquitetura recomendada

### Camada 1: preparação offline
- Recortar rasters para o limite da fazenda ou dos talhões.
- Padronizar SRC e metadados.
- Gerar rasters embarcáveis por safra, ano ou campanha.
- Versionar os produtos geoespaciais usados pelo modelo.

### Camada 2: enriquecimento do trajeto
- Entrada: CSV com pontos GPS/RTK.
- Consulta local:
  - classe do pixel no ponto;
  - classe modal em uma vizinhança;
  - transição de classe ao longo do trajeto.
- Saída: tabela de features pronta para treinamento e inferência.

### Camada 3: inferência embarcada
- O computador de bordo não consulta API externa.
- Ele usa uma base local derivada dos rasters já processados.
- A cada nova posição, o sistema obtém:
  - classe MapBiomas atual;
  - classe BDC atual;
  - histórico curto de mudança de classe;
  - distância acumulada no trecho.

### Camada 4: atualização periódica
- Reprocessar rasters conforme nova safra, nova coleção ou nova campanha.
- Recalibrar o modelo quando mudarem as classes, o manejo ou a condição hídrica.

## Features recomendadas para o modelo

### Categóricas
- `mapbiomas_class_id_point`
- `mapbiomas_class_name_point`
- `mapbiomas_class_id_mode`
- `bdc_class_id_point`
- `bdc_class_id_mode`

### De contexto operacional
- `segment_length_m`
- `cumulative_distance_m`
- `mapbiomas_class_change`
- `bdc_class_change`

### Telemetria e solo já previstas no projeto
- umidade do solo
- número de passadas
- carga por roda/eixo
- pressão do pneu
- tipo de rodado/pneu
- profundidade de interesse
- teor de argila/textura, se disponível

## Estratégia de uso no modelo

### Treinamento
- Cruzar trajetos históricos com rasters locais do MapBiomas e BDC.
- Formar um dataset por ponto ou por segmento.
- Usar as classes como variáveis explicativas auxiliares.

### Inferência em tempo real
- Receber `x,y,timestamp`.
- Consultar a base local da área operacional.
- Acrescentar as features geoespaciais ao vetor de entrada.
- Rodar o modelo de compactação.

## Script incluído no repositório
Foi adicionado o utilitário:

- `src/enriquecer_uso_cobertura.py`

Ele faz o enriquecimento offline de um CSV de trajeto com rasters locais do MapBiomas e do BDC.

### Entradas
- CSV de trajeto com colunas `x` e `y` ou equivalentes.
- Um ou mais rasters locais:
  - `--mapbiomas`
  - `--bdc`
- CRS do trajeto.
- Raio da vizinhança para cálculo da classe modal.

### Saída
CSV enriquecido com colunas como:

- `mapbiomas_class_id_point`
- `mapbiomas_class_id_mode`
- `bdc_class_id_point`
- `bdc_class_id_mode`
- `segment_length_m`
- `cumulative_distance_m`
- `mapbiomas_class_change`
- `bdc_class_change`

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

### Exemplo com legenda de classes

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

Formato esperado para legenda:

```csv
class_id,class_name
3,Formacao florestal
15,Pastagem
19,Lavoura temporaria
```

## Recomendação de engenharia para bordo
- Não consultar serviços remotos durante a operação.
- Empacotar só os rasters do perímetro relevante.
- Preferir lookup local por tile, janela ou cache embarcado.
- Atualizar a base geoespacial fora do ciclo operacional.

## Próximo passo sugerido
Integrar a saída de `enriquecer_uso_cobertura.py` ao pipeline que hoje alimenta `src/prototipo_trajeto_3d.py`, para que o modelo possa usar:

- contexto temático por ponto;
- limiares distintos de `sigma_crit` por classe de uso/cobertura;
- regras de alerta diferenciadas por ambiente operacional.
