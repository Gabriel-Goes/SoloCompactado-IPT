# Design - Simulador de Dominio GPU para Passagem de Rodado

**Spec**: `.specs/features/simulador-caixa-webgpu/spec.md`
**Status**: Implemented

## Arquitetura

O simulador é um app isolado, sem bundler, com `ES modules` nativos:

```text
prototipo/simulador_caixa_gpu/
├── index.html
├── assets/app.css
└── src/
    ├── config.mjs
    ├── renderer.mjs
    ├── simulation.mjs
    └── main.mjs
```

Ele não depende do namespace `window.SoloCompactado` do protótipo navegável atual.

## Fluxo de Dados

```text
UI controls
  -> main.mjs coleta configuração
  -> SimulationEngine valida orçamento do dispositivo
  -> WebGPU compute inicializa e atualiza voxel state
  -> sample pass produz slices XY/XZ/YZ
  -> readback assíncrono alimenta renderer
  -> renderer desenha heatmaps e visão 3D resumida
  -> timeline local acumula métricas para export
```

## Modelo Numérico do V1

### Domínio

- grade regular de voxels;
- dimensões configuráveis com default `5 m x 1 m x 1 m`;
- camadas definidas por profundidade normalizada.

### Estado por voxel

- `density`
- `porosity`
- `moisture`
- `compaction_index`
- `plastic_strain`
- `vertical_stress`

### Carga móvel

- trajetória retilínea ao longo de `x`;
- centro lateral fixo em `y = width / 2`;
- modos:
  - `wheel`: footprint elíptico;
  - `track`: footprint retangular suavizado.

### Atualização física

Cada step estima:

1. footprint relativo do voxel à carga atual;
2. atenuação lateral e com profundidade;
3. tensão aplicada local;
4. sobrecarga em relação ao `yield_kpa` da camada;
5. incremento de compactação dependente de sobrecarga, umidade, hardening e capacidade residual.

O v1 não implementa FEM clássico: usa voxel contínuo com atualização local em GPU.

## Estratégia de Renderização

- Slices:
  - compute shader gera buffers pequenos para `XY`, `XZ`, `YZ`;
  - CPU lê esses buffers e renderiza heatmaps em `canvas 2D`.
- Visão 3D:
  - CPU faz readback eventual do state buffer completo;
  - downsample e projeta pontos em perspectiva isométrica em `canvas 2D`;
  - a visão 3D atualiza mais lentamente que os slices.

## Guard de Memória

- Antes de alocar buffers, o engine calcula o tamanho do estado volumétrico.
- Se `stateBytes` exceder `maxStorageBufferBindingSize` ou `maxBufferSize`, a configuração é recusada.
- Isso protege o cenário default `5 x 1 x 1` contra presets finos demais em GPUs que não comportem o volume.

## Publicação

- `pages.yml` já copia `prototipo/` para o site final.
- A documentação Sphinx referencia o app por `prototipo/simulador_caixa_gpu/index.html`.
