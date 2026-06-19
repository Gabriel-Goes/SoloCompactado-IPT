# Spec - Simulador de Dominio GPU para Passagem de Rodado

**Status**: Implemented

## Problema

O repositório já possui um protótipo web navegável e protótipos Python de compactação
em profundidade, mas ainda falta um simulador interativo no navegador para estudar a
passagem de roda/esteira sobre um volume de solo com atualização em GPU.

Uma caixa cúbica de `1 m³` é útil para prova de conceito local, porém curta para representar
o deslocamento longitudinal do contato de um trator. O v1 precisa de um domínio mais longo.

## Objetivo

Entregar um app web paralelo, publicado junto do site existente, que:

1. simule compactação mecânica em um domínio **default** de `5 m x 1 m x 1 m`;
2. use `WebGPU` para atualizar um campo voxelizado contínuo;
3. permita ajustar dimensões, resolução, camadas de material e cenário de carga;
4. visualize slices ortogonais e uma visão 3D resumida;
5. exporte configuração, séries temporais, snapshot binário e imagens.

## Requisitos Funcionais

### RF-01 - Bootstrap e compatibilidade

- O sistema SHALL ser publicado como app isolado em `prototipo/simulador_caixa_gpu/`.
- O sistema SHALL detectar ausência de `WebGPU` e exibir mensagem clara de incompatibilidade.
- O sistema SHALL validar a configuração contra os limites do dispositivo e recusar volumes
  que excedam o orçamento de buffer.

### RF-02 - Domínio e resolução

- O sistema SHALL permitir configurar:
  - comprimento
  - largura
  - profundidade
- O cenário inicial SHALL usar `5 m x 1 m x 1 m`.
- O sistema SHALL expor presets de resolução por lado do voxel:
  - `10 cm`
  - `5 cm`
  - `2 cm`
  - `1 cm`
- O sistema SHALL exibir a contagem de voxels derivada da configuração atual.

### RF-03 - Estado material

- O sistema SHALL manter, por voxel, ao menos os campos:
  - densidade
  - porosidade
  - umidade
  - índice de compactação
  - deformação plástica acumulada
  - tensão vertical aplicada

### RF-04 - Estratigrafia inicial

- O sistema SHALL permitir inicializar o volume com até `3` camadas.
- Cada camada SHALL ser escolhida por preset de material.
- O sistema SHALL normalizar as espessuras informadas para preencher toda a profundidade.

### RF-05 - Cenário de carga

- O sistema SHALL suportar modo `wheel` e `track`.
- O sistema SHALL aplicar uma carga móvel programada na superfície superior do domínio.
- O sistema SHALL começar com trajetória retilínea programada ao longo de `x`.
- O sistema SHALL expor massa, footprint, velocidade e número de passadas.

### RF-06 - Visualização

- O sistema SHALL renderizar slices:
  - `XY`
  - `XZ`
  - `YZ`
- O sistema SHALL permitir ajustar a posição dos slices.
- O sistema SHALL renderizar uma visão 3D resumida do volume.
- O sistema SHALL atualizar os slices com maior frequência que a visão 3D resumida.

### RF-07 - Telemetria local e exportação

- O sistema SHALL manter histórico temporal mínimo para exportação.
- O sistema SHALL exportar:
  - `config.json`
  - `timeline.csv`
  - `snapshot-meta.json`
  - `snapshot-state.bin`
  - imagens PNG das vistas atuais

### RF-08 - Documentação

- O sistema SHALL ser documentado no Sphinx.
- O sistema SHALL ser acessível por URL publicada no GitHub Pages.

## Requisitos Não Funcionais

1. O v1 SHALL mirar `15 FPS` mínimos em configurações suportadas pelo dispositivo.
2. O app SHALL evitar bundler ou framework.
3. O app SHALL coexistir com o protótipo ES5 atual sem alterar seu bootstrap.

## Fora de Escopo

- solver FEM clássico completo;
- fallback CPU/WebGL completo;
- partículas móveis tipo DEM/SPH;
- dissolução, transporte reativo ou multifísica acoplada;
- gravação contínua de vídeo;
- trajetória desenhável no canvas.

## Critérios de Aceitação

1. O app abre em URL dedicada dentro de `prototipo/`.
2. Em browser sem `WebGPU`, a interface informa claramente o bloqueio.
3. Em browser com `WebGPU`, o usuário consegue:
   - iniciar, pausar e resetar a simulação;
   - trocar dimensões, resolução, camadas e carga;
   - ver `3` slices e uma visão 3D resumida;
   - exportar artefatos locais.
4. Configurações que excedam o orçamento de buffer do dispositivo são rejeitadas com mensagem clara.
5. A documentação Sphinx inclui página dedicada com link/embed do app.
