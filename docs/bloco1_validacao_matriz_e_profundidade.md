# Bloco 1 — Matriz de cenários e profundidade da coluna

## O que foi feito
1. Ajuste do protótipo para coluna padrão de `5 m` (configurável).
2. Execução da matriz OVAT (uma variável por vez) em `outputs/validacao_bloco1/`.
3. Geração de página dedicada no Sphinx: `sphinx/bloco1_validacao.rst`.

## Scripts
- Simulador principal: `src/prototipo_ponto_unico.py`
- Matriz de validação do bloco 1: `src/validacao_bloco1_matriz.py`

## Saídas principais
- `outputs/validacao_bloco1/sensibilidade_bloco1.png`
- `outputs/validacao_bloco1/sweep_passes.csv`
- `outputs/validacao_bloco1/sweep_mass.csv`
- `outputs/validacao_bloco1/sweep_moisture.csv`
- `outputs/validacao_bloco1/gate_checks.csv`

## Referências de profundidade radicular
A síntese de referências (Embrapa + artigos científicos) e a justificativa técnica do domínio de 5 m estão documentadas em:
- `sphinx/bloco1_validacao.rst`

## Observação
A adoção de 5 m é tratada como limite computacional prático para esta fase. Para interpretação agronômica, a priorização permanece nas camadas rasas e intermediárias.
