terraform {
  required_version = ">= 1.6"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Backend local por enquanto. Para trabalho em equipe, migrar para
  # backend remoto (ex.: Terraform Cloud) antes de compartilhar o state.
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
