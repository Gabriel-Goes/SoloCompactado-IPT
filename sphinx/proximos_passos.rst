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

Limitação atual (e motivo da evolução)
--------------------------------------

- Dois solos diferentes com a mesma umidade podem ter respostas mecânicas muito diferentes.
- Para um mesmo solo, a resposta tende a seguir melhor o grau de saturação do que somente umidade volumétrica.
- A sensibilidade a saturação/umidade não é universal: varia com textura, estrutura e mineralogia.

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

1. Definir tipologias de solo para o piloto (ex.: 2 a 4 classes).
2. Adicionar :math:`S_r` e densidade aparente no estado do modelo.
3. Recalibrar parâmetros por classe de solo e faixa hídrica.
4. Validar limiar de intervenção (passadas) com campanha de campo.
5. Revisar critérios operacionais para cada classe de solo.

Critérios de sucesso da próxima iteração
----------------------------------------

- Melhor separação entre cenários de solo diferente sob mesma carga.
- Limiar de intervenção estável por classe de solo (não único para todas as áreas).
- Redução do erro frente a medições de campo (cone index/densidade).

