# Projeto B — Ampara

> **Nível declarado: B.** O núcleo funcional, a qualidade contínua, a documentação arquitetural e a medição de desempenho estão entregues. Observabilidade (Prometheus/Grafana) e infraestrutura como código (Terraform) ficam como evolução pós-entrega, conforme `sdlc/milestones.md`.

## Ampara

O Ampara é uma plataforma de telemetria e manutenção preditiva para veículos. O objetivo desta entrega é resolver um problema real com uma fatia pequena, executável e testada, e evoluí-la com práticas de engenharia Full Cycle.

## Escopo da primeira versão

O primeiro fluxo recebe uma leitura de telemetria sintética, valida os dados, persiste a leitura no PostgreSQL e permite consultá-la pela API.

O primeiro recorte não depende do carro, de um adaptador ELM327, de diagnóstico por áudio, de modelo preditivo ou de interface gráfica. A documentação interativa da API será usada para demonstrar as rotas. A integração com o veículo e qualquer interface visual poderão ser consideradas depois que o fluxo estiver confiável.

### Critérios de aceite

- Uma leitura válida é aceita e persistida.
- Uma leitura persistida pode ser consultada pela API.
- Dados inválidos e credenciais ausentes ou inválidas recebem respostas previsíveis.
- Reenvios duplicados seguem uma política definida e não criam inconsistências.
- Testes com asserções cobrem os comportamentos válidos e inválidos relevantes.
- O ambiente pode ser iniciado e validado seguindo as instruções deste README.

## Stack proposta

- Python, FastAPI e Pydantic para API e contrato OpenAPI.
- PostgreSQL, SQLModel e Alembic para persistência e migrações.
- pytest para testes.
- Docker Compose para execução local.
- GitHub Actions como proposta inicial de CI, pendente de confirmação do requisito do curso sobre Jenkins.

k6, Prometheus, Grafana e Terraform entram depois do fluxo principal, conforme as etapas e critérios descritos em [`sdlc/milestones.md`](sdlc/milestones.md).

## Como executar

### Com Docker Compose

```powershell
Copy-Item .env.example .env
# Edite .env e substitua os valores de exemplo por valores locais.
docker compose up --build
```

API: `http://localhost:8001`. Documentação interativa: `http://localhost:8001/docs`. Health check: `http://localhost:8001/health`.

Para parar a aplicação e o banco sem apagar o volume de dados local:

```powershell
docker compose down
```

### Testes

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
pytest
```

Smoke test contra a aplicação em execução:

```powershell
$env:AMAPARA_BASE_URL = "http://localhost:8001"
$env:AMAPARA_DEVICE_TOKEN = "use-o-token-configurado-no-.env"
python scripts/smoke.py
```

### Teste de carga (k6)

Requer [k6](https://k6.io) instalado e a stack no ar:

```powershell
# Gera a massa sintética reproduzível (20.000 eventos, seed fixa)
python scripts/gerar_carga.py

# POST /v1/telemetria — 3 estágios (~9 min)
$env:AMAPARA_DEVICE_TOKEN = "use-o-token-configurado-no-.env"
k6 run -e BASE_URL=http://localhost:8001 -e AMAPARA_DEVICE_TOKEN=$env:AMAPARA_DEVICE_TOKEN scripts/carga.k6.js

# GET /v1/veiculos/{vehicle_id}/telemetria — execução separada (~3 min)
k6 run -e MODO=consulta -e BASE_URL=http://localhost:8001 -e AMAPARA_DEVICE_TOKEN=$env:AMAPARA_DEVICE_TOKEN scripts/carga.k6.js
```

Resultados e limitações em [`docs/desempenho.md`](docs/desempenho.md). Para comparar otimizações futuras, recrie o banco (`docker compose down -v`) antes de cada medição.

O contrato documentado está em [`docs/openapi.yaml`](docs/openapi.yaml). Para a decisão sobre dados parciais, duplicatas e expansão do escopo, consulte [`docs/adr/0001-fluxo-de-telemetria.md`](docs/adr/0001-fluxo-de-telemetria.md).

## Documentação do projeto

- [Plano de desenvolvimento e critérios de aceite](sdlc/milestones.md)
- [Arquitetura, stack e pipeline](sdlc/architecture-and-delivery.md)
- [Requisitos e entregáveis do projeto final](specs/development-project.md)
- [Requisitos de segurança](sdlc/security.md)
- [Visão de produto e evolução](docs/visao-produto.md)

## Entrega do curso

Antes da entrega, atualizar o nível declarado na primeira linha conforme as evidências concluídas e incluir as instruções reproduzíveis, o link da CI verde, `docs/desempenho.md`, `CONTRIBUTORS.md` e `docs/ia.md`, conforme aplicável.
