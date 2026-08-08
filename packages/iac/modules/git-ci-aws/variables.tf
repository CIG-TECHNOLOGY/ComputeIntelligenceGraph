variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "domain" {
  description = "Domain for the Forgejo host (e.g. ci.cig.technology). Tenants are namespaced by org path (domain/org/repo), no wildcard DNS needed."
  type        = string
  default     = "ci.cig.technology"
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID that domain belongs to"
  type        = string
}

variable "forgejo_image_tag" {
  description = "Forgejo Docker image tag (codeberg.org/forgejo/forgejo)"
  type        = string
  default     = "10"
}

variable "forgejo_runner_version" {
  description = "forgejo-runner release version to install on the runner host"
  type        = string
  default     = "6.3.1"
}

variable "host_instance_type" {
  description = "EC2 instance type for the always-on Forgejo host"
  type        = string
  default     = "t3.small"
}

variable "runner_instance_type" {
  description = "EC2 instance type for the on-demand runner host"
  type        = string
  default     = "t3.medium"
}

variable "host_root_volume_size_gb" {
  description = "Root EBS volume size (GiB) for the Forgejo host — holds all tenants' mirrored repo data"
  type        = number
  default     = 30
}

variable "runner_root_volume_size_gb" {
  description = "Root EBS volume size (GiB) for the runner host"
  type        = number
  default     = 30
}

variable "infisical_token" {
  description = "The non-expiring Infisical Service Token this module's EC2s use to authenticate with Infisical. The only bootstrap credential passed in — everything else (Forgejo admin token, runner registration token, Authentik OIDC client secret) is pulled from Infisical at boot."
  type        = string
  sensitive   = true
}

variable "infisical_url" {
  description = "The domain URL of the CIG self-hosted Infisical instance"
  type        = string
  default     = "https://secrets.cig.technology"
}

variable "infisical_project_id" {
  description = "Infisical project ID (git-ci-production) that infisical_token's machine identity has been granted access to. Required by the Infisical CLI when authenticating as a machine identity (Universal Auth) rather than a legacy project-scoped Service Token."
  type        = string
}

variable "authentik_url" {
  description = "Authentik OIDC issuer URL for CIG staff/admin SSO into the Forgejo instance. Leave empty to skip OIDC wiring (local Forgejo admin login only)."
  type        = string
  default     = ""
}

variable "authentik_client_id" {
  description = "OIDC client ID registered in Authentik for the Forgejo app"
  type        = string
  default     = ""
  sensitive   = true
}

variable "authentik_client_secret" {
  description = "OIDC client secret from Authentik for the Forgejo app"
  type        = string
  default     = ""
  sensitive   = true
}

variable "ssh_public_key" {
  description = "Optional EC2 SSH public key for both hosts. Leave empty to disable SSH access (SSM Session Manager is always available via the instance profile)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
