variable "cloudflare_api_token" {
  description = "API token da Cloudflare com permissão Zone.DNS Edit e Account.Cloudflare Tunnel Edit. Fornecido via variável de ambiente CLOUDFLARE_API_TOKEN ou -var."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Account ID da conta Cloudflare (dashboard → qualquer domínio → sidebar direita)."
  type        = string
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

variable "tunnel_name" {
  description = "Nome do túnel Cloudflare."
  type        = string
  default     = "ampara-api"
}
