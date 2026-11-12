# Túnel Cloudflare Tunnel: conector seguro que expõe um serviço local
# (ou interno) em um hostname público com HTTPS gerenciado pela Cloudflare,
# sem abrir portas no roteador.

resource "random_id" "tunnel_secret" {
  byte_length = 32
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "api" {
  account_id = var.cloudflare_account_id
  name       = var.tunnel_name
  secret     = random_id.tunnel_secret.b64_std
  config_src = "cloudflare"
}

# Rota DNS: <hostname>.<zone> → <tunnel-id>.cfargotunnel.com (proxied).
# O ingress (qual serviço local responde) é configurado no painel
# Zero Trust ou via API; ver docs em terraform/README.md.
resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "${var.hostname}.${var.cloudflare_zone_name}"
  type    = "CNAME"
  value   = "${cloudflare_zero_trust_tunnel_cloudflared.api.id}.cfargotunnel.com"
  proxied = true
  ttl     = 1
  comment = "Cloudflare Tunnel gerenciado por Terraform (Ampara API)"
}
