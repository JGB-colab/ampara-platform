# ADR 0001: primeira fatia de telemetria

- **Status:** Aceita
- **Data:** 2026-11-06

## Contexto

O projeto precisa demonstrar um fluxo real e verificável dentro de um prazo curto. A conexão com veículo físico, interface gráfica, predição e infraestrutura cloud aumentariam dependências antes de provar o comportamento central.

## Decisão

Começar com uma API FastAPI de domínio único que recebe leituras sintéticas, valida uma allowlist pequena de PIDs, persiste no PostgreSQL e permite consultar as leituras do veículo autorizado. O ambiente local usa Docker Compose. O código aplica idempotência por `vehicle_id` e `event_id`.

O acesso do MVP usa um token de dispositivo configurado por ambiente e vinculado a um único `vehicle_id`. Esta é uma fronteira educativa para o fluxo de demonstração, não um sistema completo de gestão de identidades.

## Política de dados inválidos e duplicatas

- Cada requisição contém uma leitura. Uma leitura inválida é rejeitada com HTTP 422; não há processamento parcial de lote.
- Repetir o mesmo `event_id` com conteúdo idêntico retorna a leitura existente sem criar outra linha.
- Reutilizar `event_id` com conteúdo diferente retorna HTTP 409.
- Timestamp precisa incluir fuso horário e é normalizado para UTC.

## Alternativas consideradas

- **Conectar o ELM327 desde o primeiro commit:** adiado para evitar depender do adaptador, do veículo e do protocolo durante a validação do domínio.
- **Diagnosticar falhas pelo áudio:** adiado porque exige dados de áudio representativos, rótulos confiáveis e validação específica; a primeira versão não fará alegações de diagnóstico.
- **Criar frontend:** adiado; a documentação interativa da API demonstra o fluxo inicial.
- **SQLite como banco principal:** não escolhido para execução local padrão; PostgreSQL aproxima o ambiente da persistência planejada. Testes unitários podem usar SQLite isolado quando a equivalência de comportamento for suficiente.

## Consequências

- O fluxo pode ser exercitado sem carro ou conta externa.
- O contrato da API permite trocar o gerador sintético por um coletor ELM327 posteriormente.
- A credencial única e a autorização por um veículo são limitadas; qualquer exposição pública exige autenticação, gestão de credenciais e revisão de segurança mais robustas.
- Métricas, k6, Grafana e Terraform seguem etapas posteriores, definidas em [`sdlc/milestones.md`](../../sdlc/milestones.md).
