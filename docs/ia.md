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
| Publicar em produção e provisionar infraestrutura | Escolher free tier (Render + Neon), documentar variáveis de ambiente e criar módulo Terraform mínimo (Cloudflare Tunnel + DNS) | URLs, variáveis e limitações do free tier revisados em `docs/deploy.md`; plano Terraform revisado antes de aplicar, com registro de drift corrigido no PR #8. |
| Construir interface do motorista e coletor OBD-II | Dashboard web mínimo que consome a API, coletor ELM327 via Web Bluetooth e script PC com python-OBD, identificação por VIN | Telas, contrato consumido e fluxo de conexão revisados; VIN é melhor esforço (Mode 09 PID 02) com preenchimento manual como fallback. |
| Automatizar o passo a passo de coleta no PC | Script guia que verifica Python/`obd`, testa credenciais na nuvem, detecta a porta COM via `ATZ` e inicia o coletor | Erros traduzidos em instruções (401/403/503) e uso da URL da nuvem por padrão; script `scripts/iniciar-coleta.ps1` revisado antes de uso. |

O estudante deve revisar e compreender cada mudança e decisão antes da entrega.
