# Terraform — Cloudflare Tunnel do Ampara

Provisiona um túnel Cloudflare Tunnel e a rota DNS pública para a API, sem abrir portas no roteador e sem custo.

## O que este módulo cria

| Recurso | Descrição |
|---|---|
| `cloudflare_tunnel.api` | Túnel gerenciado (`config_src = "cloudflare"` — regras de ingress pela API/painel Zero Trust) |
| `cloudflare_record.api` | CNAME `<hostname>.<zone>` → `<tunnel-id>.cfargotunnel.com` (proxied) |
| `random_id.tunnel_secret` | Segredo do túnel gerado e mantido no state |

## Pré-requisitos (conta gratuita)

1. Conta Cloudflare (sem cartão).
2. Zona `jgborg.dev.br` adicionada — apontar nameservers no registrador do domínio.
3. API token com escopo **Zone → DNS → Edit** e **Account → Cloudflare Tunnel → Edit** (My Profile → API Tokens).
4. `Account ID` e `Zone ID` no painel Cloudflare.

## Uso

```powershell
cd terraform
terraform init
terraform plan      # revise o que será criado
terraform apply     # confirma e cria
```

Alternativa às variáveis em `terraform.tfvars`: `TF_VAR_cloudflare_api_token`, `TF_VAR_cloudflare_account_id`, `TF_VAR_cloudflare_zone_id`, `TF_VAR_cloudflare_zone_name`.

## Depois do apply

O output `tunnel_token` alimenta o conector. Opções:

- **Remotamente gerenciado:** configurar o ingress no painel Zero Trust (Networks → Tunnels → Public Hostname) apontando para o serviço local (ex.: `http://localhost:8001`).
- **cloudflared local:** `cloudflared tunnel run --token <tunnel_token>` com `config.yml` local definindo `ingress` para `localhost:8001`.

## Regras deste módulo

- Segredos nunca versionados: `terraform.tfvars` está no `.gitignore`; `terraform.tfstate` também.
- `terraform plan` deve ser revisado antes de qualquer `apply`.
- `terraform destroy` remove túnel e registro DNS.

## Limitações

- O túnel expõe o que estiver configurado no ingress — para produção real, avaliar autenticação na borda (Cloudflare Access) e TLS fim-a-fim.
- Este módulo não provisiona a aplicação nem o banco; ele só publica um endpoint já existente.
