Simulador de Dominio GPU para Passagem de Rodado
================================================

Objetivo
--------

Esta página publica um protótipo interativo para passagem de roda/esteira sobre um domínio
volumétrico voxelizado com atualização em GPU.

O cenário inicial usa **5 m x 1 m x 1 m**, porque um domínio de apenas `1 m³` ficou curto para
representar o deslocamento longitudinal do contato na superfície.

Escopo do v1
------------

- foco em **compactação mecânica**;
- grade **voxel contínua** em vez de solver FEM clássico;
- dimensões configuráveis com default `5 x 1 x 1`;
- trajetória **reta programada** na superfície;
- exportação de snapshots, séries e imagens;
- guard explícito contra estouro do orçamento de buffer da GPU.

Acessar o simulador
-------------------

.. raw:: html

   <p><a href="prototipo/simulador_caixa_gpu/index.html" target="_blank" rel="noopener"><strong>Abrir simulador em nova aba</strong></a></p>
   <iframe
     src="prototipo/simulador_caixa_gpu/index.html"
     style="width: 100%; height: 1640px; border: 1px solid #c6ced8; border-radius: 10px;"
     loading="lazy">
   </iframe>

Compatibilidade
---------------

- Requer ``HTTPS`` e suporte a ``WebGPU``.
- O alvo do v1 é desktop em navegadores modernos, tipicamente Chrome ou Edge recentes.
- Configurações que excedam o orçamento do dispositivo são recusadas com mensagem clara.

Leitura rápida da interface
---------------------------

- **Domínio**: controla comprimento, largura, profundidade, resolução e posição dos slices.
- **Carga**: define roda/esteira, massa, footprint, velocidade e número de passadas.
- **Camadas**: inicializa o solo com até ``3`` horizontes materializados por preset.
- **Slices**: mostram a evolução local da compactação.
- **Visão 3D resumida**: exibe uma projeção volumétrica desacoplada da amostragem principal.

Limites conhecidos
------------------

- O modelo do v1 não implementa dissolução, transporte reativo nem FEM clássico completo.
- A visão 3D é uma projeção resumida em ``canvas 2D`` baseada em readback periódico do estado volumétrico.
- Gravação contínua de vídeo fica para a próxima fase; o v1 exporta snapshots e PNGs.
