FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml ./
COPY src ./src
COPY alembic.ini ./
COPY migrations ./migrations

RUN python -m pip install --no-cache-dir .

# cloudflared: conector do Cloudflare Tunnel. Só roda se TUNNEL_TOKEN estiver
# definido; caso contrário o container sobe apenas a API (ver docker-entrypoint.sh).
ARG CLOUDFLARED_VERSION=2025.11.1
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && curl -fsSL "https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-linux-amd64" \
    -o /usr/local/bin/cloudflared \
 && chmod +x /usr/local/bin/cloudflared \
 && apt-get purge -y curl \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

EXPOSE 8000

COPY docker-entrypoint.sh ./
CMD ["bash", "docker-entrypoint.sh"]
