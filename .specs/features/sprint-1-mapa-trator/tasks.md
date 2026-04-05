# Sprint 1: Mapa Satelital com Trator Navegavel Tasks

**Design**: [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-1-mapa-trator/design.md)  
**Status**: Draft

---

## Execution Plan

### Phase 1: Foundation (Sequential)

T1 -> T2 -> T3

### Phase 2: Core Implementation (Parallel OK)

Depois de T3:

- T4 [P]
- T5 [P]
- T6 [P]

### Phase 3: Integration (Sequential)

T7 -> T8 -> T9

---

## Task Breakdown

### T1: Criar o shell base do HTML

**What**: Criar [index.html](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/index.html) com estrutura minima da pagina, containers `#app`, `#map`, `#tractor-overlay` e `#debug-overlay`.
**Where**: `prototipo/index.html`
**Depends on**: None
**Reuses**: [sprint-1-mapa-trator.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/prototipo/sprint-1-mapa-trator.md), [spec.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-1-mapa-trator/spec.md)
**Requirement**: S1MAP-01, S1MAP-06, S1MAP-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O arquivo `prototipo/index.html` existe
- [ ] A pagina possui os containers previstos no design
- [ ] A abertura do arquivo nao depende de build nem backend

**Commit**: `feat(prototipo): cria shell base do index da sprint 1`

---

### T2: Integrar Leaflet e inicializacao do mapa

**What**: Adicionar `Leaflet` via CDN e inicializar o mapa na Fazenda Paladino com `zoom` `17`.
**Where**: `prototipo/index.html`
**Depends on**: T1
**Reuses**: padrao definido em [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-1-mapa-trator/design.md)
**Requirement**: S1MAP-02, S1MAP-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `Leaflet CSS` e `Leaflet JS` sao carregados no HTML
- [ ] O mapa inicia em `[-13.098074, -45.846229]`
- [ ] O `zoom` inicial e `17`

**Commit**: `feat(prototipo): inicializa leaflet na fazenda paladino`

---

### T3: Configurar camada satelital e estado de erro

**What**: Configurar `Esri World Imagery` como camada principal e exibir erro diagnostico visivel se a camada falhar.
**Where**: `prototipo/index.html`
**Depends on**: T2
**Reuses**: estrategia de erro em [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-1-mapa-trator/design.md)
**Requirement**: S1MAP-04, S1MAP-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O mapa usa `Esri World Imagery`
- [ ] A falha de carregamento do mapa produz mensagem visivel
- [ ] Nao existe fallback automatico para outro provedor

**Commit**: `feat(prototipo): adiciona camada satelital e erro visivel`

---

### T4: Implementar o overlay central do trator [P]

**What**: Criar o elemento visual do trator centralizado e preparar rotacao via CSS/JS.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: definicao de overlay em [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-1-mapa-trator/design.md)
**Requirement**: S1MAP-06, S1MAP-12, S1MAP-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O trator aparece fixo no centro da viewport
- [ ] O mapa pode se mover sem deslocar o overlay
- [ ] A rotacao do overlay pode ser atualizada por `heading`

**Commit**: `feat(prototipo): adiciona overlay central do trator`

---

### T5: Implementar captura de teclado e estado de debug [P]

**What**: Capturar `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` e `D`, mantendo estado de teclas e alternancia de debug.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: `Input Controller` definido em [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-1-mapa-trator/design.md)
**Requirement**: S1MAP-07, S1MAP-08, S1MAP-09, S1MAP-16, S1MAP-18

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] As teclas direcionais atualizam estado interno de input
- [ ] A tecla `D` alterna um estado booleano de debug
- [ ] O sistema recupera controle apos clique se o foco do teclado se perder

**Commit**: `feat(prototipo): captura teclado e alterna debug`

---

### T6: Implementar estado do trator e motor de movimento [P]

**What**: Criar `TractorState` e atualizar posicao, velocidade, heading e freio sem re.
**Where**: `prototipo/index.html`
**Depends on**: T3
**Reuses**: `Movement Engine` definido em [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-1-mapa-trator/design.md)
**Requirement**: S1MAP-07, S1MAP-08, S1MAP-09, S1MAP-15

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `ArrowUp` acelera o trator
- [ ] `ArrowLeft` e `ArrowRight` alteram o `heading`
- [ ] `ArrowDown` reduz a velocidade ate `0`
- [ ] O estado nunca entra em velocidade negativa

**Commit**: `feat(prototipo): implementa estado e movimento do trator`

---

### T7: Integrar loop de animacao e recenter da camera

**What**: Conectar input, movimento, camera e overlay dentro de um loop com `requestAnimationFrame`.
**Where**: `prototipo/index.html`
**Depends on**: T4, T5, T6
**Reuses**: `Frame Loop` e `Map Bootstrap` do [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-1-mapa-trator/design.md)
**Requirement**: S1MAP-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O mapa recentra continuamente conforme a posicao logica do trator
- [ ] O overlay do trator permanece fixo no centro
- [ ] O movimento e atualizado por `requestAnimationFrame`

**Commit**: `feat(prototipo): integra loop de animacao e camera`

---

### T8: Implementar painel de debug visual

**What**: Exibir e ocultar painel de debug com coordenadas e `heading`.
**Where**: `prototipo/index.html`
**Depends on**: T5, T7
**Reuses**: `DebugState` e `Overlay Renderer` do [design.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-1-mapa-trator/design.md)
**Requirement**: S1MAP-16, S1MAP-17, S1MAP-18

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O painel nasce oculto por padrao
- [ ] A tecla `D` exibe e oculta o debug
- [ ] O painel mostra pelo menos coordenadas atuais e `heading`

**Commit**: `feat(prototipo): adiciona painel de debug`

---

### T9: Refinar UX visual e validar criterios da sprint

**What**: Ajustar aparencia tipo app de mapa, remover conflitos de controles nativos do `Leaflet` e validar os criterios de aceitacao da sprint.
**Where**: `prototipo/index.html`
**Depends on**: T7, T8
**Reuses**: criterios de [spec.md](/Users/wiser/projects/gabrielgoes/SoloCompactado-IPT/.specs/features/sprint-1-mapa-trator/spec.md)
**Requirement**: S1MAP-11, S1MAP-12, S1MAP-13, S1MAP-14

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Scroll zoom, drag manual e teclado nativo do `Leaflet` nao interferem na demo
- [ ] A composicao visual remete a app de mapa
- [ ] A sprint pode ser verificada manualmente contra todos os criterios de sucesso

**Commit**: `feat(prototipo): finaliza ux e validacao da sprint 1`

---

## Parallel Execution Map

```text
Phase 1 (Sequential):
  T1 -> T2 -> T3

Phase 2 (Parallel):
  T3 complete, then:
    -> T4 [P]
    -> T5 [P]
    -> T6 [P]

Phase 3 (Sequential):
  T4, T5, T6 complete, then:
    T7 -> T8 -> T9
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: Criar o shell base do HTML | 1 arquivo / 1 estrutura | Granular |
| T2: Integrar Leaflet e inicializacao do mapa | 1 integracao | Granular |
| T3: Configurar camada satelital e erro | 1 responsabilidade | Granular |
| T4: Implementar o overlay central do trator | 1 componente visual | Granular |
| T5: Implementar captura de teclado e estado de debug | 1 controlador coeso | Aceitavel |
| T6: Implementar estado do trator e motor de movimento | 1 motor coeso | Aceitavel |
| T7: Integrar loop de animacao e recenter da camera | 1 integracao | Granular |
| T8: Implementar painel de debug visual | 1 componente visual | Granular |
| T9: Refinar UX visual e validar criterios da sprint | 1 fase de acabamento | Aceitavel |

---

## Tooling Note

Para esta sprint, o caminho mais direto de execucao e:

- MCPs: nenhum obrigatorio
- Skills: `tlc-spec-driven`

Se quisermos validar visualmente a navegacao no navegador durante a execucao, o proximo passo pode usar `playwright-skill`.
