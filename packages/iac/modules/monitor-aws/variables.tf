variable "domain" {
  description = "Base domain for the monitor (e.g. status.cig.technology). Caddy serves apex + *.domain."
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID. Used for wildcard DNS record AND Caddy DNS-01 ACME challenges."
  type        = string
}

variable "monitor_ui_image_tag" {
  description = "Full image reference for monitor-ui (e.g. ghcr.io/cig-technology/monitor-ui:sha-abc1234)"
  type        = string
  default     = "ghcr.io/cig-technology/monitor-ui:latest"
}

variable "gatus_image_tag" {
  description = "Gatus Docker image tag (twinproduction/gatus)"
  type        = string
  default     = "latest"
}

variable "smtp_host" {
  description = "SMTP host for outbound alert notifications"
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "SMTP port"
  type        = number
  default     = 587
}

variable "smtp_username" {
  description = "SMTP username"
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_password" {
  description = "SMTP password"
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_from" {
  description = "Sender address for monitor notifications"
  type        = string
  default     = ""
}

variable "authentik_url" {
  description = "Authentik OIDC issuer URL for SSO (e.g. https://auth.cig.technology/application/o/monitor/)"
  type        = string
  default     = ""
}

variable "authentik_client_id" {
  description = "OIDC client ID registered in Authentik for the monitor app"
  type        = string
  default     = ""
  sensitive   = true
}

variable "authentik_client_secret" {
  description = "OIDC client secret from Authentik"
  type        = string
  default     = ""
  sensitive   = true
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
