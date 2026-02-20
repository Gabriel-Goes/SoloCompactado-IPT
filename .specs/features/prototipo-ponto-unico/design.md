# Design — Protótipo de Compactação em Ponto Único

## Escopo técnico
Modelo 1D (profundidade) com ponto único na superfície:
- entrada: parâmetros de máquina/pneu/solo + número de passadas;
- estado: índice de compactação por camada + tensão de pré-adensamento + sulco residual;
- saída: séries temporais e perfil final.

## Componentes
1. `contact_pressure_pa`: calcula pressão média de contato.
2. `bekker_sinkage_m`: converte pressão em afundamento equivalente.
3. `vertical_stress_profile_pa`: distribui tensão por profundidade.
4. `simulate`: aplica múltiplas passadas e atualiza estados.
5. `virtual_sensors`: converte estado final em cone index e densidade sintéticos.
6. `plot_outputs`: cria gráficos de evolução e perfil final.

## Decisões
1. Histerese simplificada por aproximação assintótica do sulco residual.
2. Atualização de compactação por camada com saturação (`1 - C/Cmax`).
3. Uso de CSV + PNG para inspeção rápida por equipe multidisciplinar.

## Riscos
1. Parâmetros default sem calibração de campo.
2. Distribuição de tensão simplificada para contato pneu-solo real.
3. Ausência de variáveis dinâmicas (velocidade, escorregamento, vibração).

## Evolução planejada
1. Ingestão de telemetria real por operação.
2. Calibração por solo/umidade.
3. Extensão de ponto único para malha 2D de trilha.
