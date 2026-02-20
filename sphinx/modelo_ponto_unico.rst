Modelo de Ponto Único (0-5 m)
==============================

Fluxo de cálculo por passada
----------------------------

Para cada passada sobre o mesmo ponto:

1. Calcula carga por roda e pressão média de contato.
2. Estima afundamento equivalente por relação pressão-afundamento.
3. Atualiza sulco residual (com ganho decrescente ao longo das passadas).
4. Calcula perfil de tensão vertical na coluna de solo.
5. Atualiza índice de compactação por camada.
6. Atualiza tensão de pré-adensamento e acumula energia mecânica associada ao sulco.

Variáveis de estado
-------------------

- :math:`z_r`: sulco residual acumulado (m).
- :math:`C_k`: índice de compactação da camada :math:`k` (adimensional, 0 a :math:`C_{max}`).
- :math:`\sigma'_{pc,k}`: tensão de pré-adensamento efetiva da camada :math:`k` (Pa).

Métricas de saída
-----------------

- ``rut_depth_mm``: profundidade de sulco residual (mm).
- ``surface_compaction_index``: índice de compactação na camada superficial.
- ``avg_compaction_0_30cm`` e ``avg_compaction_30_100cm``.
- ``compaction_resistance_kN``: métrica de resistência de compactação associada ao sulco.
- ``cumulative_compaction_energy_kJ``: energia acumulada por formação do sulco.

Ligação entre conceito físico e implementação
---------------------------------------------

.. list-table::
   :header-rows: 1

   * - Função no script
     - Papel físico no modelo
   * - ``wheel_load_n``
     - Converte massa total em carga normal por roda
   * - ``contact_pressure_pa``
     - Converte carga por roda em pressão média no contato
   * - ``bekker_sinkage_m``
     - Calcula afundamento equivalente por relação pressão-afundamento
   * - ``vertical_stress_profile_pa``
     - Calcula decaimento da tensão vertical com a profundidade
   * - ``simulate``
     - Atualiza estado do solo e métricas em cada passada
   * - ``virtual_sensors``
     - Converte estado final em leituras sintéticas de cone index e densidade

Faixas típicas de unidades
--------------------------

- Carga: N
- Pressão/Tensão: Pa (kPa para leitura operacional)
- Profundidade: m (mm para sulco)
- Densidade aparente: g/cm³
- Cone index: MPa
