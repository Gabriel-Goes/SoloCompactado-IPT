# Script de Apresentação
## Mapeamento de Análogos ao Terranimo — No mundo e no Brasil
**Data:** 30/03/2026 | **Duração estimada:** 20–25 minutos

---

## Slide 1 — Capa

*[Aguardar a sala se organizar. Falar com calma.]*

Bom dia a todos. Vou apresentar um mapeamento que fizemos de ferramentas análogas ao Terranimo — tanto no cenário internacional quanto no Brasil — com foco em avaliação de risco de compactação do solo por tráfego de máquinas agrícolas.

O objetivo é entender onde estamos posicionados em relação ao estado da arte, o que já existe e o que falta para construirmos um protótipo nacional.

---

## Slide 2 — Agenda

Vamos percorrer oito tópicos.

Começamos pelo próprio Terranimo, para alinhar o que a ferramenta faz e por que ela é a referência. Depois fazemos o panorama internacional, com o quadro comparativo. Na segunda metade, mergulhamos nos análogos brasileiros — as ferramentas, o pacote computacional de base, os grupos de pesquisa e as bases de dados disponíveis. Terminamos com as lacunas e a proposta de próximos passos.

---

## Slide 3 — Terranimo: a referência internacional

O Terranimo é uma ferramenta desenvolvida em consórcio entre Suíça, Dinamarca, Suécia e Holanda. Não é um produto de uma empresa — é uma iniciativa acadêmica e institucional de pesquisa agrícola.

Ele tem dois modos de uso. O **modo Light** é o mais simples: o usuário informa quatro dados — carga na roda, pressão do pneu, teor de argila e sucção matricial do solo — e recebe uma classificação de risco a 35 cm de profundidade: verde, amarelo ou vermelho.

O **modo Expert** vai mais fundo: permite configurar o solo camada por camada, de 10 em 10 centímetros, com textura completa e parâmetros mecânicos por camada.

O que torna o Terranimo único não é só a física — é a combinação de um motor de cálculo validado, um banco de máquinas já cadastrado, uma interface web que qualquer técnico consegue usar, e uma saída operacional direta: "pode passar" ou "não pode passar".

Em 2022, a CLAAS integrou o Terranimo ao sistema CEMOS do trator — ou seja, a decisão passou a ser feita dentro da cabine, em tempo real.

O ponto mais importante para nós: **não existe versão Brasil**. Não há parametrização para solos tropicais na página oficial.

---

## Slide 4 — Divisória: Panorama Internacional

Vamos agora ao que existe no mundo.

---

## Slide 5 — Modelos analíticos (base científica)

Todos os modelos analíticos relevantes compartilham a mesma física de base: a teoria de Boussinesq para propagação de tensões no solo, com o fator de concentração de Froehlich.

O **SoilFlex**, de Keller e colaboradores, é o motor científico do Terranimo. Ele calcula a tensão vertical no perfil do solo a partir da geometria de contato do pneu — usando um modelo de super-elipse — e propaga essa tensão em profundidade. O SoilFlex está implementado no pacote R `soilphysics`, na função `stressTraffic`. É nosso ponto de partida técnico.

O **TASC** cuida especificamente do contato pneu-solo: dado um pneu com dimensões e pressão conhecidas, ele prediz qual é a área de contato e como a tensão se distribui nessa área. É um componente que alimenta o SoilFlex.

O **SOCOMO**, holandês, é o precursor. Usa a mesma física, mas com modelo de contato mais simples — carga circular uniforme. Importante historicamente, mas menos preciso que o SoilFlex.

O **COMPSOIL**, desenvolvido em projeto europeu, tem uma abordagem diferente: ele não pergunta "o solo vai compactar?" — ele pergunta "quanto vai compactar?". Foca na variação de densidade aparente após o carregamento. Requer mais parâmetros de entrada.

As **PTFs de Horn e Lebert** são funções de pedotransferência alemãs para estimar a resistência do solo — o pré-adensamento — a partir de propriedades básicas como textura, matéria orgânica, densidade e umidade. Elas fornecem o lado "força" da equação de risco que o Terranimo usa.

---

## Slide 6 — Ferramentas aplicadas, MEF e fronteira

O **REPRO** é uma ferramenta alemã de sustentabilidade de fazenda. A compactação é apenas um dos muitos indicadores que ele avalia. A física é simplificada — serve para gestão, não para engenharia por operação.

O **FRIDA** é um diagnóstico qualitativo de risco por rodado, também alemão. Mais um checklist do que um modelo físico.

O **Softsoil no PLAXIS** é o outro extremo: um modelo constitutivo dentro de um software de elementos finitos comercial. Consegue modelar consolidação, fluência, acoplamento hidromecânico, geometrias em 2D e 3D. É muito mais poderoso, mas exige especialista, calibração extensa e tempo computacional. É usado na academia para validar os modelos simplificados — não é ferramenta de campo.

As abordagens de **Machine Learning** estão crescendo na literatura desde 2020, com redes neurais e random forests treinadas em dados experimentais. Ainda não há nenhuma ferramenta operacional consolidada nessa linha.

E a **fronteira atual** é o **Soil2Cover**, publicado em 2025 pelo mesmo grupo do Terranimo. Ele pega o SoilFlex e integra ao planejamento de rota no campo: em vez de avaliar o risco de uma passagem, ele otimiza qual rota minimiza a compactação acumulada ao longo de toda a operação. Foi testado em mais de mil campos.

---

## Slide 7 — Quadro comparativo internacional

Esta tabela resume as 12 ferramentas mapeadas.

Notem a coluna "Web?" — apenas o Terranimo, PredComp e COMPSOHMA têm interface web acessível. Todas as outras são ferramentas de pesquisa que exigem programação ou software específico.

Na coluna "Status" — o Terranimo, SoilFlex e TASC são os únicos ativamente mantidos. Os modelos europeus mais antigos (SOCOMO, COMPSOIL) são referências acadêmicas, não plataformas vivas.

O ponto que fica claro nessa tabela: **o Terranimo ocupa um nicho vazio**. Não existe outra ferramenta que combine simultaneamente motor físico validado, web amigável, banco de máquinas pré-populado e saída operacional direta.

---

## Slide 8 — Divisória: Análogos Brasileiros

Vamos agora ao que temos no Brasil.

---

## Slide 9 — PredComp vs COMPSOHMA

No Brasil, as duas ferramentas funcionais são desenvolvidas pelo mesmo grupo — principalmente pelo pesquisador **Renato Paiva de Lima**, na ESALQ/USP, com colaboração do Anderson Rodrigo da Silva no IF Goiano e do Mauricio Cherubin.

O **PredComp** é o análogo acadêmico. Tem cinco abas de cálculo: tensão no perfil, estimativa de pré-adensamento via funções de pedotransferência, propriedades compressivas, avaliação de risco e predição de variação de densidade. A física é a mesma do SoilFlex. O problema é que exige que o usuário conheça ou estime parâmetros mecânicos do solo — o que limita o uso a quem tem formação em física do solo.

O **COMPSOHMA** é o análogo aplicado. A filosofia é a mesma do Terranimo Light: simplificar as entradas para que o técnico de campo consiga usar. O usuário escolhe a máquina, informa o teor de argila por camada e a umidade de forma qualitativa, e recebe um perfil de risco verde/amarelo/vermelho. Ainda está em beta e, por enquanto, os cenários estão configurados para cana-de-açúcar.

Ambos têm registro de propriedade intelectual no INPI e foram apresentados no CONBEA 2023 como ferramentas "Made in Brazil".

---

## Slide 10 — Pacote soilphysics — funções de compactação

O pacote `soilphysics` é a infraestrutura computacional que sustenta tudo isso. Está disponível no CRAN — o repositório oficial do R — e é mantido ativamente.

As cinco funções principais de compactação são:

- `stressTraffic` — calcula área de contato e propaga a tensão em profundidade;
- `soilDeformation` — prediz a variação de densidade após o carregamento;
- `soilStrength` e `soilStrength2` — estimam o pré-adensamento via funções de pedotransferência;
- `compressive_properties` — estima os parâmetros compressivos N, lambda e kappa.

Esse pacote é nosso ponto de partida computacional — a física já está implementada e validada.

---

## Slide 11 — PTFs calibradas com solos brasileiros

Um dado importante: o pacote já contém funções de pedotransferência calibradas com solos brasileiros.

Severiano e colaboradores (2013) calibraram equações para pré-adensamento de Latossolos em cinco faixas de teor de argila, de 152 a 521 g/kg. Imhoff e colaboradores (2004) fizeram o mesmo para Hapludox. De Lima e colaboradores fizeram calibrações para solos de textura média e argilosa.

Isso significa que para Latossolos — que dominam as áreas agrícolas brasileiras — temos uma base razoável.

A lacuna está nos outros grandes grupos: Argissolos, Nitossolos, Cambissolos e Neossolos. Para esses, não temos PTFs de resistência mecânica calibradas com dados brasileiros.

---

## Slide 12 — Grupos de pesquisa

O hub principal é a **ESALQ/USP** em Piracicaba. O grupo de Renato de Lima, Mauricio Cherubin e Álvaro Pires da Silva concentra o desenvolvimento das ferramentas e as publicações mais recentes. Rafael Menillo, no mesmo grupo, está desenvolvendo uma probe automatizada montada em trator para coleta de densidade aparente em campo — o que é essencial para calibração futura.

Fora da ESALQ, temos contribuições relevantes do IF Goiano, da UFLA — que gerou as PTFs para Latossolos — e dos grupos da UEM e UEPG no Paraná, que colaboraram com o próprio Keller no SoilFlex-LLWR.

A EMBRAPA Solos tem as bases de dados e a classificação de solos, mas não tem uma ferramenta pública de avaliação de compactação por tráfego.

---

## Slide 13 — Bases de dados e recursos brasileiros

Para um Terranimo brasileiro funcionar, ele precisa de parâmetros do solo. A boa notícia é que temos bases de dados relevantes.

O **BDSolos** da EMBRAPA tem milhares de perfis com granulometria, densidade e matéria orgânica — seria a fonte de parâmetros default por classe de solo, assim como o Terranimo usa bases europeias.

O **HYBRAS** tem curvas de retenção de água para solos brasileiros — útil para estimar o estado hídrico, que é entrada crítica do modelo de resistência.

O **SiBCS** dá a classificação pedológica — e poderíamos usar a classe do solo como chave para buscar automaticamente os parâmetros no BDSolos.

O app **SoloClass** da EMBRAPA já permite classificar o solo no campo pelo celular — poderia ser uma porta de entrada para o usuário no futuro.

---

## Slide 14 — Lacunas críticas

Com esse mapeamento, ficam claras seis lacunas para um Terranimo brasileiro.

A primeira é que não existe ferramenta agnóstica de cultura. O COMPSOHMA foi construído para cana. Grãos, café, citros, floresta, pastagem — sem cobertura.

A segunda é a ausência de integração espacial. Nenhuma das ferramentas brasileiras conecta com dados de GPS ou RTK para gerar um mapa de risco por trilha no campo.

A terceira é a ausência de capacidade embarcada — nada como o CLAAS CEMOS com Terranimo rodando dentro da cabine do trator.

A quarta é a cobertura incompleta de PTFs — precisamos de calibrações para os outros grandes grupos de solos.

A quinta é que toda a entrada de parâmetros ainda é manual — não há conexão automática entre a classe do solo e os parâmetros do modelo.

E a sexta é estrutural: o Brasil não tem um framework regulatório que vincule o tráfego de máquinas a limites de degradação do solo. Na Alemanha, o BBodSchG faz isso. Isso também afeta o incentivo para desenvolver e adotar essas ferramentas.

---

## Slide 15 — Próximos passos e proposta

Com base nesse mapeamento, a proposta é agir em três frentes.

No curto prazo: usar o **PredComp/soilphysics** como benchmark técnico — a física está pronta — e o **COMPSOHMA + Terranimo Light** como benchmark de interface e fluxo de decisão.

No médio prazo: **tropicalizar o modelo**. Isso significa incluir parâmetros de natureza e estado dos solos brasileiros — granulometria, limites de Atterberg, índice L para lateríticos, índice de vazios, grau de saturação e histórico de carregamento. Começar com 2 a 4 classes de solo piloto e calibrar o limiar de resistência σcrit por camada com ensaios de campo.

E a **integração-alvo** de longo prazo: conectar a classificação SiBCS e o BDSolos para fornecer parâmetros automaticamente, alimentar o motor de risco por camada, e entregar ao usuário um semáforo operacional com recomendação de ajuste — pressão do pneu, carga ou número de passadas.

---

## Slide 16 — Encerramento

É isso. O documento completo com todas as referências, links e detalhes técnicos está em:

`docs/mapeamento_analogos_terranimo_brasil_2026-03-30.pdf`

Fico à disposição para perguntas.

---

## Perguntas esperadas e respostas sugeridas

**"Por que não usar o Terranimo diretamente?"**
O backend é proprietário. Não temos acesso ao código de cálculo. A interface é europeia, sem parametrização para solos tropicais. E não há banco de máquinas brasileiras. Usamos como referência de fluxo e física, não como plataforma.

**"Qual a diferença do nosso protótipo para o PredComp?"**
O PredComp avalia o risco de uma operação pontual. Nosso protótipo integra passadas acumuladas ao longo de uma rota RTK, gera perfil temporal de compactação e aponta faixas críticas. A saída é operacional, não acadêmica.

**"Quando isso fica operacional?"**
Depende de calibração com dados de campo — cone index, densidade aparente, umidade — por classe de solo. A estrutura computacional já existe. O que falta é parametrização local.

**"A EMBRAPA não faz isso?"**
Tem bases de dados e classificação de solos excelentes. Não tem ferramenta pública de avaliação de risco de compactação por tráfego com o escopo do Terranimo.

**"O que é o Soil2Cover?"**
É a fronteira: em vez de avaliar se uma passagem causa risco, ele otimiza qual caminho o trator deve fazer para minimizar a compactação acumulada no campo inteiro. Publicado em 2025, ainda em fase de pesquisa.
