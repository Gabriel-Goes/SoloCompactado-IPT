Revisão das Referências
=======================

Objetivo
--------

Consolidar leitura técnica das referências base para sustentar hipóteses do protótipo.

Síntese por fonte
-----------------

.. list-table::
   :header-rows: 1

   * - Fonte
     - Ponto principal para o projeto
     - Implicação no modelo
   * - Embrapa (milho)
     - Maior concentração de raízes nas camadas rasas, com variação por ambiente.
     - Justifica foco operacional em 0-0,30 m e 0,30-1,0 m.
   * - PAB 2006 (cana, raízes ativas)
     - Mostra atividade radicular também em camadas intermediárias (0,6-0,8 m).
     - Suporta manter camada complementar abaixo de 0,30 m no monitoramento.
   * - PAB 2012 (cana, compressibilidade e tráfego)
     - Relaciona manejo de tráfego/compactação com comportamento do sistema radicular.
     - Sustenta uso de passadas como variável de estado e limiar operacional.
   * - RBEAA 2014 (café)
     - Evidencia distribuição espacial de raízes e influência da estrutura de poros.
     - Reforça abordagem por camadas com calibração por tipo de solo.
   * - PAB 2007 (citros em Neossolo)
     - Indica concentração radicular nas camadas mais rasas e sensibilidade a barreiras físicas.
     - Sustenta prioridade de diagnóstico superficial e subsuperficial.
   * - Embrapa (citros, solos)
     - Define requisitos de solo/profundidade efetiva para implantação e manejo.
     - Orienta limites de validade para extrapolação.
   * - UNESP 2015 (laranjeira 'Valência', tese)
     - Reporta enraizamento profundo em condição específica de pomar.
     - Justifica usar 5 m como domínio prático nesta fase, sem ignorar cenários profundos.

Artigo adicional incorporado (tráfego de trator + Terranimo)
-------------------------------------------------------------

- Artigo: ``Simulating the effects of the passage of tractors on agricultural land``.
- Autores: A. Elaoud, S. Chehaibi, K. Abrougui.
- Evento: ``2013 5th International Conference on Modeling, Simulation and Applied Optimization (ICMSAO)``.
- DOI: ``10.1109/ICMSAO.2013.6552661`` (`link <https://doi.org/10.1109/ICMSAO.2013.6552661>`_).
- Método reportado: simulação de tensão pneu-solo com ``TERRANIMO`` e comparação com ``Softsoil``.
- Mensagem principal para o protótipo: aumento de pressão de inflação aumenta tensão máxima e risco de compactação, com maior sensibilidade na camada superficial.

Como este artigo entra no nosso protótipo
-----------------------------------------

1. Reforça o uso de ``pressão de contato`` como variável de entrada central.
2. Reforça ``número de passadas`` como variável de estado operacional.
3. Sustenta a leitura por camadas (superficial mais sensível, subsuperficial como risco acumulado).
4. Sustenta a necessidade de comparação entre modelos/simuladores e validação de campo.

Referências-base do artigo de 2013 (mapeadas)
----------------------------------------------

1. Billot, J.F.; Aubineau, M.; Autelet, R. ``Les matériels de travail du sol, semis et plantation``. CEMAGREF/ITCF/TEC & DOC, 1993.
2. Vitlox, O.; Loyen, S. ``Conséquences de la mécanisation sur la compaction du sol et l’infiltration de l’eau``. Journée d’étude, 2002.
3. Elaoud, A.; Chehaibi, S. ``Soil compaction due to tractor traffic``. Journal of Failure Analysis and Prevention, 2011. DOI: ``10.1007/s11668-011-9479-3`` (`link <https://doi.org/10.1007/s11668-011-9479-3>`_).
4. Chehaibi, S.; Hamza, E.; Pieters, J.; Verschoore, R. ``Analyse comparative du tassement du sol occasionné par les passages de deux types de tracteurs``. *Annales de l'INRGREF*, 2006, n°8, p. 157-170.

Rastreio de citações e continuidade temática
--------------------------------------------

Artigos que citam diretamente o trabalho de 2013 (confirmado)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

1. Elaoud, A.; Chehaibi, S.; Abrougui, K. ``Simulation of Soil Behavior Following the Passage of Tractors``. IJCET, 2015. DOI: ``10.14741/ijcet/22774106/4.1.2015.106`` (`link <https://doi.org/10.14741/ijcet/22774106/4.1.2015.106>`_). Na lista de referências, cita explicitamente o artigo ICMSAO 2013.
2. Elaoud, R.; Elaoud, A.; Chehaibi, S.; Abrougui, K. ``Effect of the Passage for Different Tractors on the Soil Compaction``. IJCET, 2015. DOI: ``10.14741/ijcet/22774106/4.2.2014.118`` (`link <https://doi.org/10.14741/ijcet/22774106/4.2.2014.118>`_). Também cita explicitamente o artigo ICMSAO 2013.

Continuidade da linha (não necessariamente citação direta do DOI 2013)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

1. Khemis, C.; et al. ``Development of Artificial Neural Networks to Predict the Effect of Tractor Speed on Soil Compaction``. *Processes*, 2022 (`link <https://www.mdpi.com/2227-9717/10/11/2326>`_). Evolui a mesma temática com modelagem por IA.
2. Abubakar, Y.; et al. ``The Impact of Tractor Power and Multiple Passes on Soil Compaction and Crop Yield in Different Soil Types``. FUDMA Journal, 2024 (`link <https://fjs.fudutsinma.edu.ng/index.php/fjs/article/view/2141>`_). Referencia a linha IJCET 2015 em compactação por tráfego.

Decisão de domínio vertical para esta fase
------------------------------------------

- O domínio padrão foi ajustado para 5 m.
- Para decisão agronômica, manter foco em 0-0,30 m, 0,30-1,0 m e 1,0-2,0 m.
- Faixa 2,0-5,0 m permanece como monitoramento complementar.

Nota sobre rastreabilidade de referências
-----------------------------------------

A referência antiga da tese UNESP de 1998 não foi mantida por indisponibilidade do endereço informado.
Foi adotada a tese UNESP com endereço ativo no Acervo Digital.
