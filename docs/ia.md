# Uso de IA

A IA foi usada como apoio de planejamento e implementação. O estudante deve revisar e compreender o código e as decisões antes da entrega.

## Prompts relevantes

| Objetivo | Prompt ou resumo | Revisão humana / decisão |
|---|---|---|
| Definir escopo e critérios do projeto final | Organizar a entrega por níveis, começar pelo fluxo funcional e separar melhorias avançadas | O escopo B inicial e os critérios de aceite foram revisados; nível final depende das evidências concluídas. |
| Especificar a primeira fatia | Desenhar ingestão, validação, persistência e consulta de telemetria sintética | Revisar contrato, allowlist de PIDs, política de duplicatas e segurança antes de aceitar a implementação. |
| Cobrir idempotência e autenticação no PostgreSQL | Acrescentar casos de repetição idêntica, conflito por conteúdo diferente e token inválido | Os três casos foram executados localmente contra PostgreSQL; os quatro testes de integração passaram. |
| Validar e preparar a mudança para revisão | Executar testes locais, conferir o diff e abrir um PR para executar a CI hospedada | A CI do PR #1 passou em lint, testes unitários, integração, cobertura e build/smoke. |

O estudante deve revisar e compreender cada mudança e decisão antes da entrega.
