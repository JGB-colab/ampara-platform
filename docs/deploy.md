# Deploy em produção (free tier)

Ambiente de homologação público do Ampara, sem custo, usando Render (hosting) e Neon (PostgreSQL gerenciado).

## URLs

- **API:** https://ampara-platform.onrender.com
- **Documentação interativa (Swagger):** https://ampara-platform.onrender.com/docs
- **Health check:** https://ampara-platform.onrender.com/health

## Arquitetura

```text
Internet → Render (container Docker, build do Dockerfile do repo)
              ├── FastAPI/uvicorn :8000
              └── DATABASE_URL → Neon PostgreSQL (serverless, scale-to-zero)
```

- **Render:** Web Service Docker conectado ao repositório; deploy automático a cada push na `main`. Plano Free: 512 MB RAM, dorme após 15 min sem tráfego.
- **Neon:** projeto PostgreSQL free (1 GB storage, 100 CU-h/mês, scale-to-zero após 5 min).
- **Segredos:** `DATABASE_URL`, `AMAPARA_DEVICE_TOKEN` e `AMAPARA_ALLOWED_VEHICLE_ID` configurados como Environment Variables no painel do Render — nunca versionados.

## Variáveis de ambiente do serviço

| Variável | Origem |
|---|---|
| `DATABASE_URL` | Connection string do Neon com driver `postgresql+psycopg://` |
| `AMAPARA_DEVICE_TOKEN` | Token forte gerado localmente (`openssl rand -hex 32`) |
| `AMAPARA_ALLOWED_VEHICLE_ID` | `classic-demo` |

## Comportamento do free tier

- **Cold start:** após ~15 min sem requisições, o serviço dorme; a primeira request pode levar 30–60 s. Não é erro — é o spin-up.
- **Neon:** compute escala a zero após 5 min; a primeira query também pode ter latência extra.
- **Limites:** 512 MB RAM e CPU compartilhada — suficiente para demo e baixo tráfego, não para carga. Os números de `docs/desempenho.md` são do ambiente local e não se aplicam a este deploy.

## Verificação

```powershell
curl https://ampara-platform.onrender.com/health
# {"status":"ok"}

$env:AMAPARA_BASE_URL = "https://ampara-platform.onrender.com"
$env:AMAPARA_DEVICE_TOKEN = "<token configurado no Render>"
python scripts/smoke.py
```

## Limitações conhecidas

- Sem domínio customizado: Render Free não permite `api.jgborg.dev.br`; usar `*.onrender.com` ou planejar Cloudflare Tunnel/plano pago.
- Sem observabilidade remota: Prometheus/Grafana rodam apenas localmente (`--profile observability`).
- Autenticação é token único estático — adequada para demo, insuficiente para produção real (ver `sdlc/security.md`).
