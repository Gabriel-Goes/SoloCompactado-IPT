# SoloCompactado-IPT
Este protótipo implementa, de forma **conceitual e executável**, a ideia discutida em `README.md`, `Proposta.md` e `Prototipo.md`: - um único ponto da superfície recebe várias passadas de uma máquina pesada; - a compactação evolui em uma coluna de solo de até 5 m; - o resultado é uma série temporal por passada + perfil vertical final.

## Visão geral
Este projeto propõe um **protótipo (TRL 4–5)** para ajudar agricultores a **identificar o momento ótimo de renovação** (descompactação/intervenção) em **linhas específicas de tráfego** onde as máquinas passam repetidamente (tráfego controlado com precisão centimétrica/RTK).

A abordagem central não depende de instrumentação contínua em toda a área. Em vez disso, combina:
1) **Modelo preditivo baseado em telemetria e passadas** (rota, número de passagens, carga, rodado/pneu, etc.), e
2) **Medições de calibração esparsas** (sensores ou ensaios em pontos sentinela) para manter o modelo ajustado ao solo real.

---

## Problema
- Máquinas agrícolas trafegam em rotas repetidas, causando **acúmulo de compactação** ao longo do tempo em **faixas/linhas específicas**.
- A compactação varia com **tipo de solo** e, principalmente, **teor de umidade** no momento do tráfego.
- Métodos atuais de diagnóstico (p.ex. penetrômetro e interpolação) são tipicamente **pontuais e periódicos**, custosos em área e pouco integrados ao histórico operacional.

---

## Hipótese e estratégia (falas finais da reunião)
### Ideia principal
Em vez de medir compactação “em tempo real” em todo lugar, o sistema:
- Usa os **dados já existentes** de agricultura de precisão (telemetria embarcada) para estimar a evolução da compactação:
  - **rota** (onde passou),
  - **quantas vezes passou**,
  - **peso/carga média**,
  - **tipo de rodado/pneu** (e, quando disponível, pressão e configuração),
  - **chuva/umidade** e variáveis ambientais/operacionais correlatas.
- Mantém **validação contínua** por medições esparsas (não precisa “sensor a cada metro”; pode ser **a cada quilômetro**, por exemplo).

### Resultado esperado
- Um **modelo matemático** correlaciona conjunto de variáveis operacionais → variável alvo (estado/risco de compactação).
- O modelo permite **extrapolar** para cenários e parâmetros iniciais diferentes, desde que validado periodicamente.
- Gera **alertas** do tipo: “checar esta região/linha — já acumulou X passadas / X t / risco elevado”.

---

## Princípios técnicos do projeto
1. **Digital Twin do solo/linha de tráfego (simplificado)**
   - Um “gêmeo digital” evolui com base no histórico de tráfego e ambiente.
   - É recalibrado com medições espaçadas no tempo, como já é rotina em campo.

2. **Calibração por campanha + atualização por telemetria**
   - **Avaliação inicial (baseline):** mapa/diagnóstico inicial (ex.: penetrômetro em pontos e interpolação).
   - **Evolução estimada:** algoritmo atualiza o estado ao longo do tempo conforme o tráfego ocorre.
   - **Recalibração periódica:** novas campanhas de medição ajustam o modelo e reduzem deriva.

3. **Variáveis de contorno essenciais**
   - **Tipo de solo** e **teor de umidade** no momento do tráfego são variáveis críticas.
   - Em solos naturais (sem preparo), há maior variabilidade: o projeto deve restringir condições de contorno e/ou incorporar fatores de correção.

4. **Arquitetura de sensoriamento “mínimo viável”**
   - Medição densa não é requisito.
   - **Pontos sentinela** (medição pontual) são usados para calibrar e validar o modelo.
   - Sensores embarcados e telemetria são explorados ao máximo (dados já disponíveis).

---

## Objetivo do protótipo (TRL 4–5)
Entregar um sistema que, dado um baseline e dados de telemetria, gere:
- **Mapa/heatmap** de risco/estado de compactação por linha de tráfego (2D) e, quando possível, por camadas (pseudo-3D).
- **Estimativa de “momento ótimo de renovação”** (threshold-based) por linha/trecho.
- **Alertas e recomendações operacionais** (“verificar/renovar nesta faixa”).
- Interface de ingestão de dados e recalibração a cada campanha.

---

## Escopo inicial
### Dentro do escopo
- Uso de telemetria e dados operacionais: rota, passadas, carga/peso, pneu/rodado.
- Integração com dados ambientais: chuva/umidade (medida ou proxy).
- Calibração com ensaios existentes (penetrômetro e outros) e pontos sentinela.
- Modelagem: correlação/estimação com validação periódica e extrapolação controlada.
- Saída: mapas e alertas por linha/trecho.

### Fora do escopo (por ora)
- Medição “não invasiva” contínua em toda a lavoura com alta densidade espacial.
- Dependência exclusiva de sensores geofísicos para inferir compactação (podem ser avaliados como complementares).

---

## Metodologia (alto nível)
1. **Levantamento e consolidação de dados existentes**
   - Telemetria e rotas (GPS/RTK), passadas, carga, rodado/pneu.
   - Ensaios de compactação já realizados pelo cliente.
   - Dados de solo (classe/textura) e ambiente (chuva/umidade).

2. **Baseline e definição de variável-alvo**
   - Definir como o “estado de compactação” será representado (ex.: classes, índice contínuo, risco).
   - Construir baseline via medições disponíveis e mapear linhas de tráfego.

3. **Modelo preditivo de evolução**
   - Construir função/algoritmo que acumula “dano/estado” por passadas ponderadas por carga e condição hídrica.
   - Ajustar parâmetros por tipo de solo e condição de contorno.

4. **Validação e recalibração**
   - Comparar previsão com medições de campo (sentinelas e campanhas).
   - Atualizar parâmetros e reduzir erro (ciclo iterativo).

5. **Entrega do protótipo**
   - Pipeline de dados → estimativa → mapa → alerta.
   - Documentar limites de validade (solo/umidade/faixa de operação).

---

## Entradas e saídas do sistema
### Entradas (mínimas)
- Trilhas de tráfego georreferenciadas (rota).
- Contagem de passadas por linha/trecho.
- Carga/peso do equipamento (ou estimativa).
- Tipo de pneu/rodado (e pressão, se disponível).
- Chuva/umidade (medida/proxy).
- Baseline de compactação (campanha inicial).

### Saídas
- Índice/risco de compactação por linha/trecho (com histórico temporal).
- Alertas do tipo “atingiu nível de intervenção”.
- Mapas 2D (e extensões por camadas quando suportado por dados/modelo).
- Relatório de confiabilidade (erro, cobertura de dados, condição fora do envelope).

---

## Próximos passos (tarefa de casa)
1. **Revisão bibliográfica e benchmarking** das abordagens de:
   - compactação por passadas (pista experimental / calibração por número de passagens),
   - modelos que incorporam umidade e tipo de solo,
   - métodos de validação em solos naturais.
2. **Inventário de dados CNH/cliente** (telemetria + ensaios já existentes).
3. **Definir baseline e protocolo de recalibração** (frequência, pontos sentinela).
4. **Desenhar arquitetura do protótipo** (ingestão, processamento, visualização, alertas).
5. **Montar apresentação** de opções, prós e contras, e plano TRL 4–5.

---

## Participantes (referência da reunião)
- CNH: Caio Silva, João Lucca, Marcos Ohira (e equipe)
- IPT/FIPT: Gabriel Góes Rocha de Lima, Rubens Vieira, Scandar Gasperazzo Ignatius, Otavio (métodos geofísicos), Daniel Seabra Nogueira Alves Albarelli

---

## Nota sobre riscos e limites
- O modelo é **fortemente condicionado** por solo e umidade; extrapolações devem ficar dentro do envelope validado.
- O objetivo do protótipo é atingir acurácia operacional “boa o suficiente” (ex.: ~90% utilidade prática) com **validação periódica** e uso de dados já disponíveis.

---

## Documentação Técnica (Sphinx + GitHub Pages)

A documentação para público de engenharia de solos está em `sphinx/`, com foco em:
- fundamentos geotécnicos e terramecânicos do modelo,
- equações e hipóteses físicas,
- interpretação dos resultados para decisão.

### Build local
```bash
pip install -r docs-requirements.txt
sphinx-build -b html sphinx sphinx/_build/html
```

### Publicação no GitHub Pages
- Workflow: `.github/workflows/pages.yml`
- O deploy é automático a cada push no `main` quando houver mudanças na documentação/código.
- Em `Settings > Pages`, garantir que a fonte está configurada para **GitHub Actions**.
