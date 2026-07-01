variable "domain" {
  description = "FQDN for the Authentik instance (for example auth.cig.technology)"
  type        = string
}

variable "tls_alt_domain" {
  description = "Additional DNS name used to obtain a fresh TLS certificate set for Authentik"
  type        = string
  default     = "auth-acme.cig.technology"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for the Authentik domain"
  type        = string
}

variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
  default     = "authentik"
}

variable "admin_email" {
  description = "Bootstrap admin email for Authentik"
  type        = string
  default     = "admin@cig.technology"
}

variable "oidc_client_id" {
  description = "OIDC client ID registered in Authentik"
  type        = string
  default     = "cig-dashboard"
}

variable "oidc_client_secret" {
  description = "Optional OIDC client secret. Leave empty to generate one."
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_auth_client_id" {
  description = "Google OAuth client ID used to seed the Authentik Google source"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_auth_client_secret" {
  description = "Google OAuth client secret used to seed the Authentik Google source"
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_auth_client_id" {
  description = "GitHub OAuth client ID used to seed the Authentik GitHub source"
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_auth_client_secret" {
  description = "GitHub OAuth client secret used to seed the Authentik GitHub source"
  type        = string
  default     = ""
  sensitive   = true
}

variable "dashboard_url" {
  description = "Public dashboard URL registered in Authentik"
  type        = string
  default     = "https://app.cig.lat"
}

variable "redirect_uris" {
  description = "OIDC redirect URIs for the dashboard application"
  type = list(object({
    url           = string
    matching_mode = string
  }))
  default = [
    {
      url           = "https://app.cig.lat/auth/callback"
      matching_mode = "strict"
    },
    {
      url           = "https://app.cig.technology/auth/callback"
      matching_mode = "strict"
    },
    {
      url           = "http://localhost:3001/auth/callback"
      matching_mode = "strict"
    },
  ]
}

variable "authentik_image_tag" {
  description = "Authentik Docker image tag"
  type        = string
  default     = "2024.12.3"
}

variable "instance_type" {
  description = "EC2 instance type for the Authentik host"
  type        = string
  default     = "t3.small"
}

variable "vpc_cidr" {
  description = "VPC CIDR block for the Authentik host"
  type        = string
  default     = "10.43.0.0/16"
}

variable "public_subnet_cidr" {
  description = "Public subnet CIDR block for the Authentik host"
  type        = string
  default     = "10.43.1.0/24"
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size in GiB"
  type        = number
  default     = 30
}

variable "ssh_public_key" {
  description = "Optional EC2 SSH public key. Leave empty to disable SSH access."
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_host" {
  description = "SMTP host used by Authentik for email delivery"
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "SMTP port used by Authentik for email delivery"
  type        = number
  default     = 587
}

variable "smtp_username" {
  description = "SMTP username used by Authentik"
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_password" {
  description = "SMTP password used by Authentik"
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_from" {
  description = "From address used by Authentik"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
