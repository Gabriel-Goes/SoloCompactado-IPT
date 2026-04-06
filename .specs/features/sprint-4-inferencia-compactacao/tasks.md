# Sprint 4: Inferencia de Parametros de Solo via BDC — Tasks

**Spec**: [spec.md](spec.md)
**Design**: [design.md](design.md)
**Status**: Draft

---

## Execution Plan

```
T1 -> T2 -> T3
```

---

## Task Breakdown

### T1: Gerar o produto raster BDC pixelado

**What**: Atualizar `prototipo/scripts/enriquecer-grade-bdc.py` para ler o recorte operacional completo dos COGs, classificar `thematic_class` pixel a pixel e gravar `prototipo/data/terrain-bdc-raster.json` com codificacao compactada.
**Where**: `prototipo/scripts/enriquecer-grade-bdc.py`, `prototipo/data/terrain-bdc-raster.json`
**Depends on**: None
**Reuses**: [design.md](design.md) — seções "Passo 2", "Passo 3" e "Passo 4"

**Done when**:

- [ ] O script le `selectedObservation` de `terrain-sources.json`
- [ ] O script processa o recorte completo do raster, nao o centro da celula de 2 km
- [ ] NDVI e dividido por 10000 antes da classificacao
- [ ] A classificacao `thematic_class` e feita pixel a pixel
- [ ] `terrain-bdc-raster.json` e gerado com `datasetVersion`, `bounds`, `width`, `height`, `classEncoding` e `classCodesBase64`
- [ ] O script continua gerando `terrain-grid.json` como malha operacional de compatibilidade
- [ ] O `terrain-sources.json` documenta explicitamente o produto raster local no `inferenceChain`

**Requirement**: S4INF-01 a S4INF-15
**Commit**: `feat(bdc): gera raster local pixelado para inferencia de solo`

---

### T2: Usar o raster pixelado no runtime

**What**: Atualizar `prototipo/index.html` para carregar o raster BDC local, desenhar o overlay em granularidade fina e consultar o pixel corrente para o HUD.
**Where**: `prototipo/index.html`
**Depends on**: T1
**Reuses**: [design.md](design.md) — seção "Runtime Decisions"

**Done when**:

- [ ] O HTML embute `terrain-bdc-raster.json`
- [ ] O runtime decodifica `classCodesBase64`
- [ ] O overlay "Ver dado BDC" usa o raster pixelado, nao retangulos de 2 km
- [ ] O HUD usa o pixel corrente como fonte primaria das variaveis de solo
- [ ] O HUD atualiza dentro da mesma celula operacional quando o pixel BDC muda
- [ ] A grade operacional continua disponivel para missao/exportacao

**Requirement**: S4INF-16 a S4INF-22
**Commit**: `feat(prototipo): usa raster bdc pixelado no mapa e hud`

---

### T3: Validar comportamento fim a fim

**What**: Regenerar os dados, re-embutir no HTML e validar que o overlay e o HUD respondem a variacao espacial do raster.
**Where**: `prototipo/scripts/`, `prototipo/data/`, `prototipo/index.html`
**Depends on**: T2

**Done when**:

- [ ] O script executa com sucesso no ambiente `geologia`
- [ ] `terrain-bdc-raster.json` e gerado e re-embutido
- [ ] O overlay BDC deixa de mostrar patches de 2 km
- [ ] O HUD muda dentro da mesma celula operacional quando o pixel corrente muda
- [ ] Navegacao, coleta, persistencia e HUD herdados continuam sem regressao estrutural

**Requirement**: S4INF-16 a S4INF-22
**Commit**: `feat(prototipo): valida raster bdc pixelado no runtime`

---

## Tooling

- Ambiente Python: `geologia` via pyenv
- Bibliotecas: `rasterio`, `numpy`, `pyproj`
- Runtime: HTML local com Leaflet, sem build
