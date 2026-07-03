variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for cig.technology in the target account"
  type        = string
}

variable "api_domain" {
  description = "Public API domain"
  type        = string
  default     = "api.cig.technology"
}

variable "authentik_domain" {
  description = "Public Authentik domain"
  type        = string
  default     = "auth.cig.technology"
}

variable "api_image_uri" {
  description = "Fully qualified API image URI to deploy"
  type        = string
}

variable "api_name_prefix" {
  description = "Resource prefix for the API host"
  type        = string
  default     = "cig-api"
}

variable "authentik_name_prefix" {
  description = "Resource prefix for the Authentik host"
  type        = string
  default     = "authentik"
}

variable "api_container_port" {
  description = "Internal container port exposed by the API"
  type        = number
  default     = 8080
}

variable "api_instance_type" {
  description = "EC2 instance type for the API host"
  type        = string
  default     = "t3.medium"
}

variable "neo4j_volume_size_gb" {
  description = "Neo4j data EBS volume size in GiB"
  type        = number
  default     = 25
}

variable "neo4j_version" {
  description = "Neo4j container image version"
  type        = string
  default     = "5.26"
}

variable "authentik_image_tag" {
  description = "Authentik Docker image tag"
  type        = string
  default     = "2026.2.1"
}

variable "authentik_admin_email" {
  description = "Bootstrap admin email for Authentik"
  type        = string
  default     = "admin@cig.technology"
}

variable "authentik_oidc_client_id" {
  description = "OIDC client ID registered in Authentik"
  type        = string
  default     = "cig-dashboard"
}

variable "authentik_oidc_client_secret" {
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

variable "authentik_instance_type" {
  description = "EC2 instance type for the Authentik host"
  type        = string
  default     = "t3.small"
}

variable "ssh_public_key" {
  description = "Optional EC2 SSH public key. Leave empty to disable SSH access."
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_host" {
  description = "SMTP host used by Authentik email sending"
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "SMTP port used by Authentik email sending"
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

variable "infisical_domain" {
  description = "FQDN for the Infisical instance"
  type        = string
  default     = "secrets.cig.technology"
}

variable "infisical_image_tag" {
  description = "Infisical Docker image tag"
  type        = string
  default     = "v0.161.0"
}

variable "infisical_instance_type" {
  description = "EC2 instance type for the Infisical host"
  type        = string
  default     = "t3.small"
}

variable "infisical_multi_tenant" {
  description = "Whether to enable multi-tenant workspace isolation features"
  type        = bool
  default     = true
}

variable "monitor_domain" {
  description = "Base domain for the uptime monitor SaaS"
  type        = string
  default     = "status.cig.technology"
}

variable "monitor_ui_image_tag" {
  description = "Docker image tag for the monitor-ui Next.js app (ECR or GHCR)"
  type        = string
  default     = "latest"
}

variable "gatus_image_tag" {
  description = "Gatus Docker image tag"
  type        = string
  default     = "latest"
}

variable "monitor_authentik_url" {
  description = "Authentik OIDC issuer URL for the monitor app"
  type        = string
  default     = ""
}

variable "monitor_authentik_client_id" {
  description = "OIDC client ID for the monitor app registered in Authentik"
  type        = string
  default     = ""
  sensitive   = true
}

variable "monitor_authentik_client_secret" {
  description = "OIDC client secret for the monitor app from Authentik"
  type        = string
  default     = ""
  sensitive   = true
}

variable "infisical_token" {
  description = "The non-expiring Service Token to authenticate with Infisical"
  type        = string
  default     = ""
  sensitive   = true
}

variable "infisical_url" {
  description = "The domain URL of our self-hosted Infisical instance"
  type        = string
  default     = "https://secrets.cig.technology"
}
