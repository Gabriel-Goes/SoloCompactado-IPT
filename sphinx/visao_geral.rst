Visão Geral do Problema
=======================

Contexto
--------

No tráfego controlado agrícola, máquinas pesadas percorrem repetidamente as mesmas faixas com precisão centimétrica (RTK). O efeito cumulativo dessas passadas tende a aumentar a compactação, principalmente nas camadas superficiais e subsuperficiais.

Objetivo do protótipo
---------------------

O protótipo simula, em um único ponto da trilha:

- evolução do sulco residual ao longo das passadas,
- evolução do índice de compactação na coluna de solo (0 a 10 m, configurável),
- leituras sintéticas de sensores virtuais (cone index e densidade aparente).

Escopo técnico atual
--------------------

- Modelo 1D em profundidade (ponto único).
- Carregamento repetitivo por roda equivalente.
- Relação pressão-afundamento para o contato pneu-solo.
- Propagação simplificada de tensões com decaimento em profundidade.

O que ainda não está no escopo
------------------------------

- Modelagem espacial 2D da trilha completa.
- Calibração com dados reais de campo por tipo de solo e umidade.
- Modelagem detalhada de tração/slip e efeitos dinâmicos.
