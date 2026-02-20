Próximos Passos
===============

Contexto
--------

O protótipo atual é útil para tendência inicial, mas a resposta do solo ainda está simplificada.
Hoje, a principal variável de estado do solo no cálculo é a umidade.

Para evoluir o realismo físico, a rigidez efetiva e a evolução da compactação devem depender também de:

- tipo de solo,
- grau de saturação,
- estado estrutural (porosidade/densidade),
- histórico de tensões e compactação.

Base de referência para o protótipo nacional
--------------------------------------------

Nesta próxima etapa, o protótipo nacional passa a adotar explicitamente a lógica de referência usada em
``Terranimo`` (com comparação de tendências em ``Softsoil``), sem cópia direta de implementação.

Objetivo prático dessa referência:

- manter a física central de risco de compactação por camadas;
- usar variáveis operacionais disponíveis em telemetria (carga por eixo/roda, pneu, pressão, passadas);
- transformar resultado técnico em recomendação operacional de proteção do solo.

Formulação-alvo de risco por camada (visão de engenharia)
---------------------------------------------------------

Adotar a leitura de risco mecânico por profundidade como relação entre:

.. math::

   R_k = \frac{\sigma_{z,k}}{\sigma_{crit,k}}

onde:

- :math:`\sigma_{z,k}` é a tensão induzida pela operação na camada :math:`k`,
- :math:`\sigma_{crit,k}` é a capacidade de suporte/limiar da camada :math:`k` para o estado do solo.

Interpretação operacional:

- :math:`R_k < 1`: baixo risco de dano estrutural relevante na camada;
- :math:`R_k \approx 1`: faixa crítica de decisão;
- :math:`R_k > 1`: risco elevado de compactação prejudicial.

Limitação atual (e motivo da evolução)
--------------------------------------

- Dois solos diferentes com a mesma umidade podem ter respostas mecânicas muito diferentes.
- Para um mesmo solo, a resposta tende a seguir melhor o grau de saturação do que somente umidade volumétrica.
- A sensibilidade a saturação/umidade não é universal: varia com textura, estrutura e mineralogia.

Como o protótipo atual será aprimorado com Terranimo + Softsoil
----------------------------------------------------------------

.. list-table::
   :header-rows: 1

   * - Situação atual
     - Aprimoramento inspirado em Terranimo/Softsoil
     - Ganho esperado
   * - Índice principal é compacto (``C_k``) e sulco
     - Adicionar indicador de risco por camada :math:`R_k=\sigma_z/\sigma_{crit}`
     - Saída diretamente ligada a decisão de operação
   * - Solo varia principalmente por umidade
     - Incluir classe de solo, estado hídrico (:math:`S_r`) e estado estrutural
     - Resposta mais realista entre talhões diferentes
   * - Predição focada em ponto único
     - Evoluir para grade espacial com acumulação por trilha RTK/passadas
     - Mapa operacional de risco e priorização de intervenção
   * - Calibração ainda genérica
     - Calibrar :math:`\sigma_{crit}` por classe de solo com dados de campo
     - Redução de incerteza e maior confiança no limiar de intervenção
   * - Comparação externa limitada
     - Rodar casos-espelho em Terranimo/Softsoil para validar tendência
     - Benchmark técnico contínuo do protótipo nacional

Hipótese de modelo v2
---------------------

Em vez de usar apenas um fator de umidade, adotar:

.. math::

   K_{efetiva} = K_{ref} \cdot f_{solo} \cdot f_{S_r} \cdot f_{estrutura} \cdot f_{historico}

onde:

- :math:`f_{solo}` representa classe textural e composição,
- :math:`f_{S_r}` representa efeito do grau de saturação,
- :math:`f_{estrutura}` representa porosidade/densidade/estado de compactação,
- :math:`f_{historico}` representa pré-adensamento e carregamentos prévios.

Variáveis prioritárias para incluir
-----------------------------------

.. list-table::
   :header-rows: 1

   * - Grupo
     - Variáveis candidatas
     - Impacto esperado no modelo
   * - Textura/composição
     - frações areia-silte-argila, matéria orgânica, classe do solo
     - altera compressibilidade e sensibilidade à água
   * - Estado hídrico
     - grau de saturação (:math:`S_r`), umidade volumétrica, sucção matricial (quando disponível)
     - melhora predição de rigidez efetiva e sulcamento
   * - Estrutura
     - densidade aparente, porosidade total, índice de vazios
     - ajusta capacidade remanescente de compactação
   * - Resistência/deformabilidade
     - cone index, pré-adensamento estimado, parâmetros calibrados por classe
     - melhora atualização por passada em profundidade
   * - Operação
     - carga por roda, geometria/pressão de pneu, número de passadas
     - mantém ligação com telemetria operacional

Plano técnico sugerido
----------------------

1. Definir tipologias de solo para o piloto (ex.: 2 a 4 classes) e parametrizar ``\sigma_{crit}`` por camada.
2. Adicionar :math:`S_r`, densidade aparente e índice de vazios no estado do modelo.
3. Manter o cálculo atual de :math:`\sigma_z` e incluir o índice de risco :math:`R_k=\sigma_z/\sigma_{crit}`.
4. Recalibrar parâmetros por classe de solo e faixa hídrica com ensaios de campo.
5. Executar comparação sistemática de tendências com Terranimo/Softsoil em casos controlados.
6. Validar limiar de intervenção (passadas) por camada e revisar critérios operacionais.

Critérios de sucesso da próxima iteração
----------------------------------------

- Melhor separação entre cenários de solo diferente sob mesma carga.
- Limiar de intervenção estável por classe de solo (não único para todas as áreas).
- Redução do erro frente a medições de campo (cone index/densidade).
- Concordância de tendência com Terranimo/Softsoil para casos-espelho.
