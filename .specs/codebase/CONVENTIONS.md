# Code Conventions

## Convenções de Nomes

**Arquivos:**
- kebab-case para todos os arquivos JS e CSS
- Exemplos: `tractor.js`, `terrain.js`, `base.css`, `hud.css`

**Funções:**
- camelCase para funções internas
- Prefixo `create` para factories: `createTractorDomain`, `createRuntime`, `createMissionDomain`
- Prefixo `build` para construtores de dados: `buildFieldPolygon`, `buildCoveragePlan`, `buildMissionExport`
- Prefixo `calc` para cálculos: `calcContactStress`, `calcSigmaP`, `calcDeformation`

**Variáveis:**
- camelCase: `tractorState`, `plannerView`, `runtimeState`
- snake_case somente em objetos de dados/persistência: `mission.current_cell_id`, `tractorConfig.wheel_load`

**Constantes:**
- UPPER_SNAKE_CASE para constantes de módulo: `COMPACTION_DEPTH_RANGES`, `BDC_THEMATIC_COLORS`, `BDC_SOIL_LOOKUP`

## Organização de Código

**Estrutura de um módulo domain:**
```js
(function (global) {
  var app = global.SoloCompactado;
  var CONSTANTES = { ... };         // 1. constantes do módulo
  var activeDomain = null;          // 2. singleton ativo (quando aplicável)

  function helperPuro(...) { ... }  // 3. funções puras / auxiliares
  function createXxxDomain(config) { // 4. factory principal
    // funções privadas
    function doSomething() { ... }
    // retorna API pública
    activeDomain = { doSomething, ... };
    return activeDomain;
  }

  app.registerModule("domains", "xxx", { // 5. registro do módulo
    createXxxDomain: createXxxDomain,
    getActiveDomain: function() { return activeDomain; }
  });
})(window);
```

**Ordem de declarações dentro de módulos:**
1. `var app = global.SoloCompactado`
2. Constantes de módulo (UPPER_SNAKE_CASE)
3. Variável do singleton ativo
4. Funções helper puras (sem acesso ao `global`)
5. Factory function principal
6. `app.registerModule(...)`

## Tipagem / Documentação

Sem JSDoc. Nomes descritivos substituem comentários. Sem TypeScript.

## Tratamento de Erros

```js
try {
  resultado = config.buildCoveragePlan(...);
  runtime.coveragePlanner.status_message = "...";
} catch (error) {
  console.error("[contexto]", error);
  runtime.coveragePlanner.status_message = error.message;
}
```

Erros de domínio são capturados com `try/catch` e surfacados via `status_message` no HUD.
Funções que podem falhar retornam `null` em vez de lançar (ex: `resolveCell`, `resolveTerrainPixel`).

## Comentários

Raramente usados. Apenas em casos não-óbvios (ex: fallback matemático em `calcDeformation`).
IDs de elementos DOM são literais de string: `byId("mission-export")`.

## ES5

Todo código usa `var` (sem `let`/`const`), `function` declaration/expression (sem arrow functions), sem template literals, sem destructuring, sem classes. Isso é intencional para compatibilidade com embarcados.
