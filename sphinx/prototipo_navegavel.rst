Protótipo Navegável
===================

Objetivo
--------

Disponibilizar a versão interativa do protótipo diretamente no GitHub Pages do projeto,
sem servidor adicional e sem build frontend dedicado.

Acessar protótipo
-----------------

.. raw:: html

   <p><a href="prototipo/index.html" target="_blank" rel="noopener"><strong>Abrir em nova aba</strong></a></p>
   <iframe
     src="prototipo/index.html"
     style="width: 100%; height: 980px; border: 1px solid #c6ced8; border-radius: 8px;"
     loading="lazy">
   </iframe>

Notas de publicação
-------------------

- O HTML publicado é o arquivo ``prototipo/index.html`` do repositório.
- O deploy acontece junto com a documentação Sphinx no GitHub Pages.
- A publicação continua estática e offline-first, dependente apenas dos serviços externos já usados pelo mapa.

Escopo desta integração
-----------------------

- Expor a experiência navegável do protótipo dentro do site do projeto.
- Permitir abrir o app em nova aba para uso em tela cheia.
- Manter a documentação técnica e o protótipo no mesmo domínio do GitHub Pages.
