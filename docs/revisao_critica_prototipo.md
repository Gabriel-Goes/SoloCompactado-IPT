# Revisão Crítica do Protótipo (pré-apresentação)

Data: 2026-02-20

## Resumo
Foram identificados e tratados erros que afetavam robustez e clareza dos gráficos. O protótipo agora executa em cenários padrão e de borda sem falhas, com saída consistente (CSV + PNG).

## Achados e status

1. **[Corrigido] Falha para poucas passadas (`--passes < 10`)**
- Impacto: o script quebrava com `IndexError` na geração de snapshots do perfil.
- Causa: tentativa de acessar `Passada 10` mesmo quando `N < 10`.
- Correção: filtrar snapshots para o intervalo válido `1..N`.
- Referência: `src/prototipo_ponto_unico.py:276`

2. **[Corrigido] `NaN` em métricas por camada para `dz` alto**
- Impacto: `avg_compaction_0_30cm` e `avg_compaction_30_100cm` podiam ficar vazios e gerar `NaN`.
- Causa: máscaras de profundidade sem elementos em malhas muito grossas.
- Correção: fallback para camada mais próxima quando a banda não tiver pontos.
- Referências: `src/prototipo_ponto_unico.py:60`, `src/prototipo_ponto_unico.py:206`

3. **[Corrigido] Gráfico de sensores virtuais sem legenda**
- Impacto: leitura ambígua de qual curva representa cone index vs densidade.
- Correção: legenda combinada dos dois eixos (`ax_left` + `ax_right`).
- Referência: `src/prototipo_ponto_unico.py:318`

4. **[Corrigido] Gráfico principal sem legenda explícita das duas variáveis**
- Impacto: menor clareza para audiência não técnica.
- Correção: legenda combinada do eixo esquerdo e direito.
- Referência: `src/prototipo_ponto_unico.py:272`

5. **[Corrigido] Tratamento fraco de entradas inválidas**
- Impacto: erro com traceback em vez de mensagem clara ao usuário.
- Correção: validação de argumentos + saída amigável.
- Referências: `src/prototipo_ponto_unico.py:362`, `src/prototipo_ponto_unico.py:393`

6. **[Corrigido] Duplicação de conteúdo no README**
- Impacto: documentação com aparência de rascunho e risco de confusão em apresentação.
- Correção: remoção da seção repetida no final.
- Referência: `README.md:1`

## Evidências de verificação

Cenários executados com sucesso:
- `python3 src/prototipo_ponto_unico.py --passes 30 --output-dir outputs/ponto_unico`
- `python3 src/prototipo_ponto_unico.py --passes 5 --output-dir outputs/ponto_unico_passes5`
- `python3 src/prototipo_ponto_unico.py --passes 1 --dz-m 0.7 --output-dir outputs/ponto_unico_edge_dz`

Checagens automáticas:
- Arquivos esperados gerados (`series_passadas.csv`, `perfil_final_coluna.csv`, `parametros_simulacao.csv`, `evolucao_ponto_unico.png`, `sensores_virtuais_perfil_final.png`)
- Sem `NaN` nos CSVs
- `rut_depth_mm` monotônico não decrescente

## Riscos remanescentes (não são bugs, mas limitações)

1. Parâmetros físicos default ainda não calibrados com dados reais de campo.
2. Modelo de histerese e propagação de tensões é simplificado (adequado para TRL 4-5 conceitual).
3. Prototipo é ponto único; extensão espacial 2D por trilha ainda pendente.
