variable "domain" {
  description = "FQDN for the Infisical instance (e.g. secrets.cig.technology)"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for the domain"
  type        = string
}

variable "infisical_image_tag" {
  description = "Infisical Docker image tag"
  type        = string
  default     = "v0.161.0" # Stable multi-tenant self-hosted version
}

variable "instance_type" {
  description = "EC2 instance type for the Infisical host"
  type        = string
  default     = "t3.small"
}

variable "ssh_public_key" {
  description = "EC2 SSH public key (leave empty to disable SSH key pair)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_host" {
  description = "SMTP host for Infisical email sending"
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
  description = "From address for Infisical emails"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "multi_tenant" {
  description = "Whether to enable multi-tenant workspace isolation features"
  type        = bool
  default     = true
}
