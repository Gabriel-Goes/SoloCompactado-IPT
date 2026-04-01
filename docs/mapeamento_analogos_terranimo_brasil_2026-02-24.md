# Mapeamento de Análogos ao Terranimo no Brasil (foco: compactação por tráfego)

Data de referência: **24/02/2026**

## 1) Objetivo

Consolidar as principais soluções, documentações e publicações que podem servir como base para um protótipo nacional de avaliação de risco de compactação do solo por tráfego de máquinas, no espírito do Terranimo.

## 2) Síntese executiva

Os dois análogos brasileiros mais relevantes encontrados até o momento são:

1. **PredComp** (base acadêmica/científica, via pacote `soilphysics` em R).
2. **COMPSOHMA** (aplicação brasileira em evolução, com foco prático de apoio à decisão).

Em **ESALQ** e **EMBRAPA** há iniciativas digitais robustas em solo, porém não foi identificado, de forma pública, um simulador com o mesmo escopo do Terranimo (risco de compactação por tráfego com foco em carga por roda + pressão de pneu + risco em profundidade).

## 3) Análogos diretos (Brasil)

### 3.1 PredComp (web app / Shiny)

Link:
https://appsoilphysics.shinyapps.io/PredComp/

Relevância:
- É o análogo nacional mais próximo em lógica de modelagem de compactação por tráfego.
- Baseado no ecossistema `soilphysics`, com funções para tensão transmitida ao solo e avaliação de risco.

### 3.2 COMPSOHMA (web app / Shiny, beta)

Link:
https://testbeta.shinyapps.io/compsohma/

Relevância:
- Ferramenta brasileira de perfil mais aplicado para gestão do risco de compactação.
- Útil como referência de interface e fluxo de decisão para usuário final.

## 4) Documentação técnica relevante

1. Índice do pacote `soilphysics` (CRAN):
https://search.r-project.org/CRAN/refmans/soilphysics/html/00Index.html

2. Função `stressTraffic` (referência explícita a base SoilFlex):
https://search.r-project.org/CRAN/refmans/soilphysics/html/stressTraffic.html

3. Página do projeto `soilphysics` com materiais e links:
https://arsilva87.github.io/soilphysics/

4. Código-fonte da app PredComp no pacote:
https://rdrr.io/cran/soilphysics/src/R/PredComp.R

5. Página do pacote no CRAN:
https://cran.r-project.org/web/packages/soilphysics/index.html

6. Registro AGRIS associado ao software/artigo:
https://agris.fao.org/search/en/providers/122535/records/65de3c294c5aef494fdb1c51

## 5) Artigos e produção científica (aplicação no Brasil)

1. **de Lima et al., 2021** (software `soilphysics` para simulação de compactação por tráfego):
https://doi.org/10.1016/j.still.2020.104824

2. **Tese USP, 2017** (sistema de predição para solos brasileiros):
https://www.teses.usp.br/teses/disponiveis/11/11140/tde-09082017-151718/pt-br.php

3. **Lozano et al., 2013** (aplicação de SoilFlex em cana no Brasil):
https://doi.org/10.1016/j.still.2013.01.010

4. **Soil & Tillage Research, 2024** (risco de compactação em cana; contexto Terranimo/SoilFlex/TASC):
https://doi.org/10.1016/j.still.2024.106206

5. **Science of the Total Environment, 2019** (uso de TASC em sistemas de cana no Brasil):
https://doi.org/10.1016/j.scitotenv.2019.05.009

## 6) Evidência institucional brasileira relacionada ao COMPSOHMA

1. Trabalho CONBEA 2023 (PredComp e COMPSOHMA como ferramentas nacionais):
https://conbea.org.br/anais/publicacoes/conbea-2023/anais-2023/engenharia-de-agua-e-solo-eas-4/3708-ferramentas-computacionais-made-in-brazil-para-predicao-da-compactacao-do-solo-induzida-pelo-trafego-agricola/file

2. Registro de PI (BR512023000761-7) e trilha institucional:
https://bv.fapesp.br/en/papi-nuplitec/instituicao/1521/

3. Página associada ao ecossistema da ferramenta:
https://renatoagro.wixsite.com/soilphysics

## 7) Análogos brasileiros com escopo diferente (não equivalentes diretos ao Terranimo)

### 7.1 ESALQ

Exemplo de plataforma digital de solo (foco em atributos do solo, não em risco de compactação por roda):
https://pt.esalq.usp.br/banco-de-noticias/grupo-da-esalq-cria-plataforma-online-para-an%C3%A1lise-de-solo

### 7.2 EMBRAPA

Há conteúdo e apps sobre solos e manejo, mas não foi identificado publicamente um simulador equivalente ao Terranimo no mesmo formato de risco por tráfego/camada.

Referências:
https://www.embrapa.br/busca-de-noticias/-/noticia/47652221/produtor-obtera-classificacao-do-solo-da-sua-propriedade-no-celular
https://www.embrapa.br/agencia-de-informacao-tecnologica/cultivos/soja/producao/manejo-do-solo/compactacao-do-solo
https://www.embrapa.br/florestas/aplicativos-e-softwares/aplicativos

## 8) Referência internacional (comparação)

Exemplo de página internacional com versões por região:
https://www.terranimo.uk/

Observação: na consulta realizada, não foi identificada versão Brasil explicitamente listada nessa página.

## 9) Conclusão prática para o projeto

1. **Benchmark técnico imediato**: usar PredComp/`soilphysics` como referência de entradas, estrutura de cálculo e saídas.
2. **Benchmark de produto/interface**: usar COMPSOHMA + Terranimo Light como referência de UX para apoio à decisão.
3. **Próxima etapa de tropicalização**: incorporar parâmetros de natureza e estado de solos brasileiros (granulometria, Atterberg, índice L, índice de vazios, grau de saturação, histórico de umedecimento/secagem).

