#!/usr/bin/env bash
# Sobe a API e, se TUNNEL_TOKEN estiver definido, o conector cloudflared
# do Cloudflare Tunnel no mesmo container. Se qualquer processo morrer,
# o script termina e o orquestrador reinicia o container inteiro.
set -euo pipefail

alembic upgrade head

uvicorn ampara.api:app --host 0.0.0.0 --port 8000 &

if [ -n "${TUNNEL_TOKEN:-}" ]; then
  cloudflared tunnel --no-autoupdate run --token "$TUNNEL_TOKEN" &
fi

wait -n
exit 1
