Modelo de Ponto Único (0-5 m)
==============================

Para auditoria técnica com navegação até o código-fonte, consulte :doc:`referencia_codigo`.

Fluxo de cálculo por passada
----------------------------

Para cada passada sobre o mesmo ponto:

1. Calcula carga por roda e pressão média de contato.
2. Estima afundamento equivalente por relação pressão-afundamento.
3. Atualiza sulco residual (com ganho decrescente ao longo das passadas).
4. Calcula perfil de tensão vertical na coluna de solo.
5. Atualiza índice de compactação por camada.
6. Atualiza tensão de pré-adensamento e acumula energia mecânica associada ao sulco.

Equações implementadas (forma usada no código)
-----------------------------------------------

Carga e pressão de contato:

.. math::

   W_r = \frac{M g}{N_w}

.. math::

   p = \frac{W_r}{A}, \qquad A = b \cdot L

Afundamento equivalente (forma de Bekker com fatores de umidade e endurecimento):

.. math::

   z_{eq} = \left(\frac{p}{\left(\frac{k_c}{b} + k_{\phi}\right)\,s_u\,h_c}\right)^{1/n}

.. math::

   s_u = \max\left(0.35,\;1-\gamma_u(\theta-\theta_{ref})\right), \qquad
   h_c = 1+\gamma_h C_{sup}

Evolução do sulco por passada:

.. math::

   z_r^{*} = z_{eq}\left(1.15 + 0.25\max(0,\theta-\theta_{ref})\right)

.. math::

   r = \max\left(0.04,\;0.35(1-0.45C_{sup})\right)

.. math::

   \Delta z_r = \max\left(0,\,(z_r^{*}-z_r)\left(1-e^{-r}\right)\right), \qquad
   z_r \leftarrow z_r + \Delta z_r

Perfil de tensão vertical (aproximação axisimétrica):

.. math::

   \sigma_z(z) = p\left[1-\left(1+\left(\frac{a}{z}\right)^2\right)^{-3/2}\right], \qquad
   a=\sqrt{\frac{A}{\pi}}

Atualização da compactação em profundidade (camada :math:`k`):

.. math::

   \Delta C_k =
   \alpha\,f_u
   \left(\frac{\sigma_{z,k}}{\sigma'_{pc,k}}\right)^m
   e^{-z_k/2.5}
   \left(1-\frac{C_k}{C_{max}}\right)

.. math::

   f_u = \operatorname{clip}\left(1+2.2\max(0,\theta-\theta_{ref}),\;0.7,\;2.0\right), \qquad
   C_k \leftarrow \operatorname{clip}(C_k+\Delta C_k,\;0,\;C_{max})

Métricas derivadas:

.. math::

   C_{sup} = C(z=\Delta z/2)

.. math::

   \bar{C}_{0-0.30}=\operatorname{media}\{C_k:0\le z_k\le 0.30\}, \qquad
   \bar{C}_{0.30-1.00}=\operatorname{media}\{C_k:0.30< z_k\le 1.00\}

.. math::

   E_{acum} \leftarrow E_{acum} + W_r\,\Delta z_r\,N_w

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
- ``parametros_simulacao.csv``: parâmetros de entrada e derivados (massa, rodas, carga por roda, pressão de contato, umidade, ``kc``, ``kphi``, ``n``).

Ligação entre conceito físico e implementação
---------------------------------------------

.. list-table::
   :header-rows: 1

   * - Função no script
     - Papel físico no modelo
   * - :py:func:`prototipo_ponto_unico.wheel_load_n`
     - Converte massa total em carga normal por roda
   * - :py:func:`prototipo_ponto_unico.contact_pressure_pa`
     - Converte carga por roda em pressão média no contato
   * - :py:func:`prototipo_ponto_unico.bekker_sinkage_m`
     - Calcula afundamento equivalente por relação pressão-afundamento
   * - :py:func:`prototipo_ponto_unico.vertical_stress_profile_pa`
     - Calcula decaimento da tensão vertical com a profundidade
   * - :py:func:`prototipo_ponto_unico.simulate`
     - Atualiza estado do solo e métricas em cada passada
   * - :py:func:`prototipo_ponto_unico.virtual_sensors`
     - Converte estado final em leituras sintéticas de cone index e densidade

Faixas típicas de unidades
--------------------------

- Carga: N
- Pressão/Tensão: Pa (kPa para leitura operacional)
- Profundidade: m (mm para sulco)
- Densidade aparente: g/cm³
- Cone index: MPa
