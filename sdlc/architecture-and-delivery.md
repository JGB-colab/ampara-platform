# Arquitetura e entrega

Este documento descreve a arquitetura-alvo mínima e o fluxo do artefato até a execução. A sequência de implementação e os critérios por etapa estão em [`milestones.md`](milestones.md); controles de segurança estão em [`security.md`](security.md).

## Direção arquitetural

Começar com um monólito modular em Python. O fluxo inicial é uma leitura sintética de telemetria que entra pela API, passa por validação de domínio, é persistida e pode ser consultada. A stack proposta é:

- **API e contrato:** Python + FastAPI + Pydantic; OpenAPI gerado pela API.
- **Persistência:** PostgreSQL + SQLModel + Alembic para migrações.
- **Qualidade:** pytest para testes unitários e de integração; HTTPX/TestClient para exercitar a API.
- **Ambiente local:** Docker Compose.
- **Desempenho:** k6.
- **Métricas e dashboards:** Prometheus + Grafana, depois do fluxo principal estar funcional.
- **Infraestrutura:** Terraform, com provedor cloud escolhido quando houver ambiente e orçamento definidos.
- **CI:** GitHub Actions é a opção inicial por corresponder ao caminho `.github/workflows/ci.yml` do material final; confirmar com o professor se isso satisfaz a exigência geral de Jenkins. Manter um único pipeline canônico.

Não incluir frontend na primeira fatia; a API e o fluxo demonstrável são suficientes para estabelecer o domínio. A stack é uma proposta, não um motivo para reescrever um componente já funcional. Se o projeto-base escolhido já trouxer uma opção equivalente, registrar a decisão e reaproveitá-la. Mudanças que alterem uma decisão importante devem ser registradas em ADR.

```text
Gerador/Coletor simulado → API → regras de telemetria → persistência PostgreSQL
                                                ↓
                                         consulta pela API
```

### Responsabilidades previstas

- **API:** valida formato e autenticação, chama regras de domínio e converte resultados em respostas HTTP.
- **Telemetria:** define evento, unidades, PIDs permitidos, validação sem dependência de HTTP ou banco e política de duplicatas.
- **Persistência:** grava e consulta eventos, mantendo restrições e transações no banco.
- **Coletor simulado:** fornece leituras sintéticas reproduzíveis para desenvolvimento e testes; não depende de hardware.

Essas são fronteiras de responsabilidade, não uma obrigação de criar quatro serviços ou quatro camadas artificiais. O domínio fica dentro de um processo até existir razão concreta para distribuí-lo. Painel, worker assíncrono, ML, cache, fila gerenciada e integração com ELM327 físico são posteriores ao primeiro fluxo.

## Ambiente local

Docker Compose deve iniciar somente os componentes necessários à fatia atual. Configurações de exemplo podem ser versionadas; valores secretos ficam em ambiente local ignorado pelo Git ou em mecanismo de segredo apropriado. Dados de desenvolvimento e testes são sintéticos.

O ambiente local é o primeiro alvo de execução. Um deploy remoto só entra depois do container e do pipeline estarem reproduzíveis, com ambiente e custo conhecidos. Staging e produção não são pré-requisitos para validar o domínio.

## Fluxo de desenvolvimento e entrega

O processo de trabalho e seus checkpoints estão em [`README.md`](README.md). Para manter comportamento reproduzível, comandos de validação são compartilhados por local e CI.

### Pull request

1. Obter o commit exato e instalar dependências fixadas por lockfile.
2. Executar formatação/lint e análise estática adequados à stack escolhida.
3. Executar testes unitários e testes de integração com dependências efêmeras ou Compose.
4. Verificar segredos e dependências segundo o estágio do projeto.
5. Construir a imagem/container e executar um smoke test quando essa etapa estiver habilitada.
6. Validar Terraform (`fmt`, `validate`, análise estática e plano revisável) quando IaC fizer parte da mudança.

Qualquer gate obrigatório com falha bloqueia a aprovação. CI não aplica mudanças em produção.

### Release e implantação

Quando houver ambiente de staging, publicar uma imagem identificada pelo commit, implantá-la e executar health/smoke tests. Promover o mesmo artefato já validado. Mudanças de infraestrutura usam plano revisado; produção requer aprovação explícita, credenciais separadas e plano de recuperação.

### Ferramenta de pipeline

Há uma divergência nos materiais: os requisitos gerais do programa citam Jenkins, enquanto a estrutura do projeto final mostra `.github/workflows/ci.yml`. A proposta inicial é GitHub Actions pela simplicidade e pela estrutura de entrega; confirmar com o professor qual execução serve como evidência da nota. Se Jenkins for obrigatório, escolher Jenkins como o pipeline canônico em vez de manter dois pipelines. Os comandos de teste/build permanecem independentes da ferramenta.

## Testes

- **Unidade:** contrato, conversões, regras de domínio, limites e deduplicação.
- **Integração:** API, autenticação/autorização e persistência/migrações.
- **Smoke:** aplicação sobe, health responde e uma operação essencial funciona.
- **Carga:** k6 no endpoint principal, após estabelecer cenário, dados e alvo de p95 em `docs/desempenho.md`.

Cada teste precisa verificar um resultado observável. Cobertura percentual isolada não demonstra qualidade; priorizar asserts do fluxo principal e falhas importantes.

## Observabilidade e infraestrutura

Adicionar métricas de requisições, latência e erros quando o fluxo já funcionar. Prometheus coleta essas métricas e Grafana exibe-as em dashboards versionados, vinculados à execução k6. Evitar rótulos que carreguem IDs pessoais, tokens ou alta cardinalidade.

Terraform entra quando o deploy-alvo estiver escolhido. Começar pelo menor módulo necessário ao ambiente não produtivo, separar estado e credenciais e revisar o plano antes de aplicar. Não criar rede, banco gerenciado e runtime em nuvem por antecipação.

## Evolução de contexto

O desenho não pressupõe autenticação de usuários finais, conexão física ao veículo, isolamento multi-tenant completo, modelo preditivo ou alta disponibilidade no primeiro fluxo. Se algum desses requisitos se tornar necessário, documentar a necessidade, o risco, a decisão e os novos critérios de aceite antes de ampliar a solução.
