Simular “qualquer instrumento” antes de ter dados reais é um bom caminho para **TLR 4–5**, desde que você defina claramente: **(i) qual variável física será o “estado verdadeiro” do solo** no simulador e **(ii) como cada sensor/ensaio enxergaria esse estado** (modelo direto + ruído + amostragem esparsa).

Abaixo está uma arquitetura objetiva para esse *sandbox*.

---

## 1) Defina o “estado” do solo que o modelo vai carregar no tempo

Para não travar no início, use um estado **mínimo** (mas fisicamente interpretável), e depois expanda:

### Estado mínimo recomendado (TLR 4)

* **(z_r(x,y))**: profundidade de sulco/sinkage “efetiva” na trilha (proxy de deformação/compactação superficial).
* **(S(x,y,k))**: “índice de compactação” por camada (k) (0–5 m), que acumula dano por passadas.

Motivo: o livro trata diretamente a ligação **carga → sinkage** via relação **pressão–afundamento**, e discute explicitamente a necessidade de modelar **carga repetitiva** para prever desempenho multipass.

---

## 2) Núcleo físico do simulador (telemetria → compactação)

Você precisa de dois blocos: (A) contato roda–solo/sinkage e (B) propagação de tensões no subsolo.

### 2A) Contato roda–solo: pressão–afundamento

O livro apresenta a forma de Reece para a relação pressão–sinkage em solo homogêneo. No protótipo, a ideia prática é:

1. Estimar **carga normal por roda** (W) (da telemetria + distribuição de peso).
2. Estimar **patch de contato** (área (A), dimensões efetivas).
3. Obter **pressão média** (p \approx W/A).
4. Resolver a equação (p(z)) para obter o **sinkage** (z) (ou rut depth (z_r)).

**Carregamento repetitivo (múltiplas passadas):** o livro descreve que, ao recarregar acima do ponto de descarregamento anterior, ocorre **sinkage adicional**; e modela o ciclo de **unloading–reloading** como uma lei própria (com rigidez (k_u) dependente do (z_u)).
Para o protótipo, isso vira uma regra simples do tipo “(z) cresce com (N) passadas e com (p)”, com saturação, calibrável depois.

### 2B) Do contato para 0–5 m: propagação de tensões (decai rápido)

Mesmo um modelo elástico simples já mostra que a tensão vertical cai muito com a profundidade: o livro dá um exemplo em que a tensão chega a **5% da pressão de contato** a cerca de **0,93 m** sob o centro do contato.
Isso é importante para seu domínio de 5 m: você pode manter 5 m, mas com **camadas grossas abaixo de ~1 m**, porque o efeito incremental tende a ser pequeno.

---

## 3) Métrica-alvo para “nível de compactação” (o que o mapa vai mostrar)

Duas saídas úteis (e compatíveis com o livro):

1. **Rut depth / sinkage (z_r)** (interpretação direta na trilha).
2. **Resistência/energia de compactação**: o livro define “compaction resistance” como o trabalho vertical por unidade de comprimento associado à formação do sulco (para roda: resistência ao movimento causada por trabalho vertical ao criar um sulco de profundidade (z_r)).
   Essa métrica é boa para “acumular dano” por passadas ao longo do tempo.

---

## 4) Simulação dos “instrumentos” (sensores virtuais)

Depois de ter o estado (S(x,y,k)) e/ou (z_r(x,y)), você cria modelos diretos (mesmo que simplificados) para gerar leituras sintéticas:

### Instrumentos “pontuais” (calibração/verdade-terreno)

* **Penetrômetro (cone index)**: amostra 1D com ruído + dependência forte de umidade.
* **Amostragem de densidade / método nuclear**: leitura pontual de densidade/umidade com viés e necessidade de calibração local.

### Instrumentos “não invasivos” / em área (candidatos do brainstorming)

* **Resistividade/condutividade (ERT/EMI/ECa)**: sensível a umidade, salinidade, textura; útil como proxy, mas exige modelo de interpretação.
* **GPR**: sensível a contrastes dielétricos (muito influenciado por umidade).
* **Sismologia rasa (MASW/velocidade de onda)**: proxy de rigidez (módulo de cisalhamento) → pode correlacionar com compactação.
* **Ultrassom/acústica embarcada**: proxy local de rigidez/contato.

No simulador, cada sensor é:

* **Operador de observação** (y = h(S, \theta) + \varepsilon) (onde (\varepsilon) é ruído).
* **Estratégia de amostragem**: “a cada quilômetro”, “por talhão”, “somente em trechos de validação”, etc.

Isso permite testar a hipótese que você mesmo colocou na reunião: **usar poucos pontos instrumentados para calibrar o modelo**, sem sensor a cada metro.

---

## 5) Estrutura mínima do protótipo (TLR 4 → 5)

**TLR 4 (protótipo em ambiente controlado/simulado)**

* Gerador de telemetria (rotas RTK, passadas, carga variável).
* Motor terramecânico (pressão–sinkage + regra multipass).
* Grade 3D em camadas (0–5 m) com decaimento de tensão.
* Sensores virtuais + relatórios: mapa 2D e cortes 3D.

**TLR 5 (ambiente relevante)**

* Substituir telemetria sintética por telemetria real.
* Substituir 1–2 sensores virtuais por sensores reais (campanha pontual).
* Rodar “recalibração periódica” (mapeamento anual com penetrômetro, como CNH comentou).

---

## Próximo passo (uma decisão antes de detalhar o simulador)

Qual você quer adotar como **“estado verdadeiro” no simulador** (o que o modelo tenta estimar):
**(A)** rut depth/sinkage (z_r), **(B)** perfil de densidade/índice de compactação (S(z)), ou **(C)** cone index (penetrômetro) como variável principal?
