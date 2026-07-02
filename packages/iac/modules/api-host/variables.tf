variable "domain" {
  description = "Public API domain (for example api.cig.technology)"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-2"
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for the API domain"
  type        = string
}

variable "api_image_uri" {
  description = "Fully qualified API image URI to deploy"
  type        = string
}

variable "name_prefix" {
  description = "Resource name prefix"
  type        = string
  default     = "cig-api"
}

variable "secret_prefix" {
  description = "Secrets Manager prefix for API runtime secrets"
  type        = string
  default     = "/cig/prod/api/"
}

variable "vpc_cidr" {
  description = "VPC CIDR block for the API host"
  type        = string
  default     = "10.42.0.0/16"
}

variable "public_subnet_cidr" {
  description = "Public subnet CIDR block for the API host"
  type        = string
  default     = "10.42.1.0/24"
}

variable "instance_type" {
  description = "EC2 instance type for the API host"
  type        = string
  default     = "t3.medium"
}

variable "api_container_port" {
  description = "Internal container port exposed by the API"
  type        = number
  default     = 8080
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size in GiB"
  type        = number
  default     = 30
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

variable "cors_origins" {
  description = "Comma-separated CORS origins for the API"
  type        = list(string)
  default     = ["https://app.cig.lat", "https://cig.lat"]
}

variable "smtp_host" {
  description = "SMTP host used by the API email flow"
  type        = string
  default     = "mail.xn--tlo-fla.com"
}

variable "smtp_port" {
  description = "SMTP port used by the API email flow"
  type        = number
  default     = 587
}

variable "smtp_secure" {
  description = "Whether SMTP should use implicit TLS"
  type        = bool
  default     = true
}

variable "smtp_auth_enabled" {
  description = "Whether SMTP authentication is enabled"
  type        = bool
  default     = true
}

variable "smtp_from_email" {
  description = "Secrets Manager secret name suffix for the SMTP from email"
  type        = string
  default     = "smtp-from-email"
}

variable "smtp_user" {
  description = "Optional SMTP username override"
  type        = string
  default     = ""
}

variable "smtp_otp_subject" {
  description = "OTP email subject"
  type        = string
  default     = "Your CIG one-time code"
}

variable "ssh_public_key" {
  description = "Optional EC2 SSH public key. Leave empty to disable SSH access."
  type        = string
  default     = ""
  sensitive   = true
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "infisical_token" {
  description = "The non-expiring Service Token to authenticate with Infisical"
  type        = string
  sensitive   = true
}

variable "infisical_url" {
  description = "The domain URL of our self-hosted Infisical instance"
  type        = string
  default     = "https://secrets.cig.technology"
}
