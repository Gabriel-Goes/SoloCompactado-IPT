Referência de Código (Opcional)
================================

Esta seção é opcional e voltada para auditoria técnica.
O fluxo principal da documentação continua focado em física/geotecnia.

Como navegar sem expor código no corpo dos capítulos
----------------------------------------------------

- Nos capítulos conceituais, usamos explicações físicas e equações.
- Nesta página, cada função tem um link ``[source]``.
- Ao clicar em ``[source]``, abre o código-fonte com destaque da função.
- Na página de código, o Sphinx também mostra link de volta para a documentação (``[docs]``), fechando o ciclo ``docs ↔ código``.

Módulo principal do protótipo
-----------------------------

.. automodule:: prototipo_ponto_unico
   :members: SoilParams, MachineParams, SimParams, wheel_load_n, contact_pressure_pa, bekker_sinkage_m, vertical_stress_profile_pa, simulate, virtual_sensors, plot_outputs
   :undoc-members:
   :show-inheritance:

Módulo de validação do Bloco 1 (OVAT)
-------------------------------------

.. automodule:: validacao_bloco1_matriz
   :members: run_case, build_sweep, monotonic_non_decreasing, plot_sweeps
   :undoc-members:

