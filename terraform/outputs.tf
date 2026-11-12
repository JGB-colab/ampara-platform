output "tunnel_id" {
  description = "ID do túnel criado."
  value       = cloudflare_zero_trust_tunnel_cloudflared.api.id
}

output "tunnel_token" {
  description = "Token para rodar o conector cloudflared (cloudflared tunnel run --token ...). Sensível."
  value       = cloudflare_zero_trust_tunnel_cloudflared.api.tunnel_token
  sensitive   = true
}

output "public_hostname" {
  description = "Hostname público provisionado."
  value       = "https://${var.hostname}.${var.cloudflare_zone_name}"
}
