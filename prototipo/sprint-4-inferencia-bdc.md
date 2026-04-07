# Sprint 4: Inferencia de Parametros de Solo via BDC

**Status**: Concluida

## Resumo
A Sprint 4 substituiu a leitura operacional baseada apenas na grade de 2 km por um fluxo em duas camadas: um raster local compactado do BDC para consulta fina em runtime e uma grade operacional derivada apenas para compatibilidade com missao e exportacao.

O objetivo desta sprint foi fazer o mapa e o HUD passarem a refletir o pixel BDC corrente no recorte da Fazenda Paladino, sem depender de consulta online no runtime e sem inventar valores para pixels invalidos, agua ou ausencia de dado observavel.

## Objetivo da Sprint
Popular as variaveis de solo da demo a partir dos assets oficiais do Brazil Data Cube, preservando a granularidade espacial do raster e reembutindo os artefatos gerados no `index.html`.

## O Que Foi Entregue
- Script offline `prototipo/scripts/enriquecer-grade-bdc.py` para processar o recorte operacional do BDC pixel a pixel.
- Produto raster local `prototipo/data/terrain-bdc-raster.json` com `datasetVersion` `2026-04-05-paladino-bdc-7km-v2`.
- Atualizacao de `prototipo/data/terrain-grid.json` como malha operacional de compatibilidade derivada do raster.
- Atualizacao de `prototipo/data/terrain-sources.json` com a cadeia de inferencia documentada e a observacao fixa do pipeline.
- Integracao do raster local no runtime do `prototipo/index.html` como fonte primaria do overlay BDC e do snapshot de terreno do HUD.

## Pipeline de Inferencia
- A observacao fixa do pipeline passou a ser `S2-16D_V2_030019_20260306`, registrada em `terrain-sources.json`.
- O script le NDVI e SCL dos COGs oficiais do BDC e normaliza o NDVI por `10000` antes da classificacao.
- A classificacao tematica por pixel ficou definida como:
- `SCL=4` e `NDVI>=0.5` -> `vegetation_dense`
- `SCL=4` e `NDVI<0.5` -> `vegetation_sparse`
- `SCL=5` -> `bare_soil`
- `SCL=6` -> `water`
- demais casos -> `null` ou invalido
- A partir da `thematic_class`, o pipeline deriva `clay_content`, `water_content` e `bulk_density` por lookup calibrado para Latossolo Vermelho-Amarelo do oeste da Bahia.
- O pipeline tambem deriva `matric_suction`, `conc_factor` e `sigma_p`, marcando `derived` quando ha base observavel valida e `unavailable` quando o pixel e `water` ou invalido.

## Artefatos Gerados
- `prototipo/scripts/enriquecer-grade-bdc.py`
- `prototipo/data/terrain-sources.json`
- `prototipo/data/terrain-grid.json`
- `prototipo/data/terrain-bdc-raster.json`
- `prototipo/index.html`

## Estado dos Dados no Prototipo
- O raster local passou a carregar `width = 1420` e `height = 1372` para o recorte operacional embedado.
- O `terrain-grid.json` deixou de ser a fonte primaria do overlay e do HUD; ele permanece como camada de compatibilidade para missao, persistencia e exportacao.
- O runtime passou a resolver o pixel BDC corrente sob o trator, permitindo variacao interna dentro da mesma celula operacional de 2 km.
- Missoes antigas com `datasetVersion` anterior passam a ser invalidadas para evitar restauracao com dados incompativeis.

## Resultado no Runtime
- O overlay "Ver dado BDC" passou a desenhar a granularidade fina do raster local em vez de retangulos operacionais grandes.
- O bloco `Terreno Atual` do HUD passou a refletir o pixel BDC corrente, inclusive quando o trator se move dentro da mesma celula operacional.
- Pixels `water`, invalidos ou sem base observavel continuam visiveis no HUD sem valor fabricado.

## Criterios de Aceitacao Atendidos
- [x] O preprocessamento offline gera o raster local compactado do BDC para o recorte da demo.
- [x] `terrain-sources.json` documenta a cadeia de inferencia e a observacao fixa do pipeline.
- [x] `terrain-grid.json` foi preservado como malha operacional derivada para compatibilidade.
- [x] O runtime usa o raster local como fonte primaria para o overlay e para o snapshot de terreno.
- [x] O HUD passa a variar dentro da mesma celula operacional quando o pixel BDC muda.
- [x] Pixels sem dado valido continuam sem valor fabricado.

## Fora da Sprint
- Motor de compactacao por camadas.
- Classificacao de risco `safe`, `warning` e `critical`.
- Acumulo de compactacao ao longo da missao.
- Recomendacoes operacionais.
- Novo painel analitico alem do HUD ja existente.

## Assumptions
- O runtime continua offline em um unico `index.html`.
- A observacao BDC usada pelo pipeline e fixa; trocar a cena exige recalibrar o lookup de solo.
- O raster local e a fonte oficial do ponto corrente; a grade operacional continua existindo para compatibilidade do prototipo.
