output "public_hostname" {
  description = "Hostname público provisionado."
  value       = "https://${var.hostname}.${var.cloudflare_zone_name}"
}

output "tunnel_cname_target" {
  description = "Destino CNAME esperado para o túnel."
  value       = "${var.cloudflare_tunnel_id}.cfargotunnel.com"
}
