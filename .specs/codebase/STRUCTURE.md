# Project Structure

**Raiz:** `/home/ggrl/projetos/ipt/Civil/Geotecnia/SoloCompactado/`

## Árvore de Diretórios (3 níveis)

```
SoloCompactado/
├── prototipo/                  ← aplicação web embarcável (foco principal)
│   ├── index.html              ← entry point único
│   ├── main.js                 ← DOMContentLoaded bootstrap
│   ├── assets/styles/          ← CSS modularizado
│   │   ├── base.css            ← variáveis, reset, .floating-panel
│   │   ├── layout.css          ← posicionamento dos painéis
│   │   ├── hud.css             ← estilos do HUD (métricas, risco)
│   │   └── planner.css         ← estilos do painel planner
│   ├── data/                   ← datasets embutidos como globals JS
│   │   ├── terrain-grid.js     ← __SOLO_TERRAIN_GRID__ (células e snapshots)
│   │   ├── terrain-bdc-raster.js ← __SOLO_TERRAIN_BDC_RASTER__ (classCodes base64)
│   │   └── terrain-sources.js  ← __SOLO_TERRAIN_SOURCES__
│   ├── src/
│   │   ├── core/               ← infraestrutura
│   │   │   ├── bootstrap.js    ← namespace e registry de módulos
│   │   │   ├── runtime.js      ← createRuntime (estado central)
│   │   │   ├── keyboard.js     ← binding de teclado
│   │   │   ├── storage.js      ← localStorage (missão)
│   │   │   └── formatters.js   ← formatação para HUD
│   │   ├── domains/            ← lógica de negócio
│   │   │   ├── tractor.js      ← física (velocidade, heading, posição)
│   │   │   ├── mission.js      ← amostragem, persistência, exportação
│   │   │   ├── map.js          ← Leaflet, imagery, BDC overlay
│   │   │   ├── planner.js      ← talhão, plano de cobertura, rotas
│   │   │   ├── terrain.js      ← resolução célula/pixel, validação dataset
│   │   │   └── compaction.js   ← tensões Boussinesq, risco por camada
│   │   └── ui/
│   │       ├── hud.js          ← renderHud(viewModel) → DOM
│   │       ├── panels.js       ← bind de eventos nos painéis
│   │       ├── dom.js          ← getDomRefs() (cache de byId)
│   │       └── debug.js        ← overlay de debug (tecla D)
│   ├── scripts/                ← scripts de pré-processamento de dados
│   │   └── enriquecer-grade-bdc.py
│   └── sprint-*.md             ← diários de sprint (documentação)
├── src/                        ← simulações Python (motor de compactação)
│   ├── prototipo_ponto_unico.py
│   ├── prototipo_trajeto_3d.py
│   └── validacao_bloco1_matriz.py
├── .specs/                     ← especificações TLC
│   ├── codebase/               ← este mapeamento
│   └── features/               ← specs por feature
├── docs/                       ← documentação técnica
├── sphinx/                     ← documentação Sphinx (fundamentos físicos)
└── outputs/                    ← resultados de simulações
```

## Onde as Coisas Moram

**Física de compactação:**
- Motor JS: `prototipo/src/domains/compaction.js`
- Protótipo Python: `src/prototipo_ponto_unico.py`

**Dados de terreno:**
- Grid de células: `prototipo/data/terrain-grid.js`
- Raster BDC: `prototipo/data/terrain-bdc-raster.js`

**Estado da aplicação:**
- Definição do estado: `prototipo/src/core/runtime.js`
- Persistência: `prototipo/src/core/storage.js` (localStorage)

**Entrada do usuário:**
- Teclado (movimento trator): `prototipo/src/core/keyboard.js`
- Botões e inputs: `prototipo/src/ui/panels.js`
- Cliques no mapa (vértices): `index.html` via `bootstrapLegacyRuntime`

**Renderização:**
- HUD: `prototipo/src/ui/hud.js`
- Mapa e overlays: `prototipo/src/domains/map.js` + `planner.js`

## Diretórios Especiais

**`prototipo/data/`:**
Datasets JavaScript carregados como `<script>` antes dos módulos. Definem globais `__SOLO_TERRAIN_*__`. Gerados via `scripts/enriquecer-grade-bdc.py`.

**`.specs/features/`:**
Uma pasta por feature/sprint com `spec.md`, `design.md`, `tasks.md`. Features concluídas: sprints 1–8.
