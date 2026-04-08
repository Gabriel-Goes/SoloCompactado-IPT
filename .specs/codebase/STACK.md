# Tech Stack

**Analisado:** 2026-04-08

## Core

- Framework: Nenhum (Vanilla JS puro)
- Linguagem: JavaScript ES5 (sem transpilação)
- Runtime: Browser (sem Node.js)
- Package manager: Nenhum (sem npm/yarn)

## Frontend

- Mapa: Leaflet.js (carregado via CDN no index.html)
- Estilo: CSS puro com variáveis CSS (`:root`), sem preprocessador
- Estado: Objeto `runtime` mutável, sem reatividade
- Formulários: HTML nativo + event listeners manuais

## Dados

- Grade de terreno: `data/terrain-grid.js` (global `__SOLO_TERRAIN_GRID__`)
- Raster BDC: `data/terrain-bdc-raster.js` (global `__SOLO_TERRAIN_BDC_RASTER__`)
- Fontes de terreno: `data/terrain-sources.js` (global `__SOLO_TERRAIN_SOURCES__`)
- Persistência: `localStorage` (missão serializada como JSON)

## Integrações Externas

- Imagery: Esri World Imagery tiles (WMTS via Leaflet TileLayer)
- BDC: Brazil Data Cube (raster local, base64-encoded classCodes)

## Ferramentas de Desenvolvimento

- Build: Nenhum (arquivos servidos diretamente)
- Linting: Nenhum configurado
- Scripts Python: `prototipo/scripts/enriquecer-grade-bdc.py` (pré-processamento de dados)
