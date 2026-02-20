# Protótipo: Compactação em Ponto Único (0-5 m)

## Objetivo
Este protótipo implementa, de forma **conceitual e executável**, a ideia discutida em `README.md`, `Proposta.md` e `Prototipo.md`:
- um único ponto da superfície recebe várias passadas de uma máquina pesada;
- a compactação evolui em uma coluna de solo de até 5 m;
- o resultado é uma série temporal por passada + perfil vertical final.

## Modelo simplificado usado

### 1) Carga da roda e pressão média de contato
- Carga por roda: `W = (massa_total * g) / n_rodas` (ou valor informado)
- Pressão média: `p = W / A`
- Área de contato: `A = largura_pneu * comprimento_contato`

### 2) Pressão-afundamento (forma de Bekker)
- `p = (kc / b + kphi) * z^n`
- `z` é o afundamento equivalente por passada
- O protótipo inclui:
  - fator de **amolecimento por umidade**;
  - fator de **endurecimento por histórico de compactação**.

### 3) Carga repetitiva (histerese simplificada)
- Cada passada aproxima o sulco residual de um valor-alvo com taxa decrescente.
- Isso simula ganho rápido nas primeiras passadas e saturação gradual depois.

### 4) Coluna de 5 m
- A tensão vertical em profundidade é aproximada por uma solução elástica axisimétrica (área circular equivalente).
- Cada camada recebe incremento de compactação `delta_c` proporcional a:
  - razão de tensão aplicada / pré-adensamento,
  - umidade,
  - profundidade,
  - capacidade remanescente de compactação da camada.

### 5) Sensores virtuais
No perfil final, o protótipo calcula leituras sintéticas:
- `cone_index_mpa` (penetrômetro virtual),
- `bulk_density_g_cm3` (densidade aparente virtual).

## Arquivos gerados
Executando o script, são salvos em `outputs/ponto_unico/`:
- `series_passadas.csv` (evolução por passada)
- `perfil_final_5m.csv` (perfil final por profundidade)
- `evolucao_ponto_unico.png` (sulco + compactação com passadas, e snapshots da coluna, com legenda)
- `sensores_virtuais_perfil_final.png` (cone index e densidade no perfil final, com legenda)

## Como rodar
```bash
python3 src/prototipo_ponto_unico.py
```

Exemplo com parâmetros de máquina/pneu:
```bash
python3 src/prototipo_ponto_unico.py \
  --passes 40 \
  --mass-kg 32000 \
  --wheels 8 \
  --tire-width-m 0.70 \
  --contact-length-m 0.50 \
  --moisture 0.30
```

## Como evoluir para dados reais
1. Substituir entradas sintéticas por telemetria real (massa por eixo/roda, rota RTK, passadas).
2. Ajustar `kc`, `kphi`, `n` por tipo de solo e faixa de umidade.
3. Calibrar sensores virtuais com campanhas pontuais (penetrômetro/densidade).
4. Definir limiar operacional de intervenção por camada/faixa.

## Limitações atuais
- Não modela lateralidade 2D da trilha (apenas ponto único).
- Usa distribuição de tensão e histerese simplificadas.
- Parâmetros default são plausíveis para protótipo, não calibrados para um talhão específico.

## Robustez operacional
- O script valida entradas de CLI (ex.: passadas, profundidade, umidade e parâmetros físicos).
- Cenários de borda como `--passes < 10` e `--dz-m` alto são tratados sem quebra.
