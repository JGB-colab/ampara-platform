# Plano de desempenho

## Estado

Plano fixado antes da primeira medição. Nenhum resultado de carga foi medido ainda; nenhum número de p95 é apresentado como observação.

## Fluxo e cenário

- **Endpoint principal:** `POST /v1/telemetria`. Execução separada e secundária: `GET /v1/veiculos/{vehicle_id}/telemetria`.
- **Dados:** eventos sintéticos gerados por script versionado com semente fixa; `event_id` único por iteração para evitar a política de duplicatas; veículo `classic-demo`; autenticação via `X-Device-Token` do `.env` local.
- **Ambiente medido:**
  - Host: Windows, AMD Ryzen 5 5500U, 5.8 GB RAM, Docker Desktop (Engine 27.2.0).
  - Containers: `ampara-platform-api` (imagem `python:3.12-slim`), `ampara-platform-db` (`postgres:16-alpine`, servidor 16.15).
  - Execução via `docker compose up -d` na porta `127.0.0.1:8001`.
- **Ferramenta:** k6, script versionado em `scripts/carga.k6.js`.
- **Alvo de p95:** ≤ 500 ms no estágio de carga sustentada, para `POST /v1/telemetria`. Alvo definido antes da medição, conservador para API + Postgres em container local sem otimização prévia.
- **Critério de erro:** menos de 1% de respostas fora de 2xx em cada estágio.

### Estágios k6

| Estágio | Perfil | Duração total |
|---|---|---|
| 1. Carga inicial | ramp 0 → 20 VUs em 1 min; sustenta 20 VUs por 2 min | 3 min |
| 2. Carga sustentada | 50 VUs constantes | 3 min |
| 3. Pico e recuperação | ramp 50 → 150 VUs em 1 min; sustenta 150 VUs por 1 min; desce a 0 | ~2.5 min |

Cada estágio grava resultado bruto em JSON para comparação posterior.

## Procedimento

1. Subir a stack e confirmar health check.
2. Preparar o conjunto sintético e registrar seu tamanho e semente.
3. Executar um smoke de carga para validar script e autenticação.
4. Executar cada estágio planejado sem concorrência de outras cargas relevantes.
5. Registrar latência, p95, taxa de erro, requisições por segundo, CPU e memória.
6. Relacionar métricas ao mesmo intervalo no dashboard de observabilidade quando ele estiver disponível.
7. Repetir após qualquer otimização e comparar nas mesmas condições.

## Resultados

### Execução 1 — `POST /v1/telemetria` — 2026-11-11

- **Commit:** `dbe009f` (docs do board; código da API inalterado desde `fc3e078`)
- **Ambiente:** host descrito acima; `docker compose up -d`; k6 v2.3.0 no host Windows
- **Massa:** 20.000 eventos sintéticos, seed 42 (`scripts/gerar_carga.py` → `scripts/carga/eventos.json`); iterações ciclam pela massa
- **Parâmetros:** 3 estágios do plano (0→20 VUs 1min + 20 VUs 2min; 50 VUs 3min; 50→150→0 VUs em 2m30s)
- **Bruto:** `scripts/carga/resultado-post.json`

| Métrica | Valor observado |
|---|---|
| Requisições | 67.120 (média 124,4 req/s) |
| Iterações | 67.120; 81 interrompidas no pico |
| p95 geral | 450,52 ms (avg 434,96 ms; max 60s — timeout do k6) |
| p95 estágio sustentado | **480,21 ms** — alvo ≤ 500 ms: **atingido** |
| Taxa de erro | **0,43%** (291 timeouts) — critério < 1%: **atingido** |

**Observações medidas:**

- Todos os erros foram timeouts concentrados no estágio de pico (150 VUs). O sistema saturou entre 50 e 150 VUs; requisições enfileiradas excederam o timeout de 60 s do k6.
- O p95 do estágio sustentado (480 ms) passou, mas com margem pequena (~4%).
- Hipótese de gargalo (pool de conexões / Postgres) registrada na seção de evolução; **nenhuma otimização foi aplicada** — medir antes de otimizar, conforme o plano.

### Execução 2 — `GET /v1/veiculos/{vehicle_id}/telemetria` — 2026-11-11

- **Commit:** `dbe009f`; mesmo ambiente e massa do POST
- **Parâmetros:** `MODO=consulta` — ramp 0→20 VUs em 1 min + 20 VUs por 2 min; `limit=100`
- **Bruto:** `scripts/carga/resultado-get.json`

| Métrica | Valor observado |
|---|---|
| Requisições | 19.594 (média 108,7 req/s) |
| p95 | **255,08 ms** (avg 151,41 ms; max 886,71 ms) |
| Taxa de erro | **0,00%** |

**Observações medidas:** a consulta leu a tabela já populada pelo teste de POST (~67 mil linhas) e manteve p95 baixo; nenhum gargalo observado neste cenário. Atenção: o volume retornado (100 leituras por resposta) inflou o tráfego de rede (~2 MB/s recebido).

### Limitações

- Teste local em host único (5.8 GB RAM); não representa capacidade de produção.
- A massa é cíclica: `event_id`s já ingeridos retornariam 200 (duplicata) em reexecuções imediatas, o que altera o custo do INSERT — para comparar otimizações futuras, recriar o banco (`docker compose down -v`) antes de cada medição.

## Evolução futura — hipóteses de otimização

Registro das hipóteses levantadas a partir da primeira medição, para orientar trabalho futuro sem otimizar no escuro. Nenhuma foi implementada; a ordem abaixo reflete impacto esperado sobre o gargalo observado (saturação no estágio de pico, ~150 VUs / >450 req/s).

### Método obrigatório para qualquer otimização futura

1. Repetir a mesma execução k6 (`scripts/carga.k6.js`, mesma massa `eventos.json`, mesmo ambiente) e guardar o JSON bruto antes da mudança.
2. Alterar **uma variável por vez** e rodar a mesma carga nas mesmas condições.
3. Comparar p95 por estágio, taxa de erro e req/s máximo na tabela de resultados; só aceitar a mudança se o gargalo medido melhorar sem regredir os critérios de aceite.
4. Registrar commit, diff resumido e números antes/depois neste documento.

### Hipóteses ordenadas por impacto esperado

1. **Pool de conexões SQLAlchemy** — o default (~5 + 10 overflow por processo) provavelmente estrangula os ~40 threads do threadpool sob pico. Verificar `docker stats` e contadores de espera; testar `pool_size`/`max_overflow` maiores antes de mexer em workers.
2. **Postgres como fundo do poço** — medir CPU/%util e I/O do container `db` durante o pico (`docker stats`). Se o banco satura, workers de API não resolvem; considerar tuning (`shared_buffers`, `effective_cache_size`) ou investigar se o `SELECT` de duplicata + `INSERT` pode ser reduzido (ex.: `INSERT ... ON CONFLICT`).
3. **Workers uvicorn > 1** — aumenta threadpools e pools em paralelo, mas multiplica conexões com o Postgres (teto `max_connections`) e pode apenas deslocar a fila para o banco. Avaliar só depois de medir os itens 1 e 2.
4. **Endpoints assíncronos** — `async def` com driver async (asyncpg) eliminaria o threadpool, mas é a mudança mais invasiva; só compensa se o gargalo for concorrência da API e não o banco.
5. **GET de consulta** — avaliar cache ou índice composto em `(vehicle_id, recorded_at)` se a consulta mostrar latência alta sob carga (medir com `MODO=consulta` antes de propor).

### O que não fazer sem medição

- Não adicionar cache, fila ou worker assíncrono "por precaução".
- Não escalar horizontalmente (réplicas) antes de esgotar as opções acima.
- Não inferir capacidade de produção a partir destes números locais (host único, 5.8 GB RAM).
