Glossário de Termos
===================

Esta página reúne os termos usados nos gráficos e tabelas do protótipo, com foco em interpretação geotécnica.

Mapeamento rápido (gráficos)
----------------------------

.. list-table::
   :header-rows: 1

   * - Rótulo exibido no gráfico
     - Significado técnico
   * - ``Sulco residual (mm)`` (linha azul)
     - Profundidade do sulco acumulado no ponto após passadas sucessivas.
   * - ``Índice superficial`` (linha vermelha tracejada)
     - Mesmo conceito de ``índice de compactação superficial``: estado de compactação da camada mais rasa da coluna simulada.
   * - ``Cone index virtual (MPa)``
     - Resistência à penetração sintética estimada a partir do estado final de compactação.
   * - ``Densidade virtual (g/cm³)``
     - Densidade aparente sintética estimada a partir do estado final de compactação.

Termos técnicos
---------------

.. glossary::
   Passada
      Evento de tráfego (uma passagem da roda/máquina sobre o ponto analisado).

   Sulco residual
      Deformação vertical acumulada na superfície, após as passadas. No CSV aparece como ``rut_depth_mm``.

   Sulco final
      Valor do sulco residual na última passada simulada (mm).

   Afundamento residual
      Sinônimo operacional de sulco residual no contexto deste protótipo.

   Umidade volumétrica
      Fração volumétrica de água no solo (adimensional, entre 0 e 1). No comparativo foi usada para definir cenário seco e úmido.

   Índice de compactação
      Indicador adimensional do estado de compactação em cada camada da coluna (0 a ``Cmax`` no modelo).

   Índice de compactação superficial
      Valor do índice de compactação na camada mais rasa da coluna simulada. No CSV: ``surface_compaction_index``.

   Índice superficial
      Rótulo curto usado no gráfico para ``índice de compactação superficial``.

   Compactação superficial final
      Valor do índice de compactação superficial na última passada.

   Compactação média 0-30 cm
      Média do índice de compactação no intervalo de 0 a 0,30 m. No CSV: ``avg_compaction_0_30cm``.

   Compactação média 30-100 cm
      Média do índice de compactação no intervalo de 0,30 a 1,00 m. No CSV: ``avg_compaction_30_100cm``.

   Resistência à compactação
      Métrica associada ao trabalho de deformar o solo para formar sulco. No CSV: ``compaction_resistance_kN``.

   Energia acumulada de compactação
      Energia mecânica acumulada no processo de formação de sulco ao longo das passadas. No CSV: ``cumulative_compaction_energy_kJ``.

   Cone index virtual
      Estimativa sintética da resistência à penetração (MPa), derivada do estado final simulado.

   Densidade aparente virtual
      Estimativa sintética da densidade aparente do solo (g/cm³), derivada do estado final simulado.

   Carga por roda
      Carga normal equivalente aplicada por roda, calculada a partir da massa total e número de rodas (ou entrada direta).

   Pressão média de contato
      Pressão média transmitida ao solo no contato pneu-solo, aproximada por carga por roda dividida pela área de contato efetiva.

   Cenário seco
      Simulação com menor umidade volumétrica, mantendo os demais parâmetros constantes.

   Cenário úmido
      Simulação com maior umidade volumétrica, mantendo os demais parâmetros constantes.
