According to a document from an undated meeting transcript, o caminho acordado (e tecnicamente consistente com o que foi dito) é prototipar um “digital twin”/modelo de evolução da compactação por linha de tráfego, alimentado por telemetria + parâmetros do equipamento, e calibrado/validado por medições espaçadas (não instrumentação contínua em toda a lavoura).

Abaixo está um plano de ação objetivo para chegar em TRL 4–5 (protótipo), alinhado com as falas finais (modelo + validação periódica + mapa + alerta).

1) Definir claramente o “produto” do protótipo (o que será demonstrado)

Entregável mínimo (TRL 4–5):

Um algoritmo que estima o “estado/risco de compactação” por trecho de linha de tráfego ao longo do tempo, usando telemetria (rota, passadas) e parâmetros operacionais, como proposto por você e apoiado pela CNH.

Um mapa (2D; e “pseudo-3D” por camadas se houver base) + alerta do tipo “checar/renovar este trecho: já passou muita máquina / X t / X passadas”.

Critério de sucesso operacional (para TRL 5):

O sistema acerta, com utilidade prática, a identificação de trechos “próximos do limite de intervenção” (a CNH explicitou que não precisa ser 100%).

2) Arquitetura conceitual: “modelo + validação esparsa” (decisão-chave)
2.1 Por que esse desenho é o correto para o problema

Área é grande (“mares de cana”), então não dá para monitorar tudo com sensores fixos.

A CNH tem telemetria em todas as máquinas (rota, passadas, peso médio, rodado/pneu), o que torna viável um modelo de evolução no tempo.

A estratégia proposta por você (sensores “a cada km”, não “a cada metro”) é exatamente a forma de manter o modelo calibrado sem inviabilizar custo/logística.

2.2 O que entra no modelo (features mínimas)

Conforme o que foi dito:

Rota/track (onde passou) + contagem de passadas por trecho.

Carga/peso médio e tipo de rodado/pneu (e, se possível, pressão/configuração).

Umidade/chuva (variável crítica) — aparece como preocupação central de compactação e também como confusor de sensores elétricos.

3) Estrutura experimental para calibrar o protótipo (base TRL 4)

O que vocês descreveram é um paralelo direto com “pista experimental” de compactação em obras: calibra-se número de passagens → resposta, mas aqui com o adicional de solo natural e variabilidade de umidade.

Como executar de forma compatível com TRL 4:

Selecionar 2–4 “áreas teste” representativas (textura/argila, manejo, histórico), com linhas de tráfego bem definidas.

Em cada área, montar trechos experimentais com diferentes níveis de tráfego (ex.: 0, N1, N2, N3 passadas), registrando o estado hídrico (umidade).

Medir “verdade de campo” (ground truth) por métodos já aceitos pelo cliente (penetrômetro + interpolação), como eles já fazem rotineiramente.

Usar um instrumento de densidade pontual apenas como baliza, se fizer sentido e for viável regulatoriamente/operacionalmente (foi citado equipamento com radiação gama e norma DNIT, porém isso tende a ser mais “obras rodoviárias” e pode não ser o caminho principal em lavoura).

4) Modelagem: o que desenvolver primeiro (protótipo robusto)

Para TRL 4–5, a recomendação é não apostar em uma única física ou em uma única correlação; usar um modelo híbrido simples que vocês consigam calibrar com poucos dados:

4.1 Estado acumulado por trecho (núcleo do “digital twin”)

Definir um índice interno
𝑆
S por trecho (ex.: “grau de compactação/risco”), que evolui por evento de tráfego:

𝑆
𝑡
+
1
=
𝑆
𝑡
+
𝑓
(
carga
,
press
a
˜
o/rodado
,
passada
,
umidade
,
solo
)
S
t+1
	​

=S
t
	​

+f(carga,press
a
˜
o/rodado,passada,umidade,solo)

O
𝑓
(
⋅
)
f(⋅) pode começar como regressão/árvore/GBM com features operacionais, ajustado por medições espaçadas (“calibração periódica”), que foi exatamente a visão do “digital twin”.

4.2 Calibração periódica (evita deriva)

Sempre que houver nova campanha de mapeamento (penetrômetro), ajustar parâmetros do modelo para manter coerência, como a CNH descreveu (“ele mede de tempos em tempos e ajusta calibração”).

4.3 Sensores elétricos/geofísicos: tratar como “auxiliares”, não como verdade absoluta

Sensores de condutividade/resistividade são viáveis para mapear variabilidade e textura, mas a reunião destacou que umidade e íons/fertilizantes afetam fortemente a resposta, reduzindo correlação direta com compactação.

Portanto, se forem usados no protótipo, devem entrar como features auxiliares e/ou para estratificar o solo, não como medida direta de compactação.

5) Protótipo TRL 5: demonstração em ambiente relevante (campo)

Para atingir TRL 5, a demonstração precisa mostrar que:

Com um baseline inicial + telemetria contínua, o sistema estima evolução e gera alertas úteis antes da próxima campanha, e depois se recalibra com as medições periódicas (modelo de negócio descrito pela CNH).

O output é acionável: “checar este trecho; tendência de compactação alta”.

Entregáveis técnicos típicos de TRL 5:

Pipeline de ingestão de telemetria → segmentação por linha/trecho → atualização do estado
𝑆
S.

Geração de mapas por trecho (heatmap) e relatório de risco.

Relatório de validação com métricas (erros vs penetrômetro e acerto na classificação “precisa intervir / não precisa”).

6) O que “devemos fazer agora” (tarefas imediatas, objetivas)

Sem depender de transcrição perfeita, os próximos passos práticos são:

Checklist de dados CNH (amostra mínima)

Track GNSS por operação (rota) + timestamp.

Passadas/contagem por trecho (ou dados para derivar).

Peso/carga estimada por máquina/operação; tipo de rodado/pneu.

Registro de chuva/umidade (próprio ou fonte integrada).
(Justificativa: é o conjunto explicitamente citado como disponível e chave para o modelo).

Definir protocolo de baseline e recalibração

Como será feita a campanha inicial (penetrômetro + interpolação, como já é rotina).

Quais pontos/trechos serão “sentinela” (sensores ou medições repetidas).

Desenhar o experimento tipo “pista” adaptado ao solo natural

Estratificar por tipo de solo e por faixas de umidade (variáveis críticas destacadas).

Definir a variável-alvo operacional

Ex.: limiar de resistência à penetração por profundidade, ou índice composto por camadas (0–10, 10–20, 20–30 cm), alinhado à decisão “renovar ou não”.

Montar a apresentação de opções (como combinado)

Modelo “digital twin” + calibração esparsa (linha principal).

Sensores adicionais como complementos (rede mínima / embarcados), com riscos de confusão por umidade/íons explicitados.

Plano TRL 4 → TRL 5 com experimento e critérios de aceitação.

Se você quiser, eu transformo esse plano em um backlog técnico (épicos + entregáveis + critérios de aceitação) já no formato de repositório (/docs, /src, /data_contracts, /validation) para iniciar o projeto com rastreabilidade.
