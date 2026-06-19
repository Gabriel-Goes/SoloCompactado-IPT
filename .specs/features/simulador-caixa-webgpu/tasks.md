# Simulador de Dominio GPU para Passagem de Rodado Tasks

**Design**: `.specs/features/simulador-caixa-webgpu/design.md`
**Status**: Done

## Execution Plan

`T1 -> T2 -> T3 -> T4`

## Task Breakdown

### T1: Formalizar spec, design e execução

**What**: Registrar contratos, limites e arquitetura da feature no padrão `.specs/`.
**Where**: `.specs/features/simulador-caixa-webgpu/`
**Depends on**: None
**Tests**: none
**Gate**: build
**Status**: Done

### T2: Implementar motor WebGPU e guard de orçamento

**What**: Criar o núcleo de simulação voxelizada com compute shaders, init pass, update pass, sample pass e validação de limites do dispositivo.
**Where**: `prototipo/simulador_caixa_gpu/src/simulation.mjs`
**Depends on**: T1
**Tests**: none
**Gate**: build
**Status**: Done

### T3: Implementar UI, renderização e exportação

**What**: Criar interface do app, heatmaps de slice, visão 3D resumida, timeline e exportação local.
**Where**:
- `prototipo/simulador_caixa_gpu/index.html`
- `prototipo/simulador_caixa_gpu/assets/app.css`
- `prototipo/simulador_caixa_gpu/src/{config,renderer,main}.mjs`
**Depends on**: T2
**Tests**: none
**Gate**: build
**Status**: Done

### T4: Documentar e publicar no site

**What**: Adicionar a página Sphinx e atualizar índice/README.
**Where**:
- `sphinx/simulador_caixa_gpu.rst`
- `sphinx/index.rst`
- `README.md`
**Depends on**: T3
**Tests**: none
**Gate**: build
**Status**: Done
