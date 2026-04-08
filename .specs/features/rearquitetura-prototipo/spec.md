# Rearquitetura do Prototipo Specification

## Problem Statement

O diretorio `prototipo/` concentra hoje a maior parte do comportamento em um unico `index.html` com milhares de linhas, misturando estrutura de tela, estilos, datasets, estado, integracao com mapa, planner, missao e motor de compactacao. Isso reduz a legibilidade, aumenta o custo de manutencao e dificulta a continuidade das proximas sprints sem regressao.

A necessidade agora nao e trocar stack nem transformar o prototipo em uma aplicacao com build, mas reorganizar o que ja existe em uma arquitetura simples, coerente com o momento atual do projeto, preservando a abertura direta no navegador por duplo clique e o comportamento final ja entregue.

## Goals

- [ ] Tornar `prototipo/` legivel e navegavel, com responsabilidades previsiveis por arquivo e por dominio.
- [ ] Preservar o comportamento atual do prototipo sem regressao funcional perceptivel.
- [ ] Manter execucao local direta via `index.html`, sem build e sem servidor obrigatorio.
- [ ] Remover datasets embutidos do HTML e colocá-los em arquivos externos compativeis com uso via `file://`.
- [ ] Fixar uma estrategia simples de carregamento de dados externos compativel com duplo clique, sem loaders assincornos ou infraestrutura adicional.
- [ ] Estabelecer uma arquitetura proporcional ao tamanho atual do projeto, sem camadas abstratas desnecessarias.

## Out of Scope

Explicitamente excluido para evitar desvio de foco.

| Feature | Reason |
| --- | --- |
| Migracao para framework frontend | Nao atende a restricao de manter simplicidade e stack atual |
| Introducao de bundler ou pipeline de build | Viola o objetivo de abrir por duplo clique no navegador |
| Reescrita visual do prototipo | O resultado final deve permanecer equivalente ao atual |
| Mudanca funcional em planner, missao, mapa ou motor de compactacao | A feature trata arquitetura, nao redefinicao de comportamento |
| Nova camada de testes automatizados como requisito obrigatorio | Pode ser considerada depois, mas nao faz parte deste escopo |
| Arquitetura enterprise com DI container, event bus generico ou padroes superabstratos | Seria over-engineering para o momento atual do projeto |
| Fragmentacao excessiva em microarquivos ou microcamadas | O objetivo e melhorar clareza, nao espalhar a complexidade do arquivo unico |

---

## User Stories

### P1: Estrutura legivel e previsivel ⭐ MVP

**User Story**: Como mantenedor do prototipo, quero que responsabilidades estejam separadas em arquivos e modulos coerentes para localizar e alterar comportamentos sem depender de um unico arquivo gigante.

**Why P1**: Esse e o objetivo central da rearquitetura. Sem isso, a mudanca nao resolve o problema principal.

**Acceptance Criteria**:

1. WHEN um desenvolvedor procurar a logica de `planner`, `mission`, `terrain`, `map`, `tractor` ou `compaction` THEN o sistema SHALL fornecer um local previsivel para cada dominio.
2. WHEN um desenvolvedor precisar alterar a interface ou regra de negocio THEN o sistema SHALL reduzir a necessidade de navegar por um arquivo monolitico.
3. WHEN a rearquitetura for concluida THEN o sistema SHALL manter uma organizacao simples, compreensivel e proporcional ao tamanho atual do projeto.
4. WHEN uma responsabilidade aparecer apenas uma vez ou for muito pequena THEN o sistema SHALL preferir permanecer junto de um modulo relacionado em vez de virar um novo artefato isolado.

**Independent Test**: Inspecionar a estrutura final de `prototipo/` e confirmar que os principais dominios e camadas estao separados de forma clara e sem duplicacao confusa.

---

### P1: Compatibilidade com execucao local por duplo clique ⭐ MVP

**User Story**: Como usuario interno do prototipo, quero continuar abrindo o projeto diretamente no navegador para usar e revisar o fluxo sem depender de build ou servidor local.

**Why P1**: Essa restricao foi definida explicitamente e condiciona toda a arquitetura-alvo.

**Acceptance Criteria**:

1. WHEN o usuario abrir `prototipo/index.html` diretamente no navegador THEN o sistema SHALL inicializar sem depender de build.
2. WHEN os assets e scripts forem reorganizados THEN o sistema SHALL continuar compativel com execucao por `file://`.
3. WHEN os dados do prototipo forem externalizados THEN o sistema SHALL usar uma estrategia compativel com abertura local sem `fetch`, `import()` dinamico ou servidor auxiliar.
4. WHEN os datasets forem carregados THEN o sistema SHALL preferir carga estatica simples via `script src` ou mecanismo equivalente igualmente compativel com `file://`.
5. WHEN os modulos JavaScript forem organizados THEN o sistema SHALL usar scripts classicos carregados em ordem explicita no `index.html`, sem depender de bundler ou ES modules como requisito da arquitetura base.

**Independent Test**: Abrir `prototipo/index.html` por duplo clique e validar que o prototipo sobe localmente com seus fluxos principais disponiveis.

---

### P1: Preservacao do comportamento atual ⭐ MVP

**User Story**: Como patrocinador do prototipo, quero que a reorganizacao arquitetural mantenha o comportamento final atual para nao perder o valor ja entregue nas sprints anteriores.

**Why P1**: O usuario explicitou que nao aceita perda funcional nem simplificacao de escopo.

**Acceptance Criteria**:

1. WHEN a nova arquitetura estiver aplicada THEN o sistema SHALL preservar os fluxos atuais de HUD, mapa, missao, planner e compactacao.
2. WHEN o usuario interagir com os controles existentes THEN o sistema SHALL responder de forma equivalente ao comportamento atual.
3. WHEN houver mudanca estrutural interna THEN o sistema SHALL evitar regressao funcional perceptivel no uso manual do prototipo.
4. WHEN o prototipo for aberto apos a rearquitetura THEN o sistema SHALL continuar exibindo o mapa com o overlay do trator e os paineis principais do HUD.
5. WHEN o usuario dirigir o trator e alternar o debug THEN o sistema SHALL manter atualizacao operacional e overlay de debug equivalentes ao comportamento atual.
6. WHEN o usuario usar o painel da missao THEN o sistema SHALL manter restauracao, limpeza e exportacao dos dados da missao.
7. WHEN o usuario usar o planner THEN o sistema SHALL manter desenho do talhao, geracao/limpeza do plano, alternancia de modo visual, controle de zoom, enquadramento e alternancia entre bases/overlays.
8. WHEN o motor de compactacao rodar durante a navegacao THEN o sistema SHALL continuar atualizando o perfil e os indicadores expostos no HUD.
9. WHEN a nova arquitetura for publicada THEN o sistema SHALL poder invalidar dados persistidos de versoes anteriores, exigindo nova coleta nessa versao rearquitetada.

**Independent Test**: Comparar no browser antes e depois da rearquitetura os fluxos de navegacao do trator, debug, missao, planner, alternancia de base visual, renderizacao do HUD e atualizacao do motor de compactacao.

---

### P1: Datasets externos sem embutir dados no HTML ⭐ MVP

**User Story**: Como mantenedor do prototipo, quero tirar datasets de dentro do `index.html` para reduzir acoplamento e facilitar manutencao dos dados sem editar o arquivo principal.

**Why P1**: A externalizacao dos dados e parte explicita do objetivo arquitetural e viabiliza um `index.html` mais enxuto.

**Acceptance Criteria**:

1. WHEN os datasets forem reorganizados THEN o sistema SHALL manter os dados fora do corpo principal do `index.html`.
2. WHEN o prototipo precisar ler `terrain sources`, `terrain grid` e raster BDC THEN o sistema SHALL carregar esses dados a partir de arquivos externos compativeis com `file://`.
3. WHEN um mantenedor precisar atualizar um dataset THEN o sistema SHALL permitir essa alteracao sem editar a logica principal da pagina.
4. WHEN a estrategia de externalizacao for definida THEN o sistema SHALL priorizar arquivos de dados simples e declarativos, evitando loaders genericos ou pipelines especiais apenas para datasets.

**Independent Test**: Verificar que os datasets foram movidos para arquivos proprios e que a aplicacao continua inicializando corretamente usando-os.

---

### P2: Estado isolado por dominio

**User Story**: Como mantenedor do prototipo, quero separar o estado por dominio para reduzir acoplamento entre responsabilidades e permitir evolucao localizada.

**Why P2**: Isso melhora a manutencao e a evolucao, mas depende da definicao estrutural do MVP.

**Acceptance Criteria**:

1. WHEN o projeto for reorganizado THEN o sistema SHALL separar pelo menos os estados de `tractor`, `terrain`, `mission`, `planner`, `map` e `compaction` em fronteiras claras.
2. WHEN uma regra de um dominio mudar THEN o sistema SHALL minimizar o impacto nos demais dominios.
3. WHEN houver uma coordenacao global THEN o sistema SHALL usar apenas uma camada leve de runtime/orquestracao, sem store monolitico confuso.
4. WHEN um dominio nao justificar arquivo proprio de estado THEN o sistema SHALL permitir consolidacao em um modulo do proprio dominio para evitar fragmentacao artificial.

**Independent Test**: Revisar a organizacao dos modulos e confirmar que cada dominio possui seu proprio estado e pontos claros de integracao.

---

### P2: UI desacoplada da logica de dominio

**User Story**: Como mantenedor do prototipo, quero que renderizacao e manipulacao de DOM fiquem separadas das regras de negocio para facilitar leitura e manutencao.

**Why P2**: Essa separacao aumenta a clareza da arquitetura, mas pode ser feita sobre a base da modularizacao principal.

**Acceptance Criteria**:

1. WHEN a interface for atualizada THEN o sistema SHALL manter a logica de calculo e estado fora dos modulos de UI.
2. WHEN a logica de `planner` ou `compaction` evoluir THEN o sistema SHALL permitir mudancas sem reescrever os bindings principais de DOM.
3. WHEN a UI for renderizada THEN o sistema SHALL consumir estado ou view models de dominios sem concentrar regras complexas no renderer.
4. WHEN a separacao entre UI e dominio aumentar o numero de arquivos sem ganho real de clareza THEN o sistema SHALL preferir coesao local em vez de separacao excessiva.

**Independent Test**: Inspecionar os modulos e verificar que arquivos de UI nao concentram calculos centrais de dominio.

---

### P3: Base para continuidade das proximas sprints

**User Story**: Como mantenedor do roadmap do prototipo, quero uma arquitetura que aceite novas iteracoes sem voltar ao padrao de concentrar tudo em um unico arquivo.

**Why P3**: E um ganho importante de medio prazo, mas depende da resolucao das necessidades imediatas de legibilidade e preservacao funcional.

**Acceptance Criteria**:

1. WHEN uma nova sprint precisar adicionar comportamento THEN o sistema SHALL oferecer pontos naturais de extensao por dominio ou camada.
2. WHEN a estrutura for apresentada para manutencao futura THEN o sistema SHALL parecer proporcional ao tamanho atual do projeto, sem complexidade excessiva.
3. WHEN novas responsabilidades forem adicionadas THEN o sistema SHALL desencorajar o retorno ao padrao de arquivo unico.
4. WHEN a arquitetura-alvo for proposta THEN o sistema SHALL favorecer poucos modulos bem definidos em vez de uma arvore profunda de pastas e abstrações.

**Independent Test**: Revisar a arvore proposta e confirmar que ha locais previsiveis para extensoes futuras sem necessidade de recompactar tudo no `index.html`.

---

## Edge Cases

- WHEN o prototipo for aberto via `file://` THEN o sistema SHALL evitar abordagens de carregamento que dependam de `fetch` local bloqueado pelo navegador.
- WHEN um dataset externo estiver ausente ou invalido THEN o sistema SHALL expor falha de forma diagnostica, sem esconder o problema no bootstrap.
- WHEN a rearquitetura alterar a proveniencia interna dos datasets ou o formato efetivo da missao THEN o sistema SHALL poder reinicializar a missao persistida e exigir nova coleta, sem compromisso de compatibilidade retroativa.
- WHEN a rearquitetura introduzir muitos arquivos THEN o sistema SHALL ainda manter navegabilidade simples e intuitiva.
- WHEN houver necessidade de coordenacao entre dominios THEN o sistema SHALL evitar tanto acoplamento cruzado excessivo quanto um runtime global opaco.
- WHEN uma decisao arquitetural aumentar complexidade sem ganho real para o momento atual do projeto THEN o sistema SHALL preferir a opcao mais simples.
- WHEN duas opcoes arquiteturais forem viaveis THEN o sistema SHALL escolher a que exigir menos infraestrutura, menos indirecao e menos pontos de entrada.
- WHEN uma separacao proposta existir apenas por pureza teorica THEN o sistema SHALL ser rejeitada em favor de uma modularizacao mais pragmatica.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ARQ-PROT-01 | P1: Estrutura legivel e previsivel | Design | Pending |
| ARQ-PROT-02 | P1: Estrutura legivel e previsivel | Design | Pending |
| ARQ-PROT-03 | P1: Compatibilidade com execucao local por duplo clique | Design | Pending |
| ARQ-PROT-04 | P1: Compatibilidade com execucao local por duplo clique | Design | Pending |
| ARQ-PROT-05 | P1: Preservacao do comportamento atual | Design | Pending |
| ARQ-PROT-06 | P1: Preservacao do comportamento atual | Design | Pending |
| ARQ-PROT-07 | P1: Preservacao do comportamento atual | Design | Pending |
| ARQ-PROT-08 | P1: Preservacao do comportamento atual | Design | Pending |
| ARQ-PROT-09 | P1: Datasets externos sem embutir dados no HTML | Design | Pending |
| ARQ-PROT-10 | P1: Datasets externos sem embutir dados no HTML | Design | Pending |
| ARQ-PROT-11 | P1: Datasets externos sem embutir dados no HTML | Design | Pending |
| ARQ-PROT-12 | P2: Estado isolado por dominio | Design | Pending |
| ARQ-PROT-13 | P2: Estado isolado por dominio | Design | Pending |
| ARQ-PROT-14 | P2: Estado isolado por dominio | Design | Pending |
| ARQ-PROT-15 | P2: UI desacoplada da logica de dominio | Design | Pending |
| ARQ-PROT-16 | P3: Base para continuidade das proximas sprints | Design | Pending |

**Coverage:** 16 total, 0 mapped to tasks, 16 unmapped pending design.

---

## Success Criteria

- [ ] A especificacao descreve uma arquitetura-alvo simples e coerente com o tamanho atual de `prototipo/`.
- [ ] A arquitetura-alvo preserva a execucao por duplo clique no navegador.
- [ ] A especificacao restringe explicitamente solucoes que dependam de infraestrutura incompativel com `file://`.
- [ ] A modularizacao proposta preserva o comportamento funcional atual do prototipo.
- [ ] A proposta externaliza datasets e reduz o papel do `index.html` como concentrador de toda a logica.
- [ ] A proposta favorece poucos modulos coesos e evita microarquivos sem ganho real.
- [ ] A estrutura resultante melhora legibilidade sem introduzir over-engineering.
