# Spec — Protótipo de Compactação em Ponto Único

## Problema
Sem dados reais disponíveis, precisamos de um protótipo conceitual que simule o efeito de múltiplas passadas de máquina pesada sobre um único ponto e uma coluna de solo de 5 m.

## Objetivo
Produzir um simulador executável que gere:
- evolução por passada de afundamento/sulco e índice de compactação;
- perfil vertical final (0-5 m) com métricas derivadas;
- saídas em CSV + gráficos para discussão técnica.

## Requisitos funcionais
1. Simular `N` passadas sobre o mesmo ponto.
2. Considerar massa da máquina, número de rodas e geometria de contato do pneu.
3. Usar relação pressão-afundamento para obter afundamento equivalente.
4. Atualizar estado de compactação por camadas até 5 m.
5. Exportar séries por passada e perfil final.
6. Gerar gráficos fáceis de interpretar para brainstorming técnico.

## Requisitos não funcionais
1. Script simples, rodável localmente com Python.
2. Sem dependência de dados externos obrigatórios.
3. Parâmetros ajustáveis por linha de comando.

## Critérios de aceitação
1. Execução padrão do script sem erro.
2. Geração dos arquivos esperados em `outputs/ponto_unico/`.
3. Tendência física plausível: aumento forte inicial e saturação gradual por passadas.
