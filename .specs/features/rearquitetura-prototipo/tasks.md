# Rearquitetura do Prototipo Tasks

**Design**: `.specs/features/rearquitetura-prototipo/design.md`
**Status**: Concluido

---

## Execution Plan

### Phase 1: Foundation (Sequential)

Criar a espinha dorsal da nova arquitetura sem alterar comportamento.

```text
T1 → T2 → T3 → T4
```

### Phase 2: Data and Presentation Extraction (Parallel OK)

Depois da base pronta, extrair dados e estilos sem mexer na logica central.

```text
          ┌→ T5 ─┐
T4 complete ┼→ T6 ─┼→ T8
          └→ T7 ─┘
```

### Phase 3: Domain Modularization (Mostly Sequential)

Migrar responsabilidades do runtime atual para modulos pequenos e coesos, preservando fluxo funcional.

```text
T8 → T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 4: Integration and Regression Check (Sequential)

Fechar a migracao e validar os fluxos protegidos pela spec.

```text
T15 → T16 → T17
```

---

## Task Breakdown

### T1: Criar estrutura fisica alvo de `prototipo/`

**What**: Criar diretorios e arquivos vazios/base de `assets/styles`, `src/core`, `src/domains` e `src/ui` conforme o design.
**Where**: `prototipo/`
**Depends on**: None
**Reuses**: `.specs/features/rearquitetura-prototipo/design.md`
**Requirement**: ARQ-PROT-01

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] A arvore base existe conforme o `design.md`
- [x] Nenhum arquivo desnecessario extra foi criado
- [x] A estrutura continua pequena e coerente com o projeto atual

---

### T2: Definir ordem estatica de scripts e assets no `index.html`

**What**: Reorganizar o shell do `index.html` para carregar CSS, Leaflet, datasets e scripts classicos em ordem explicita.
**Where**: `prototipo/index.html`
**Depends on**: T1
**Reuses**: Estrutura atual de `prototipo/index.html`, `design.md` Script Loading Model
**Requirement**: ARQ-PROT-03, ARQ-PROT-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O `index.html` passa a refletir a ordem de carga definida no design
- [x] A arquitetura base nao depende de ES modules, bundler ou `fetch`
- [x] O arquivo continua abrivel por duplo clique no navegador

---

### T3: Criar namespace global unico para a aplicacao

**What**: Definir um objeto raiz global do prototipo para registrar modulos carregados por scripts classicos.
**Where**: `prototipo/src/core/bootstrap.js` ou arquivo base equivalente
**Depends on**: T2
**Reuses**: Script Loading Model do `design.md`
**Requirement**: ARQ-PROT-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe um namespace global unico e explicito para a aplicacao
- [x] Modulos deixam de depender de globais soltas sem dono
- [x] O modelo de carga continua compativel com scripts classicos e `file://`

---

### T4: Criar bootstrap minimo e ponto de entrada real

**What**: Implementar `src/main.js` e `src/core/bootstrap.js` para inicializacao controlada do prototipo.
**Where**: `prototipo/src/main.js`, `prototipo/src/core/bootstrap.js`
**Depends on**: T3
**Reuses**: `initializeRuntime()` e bootstrap atual do `index.html`
**Requirement**: ARQ-PROT-02, ARQ-PROT-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `main.js` apenas dispara o bootstrap
- [x] O bootstrap inicializa dependencias na ordem definida
- [x] O prototipo continua subindo sem comportamento novo introduzido

---

### T5: Externalizar datasets embutidos para `data/*.js` [P]

**What**: Converter os blocos `application/json` embutidos em arquivos declarativos `.js` compatíveis com `file://`.
**Where**: `prototipo/data/terrain-sources.js`, `prototipo/data/terrain-grid.js`, `prototipo/data/terrain-bdc-raster.js`
**Depends on**: T4
**Reuses**: Blocos `terrain-sources-data`, `terrain-grid-data`, `terrain-bdc-raster-data`
**Requirement**: ARQ-PROT-09, ARQ-PROT-10, ARQ-PROT-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Os datasets deixam de ficar embutidos no corpo principal do HTML
- [x] Cada dataset expõe apenas a estrutura declarativa esperada
- [x] O prototipo continua conseguindo acessar os dados sem `fetch`

---

### T6: Extrair estilos inline para CSS externo [P]

**What**: Mover os estilos do `index.html` para poucos arquivos CSS por responsabilidade visual.
**Where**: `prototipo/assets/styles/base.css`, `layout.css`, `hud.css`, `planner.css`, `prototipo/index.html`
**Depends on**: T4
**Reuses**: Bloco `<style>` atual de `prototipo/index.html`
**Requirement**: ARQ-PROT-01

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O CSS inline relevante sai do `index.html`
- [x] Os arquivos de estilo continuam poucos e coesos
- [x] A interface visual permanece equivalente ao estado atual

---

### T7: Centralizar referencias do DOM em `ui/dom.js` [P]

**What**: Reunir todos os `document.getElementById` e referencias de elementos em um modulo unico.
**Where**: `prototipo/src/ui/dom.js`
**Depends on**: T4
**Reuses**: Seletores atuais de `prototipo/index.html`
**Requirement**: ARQ-PROT-15

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe um unico ponto de captura das refs de DOM
- [x] Os modulos de dominio nao dependem de seletores espalhados
- [x] O renderer futuro consegue consumir refs sem repetir lookup

---

### T8: Ajustar leitura de datasets e politica de missao nova

**What**: Adaptar a leitura dos dados externalizados e explicitar a invalidação das missões antigas na nova versão.
**Where**: `prototipo/src/domains/terrain.js`, `prototipo/src/domains/mission.js`, `prototipo/src/core/storage.js`
**Depends on**: T5, T7
**Reuses**: Validacao atual de datasets, `restoreOrCreateMission()`
**Requirement**: ARQ-PROT-05, ARQ-PROT-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O terreno passa a ler dos novos arquivos `data/*.js`
- [x] A missao antiga pode ser descartada intencionalmente nesta nova versao
- [x] O comportamento de restaurar ou recriar missao fica explicito e previsivel

---

### T9: Extrair utilitarios transversais de formatacao e persistencia

**What**: Mover helpers de formatacao e acesso a storage para `core/formatters.js` e `core/storage.js`.
**Where**: `prototipo/src/core/formatters.js`, `prototipo/src/core/storage.js`
**Depends on**: T8
**Reuses**: Helpers atuais de HUD/planner e logica atual de `localStorage`
**Requirement**: ARQ-PROT-01, ARQ-PROT-12

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Formatadores deixam de ficar misturados ao runtime principal
- [x] Persistencia da missao fica encapsulada em um ponto claro
- [x] Nenhum modulo de UI acessa `localStorage` diretamente

---

### T10: Extrair runtime leve para `core/runtime.js`

**What**: Mover o runtime compartilhado atual para um modulo dedicado que coordene os dominios sem manter um store monolitico opaco.
**Where**: `prototipo/src/core/runtime.js`
**Depends on**: T9
**Reuses**: `runtimeState` atual e fluxo de tick/orquestracao do `index.html`
**Requirement**: ARQ-PROT-12, ARQ-PROT-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Existe um `runtime.js` explicito e pequeno
- [x] O estado compartilhado minimo fica centralizado nele
- [x] Dominios passam a depender de um runtime claro, nao de globais dispersas
- [x] O runtime nao volta a virar um novo monolito

---

### T11: Extrair dominio de terreno e compactacao

**What**: Mover resolucao de celula/pixel/snapshot de terreno e motor de compactacao para modulos de dominio dedicados.
**Where**: `prototipo/src/domains/terrain.js`, `prototipo/src/domains/compaction.js`
**Depends on**: T10
**Reuses**: `resolveCell`, `resolveTerrainPixel`, `buildTerrainSnapshot`, `runCompactionMotor()` e helpers associados
**Requirement**: ARQ-PROT-02, ARQ-PROT-08, ARQ-PROT-12, ARQ-PROT-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O terreno atual e o perfil de compactacao deixam de morar no arquivo monolitico
- [x] A logica de compactacao fica fora da UI
- [x] O HUD continua recebendo os mesmos dados essenciais

---

### T12: Extrair dominios de mapa e planner

**What**: Modularizar inicializacao do Leaflet, camera, bases visuais, overlays e coverage planner.
**Where**: `prototipo/src/domains/map.js`, `prototipo/src/domains/planner.js`
**Depends on**: T11
**Reuses**: Inicializacao do mapa, `tileerror`, `coveragePlanner`, desenho do talhao, geracao do plano, controles de visualizacao
**Requirement**: ARQ-PROT-05, ARQ-PROT-07, ARQ-PROT-12, ARQ-PROT-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O mapa Leaflet e suas bases ficam encapsulados
- [x] O planner mantem desenho, geracao, limpeza, zoom, fit e alternancias atuais
- [x] O fluxo de camera e base visual continua equivalente ao estado atual

---

### T13: Extrair dominio de trator e arbitro de teclado

**What**: Separar movimento do trator do fluxo de teclado e criar `core/keyboard.js` como dono unico dos eventos globais.
**Where**: `prototipo/src/domains/tractor.js`, `prototipo/src/core/keyboard.js`, `prototipo/src/ui/debug.js`
**Depends on**: T12
**Reuses**: `inputState`, `updateTractorState()`, `attachKeyboardControls()`, `debugState`
**Requirement**: ARQ-PROT-06, ARQ-PROT-12, ARQ-PROT-14, ARQ-PROT-15

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `core/keyboard.js` concentra `keydown` e `keyup`
- [x] `planner` ja expõe informacao suficiente para bloquear setas no modo desenho
- [x] `tractor` apenas aplica input autorizado
- [x] `debug` alterna visualmente sem registrar listeners globais por conta propria

---

### T14: Extrair dominio de missao

**What**: Isolar ciclo de vida da missao, amostragem, restauracao, limpeza e exportacao em um dominio proprio.
**Where**: `prototipo/src/domains/mission.js`
**Depends on**: T13
**Reuses**: `createMission`, `updateSampling`, `downloadMissionExport`, `buildMissionExport`, `resetMission`
**Requirement**: ARQ-PROT-05, ARQ-PROT-06, ARQ-PROT-12, ARQ-PROT-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Restauracao, limpeza e exportacao da missao ficam em dominio proprio
- [x] O dominio de missao integra terreno, trator, compactacao e storage sem acoplamento opaco
- [x] A invalidacao intencional de missoes antigas fica implementada de forma previsivel

---

### T15: Extrair renderers de UI para HUD, paineis e debug

**What**: Separar renderizacao de HUD, paineis e debug da regra de negocio, consumindo refs e view models.
**Where**: `prototipo/src/ui/hud.js`, `prototipo/src/ui/panels.js`, `prototipo/src/ui/debug.js`
**Depends on**: T14
**Reuses**: `renderHud`, `renderDebug`, renderizacao atual de painéis e listeners existentes
**Requirement**: ARQ-PROT-05, ARQ-PROT-06, ARQ-PROT-15

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] HUD e paineis apenas renderizam dados e disparam acoes
- [x] O debug overlay continua funcional com a nova divisao
- [x] Arquivos de UI nao concentram calculos de dominio relevantes

---

### T16: Remover a logica restante do `index.html` e consolidar integracao

**What**: Eliminar do `index.html` a logica inline que ja estiver migrada, mantendo-o como shell e ponto de carga.
**Where**: `prototipo/index.html`
**Depends on**: T15
**Reuses**: Shell atual, ordem de carga definida, modulos implementados
**Requirement**: ARQ-PROT-01, ARQ-PROT-02, ARQ-PROT-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O `index.html` deixa de concentrar a maior parte da logica
- [x] O shell continua com markup e inclusoes necessarias
- [x] O prototipo inicializa integralmente a partir dos arquivos extraidos

---

### T17: Validar fluxos criticos e registrar fechamento da rearquitetura

**What**: Executar validacao manual/estrutural dos fluxos protegidos pela spec e registrar o fechamento tecnico da rearquitetura.
**Where**: `prototipo/index.html`, `.specs/features/rearquitetura-prototipo/`
**Depends on**: T16
**Reuses**: Critérios de aceitação do `spec.md`, fluxo atual documentado nas sprints
**Requirement**: ARQ-PROT-05, ARQ-PROT-06, ARQ-PROT-07, ARQ-PROT-08, ARQ-PROT-16

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O prototipo abre por duplo clique e sobe sem dependencias extras
- [x] Os fluxos de trator, debug, missao, planner, base visual e compactacao continuam operacionais
- [x] A rearquitetura fica documentada como concluida sem over-engineering

---

## Parallel Execution Map

```text
Phase 1 (Sequential)
  T1 → T2 → T3 → T4

Phase 2 (Parallel)
  T4 complete, then:
    ├── T5 [P]
    ├── T6 [P]
    └── T7 [P]
  T5 + T7 → T8

Phase 3 (Sequential by risk control)
  T8 → T9 → T10 → T11 → T12 → T13 → T14

Phase 4 (Sequential)
  T15 → T16 → T17
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Criar estrutura fisica alvo | 1 deliverable estrutural | ✅ Granular |
| T2: Definir ordem estatica de scripts | 1 arquivo + 1 conceito | ✅ Granular |
| T5: Externalizar datasets | 1 responsabilidade coerente | ✅ Granular |
| T10: Extrair runtime leve | 1 responsabilidade arquitetural central | ✅ Granular |
| T11: Extrair terreno e compactacao | 2 responsabilidades fortemente acopladas | ⚠️ Aceitavel |
| T12: Extrair mapa e planner | 2 responsabilidades integradas no fluxo atual | ⚠️ Aceitavel |
| T17: Validar fluxos criticos | 1 etapa de verificacao final | ✅ Granular |

**Granularity note**:

- T11 e T12 foram mantidas levemente maiores porque separar ainda mais criaria tarefas artificiais e aumentaria risco de fragmentacao excessiva para este projeto.

---

## Tooling Note for Execution

Antes de executar as tasks, a implementacao deve privilegiar:

- ferramentas locais de edicao e inspecao do repositorio;
- verificacao estrutural e manual no navegador;
- nenhuma dependencia de servidor, bundler ou tooling de build.

Se durante a execucao surgir necessidade de validacao interativa mais forte no browser, o skill mais natural e `playwright-skill`, mas ele nao e requisito para esta fase de planejamento.

---

## Commit Strategy

- T1-T4: `refactor(prototipo): prepare static modular bootstrap`
- T5-T8: `refactor(prototipo): externalize datasets and extraction base`
- T9-T14: `refactor(prototipo): split runtime into domain modules`
- T15-T17: `refactor(prototipo): finalize shell migration and validate flows`

---

## Conclusion

**Status**: Concluido

As tasks foram executadas integralmente e o fechamento tecnico da rearquitetura esta documentado em `.specs/features/rearquitetura-prototipo/closure.md`.
