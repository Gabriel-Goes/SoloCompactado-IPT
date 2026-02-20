Fundamentos de Terramecânica
============================

1. Carga normal por roda
------------------------

A carga vertical equivalente por roda é estimada por:

.. math::

   W_{rod} = \frac{m\,g}{n_{rodas}}

onde:

- :math:`m` é a massa total do conjunto,
- :math:`g` é a aceleração da gravidade,
- :math:`n_{rodas}` é o número de rodas.

2. Pressão média de contato
---------------------------

Com área de contato aproximada por largura e comprimento efetivos do pneu:

.. math::

   A = b\,\ell

.. math::

   p = \frac{W_{rod}}{A}

3. Relação pressão-afundamento (forma de Bekker)
-------------------------------------------------

O modelo utiliza a forma clássica:

.. math::

   p = \left(\frac{k_c}{b} + k_\phi\right) z^n

Invertendo para obter afundamento equivalente:

.. math::

   z = \left(\frac{p}{\left(\frac{k_c}{b} + k_\phi\right)}\right)^{1/n}

No protótipo, a rigidez efetiva é ajustada por:

- fator de umidade (solo mais úmido tende a menor rigidez efetiva),
- fator de endurecimento (histórico de compactação aumenta rigidez aparente).

4. Propagação vertical de tensões
---------------------------------

A tensão vertical na profundidade :math:`z` sob o centro do contato é aproximada por uma solução axisimétrica com raio equivalente :math:`a`:

.. math::

   a = \sqrt{\frac{A}{\pi}}

.. math::

   \sigma_z(z) = p\left[1 - \left(1 + \left(\frac{a}{z}\right)^2\right)^{-3/2}\right]

Essa forma preserva o comportamento esperado de decaimento da influência com a profundidade.

5. Acúmulo por passadas repetidas
---------------------------------

A compactação por camada é atualizada incrementalmente por passada, com saturação progressiva:

.. math::

   C_{k}^{(t+1)} = C_{k}^{(t)} + \Delta C_k

.. math::

   \Delta C_k \propto
   \left(\frac{\sigma_{z,k}}{\sigma'_{pc,k}}\right)^m
   \exp\left(-\frac{z_k}{\lambda}\right)
   \left(1 - \frac{C_k}{C_{max}}\right)

onde:

- :math:`\sigma'_{pc,k}` representa tensão de pré-adensamento efetiva da camada,
- o termo :math:`\left(1 - C_k/C_{max}\right)` representa saturação (diminuição do ganho incremental ao longo das passadas).
