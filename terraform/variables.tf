variable "cloudflare_api_token" {
  description = "API token da Cloudflare com permissão Zone.DNS Edit para a zona. Fornecido via variável de ambiente CLOUDFLARE_API_TOKEN ou -var."
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Zone ID do domínio (ex.: jgborg.dev.br) no painel Cloudflare."
  type        = string
}

variable "cloudflare_zone_name" {
  description = "Nome da zona/domínio raiz (ex.: jgborg.dev.br)."
  type        = string
}

variable "hostname" {
  description = "Subdomínio a publicar via túnel (sem o domínio raiz)."
  type        = string
  default     = "api"
}

variable "cloudflare_tunnel_id" {
  description = "ID (UUID) do túnel Cloudflare criado manualmente em Zero Trust → Networks → Tunnels."
  type        = string
}
