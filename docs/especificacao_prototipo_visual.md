# Especificacao do Prototipo Visual — Gemeo Digital de Compactacao

Data de referencia: 03/04/2026

## Objetivo

Dashboard web interativo (Streamlit + PyDeck) que simula um trator percorrendo uma rota em uma fazenda, calculando risco de compactacao em tempo real via motor SoilFlex, e exibindo mapa de risco + perfil de solo por camada.

---

## 1. Variaveis de Entrada: Maquinario

### 1.1 Parametros do pneu (modelo TASC — Keller 2005)

| Variavel | Unidade | Descricao | Exemplo |
|----------|---------|-----------|---------|
| `inflation_pressure` | kPa | Pressao de inflacao atual do pneu | 150 |
| `recommended_pressure` | kPa | Pressao recomendada pelo fabricante para a carga | 150 |
| `tyre_diameter` | m | Diametro externo do pneu descarregado | 1.42 |
| `tyre_width` | m | Largura da banda de rodagem | 0.60 |

### 1.2 Parametros da maquina

| Variavel | Unidade | Descricao | Exemplo |
|----------|---------|-----------|---------|
| `wheel_load` | kg | Carga por roda | 5000 |
| `mass_total` | kg | Massa total da maquina (alternativa a wheel_load) | 28000 |
| `n_axles` | - | Numero de eixos | 2 |
| `wheels_per_axle` | - | Rodas por eixo | 2 |
| `track_gauge` | m | Bitola (distancia entre centros dos pneus no mesmo eixo) | 2.20 |
| `wheelbase` | m | Distancia entre eixos | 3.50 |

### 1.3 Cenarios pre-configurados (banco de maquinas)

| Maquina | Massa (kg) | Rodas | Pneu | Pressao (kPa) | Carga/roda (kg) |
|---------|-----------|-------|------|---------------|-----------------|
| Colhedora cana (pesada) | 28000 | 4 | 600/55R26.5 (D=1.42, W=0.60) | 150 | 5000 |
| Trator medio | 12000 | 4 | 520/85R42 (D=1.90, W=0.52) | 100 | 3000 |
| Plantadora | 8000 | 4 | 400/60R15.5 (D=0.95, W=0.40) | 200 | 2000 |
| Transbordo carregado | 35000 | 4 | 600/50R22.5 (D=1.14, W=0.60) | 250 | 8750 |
| Trator leve | 5000 | 4 | 320/85R24 (D=1.20, W=0.32) | 120 | 1250 |

---

## 2. Variaveis de Entrada: Solo

### 2.1 Parametros por camada (modelo SoilFlex)

O perfil de solo e discretizado em camadas (tipicamente a cada 10 cm, de 0 a 60 cm). Para cada camada:

| Variavel | Unidade | Descricao | Faixa tipica |
|----------|---------|-----------|-------------|
| `clay_content` | % | Teor de argila | 10-80 |
| `matric_suction` | kPa | Succao matricial (estado de umidade atual) | 1-10000 |
| `water_content` | m3/m3 | Umidade volumetrica (alternativa a succao) | 0.05-0.50 |
| `conc_factor` | - | Fator de concentracao de Froehlich (xi) | 3 (umido) a 6 (seco) |
| `bulk_density` | Mg/m3 | Densidade aparente inicial | 1.10-1.80 |
| `particle_density` | Mg/m3 | Densidade de particulas | 2.60-2.75 |

### 2.2 Parametros compressivos (para predicao de deformacao)

| Variavel | Unidade | Descricao | Faixa tipica |
|----------|---------|-----------|-------------|
| `N` | - | Intercepto da VCL (volume especifico em ln(sigma)=0) | 1.7-2.0 |
| `lambda_n` (CI) | - | Indice de compressao (inclinacao da VCL) | 0.04-0.10 |
| `kappa` (k) | - | Indice de recompressao (inclinacao da RCL) | 0.005-0.02 |
| `kappa2` (k2) | - | Indice de recompressao secundario | 0.01-0.03 |
| `m` | - | Ponto de separacao VCL-YL (offset em log-stress) | 1.0-2.0 |

### 2.3 Cenarios pre-configurados (perfis de solo)

#### Latossolo Vermelho (Cerrado, 55% argila)

| Camada (cm) | Argila (%) | Succao umido (kPa) | Succao seco (kPa) | xi umido | xi seco | rho (Mg/m3) |
|-------------|-----------|---------------------|--------------------|---------:|--------:|------------:|
| 0-10 | 45 | 30 | 500 | 4 | 6 | 1.25 |
| 10-20 | 50 | 50 | 700 | 4 | 6 | 1.30 |
| 20-30 | 55 | 80 | 1000 | 4 | 5 | 1.28 |
| 30-40 | 55 | 100 | 1200 | 5 | 5 | 1.22 |
| 40-50 | 60 | 150 | 1500 | 5 | 5 | 1.18 |
| 50-60 | 60 | 200 | 2000 | 5 | 5 | 1.15 |

#### Argissolo Vermelho-Amarelo (25% argila)

| Camada (cm) | Argila (%) | Succao umido (kPa) | Succao seco (kPa) | xi umido | xi seco | rho (Mg/m3) |
|-------------|-----------|---------------------|--------------------|---------:|--------:|------------:|
| 0-10 | 20 | 20 | 300 | 3 | 5 | 1.45 |
| 10-20 | 22 | 40 | 500 | 3 | 5 | 1.50 |
| 20-30 | 25 | 60 | 700 | 4 | 5 | 1.48 |
| 30-40 | 28 | 80 | 900 | 4 | 5 | 1.42 |
| 40-50 | 30 | 100 | 1000 | 4 | 5 | 1.38 |
| 50-60 | 30 | 120 | 1200 | 5 | 5 | 1.35 |

### 2.4 PTF Severiano (calculo automatico de sigma_p)

A resistencia do solo (pre-adensamento) e calculada automaticamente a partir de argila + succao:

| Faixa de argila (%) | Coef. A | Coef. B | Formula: sigma_p = A * h^B |
|---------------------|---------|---------|----------------------------|
| < 20 | 129.0 | 0.15 | sigma_p = 129.0 * succao^0.15 |
| 20-31 | 123.3 | 0.13 | sigma_p = 123.3 * succao^0.13 |
| 32-37 | 85.0 | 0.17 | sigma_p = 85.0 * succao^0.17 |
| 38-52 | 70.1 | 0.16 | sigma_p = 70.1 * succao^0.16 |
| > 52 | 62.7 | 0.15 | sigma_p = 62.7 * succao^0.15 |

Limites do semaforo (criterio Terranimo/Stettler 2014):
- **VERDE:** sigma_aplicada < 0.5 * sigma_p
- **AMARELO:** 0.5 * sigma_p <= sigma_aplicada < 1.1 * sigma_p
- **VERMELHO:** sigma_aplicada >= 1.1 * sigma_p

---

## 3. Variaveis de Entrada: Rota / GPS

| Variavel | Unidade | Descricao |
|----------|---------|-----------|
| `route_points` | (x, y) em metros ou (lat, lon) | Sequencia de pontos da rota RTK/GPS |
| `route_speed` | km/h | Velocidade da maquina | 
| `n_passes` | - | Numero de passadas na mesma trilha |
| `headland_width` | m | Largura da cabeceira (zona de manobra — mais passadas) |

Formatos aceitos: CSV com colunas `x_m, y_m` ou `lat, lon` (ja existe exemplo em `data/exemplo_rota_rtk.csv`).

---

## 4. Variaveis de Saida (visualizacao)

### 4.1 Por ponto da rota

| Saida | Unidade | Descricao |
|-------|---------|-----------|
| `sigma_vertical[z]` | kPa | Tensao vertical aplicada por camada |
| `sigma_p[z]` | kPa | Pre-adensamento por camada |
| `risk[z]` | VERDE/AMARELO/VERMELHO | Semaforo por camada |
| `risk_max` | VERDE/AMARELO/VERMELHO | Pior risco entre todas as camadas |
| `delta_rho[z]` | Mg/m3 | Aumento de densidade previsto |
| `delta_rho_pct[z]` | % | Aumento percentual de densidade |

### 4.2 Mapa acumulado (apos N passadas)

| Saida | Descricao |
|-------|-----------|
| Heatmap de risco | Mapa 2D colorido (verde/amarelo/vermelho) sobre imagem de satelite |
| Trilhas de roda | Posicao das trilhas esquerda e direita baseada na bitola |
| Zonas criticas | Cabeceiras e cruzamentos com mais passadas acumuladas |
| Compactacao acumulada | Soma do dano ao longo de multiplas passadas no mesmo ponto |

### 4.3 Perfil lateral (corte transversal)

Para qualquer ponto da rota, exibir corte Y-Z mostrando:
- Trilha esquerda e direita
- Bulbo de tensao propagando em profundidade
- Cores do semaforo por camada

---

## 5. Cadeia de Calculo (motor SoilFlex)

```
ENTRADA MAQUINA                    ENTRADA SOLO
(pressao, diametro,                (argila%, succao,
 largura, carga)                    xi, rho por camada)
       |                                  |
       v                                  v
   [1. TASC]                      [2. PTF Severiano]
   Area de contato                 sigma_p por camada
   Distribuicao de pressao         (pre-adensamento)
       |                                  |
       v                                  |
   [3. Boussinesq/Froehlich]              |
   sigma_aplicada(z)                      |
   por camada                             |
       |                                  |
       +----------------------------------+
       |
       v
   [4. Comparacao]
   sigma_aplicada vs sigma_p
       |
       v
   [5. Semaforo]                  [6. Deformacao]
   VERDE/AMARELO/VERMELHO          delta_rho (O'Sullivan)
       |                                  |
       v                                  v
   [7. MAPA DE RISCO]            [8. MAPA DE DENSIDADE]
   por ponto GPS                  por ponto GPS
```

---

## 6. Componentes do Dashboard

### Layout

```
+-------------------------------------+------------------+
|                                     |  MAQUINA         |
|   [Mapa satelite / PyDeck]          |  [dropdown]      |
|                                     |  Carga: [slider] |
|   Trator animado na rota            |  Pressao:[slider]|
|   Heatmap de risco no chao          |                  |
|                                     |  SOLO            |
|                                     |  [dropdown perfil]|
|                                     |  Umidade:[slider]|
|                                     |                  |
|                                     |  PERFIL (cm)     |
|                                     |  10: ## VERMELHO |
|                                     |  20: ## VERMELHO |
|                                     |  30: ## AMARELO  |
|                                     |  40: ## VERDE    |
|                                     |  50: ## VERDE    |
|                                     |  60: ## VERDE    |
+-------------------------------------+------------------+
|  [> Play] [||] ---o--------  Passada 3/10   vel: 1x   |
+--------------------------------------------------------+
```

### Interacoes

- **Play/Pause:** anima o trator ao longo da rota
- **Slider de umidade:** altera a succao matricial em tempo real, recalcula semaforo
- **Dropdown de maquina:** troca cenario pre-configurado
- **Dropdown de solo:** troca perfil pre-configurado
- **Clique no mapa:** mostra perfil de risco naquele ponto
- **Slider de passadas:** acumula compactacao de multiplas passagens

---

## 7. Dependencias tecnicas

| Componente | Tecnologia | Papel |
|-----------|-----------|-------|
| Motor de calculo | Python (numpy, scipy) | SoilFlex reimplementado |
| Dashboard | Streamlit | Interface web |
| Mapa 3D | PyDeck (deck.gl) | Visualizacao geoespacial |
| Imagem de satelite | Mapbox tiles ou imagem local | Base do mapa |
| Dados de rota | CSV (x,y) ou GeoJSON | Trajeto do trator |
| Validacao | Rscript + soilphysics | Comparacao cruzada |

---

## 8. Dados de referencia para validacao

Cenario 1 (colhedora cana / Latossolo umido) — valores de referencia do soilphysics R:

| Prof (m) | sigma_aplicada (kPa) | sigma_p (kPa) | sigma_p×1.1 (kPa) | Risco |
|----------|---------------------|---------------|-------------------|-------|
| 0.10 | 218 | 121 | 133 | VERMELHO |
| 0.20 | 186 | 131 | 144 | VERMELHO |
| 0.30 | 145 | 121 | 133 | VERMELHO |
| 0.40 | 127 | 125 | 138 | AMARELO |
| 0.50 | 99 | 133 | 146 | AMARELO |
| 0.60 | 78 | 139 | 153 | AMARELO |
