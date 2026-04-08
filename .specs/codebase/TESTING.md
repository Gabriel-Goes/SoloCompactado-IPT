# Testing Infrastructure

## Frameworks de Teste

**Unit/Integration:** Nenhum
**E2E:** Nenhum
**Coverage:** Nenhum

## Estado Atual

O protótipo **não possui testes automatizados**. Toda validação é manual ou via protótipos Python separados.

## Validação Existente (Alternativa a Testes)

**Simulações Python:**
- `src/prototipo_ponto_unico.py` — valida o motor de compactação para um ponto único
- `src/validacao_bloco1_matriz.py` — valida a matriz de compactação para o Bloco 1
- `src/prototipo_trajeto_3d.py` — valida propagação em 3D

**Outputs gerados:**
- `outputs/` — CSVs e PNGs com resultados das simulações
- Usados para conferência visual dos cálculos físicos

**Documentação Sphinx:**
- `sphinx/` — fundamentos físicos, validação e calibração documentados em RST

## Estratégia para Novas Features

Até que testes formais sejam adotados, validação deve ser feita via:
1. Inspeção visual no browser (HUD, overlay do mapa)
2. Comparação de saída JSON exportado da missão com valores esperados
3. Protótipo Python paralelo para cálculos críticos

## Comandos

Nenhum comando de teste disponível. Para rodar as simulações Python:
```bash
cd /home/ggrl/projetos/ipt/Civil/Geotecnia/SoloCompactado
python src/prototipo_ponto_unico.py
```
