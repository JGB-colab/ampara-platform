# Terraform — DNS do túnel Cloudflare do Ampara

Gerencia **apenas o registro DNS** que publica a API via Cloudflare Tunnel. O túnel em si e o Public Hostname (qual serviço responde) são criados manualmente no painel Zero Trust — essa divisão é intencional: o API token do Terraform só precisa de permissão de DNS.

## Arquitetura

```
Visitante → api.jgborg.dev.br → Cloudflare edge
         → túnel (cloudflared rodando na máquina)
         → http://localhost:8001 (API Ampara)
```

## O que este módulo gerencia

| Recurso | Descrição |
|---|---|
| `cloudflare_record.api` | CNAME `api.jgborg.dev.br` → `<tunnel-id>.cfargotunnel.com` (proxied) |

## Pré-requisitos (todos gratuitos)

1. Conta Cloudflare + zona `jgborg.dev.br` (nameservers apontados no registrador).
2. **Zero Trust** ativado em one.dash.cloudflare.com (escolher team name grátis).
3. Túnel criado manualmente: **Networks → Tunnels → Add → Cloudflared** → copiar o **Tunnel ID** (UUID).
4. API token com escopo **Zone → DNS → Edit** para a zona (My Profile → API Tokens).
5. `Zone ID` no painel Cloudflare (sidebar direita do domínio).

## Configuração do túnel (painel Zero Trust)

Em **Networks → Tunnels → seu túnel → Public Hostname**:

- Subdomain: `api` · Domain: `jgborg.dev.br`
- Service: `http://localhost:8001` (API local) ou `https://ampara-platform.onrender.com`

> Se o Public Hostname já criar o DNS automaticamente, **não rode o apply** — o registro já existe e daria conflito. Nesse caso, ou remova a rota DNS no painel e deixe o Terraform criar, ou use `terraform import` para adotar o registro existente.

## Uso

```powershell
cd terraform
# preencha terraform.tfvars (ver terraform.tfvars.example) ou use TF_VAR_*
terraform init
terraform plan      # revise o que será criado
terraform apply     # confirma e cria o CNAME
```

## Conector cloudflared (o que segura o túnel)

O túnel só funciona enquanto um `cloudflared` estiver conectado. Na máquina que hospeda a API:

```powershell
# instalar uma vez (PowerShell como Administrador):
cloudflared.exe service install <TUNNEL_TOKEN>

# verificar:
cloudflared.exe service status
```

O `TUNNEL_TOKEN` aparece na tela do túnel no painel Zero Trust. Instalar como serviço faz o conector subir com o Windows, sem terminal aberto.

## Regras deste módulo

- Segredos nunca versionados: `terraform.tfvars` e `terraform.tfstate` estão no `.gitignore`.
- `terraform plan` deve ser revisado antes de qualquer `apply`.
- `terraform destroy` remove apenas o registro DNS — **não** apaga o túnel (gerenciado no painel).

## Limitações

- O túnel expõe o que o Public Hostname apontar — a API continua protegida pelo `X-Device-Token`, mas para produção avaliar Cloudflare Access na borda.
- Este módulo não provisiona a aplicação, o banco nem o conector cloudflared.
