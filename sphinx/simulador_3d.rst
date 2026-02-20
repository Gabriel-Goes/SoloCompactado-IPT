Simulador 3D Interativo
=======================

Objetivo desta página
---------------------

Mostrar, no próprio GitHub Pages, uma demonstração visual 3D do protótipo de compactação
em rota (conceito Terranimo/Softsoil em implementação aberta e simplificada).

Demonstração interativa (HTML)
------------------------------

.. raw:: html

   <p><a href="_static/resultados/prototipo_trajeto_3d_demo/volume_compactacao_3d_interativo.html" target="_blank" rel="noopener"><strong>Abrir visualizador 3D em nova aba</strong></a></p>
   <iframe
     src="_static/resultados/prototipo_trajeto_3d_demo/volume_compactacao_3d_interativo.html"
     style="width: 100%; height: 760px; border: 1px solid #ccc; border-radius: 6px;"
     loading="lazy">
   </iframe>

Caso o bloco interativo não carregue na sua rede/navegador, use o link "Abrir visualizador 3D em nova aba".

Figuras de apoio
----------------

.. figure:: _static/resultados/prototipo_trajeto_3d_demo/mapa_carga_superficial.png
   :alt: Mapa de carga superficial acumulada
   :width: 100%

   Mapa de intensidade relativa de carregamento na superfície para a rota amostrada.

.. figure:: _static/resultados/prototipo_trajeto_3d_demo/secao_transversal_meio_rota.png
   :alt: Seção transversal do índice de compactação
   :width: 90%

   Seção y-z no meio da rota, mostrando a distribuição de compactação com a profundidade.

.. figure:: _static/resultados/prototipo_trajeto_3d_demo/volume_compactacao_3d.png
   :alt: Volume 3D estático da compactação
   :width: 100%

   Versão estática do volume 3D (pontos acima de limiar de compactação).

Parâmetros do cenário de demonstração
-------------------------------------

.. csv-table::
   :file: _static/resultados/prototipo_trajeto_3d_demo/parametros_simulacao_3d.csv
   :header-rows: 1

Comando usado para gerar este cenário
-------------------------------------

.. code-block:: bash

   python3 src/prototipo_trajeto_3d.py \
     --route-mode csv \
     --route-csv data/exemplo_rota_rtk.csv \
     --soil-profile custom \
     --sigma-crit-layers "0.30:95,1.00:140,2.00:210,5.00:290" \
     --output-dir sphinx/_static/resultados/prototipo_trajeto_3d_demo
