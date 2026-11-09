# Plano de desempenho

## Estado

Nenhum resultado de carga foi medido ainda. Este documento não apresenta números de p95 como se fossem observações.

## Fluxo e cenário

- **Endpoint principal:** `POST /v1/telemetria` e, em uma execução separada, consulta de leituras.
- **Dados:** eventos sintéticos reproduzíveis, com token e veículo de teste.
- **Ambiente:** Docker Compose local; registrar CPU, memória, sistema operacional, versões do container e do banco antes da execução.
- **Alvo de p95:** definir antes do primeiro teste, com base no objetivo do fluxo e no ambiente medido.
- **Estágios para A:** documentar carga inicial, carga sustentada e pico/recuperação, suas durações e taxa pretendida; executar os três com k6 e guardar o resultado bruto.

## Procedimento

1. Subir a stack e confirmar health check.
2. Preparar o conjunto sintético e registrar seu tamanho e semente.
3. Executar um smoke de carga para validar script e autenticação.
4. Executar cada estágio planejado sem concorrência de outras cargas relevantes.
5. Registrar latência, p95, taxa de erro, requisições por segundo, CPU e memória.
6. Relacionar métricas ao mesmo intervalo no dashboard de observabilidade quando ele estiver disponível.
7. Repetir após qualquer otimização e comparar nas mesmas condições.

## Resultados

Preencher após as execuções: data, commit, ambiente, massa de dados, parâmetros do k6, resultados observados e limitações. Não inferir capacidade de produção a partir de um teste local.
