# Architecture

**Padrão:** Modular monolito client-side com namespace global e IIFE

## Estrutura de Alto Nível

```
window.SoloCompactado
├── modules.core
│   ├── bootstrap   → registry de módulos (registerModule / getModule)
│   ├── runtime     → fábrica do estado global (createRuntime)
│   ├── keyboard    → binding de teclas direcionais e atalhos
│   ├── storage     → localStorage (persistir/restaurar missão)
│   └── formatters  → formatação de valores para exibição no HUD
├── modules.domains
│   ├── tractor     → física do trator (aceleração, direção, posição)
│   ├── mission     → ciclo de vida da missão (criar, amostrar, exportar)
│   ├── map         → mapa Leaflet, imagery, overlay BDC, câmera
│   ├── planner     → polígono de talhão, plano de cobertura, rotas
│   ├── terrain     → resolução de célula/pixel, snapshot de solo
│   └── compaction  → propagação de tensão Boussinesq, risco de compactação
└── modules.ui
    ├── hud         → renderização do HUD (viewModel → DOM)
    ├── panels      → event binding dos painéis (cliques, inputs)
    └── dom         → referências aos elementos DOM (byId cacheado)
```

## Padrões Identificados

### Módulo IIFE com Namespace Global

**Local:** Todos os arquivos em `prototipo/src/`
**Propósito:** Encapsulamento sem bundler
**Implementação:** Cada arquivo define `(function(global) { ... })(window)` e registra via `app.registerModule(layer, name, api)`
**Exemplo:** `src/domains/tractor.js:121`

### Factory Function com Injeção de Dependência por Config

**Local:** `createXxxDomain(config)` em todos os domains
**Propósito:** Domains recebem dependências (runtime, outros domains, utilitários) via objeto `config`
**Exemplo:** `createMissionDomain(config)` recebe `config.tractorDomain`, `config.storage`, `config.terrainModule`

### Objeto `runtime` como Estado Central

**Local:** `src/core/runtime.js`
**Propósito:** Único objeto mutável compartilhado; domains recebem referência e mutam diretamente
**Campos principais:** `datasetReady`, `mission`, `currentCell`, `currentCompactionProfile`, `coveragePlanner` (sub-objeto com modo do planner, view, talhão, plano)

### Game Loop com `requestAnimationFrame`

**Local:** Inicializado via `bootstrapLegacyRuntime()` em `index.html`
**Propósito:** Tick de atualização do trator, amostragem e câmera
**Fluxo:** tick → `tickRuntime` → `tractorDomain.update(deltaMs)` → `missionDomain.updateSampling` → `renderHud`

## Fluxo de Dados Principal

### Movimento do Trator → Amostragem de Solo

```
keydown (ArrowUp/Down/Left/Right)
  → keyboard.js applyDirectionalInput
  → tractorDomain.inputState
  → tractorDomain.update(deltaMs) [game loop]
    → tractorState.position atualizado
  → missionDomain.updateSampling(deltaMs, timestamp)
    → terrainDomain.resolveCell(position, grid)
    → terrainDomain.resolveTerrainPixel(position, raster)
    → compactionDomain.runCompaction(tractorConfig, snapshot)
    → appendSample → storage.persistMission
```

### Planner (Planejamento de Cobertura)

```
botão "Desenhar Talhão"
  → plannerDomain.startDrawing()
    → paused_tractor = true, mode = "drawing"
  → clicks no mapa → addDraftVertex
  → botão "Fechar Talhão"
    → buildFieldPolygon → buildCoveragePreview
    → mode = "polygon-ready", paused_tractor = false
  → botão "Gerar Plano"
    → buildCoveragePlan → baseline_route + optimized_route
    → renderOverlay (Leaflet layers)
```

## Organização do Código

**Abordagem:** Camadas (core / domains / ui) + separação por responsabilidade

```
prototipo/
├── index.html          → entry point, carrega scripts em ordem, bootstrapLegacyRuntime
├── assets/styles/      → CSS por camada (base, layout, hud, planner)
├── data/               → datasets JS como globals (terrain-grid, bdc-raster, sources)
├── src/
│   ├── core/           → infraestrutura (bootstrap, runtime, keyboard, storage, formatters)
│   ├── domains/        → lógica de negócio (tractor, mission, map, planner, terrain, compaction)
│   └── ui/             → camada de apresentação (hud, panels, dom)
└── main.js             → DOMContentLoaded → app.startApp()
```

**Fronteiras de módulo:** Não há imports. A ordem dos `<script>` no `index.html` define dependências.
