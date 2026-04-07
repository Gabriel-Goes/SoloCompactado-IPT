# Extracao 7 km Fazenda Paladino via BDC

Centro utilizado:

- latitude: `-13.098074`
- longitude: `-45.846229`
- raio: `7000 m`

Bounding box aproximado do recorte:

- west: `-45.91079043940991`
- south: `-13.160955782249372`
- east: `-45.781667560590094`
- north: `-13.035192217750629`

## O que ja foi extraido

- `BDC`:
  - arquivo gerado em [bdc-paladino-7km-items.json](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/data/bdc-paladino-7km-items.json)
  - colecao usada: `S2-16D-2`
  - o arquivo lista itens reais da STAC API que cobrem o recorte e seus assets principais (`NDVI`, `SCL`, `B03`, `thumbnail`)

## Fontes oficiais

- Brazil Data Cube image collections: https://data.inpe.br/bdc/en/image-collections/
- Brazil Data Cube STAC API: https://data.inpe.br/bdc/stac/v1/
- Colecao Sentinel-2 16 dias usada nesta extracao:
  https://data.inpe.br/bdc/stac/v1/collections/S2-16D-2

## Uso sugerido

1. Consultar a STAC API do `BDC` para o bbox do recorte.
2. Selecionar os itens temporais mais adequados para a demo.
3. Consumir os assets desejados no builder do dataset local.
4. Converter o resultado para o formato do `terrain-grid.json`.

## Observacao

O runtime atual do prototipo ja foi expandido para usar o recorte radial de `7 km`; o inventario oficial salvo localmente e o arquivo [bdc-paladino-7km-items.json](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/data/bdc-paladino-7km-items.json).
