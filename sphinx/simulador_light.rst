Simulador Light (Cópia Simplificada)
====================================

Objetivo
--------

Entregar uma interface direta, no estilo "Light", para discussão rápida com a equipe técnica:

- controles de entrada operacionais;
- cálculo transparente de ``soil stress`` e ``soil strength`` a 35 cm;
- gráfico de decisão com zonas verde/amarela/vermelha.

Importante
----------

Esta página é um **protótipo aberto não oficial** (inspirado no fluxo da versão Light).
Não replica o algoritmo proprietário do Terranimo.

Acessar simulador
-----------------

.. raw:: html

   <p><a href="_static/apps/simulador_light_prototipo.html" target="_blank" rel="noopener"><strong>Abrir em nova aba</strong></a></p>
   <iframe
     src="_static/apps/simulador_light_prototipo.html"
     style="width: 100%; height: 980px; border: 1px solid #c6ced8; border-radius: 8px;"
     loading="lazy">
   </iframe>

Como interpretar
----------------

- ``Soil stress``: estimativa da tensão transmitida ao solo na camada de referência (35 cm).
- ``Soil strength``: estimativa simplificada da resistência do solo nessa camada.
- Se ``soil strength`` cair abaixo de ``soil stress``, o risco de compactação cresce.
- O gráfico usa três faixas:

  - verde: sem risco relevante,
  - amarelo: risco considerável,
  - vermelho: alto risco de compactação subsuperficial.

Modelo matemático (simplificado)
--------------------------------

No código da página HTML:

- ``soil_stress_bar`` cresce com carga por roda e pressão do pneu;
- ``soil_strength_bar`` cresce com potencial matricial (sucção), teor de argila e SWRI;
- classificação por razão entre força e tensão:

  - verde se ``strength >= 1.3 * stress``;
  - amarelo se ``0.8 * stress <= strength < 1.3 * stress``;
  - vermelho se ``strength < 0.8 * stress``.

Próximo refinamento
-------------------

Substituir as equações heurísticas por funções calibradas com:

- ensaios de campo/laboratório (cone index, densidade, umidade/sucção);
- parâmetros de natureza e de estado dos solos brasileiros (granulometria, limites de Atterberg, índice L, índice de vazios, grau de saturação).
