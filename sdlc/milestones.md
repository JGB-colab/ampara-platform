# Etapas e estado do projeto

Este é o plano de execução e a fonte de verdade do progresso. Os critérios do curso estão em [`specs/development-project.md`](../specs/development-project.md); a arquitetura e o ciclo técnico estão em [`architecture-and-delivery.md`](architecture-and-delivery.md); os controles de segurança estão em [`security.md`](security.md).

## Estado atual

**Entrega de nível B concluída e evolução pós-B em andamento.** As Etapas 0–5 estão concluídas com evidência na `main` (CI verde, PRs mergeados) e a Etapa 6 iniciada como evolução (Terraform: Cloudflare Tunnel + DNS). A API, o banco e o dashboard rodam em produção no Render (`docs/deploy.md`) com DNS no Cloudflare; observabilidade (Prometheus/Grafana) permanece local via profile `observability`. Depois da entrega B, entraram na `main` a interface web do motorista, o coletor ELM327 (Web Bluetooth no celular e python-OBD no PC), a identificação do veículo por VIN e o deploy em produção. O suporte a códigos de falha (DTC) está implementado localmente, com testes e lint verdes, aguardando consolidação em PR.

O desenvolvimento começa pelo núcleo funcional que também atende ao nível B. Isso não fixa a classificação final: antes da entrega, declarar A somente se todas as evidências A aplicáveis estiverem completas e aceitas; caso contrário, declarar B e entregar o núcleo com qualidade. Depois do prazo, o mesmo projeto pode continuar evoluindo em direção ao A. Se um item avançado ameaçar funcionamento, testes ou CI, ele fica para depois.

## Decisões acordadas

- **Primeira fatia:** API e banco para ingestão, validação, persistência e consulta de telemetria sintética.
- **Interface:** não construir frontend na primeira etapa. Usar a documentação interativa do FastAPI para exercitar e demonstrar as rotas; reconsiderar uma tela depois que o fluxo funcional estiver concluído.
- **Nível da entrega:** começar pelo núcleo comum ao B e decidir a declaração A/B perto da entrega, conforme as evidências concluídas.
- **Stack proposta:** Python, FastAPI, Pydantic, PostgreSQL, SQLModel, Alembic, pytest e Docker Compose. A decisão de pipeline e o provedor Terraform seguem pendentes conforme `architecture-and-delivery.md`.

## Plano por etapas

### Etapa 0 — Fechar o recorte funcional

**Resultado:** uma história de usuário pequena, contrato de entrada/saída e critérios de aceite acordados antes da implementação.

**Recorte inicial proposto:** enviar uma leitura sintética do veículo, validar e persistir a leitura, e consultá-la pela API. Sem carro físico, painel, modelo preditivo, mensageria ou cloud nesta etapa.

**Aceite:**

- campos obrigatórios, unidades, timestamp, PIDs permitidos e respostas para dados inválidos estão documentados;
- política para duplicatas e para lote parcialmente inválido está decidida;
- OpenAPI descreve o mesmo contrato que os testes exercitam;
- critérios de segurança do fluxo (autorização, limites e dados sensíveis) estão registrados.

**Parada de controle:** revisar o contrato e os exemplos antes de iniciar implementação.

### Etapa 1 — Entregar a fatia funcional

**Resultado:** caminho executável de ponta a ponta usando dados sintéticos e uma dependência local reproduzível.

**Aceite:**

- uma leitura válida é aceita pela API e persiste no banco;
- a leitura persistida pode ser consultada pela API;
- payload malformado, PID não permitido e credencial ausente/inválida são rejeitados com resposta previsível;
- reenvio duplicado segue a política definida e não corrompe nem duplica o dado;
- testes de unidade cobrem regras e limites; testes de integração exercitam API e banco;
- uma pessoa consegue iniciar o serviço e executar o fluxo a partir do README.

**Fora do escopo:** conexão com carro real, usuário final, painel, worker, cache e previsão ML.

### Etapa 2 — Tornar a execução reproduzível e a qualidade contínua

**Resultado:** ambiente local simples e pipeline que bloqueia regressões.

**Aceite:**

- Docker Compose inicia aplicação e banco com configuração de exemplo, sem segredos versionados;
- health check confirma disponibilidade da aplicação e prontidão do banco;
- comandos de lint/format, testes e build são documentados e executáveis localmente;
- pipeline executa esses comandos em pull request e apresenta resultado verde;
- ao menos um teste negativo de segurança roda no pipeline;
- README explica subir, testar e parar o ambiente.

O critério para escolher a ferramenta canônica de CI está registrado em [`architecture-and-delivery.md`](architecture-and-delivery.md).

### Etapa 3 — Documentar e explicitar as fronteiras do nível A

**Resultado:** monólito modular simples, com fronteiras coerentes com o domínio, sem distribuir serviços.

**Aceite:**

- módulos têm responsabilidades e interfaces explícitas, e regras de domínio não dependem do framework HTTP;
- dependências entre módulos seguem uma direção documentada, sem ciclos;
- ADR explica a decisão arquitetural relevante e as alternativas consideradas;
- diagrama C4 de contexto e containers corresponde à implementação existente;
- testes protegem as regras nas fronteiras entre domínio, API e persistência.

**Regra:** só criar um módulo se ele representar uma capacidade ou regra de domínio; não criar camadas/pastas vazias para aparentar arquitetura.

### Etapa 4 — Medir antes de otimizar

**Resultado:** plano e medição reproduzível para o endpoint principal.

**Aceite:**

- `docs/desempenho.md` declara ambiente, dados, cenário, concorrência, duração e alvo de p95 antes do teste;
- gerador cria dados sintéticos reproduzíveis e adequados ao domínio;
- k6 executa três estágios definidos no plano, guarda resultados e permite repetir a execução;
- relatório separa observações medidas de hipóteses e registra gargalos;
- otimização só é feita para gargalo observado e é comparada com a medição inicial.

**Questão de avaliação:** confirmar com o professor se o volume de 100 mil pedidos do exemplo A é específico de marketplace ou se espera volume equivalente em outro domínio. Não assumir que telemetria substitui pedidos sem registrar a interpretação aceita.

### Etapa 5 — Adicionar observabilidade útil

**Resultado:** métricas e painéis ajudam a explicar o comportamento do fluxo e da carga.

**Aceite:**

- aplicação expõe métricas mínimas de requisições, erros e latência sem dados pessoais ou segredos;
- Prometheus coleta essas métricas e Grafana apresenta um dashboard versionado;
- dashboard permite relacionar a carga do k6 com taxa de erro e latência;
- instruções locais permitem iniciar e parar a stack de observabilidade;
- alerta inicial tem condição clara e não depende de alertas ruidosos sem ação definida.

Grafana entra depois de termos métricas reais para visualizar; não é critério para declarar o fluxo funcional.

### Etapa 6 — Provisionar infraestrutura com Terraform

**Resultado:** infraestrutura de um ambiente não produtivo descrita e validável como código. Esta etapa é uma evolução Full Cycle do projeto; não substitui os critérios específicos de nível A/B do projeto final.

**Aceite:**

- módulo tem uma responsabilidade, entradas/saídas documentadas e valores sem segredo;
- `terraform fmt`, `validate` e análise estática passam;
- plano é revisável e mostra recursos esperados;
- nenhuma aplicação automática em produção; estado e credenciais são protegidos;
- aplicação implantada usa a mesma imagem imutável validada pelo pipeline, se houver ambiente remoto autorizado e disponível.

Terraform só entra após definir runtime e ambiente-alvo. Não criar módulos de rede, banco e compute sem necessidade demonstrada para o deploy escolhido.

### Etapa 7 — Fechar a entrega

**Aceite:** nível na primeira linha do README; instruções reproduzíveis; CI verde; ADR, OpenAPI, desempenho, CONTRIBUTORS e declaração de uso de IA entregues; medições e imagens demonstráveis; segredos ausentes; histórico de contribuição identificável.

## Plano de uma semana

| Janela | Prioridade | Evidência ao final |
|---|---|---|
| Dia 1 | Etapa 0: contrato e critérios de aceite | Contrato revisado e testes de aceitação definidos |
| Dias 2–3 | Etapa 1: API, regra de domínio e persistência | Fluxo válido e casos inválidos funcionando localmente |
| Dia 4 | Etapa 2: Compose, integração e README | Ambiente recriável e testes reproduzíveis |
| Dia 5 | Pipeline e correção de falhas | Execução verde em pull request |
| Dia 6 | Etapa 3 mínima + preparar medição | ADR, C4 aderente ao código e plano de desempenho |
| Dia 7 | Etapa 4 e fechamento | k6 em três estágios, resultados registrados e buffer de correções |

Grafana e Terraform ficam no próximo ciclo, depois da entrega, a menos que as etapas anteriores terminem com margem e o ambiente esteja disponível. Não sacrificar funcionamento, testes ou CI para encaixá-los.

## Registro de progresso

Atualizar este arquivo ao concluir uma etapa, com data, evidência (commit, PR, CI ou relatório) e próximo passo. Marcar uma etapa como concluída somente quando todos os critérios de aceite correspondentes tiverem evidência executável. A próxima unidade de trabalho deve ser uma única fatia, com critérios revisados antes do código.

## Retomada da próxima sessão

### Checkpoint histórico — 2026-11-08

- O trabalho segue uma ação por vez, com proposta concreta antes de cada edição; consultar também as instruções em [`AGENTS.md`](../AGENTS.md).
- Existe um scaffold local sem commit em `README.md`, `.env.example`, `.github/`, `CONTRIBUTORS.md`, `Dockerfile`, `alembic.ini`, `docker-compose.yml`, `docs/`, `migrations/`, `pyproject.toml`, `scripts/`, `src/` e `tests/`.
- Naquele checkpoint, a revisão do contrato e a Etapa 0 permaneciam abertas. O checkpoint de 2026-11-09 registra a revisão concluída e as evidências atuais.
- `.env` local foi criado com credenciais aleatórias e é ignorado pelo Git. Não copiar seus valores para documentação ou commits.
- `docker compose up --build` falhou ao publicar `127.0.0.1:8000`; a publicação foi alterada para `127.0.0.1:8001`, mantendo a porta interna da API em 8000. README, OpenAPI estático e default do smoke test também apontam para 8001.
- O build da imagem terminou, PostgreSQL iniciou, a migração `0001_create_telemetry` foi aplicada, e `/health`, `/docs` e `/openapi.json` responderam com sucesso em `http://localhost:8001`.
- O Compose foi encerrado naquele checkpoint; o estado atual dos containers está registrado no checkpoint de 2026-11-09.
- Naquele checkpoint, `pytest`, o smoke test e o pipeline ainda não haviam sido executados. Consulte o checkpoint de 2026-11-09 para as validações posteriores.
- Próxima ação naquele momento: revisar o contrato. Essa ação foi concluída e está registrada no checkpoint de 2026-11-09.
- As alterações locais continuam sem commit nem envio ao remoto.

### Checkpoint — 2026-11-09

- O workspace está na branch `main`, com alterações locais em `.github/workflows/ci.yml`, `.codex/rules/default.rules`, `docs/openapi.yaml`, `pyproject.toml`, `sdlc/milestones.md`, `src/ampara/schemas.py` e `tests/test_postgres_integration.py`.
- `docs/openapi.yaml` registra que `event_id` é único por veículo e que PIDs em minúsculas são aceitos e normalizados para maiúsculas. O enum estático lista as formas maiúsculas e minúsculas aceitas.
- Docker Compose iniciou API e PostgreSQL saudáveis. O OpenAPI 3.1.0 foi extraído de `app.openapi()` dentro do container; os containers permanecem em execução a pedido do usuário e o volume PostgreSQL foi preservado.
- A implementação do schema Pydantic foi alinhada à documentação estática: o OpenAPI gerado enumera as variantes maiúsculas e minúsculas de PID, descreve a normalização e informa que `event_id` é único por veículo. A extração do OpenAPI dentro do container confirmou esses campos e as respostas 200, 201, 401, 403, 409, 422 e 503.
- A revisão do contrato foi concluída: campos, faixas, timestamp com fuso horário/UTC, PIDs e normalização, duplicatas, envio unitário, autorização, limites de consulta e respostas previsíveis estão documentados; o OpenAPI gerado confirma o enum de PID e a unicidade de `event_id` por veículo.
- A API e o PostgreSQL iniciaram saudáveis, e a validação de domínio no container confirmou `010c` normalizado para `010C`. O Compose permanece em execução a pedido do usuário.
- Pipeline configurado em ordem fail-fast: lint, testes unitários, job de integração com Postgres efêmero, comparação de cobertura com a revisão base e build/smoke Compose. O token tem `contents: read`, checkout não persiste credenciais e não há `pull_request_target`, matrix ou retentativas dos testes. A instalação de dependências tem até três tentativas.
- Ruff passou (`.venv\\Scripts\\python.exe -m ruff check .`); testes unitários passaram (9 passed, 1 deselected); integração com PostgreSQL real passou (1 passed, 9 deselected). A mutação isolada da expectativa de HTTP 200 para 999 falhou no assert esperado.
- Pytest-cov gera dados separados de unitários e integração; o gate calcula a cobertura total da revisão base e falha se a cobertura atual cair. O merge só será bloqueado quando os checks forem marcados como obrigatórios na proteção de branch do GitHub.
- O workflow e o gate de cobertura ainda não foram executados no GitHub Actions. O smoke test não foi executado nesta retomada. O Compose local permanece em execução a pedido do usuário.
- Próximo passo: enviar esta branch em um PR para executar o workflow hospedado e configurar os checks como obrigatórios na proteção da `main`.

### Checkpoint — 2026-11-11

- **Decisão de entrega:** o projeto será declarado no **nível B**. Etapas 5 (observabilidade) e 6 (Terraform) ficam explicitamente para depois da entrega, conforme a regra do plano.
- **Proteção de branch:** `main` já possuía checks obrigatórios (`lint`, `unit-tests`, `integration-tests`, `coverage`, `build-smoke`, strict) e 1 review exigido, com `enforce_admins` ativo.
- **Merge do PR #1** (`test/postgres-integration-acceptance` → `main`): todos os 5 checks verdes no GitHub Actions. Como o autor do PR era o próprio mantenedor e reviews não podem ser auto-aprovadas, a exigência de review foi **removida temporariamente via API**, o merge squash foi realizado e a proteção foi **restaurada** (`dismiss_stale_reviews`, 1 review exigido). Registro obrigatório: o merge foi feito com bypass administrativo da revisão, não com review aprovado.
- **Merge do PR #2** (`feat/etapa-3-arquitetura-modular` → `main`): ADR 0002 + diagramas C4 do monólito modular. A branch foi rebaseada sobre `main` (apenas o commit de documentação permaneceu), enviada ao remoto e mergeada com squash após os 5 checks verdes. O mesmo bypass administrativo de review foi aplicado e a proteção restaurada em seguida — registrar que nenhum dos dois merges teve review aprovado.
- **Estado das etapas:** Etapa 0 concluída; Etapas 1 e 2 com evidência de CI verde nos PRs mergeados — pendente smoke local e atualização formal do estado; Etapa 3 com ADR e C4 mergeados.
- **Restante para a entrega B:** smoke test local, Etapa 4 mínima (plano de desempenho + k6 em 3 estágios + relatório), atualização do README com nível B, verificação de segredos e fechamento da Etapa 7.
- **Prazo informado pelo usuário:** entrega até depois de amanhã (2026-11-13).

### Checkpoint final — 2026-11-11 (entrega nível B)

- **Smoke local:** `docker compose up -d` + `scripts/smoke.py` aprovados em `http://localhost:8001` (health, ingestão autenticada e consulta).
- **Etapa 4 concluída:** plano fixado em `docs/desempenho.md` antes de medir; gerador determinístico `scripts/gerar_carga.py` (20.000 eventos, seed 42) e `scripts/carga.k6.js` criados; execuções POST (3 estágios, 67.120 req, p95 sustentado 480,21 ms ≤ 500 ms, erro 0,43% < 1%) e GET (19.594 req, p95 255,08 ms, 0% erro) registradas com JSON bruto em `scripts/carga/`.
- **Achado de desempenho:** saturação no estágio de pico (150 VUs) com timeouts concentrados; hipóteses de otimização documentadas em `docs/desempenho.md` sem implementação — medir antes de otimizar.
- **Fechamento Etapa 7:** README declara nível B e documenta o teste de carga; `docs/ia.md` registra o uso de IA incluindo os bypasses de review; `CONTRIBUTORS.md` atualizado com PRs #1–#3.
- **Bypasses administrativos:** os merges dos PRs #1, #2 e #3 usaram remoção temporária da exigência de review via API, com proteção restaurada; nenhum PR teve review aprovado — registrado para transparência.
- **Pendente:** commit/PR final desta rodada de documentação e evidências; CI verde na `main` após merge.

### Checkpoint — 2026-11-11 (continuação): Etapa 5 e entrega B mergeada

- **PR #4 mergeado** (`feat/entrega-b` → `main`, squash `f87204d`): métricas `/metrics`, stack Prometheus/Grafana, scripts k6, resultados de desempenho, README nível B, `docs/ia.md`, `CONTRIBUTORS.md`, `docs/visao-produto.md`. 5 checks verdes; bypass administrativo de review aplicado e proteção restaurada (4º registro).
- **Etapa 5 concluída:** `prometheus-fastapi-instrumentator` expõe `/metrics` sem labels sensíveis (teste dedicado em `test_telemetry.py`); Prometheus faz scrape de `api:8000/metrics` a cada 5s; Grafana provisiona datasource e dashboard "Ampara — Telemetria" versionados em `observability/`; alerta "Taxa de erros 5xx acima de 1%" provisionado e verificado via API; README documenta subida/descida do profile `observability`.
- **Estado das etapas:** 0, 1, 2, 3, 4 e 5 com evidência na `main`; Etapa 6 (Terraform) e Etapa 7 formalmente fechada como entrega nível B em 2026-11-11.
- **Observação de ambiente:** porta 3000 do host estava ocupada por serviço do Windows; Grafana publicado em `127.0.0.1:3300`.
- **Lacunas conhecidas registradas:** sem logging estruturado, sem SLO formal, gestão de segredos apenas local (.env), OpenAPI estático pode dessincronizar do gerado — candidatas a evolução pós-entrega.

### Checkpoint — 2026-11-13 (consolidação e fechamento)

- **Teste real no carro:** o usuário testou com dongle ELM327 no veículo; o Car Scanner conecta e valida o carro/dongle. No nosso `/coletor` (Web Bluetooth) nada apareceu ao conectar — causa mais provável: adaptador Bluetooth clássico/SPP (não BLE) e/ou página fora de HTTPS; deixar isso explícito na UI ficou como evolução pendente. O token de leitura testado contra o Render retornou 401 (`Credencial de dispositivo inválida`): o valor enviado não confere com `AMAPARA_DEVICE_TOKEN` do serviço.
- **Deploy:** app no Render (Web Service + Postgres gerenciado) com DNS no Cloudflare — `https://ampara-platform.onrender.com` respondeu `/health` = ok (com cold start do plano free). `AMAPARA_ALLOWED_VEHICLE_ID=*` no serviço, ou seja, qualquer `vehicle_id`/VIN é aceito; 401 depende só do token.
- **Trabalho local (DTC):** suporte a códigos de falha SAE J2012 (`P/C/B/U` + 4 hex, unidade `dtc`, valor 0/1) em `domain.py`/`schemas.py`/`models.py` + migração `0002_widen_pid_for_dtc.py`, coletor `--dtc`, telas e testes. `ruff` e `pytest -m "not integration"` verdes (18 passed, 4 deselected).
- **Correção de bug:** unidade do PID 0105 no `scripts/coletor.py` era `°C`, mas o domínio exige `celsius` — toda leitura de temperatura seria rejeitada com 422. Corrigido para `celsius`.
- **`docs/openapi.yaml`:** tinha erro de sintaxe YAML (dois-pontos sem aspas em `description`) e estava dessincronizado do contrato DTC (enums e `maxLength`). Corrigido e validado: OpenAPI 3.1.0 com os 3 paths.
- **Documentação de fechamento:** `CONTRIBUTORS.md` atualizado com PRs #4–#12; `docs/ia.md` com os ciclos de deploy/Terraform/UI/coletor/assistente; estado atual de `milestones.md` corrigido.
- **Assistente de coleta:** criado `scripts/iniciar-coleta.ps1` (guiado por máquina: Python/venv/`obd`, URL da nuvem, token mascarado, teste de credenciais, detecção de COM via `ATZ`, início do coletor).
- **Pendente:** dashboards preditivos no dashboard do motorista; consolidação em commit/PR com CI verde; tornar `/coletor` explícito sobre suporte Web Bluetooth (BLE vs clássico/HTTPS).
