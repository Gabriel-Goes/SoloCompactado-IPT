Análise Técnica do Terranimo (Light + Expert)
==============================================

Objetivo
--------

Registrar a engenharia reversa do material salvo em ``terranimo/`` para orientar
um protótipo nacional focado em solos brasileiros.

Escopo analisado
----------------

- ``terranimo/expert-en/Terranimo Expert - Terranimo_files/expert.js``
- ``terranimo/complete/Terranimo Light - Terranimo_files/light.js``
- ``terranimo/complete/Terranimo Light - Terranimo.mhtml``
- ``terranimo/expert-en/Terranimo Expert - Terranimo.html``

O que o front-end faz (e o que não faz)
---------------------------------------

Pelo código JavaScript salvo, o front-end:

1. Renderiza UI (sliders, abas, nomogramas, cenários).
2. Envia parâmetros para endpoints HTTP.
3. Recebe resultados do backend e atualiza gráficos/indicadores.

Conclusão importante:

- O cálculo físico principal não está no JavaScript salvo; ele roda no backend.

Evidências de endpoints
-----------------------

No arquivo ``expert.js`` aparecem chamadas para:

- ``POST /update-data`` (atualização geral de estado da simulação),
- ``GET /calculate-light`` (cálculo modo Light),
- ``GET /calculate-light-for-scenario`` (cálculo por cenário pré-definido),
- carregamento dinâmico de fragmentos:
  - ``./update-control-panel-content/{action}``
  - ``./update-content-area-content/{action}``

No modo Light também aparece:

- ``/load-and-pressure-working-step/{id}`` para carregar passos de cenário.

Entradas e saídas inferidas do modo Light
-----------------------------------------

No ``Terranimo Light - Terranimo.mhtml`` foram identificados 4 controles principais:

1. Carga na roda (``tyre-selected-load``): faixa 1000–12000 kg.
2. Pressão do pneu (``tyre-selected-pressure``): faixa 5–72 psi.
3. Teor de argila (``clay-selected-content``): faixa 5–40 %.
4. Sucção matricial do solo (``soil-selected-suction``): faixa 0–60 cbar.

Saídas retornadas pelo backend (consumidas no front):

- ``bodenbelastung``: tensão no solo (soil stress),
- ``bodenfestigkeit``: resistência do solo (soil strength),
- ``resultat``: classe de risco (0/1/2),
- ``infoText``: texto explicativo.

Observação:

- O modo Light usa nomogramas com referência explícita a 35 cm de profundidade no texto dos diagramas.

Entradas inferidas do modo Expert
---------------------------------

No ``expert.js`` e no HTML do Expert:

- Navegação por blocos: veículo, pneu, solo, umidade, resultados.
- Atualização de qualquer parâmetro via ``identifier`` + ``value`` para ``/update-data``.
- Configuração manual de solo por camadas com passo de 10 cm (rotina percorre linhas 1..10).
- Validação de textura por camada: soma de frações = 100%.

Campos de solo manual detectados no JS:

- ``clay_``, ``silt_``, ``sand_``, ``organicmatter_``, ``bulkdensity_``, ``mjaela_``, ``finmo_``, ``grovmo_``.

Arquitetura inferida (Terranimo)
--------------------------------

1. Front-end web orientado a estado de sessão.
2. Backend com motor de cálculo e regras de negócio.
3. Endpoints finos para recalcular após cada ajuste.
4. Diagramas/indicadores como camada de visualização.

Como reproduzir no protótipo brasileiro
---------------------------------------

Proposta de equivalência mínima:

1. ``/calculate-light-br``: mesma lógica de UX do Light, com entradas brasileiras.
2. ``/update-data-br``: atualização incremental de estado para modo Expert.
3. Motor físico único:
   - tensão induzida por roda/eixo (contato + profundidade),
   - resistência do solo por camada,
   - risco por camada :math:`R_k = \sigma_{z,k}/\sigma_{crit,k}`.
4. Saída operacional:
   - classe de risco (verde/amarelo/vermelho),
   - perfil por profundidade,
   - recomendação de ajuste (pressão de pneu, carga, passadas).

Adaptação para solos brasileiros (núcleo)
-----------------------------------------

Além de umidade, incluir:

- natureza do solo: granulometria + Atterberg + índice L (laterítico/não laterítico),
- estado: índice de vazios/densidade e grau de saturação,
- classe de manejo/estrutura (quando disponível).

Risco de interpretação e limite da análise
------------------------------------------

Como o backend original não está no repositório, esta análise descreve:

- fluxo de dados,
- entradas/saídas e regras de interface,
- arquitetura de simulação.

As equações proprietárias exatas do Terranimo não são observáveis no material salvo.
