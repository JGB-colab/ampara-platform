# Rota DNS: <hostname>.<zone> → <tunnel-id>.cfargotunnel.com (proxied).
# O túnel em si e o Public Hostname (qual serviço responde) são criados
# manualmente no painel Zero Trust; o Terraform gerencia apenas o DNS.

resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "${var.hostname}.${var.cloudflare_zone_name}"
  type    = "CNAME"
  value   = "${var.cloudflare_tunnel_id}.cfargotunnel.com"
  proxied = true
  ttl     = 1
  comment = "Cloudflare Tunnel gerenciado por Terraform (Ampara API)"
}
