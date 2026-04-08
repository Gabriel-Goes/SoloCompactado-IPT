# Concerns

## [ALTO] Sem isolamento de estado entre sessões de teste

**Evidência:** `mission.js` persiste no `localStorage` e restaura na inicialização.
**Risco:** Durante desenvolvimento, estado corrompido ou de sprint anterior pode ser restaurado silenciosamente.
**Fix:** Adicionar flag de versão de dev que força reset, ou expor botão de reset no debug overlay.

## [ALTO] Ordem de `<script>` no index.html é a única garantia de dependência

**Evidência:** Não há bundler, import statements ou verificação de módulo carregado.
**Risco:** Se um `<script>` falhar silenciosamente (arquivo não encontrado, erro de parse), módulos dependentes quebram com mensagens crípticas.
**Fix:** A curto prazo: adicionar guard no `bootstrapLegacyRuntime` verificando módulos obrigatórios. A longo prazo: migrar para ES modules nativos.

## [MÉDIO] `bootstrapLegacyRuntime` vive no index.html

**Evidência:** A maior parte da lógica de inicialização (wiring de domains, game loop, event handlers do mapa) está inlined no HTML, não em um arquivo JS separado.
**Risco:** Dificulta leitura, busca e testes da lógica de bootstrap.
**Fix:** Extrair para `src/core/app.js` ou similar.

## [MÉDIO] ES5 obrigatório limita expressividade

**Evidência:** Sem `let`, `const`, arrow functions, template literals, destructuring.
**Risco:** Código mais verboso; erros de `var` hoisting difíceis de debugar.
**Contexto:** Decisão intencional para compatibilidade com embarcados. Manter enquanto o target for embarcado.

## [MÉDIO] Motor de compactação usa dados hardcoded em templates

**Evidência:** `compaction.js:11` — `COMPACTION_PROFILE_TEMPLATES` com deltas fixos por classe temática.
**Risco:** Valores físicos não derivados de PTFs reais; adequados para protótipo mas não para produção.
**Fix:** Substituir por cálculo via PTFs calibradas (em desenvolvimento no `src/` Python).

## [BAIXO] Sem tratamento de resize/orientação

**Evidência:** `map.invalidateSize()` existe mas não há listener de `resize`.
**Risco:** Mapa pode ficar desalinhado se a janela for redimensionada.
**Fix:** `window.addEventListener("resize", mapDomain.invalidateSize)` no bootstrap.

## [BAIXO] Exportação de missão inclui todos os samples em memória

**Evidência:** `mission.js:343` — `samples` é array que cresce ilimitadamente.
**Risco:** Para missões longas (muitas horas), o JSON pode ficar grande demais para `localStorage` ou download.
**Fix:** Adicionar paginação ou limite de samples, ou mover para IndexedDB.

## [INFO] Fazenda Paladino hardcoded

**Evidência:** `terrain.js:71` — validação checa `farmId === "fazenda-paladino"`.
**Risco:** Para usar outra fazenda, é preciso alterar a validação e carregar novo dataset.
**Contexto:** Intencional na fase de protótipo. A generalização é parte do roadmap.
