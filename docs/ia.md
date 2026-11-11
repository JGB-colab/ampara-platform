# Uso de IA

A IA foi usada como apoio de planejamento e implementação. O estudante deve revisar e compreender o código e as decisões antes da entrega.

## Prompts relevantes

| Objetivo | Prompt ou resumo | Revisão humana / decisão |
|---|---|---|
| Definir escopo e critérios do projeto final | Organizar a entrega por níveis, começar pelo fluxo funcional e separar melhorias avançadas | O escopo B inicial e os critérios de aceite foram revisados; nível final depende das evidências concluídas. |
| Especificar a primeira fatia | Desenhar ingestão, validação, persistência e consulta de telemetria sintética | Revisar contrato, allowlist de PIDs, política de duplicatas e segurança antes de aceitar a implementação. |
| Cobrir idempotência e autenticação no PostgreSQL | Acrescentar casos de repetição idêntica, conflito por conteúdo diferente e token inválido | Os três casos foram executados localmente contra PostgreSQL; os quatro testes de integração passaram. |
| Validar e preparar a mudança para revisão | Executar testes locais, conferir o diff e abrir um PR para executar a CI hospedada | A CI do PR #1 passou em lint, testes unitários, integração, cobertura e build/smoke. |
| Mergear PRs com CI verde sob proteção de branch | Avaliar como mergear PRs de autoria do próprio mantenedor quando a proteção exige review | A exigência de review foi removida temporariamente via API e restaurada após cada merge squash (PRs #1, #2 e #3); os bypasses administrativos estão registrados em `sdlc/milestones.md` para revisão humana. |
| Planejar e executar teste de carga k6 | Definir plano antes de medir, gerar massa sintética reproduzível e executar 3 estágios de POST e GET | Plano, gerador (`scripts/gerar_carga.py`), script (`scripts/carga.k6.js`) e resultados em `docs/desempenho.md` foram revisados; saturação no pico registrada sem otimização prematura. |

O estudante deve revisar e compreender cada mudança e decisão antes da entrega.
