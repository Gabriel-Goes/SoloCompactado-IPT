# Benchmark — Projetos/Estudos Similares

## Objetivo
Registrar referências já aplicadas em compactação por tráfego repetido, para justificar as escolhas do protótipo de ponto único.

## 1) Terranimo® (ferramenta operacional)
- Link: https://terranimo.world/
- O que é: modelo para prever risco de compactação por tráfego agrícola.
- Valor para o projeto: valida a ideia de combinar dados de máquina + solo para estimar risco, sem medir tudo continuamente.

## 2) Integração Terranimo® em assistência embarcada (CLAAS CEMOS)
- Link: https://www.claas.com/de-de/presse/pressemitteilungen/2022-05-25-de-de-cemos-terranimo
- Link complementar: https://www.mynewsdesk.com/dk/danishagro/pressreleases/claas-integrates-terranimo-r-into-cemos-for-tractors-3184398
- O que mostra: uso prático em campo com recomendação de pressão de pneus/lastro; risco avaliado em três camadas de solo.
- Valor para o projeto: confirma viabilidade de transformar parâmetros operacionais em decisão de manejo.

## 3) Soil2Cover + SoilFlex (otimização de rota com custo de compactação)
- Link (open access): https://pmc.ncbi.nlm.nih.gov/articles/PMC12134033/
- DOI: https://doi.org/10.1007/s11119-025-10250-4
- O que mostra: minimiza compactação via planejamento de cobertura/rota, modelando comportamento não linear por passadas repetidas.
- Resultado reportado: teste em 1000 campos com redução de compactação em cabeceiras e ganhos de eficiência de rota.
- Valor para o projeto: reforça a estratégia de usar passadas como variável de estado central.

## 4) Experimento clássico de passadas repetidas (Botta et al., 2009)
- Link: https://www.sciencedirect.com/science/article/abs/pii/S0167198708002365
- DOI: https://doi.org/10.1016/j.still.2008.12.002
- O que mostra: comparação 0, 1, 3, 5, 10 passadas com medição de sulco e cone index.
- Valor para o projeto: referência direta para calibração de curva passadas -> sulco -> compactação.

## 5) Repeated wheeling + tração (ten Damme et al., 2021)
- Link: https://www.sciencedirect.com/science/article/pii/S0167198721002014
- DOI: https://doi.org/10.1016/j.still.2021.105128
- O que mostra: efeito incremental com número de passadas e impacto adicional de tração em deformação estrutural.
- Valor para o projeto: indica que, em fase posterior, o modelo deve incluir fator de tração/slip além da carga normal.

## 6) Passadas repetidas e impacto agronômico (Huang et al., 2025)
- Link: https://www.sciencedirect.com/science/article/abs/pii/S0167198725002260
- DOI: https://doi.org/10.1016/j.still.2025.106672
- O que mostra: aumento de sulco com passadas e redução de produtividade em cenário de carga alta e tráfego repetido.
- Valor para o projeto: sustenta a necessidade de limiar operacional de passadas para intervenção.

## Implicações diretas no protótipo atual
1. Estado por passadas repetidas com saturação (implementado).
2. Métrica de sulco residual por passada (implementado).
3. Perfil em profundidade e sensores virtuais para calibração futura (implementado).
4. Evolução futura para incluir tração/slip e espacialização 2D por trilha (planejado).
