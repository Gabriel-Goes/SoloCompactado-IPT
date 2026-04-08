# SoloCompactado-IPT

Protótipo navegável e documentação técnica para estudo, simulação e apoio à decisão em compactação de solo causada por tráfego repetido de máquinas agrícolas.

## Demo online

- **Documentação técnica:**  
  https://gabriel-goes.github.io/SoloCompactado-IPT/

- **Protótipo navegável:**  
  https://gabriel-goes.github.io/SoloCompactado-IPT/prototipo/index.html

## Sobre o projeto

O **SoloCompactado-IPT** investiga uma abordagem de apoio operacional para monitoramento e planejamento de tráfego agrícola com foco em **risco de compactação do solo**.

A proposta combina:

- histórico de tráfego e telemetria,
- propriedades do terreno por célula,
- estimativa de compactação por profundidade,
- comparação entre rota de referência e rota planejada,
- visualização interativa diretamente no navegador.

O projeto reúne, em um mesmo repositório:

- **documentação técnica em Sphinx**, publicada no GitHub Pages;
- **protótipo navegável** com mapa, HUD operacional e planner de cobertura;
- **experimentos conceituais** sobre compactação, calibração e integração geoespacial.

## O que já está disponível

### 1. Documentação técnica no GitHub Pages
A documentação pública apresenta a base conceitual e técnica do projeto, incluindo:

- visão geral da proposta;
- fundamentos de terramecânica;
- análise de referências como Terranimo;
- modelo conceitual de compactação;
- simulador leve;
- protótipo navegável;
- simulador 3D;
- integração geoespacial;
- leitura e interpretação dos resultados;
- validação, calibração e referências.

### 2. Protótipo navegável
A aplicação web publicada em `prototipo/index.html` apresenta uma interface interativa com:

- **HUD operacional do trator**
  - preset da máquina
  - velocidade
  - heading
  - carga por roda
  - pressão
  - largura do pneu
  - bitola

- **Leitura do terreno atual**
  - célula ativa
  - teor de argila
  - teor de água
  - sucção mátrica
  - densidade
  - fator de concentração
  - sigma de pré-consolidação

- **Compactação por camada**
  - leitura por profundidade de 0–10 cm até 50–60 cm
  - indicação qualitativa de risco
  - tensão aplicada
  - sigma de pré-consolidação
  - indicador de deformação/densidade estimada

- **Mapa temático**
  - alternância entre base satelital e visualização temática BDC
  - legenda de classes como vegetação densa, vegetação esparsa, solo exposto e água

- **Planejamento de cobertura**
  - desenho de talhão no mapa
  - geração de plano de cobertura
  - comparação entre rota **baseline** e rota **otimizada**
  - métricas de comprimento e custo de compactação
  - visualização dedicada do planner

- **Painel de missão**
  - ID da missão
  - número de amostras
  - última coleta
  - timestamp
  - latitude e longitude
  - célula atual
  - status de armazenamento local
  - exportação dos dados em JSON

## Como usar a demo

1. Abra o protótipo navegável.
2. Navegue no mapa da área operacional.
3. Observe o HUD do trator e da célula ativa.
4. Alterne entre imagem de satélite e camada temática BDC.
5. Entre no fluxo de planejamento:
   - iniciar desenho do talhão,
   - fechar o polígono,
   - gerar o plano,
   - comparar baseline e otimizada.
6. Use o painel de missão para exportar ou limpar os dados locais.

## Controles básicos

- `↑` avançar
- `←` / `→` esterçar
- `↓` frear
- `D` alternar painel de debug

## Objetivo técnico

O objetivo do protótipo é evoluir para um sistema capaz de:

- estimar risco/estado de compactação por linha de tráfego;
- considerar histórico de passadas, carga e condição do solo;
- comparar trajetórias com menor impacto operacional;
- apoiar decisões sobre intervenção, renovação e manejo.

## Estrutura do repositório

```text
SoloCompactado-IPT/
├── prototipo/          # aplicação web navegável
├── sphinx/             # documentação técnica
├── docs/               # documentação complementar
├── src/                # scripts e experimentos
└── .github/workflows/  # automação de build e deploy
