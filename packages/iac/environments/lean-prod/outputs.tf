output "api_url" {
  description = "Canonical HTTPS URL for the API"
  value       = module.api_host.api_url
}

output "authentik_url" {
  description = "Canonical HTTPS URL for Authentik"
  value       = module.authentik_host.authentik_url
}

output "route53_zone_id" {
  description = "Route 53 hosted zone ID used by the lean production stack"
  value       = var.route53_zone_id
}

output "authentik_issuer_url" {
  description = "Authentik OIDC issuer URL"
  value       = module.authentik_host.issuer_url
}

output "authentik_token_endpoint" {
  description = "Authentik OIDC token endpoint"
  value       = module.authentik_host.token_endpoint
}

output "authentik_jwks_uri" {
  description = "Authentik OIDC JWKS endpoint"
  value       = module.authentik_host.jwks_uri
}

output "authentik_oidc_client_id" {
  description = "Authentik OIDC client ID"
  value       = module.authentik_host.oidc_client_id
}

output "authentik_oidc_client_secret" {
  description = "Authentik OIDC client secret"
  value       = module.authentik_host.oidc_client_secret
  sensitive   = true
}

output "api_neo4j_password_secret_arn" {
  description = "Secrets Manager ARN for the API host Neo4j password"
  value       = module.api_host.neo4j_password_secret_arn
  sensitive   = true
}

output "authentik_admin_password_secret_arn" {
  description = "Secrets Manager ARN for the Authentik admin password"
  value       = module.authentik_host.admin_password_secret_arn
  sensitive   = true
}

output "authentik_oidc_client_secret_arn" {
  description = "Secrets Manager ARN for the Authentik OIDC client credentials"
  value       = module.authentik_host.oidc_client_secret_arn
  sensitive   = true
}

output "api_instance_id" {
  description = "EC2 instance ID for the API host"
  value       = module.api_host.instance_id
}

output "authentik_instance_id" {
  description = "EC2 instance ID for the Authentik host"
  value       = module.authentik_host.instance_id
}

output "api_elastic_ip" {
  description = "Elastic IP assigned to the API host"
  value       = module.api_host.elastic_ip
}

output "authentik_elastic_ip" {
  description = "Elastic IP assigned to the Authentik host"
  value       = module.authentik_host.elastic_ip
}

output "infisical_url" {
  description = "Canonical HTTPS URL for Infisical"
  value       = module.infisical_host.infisical_url
}

output "infisical_alb_dns_name" {
  description = "DNS name of the Application Load Balancer for Infisical"
  value       = module.infisical_host.alb_dns_name
}

output "infisical_instance_id" {
  description = "EC2 instance ID for the Infisical host"
  value       = module.infisical_host.instance_id
}

output "infisical_elastic_ip" {
  description = "Elastic IP assigned to the Infisical host"
  value       = module.infisical_host.elastic_ip
}

output "infisical_encryption_key_secret_arn" {
  description = "Secrets Manager ARN for the Infisical encryption key"
  value       = module.infisical_host.encryption_key_secret_arn
  sensitive   = true
}

output "infisical_auth_secret_secret_arn" {
  description = "Secrets Manager ARN for the Infisical auth secret"
  value       = module.infisical_host.auth_secret_secret_arn
  sensitive   = true
}

output "infisical_db_password_secret_arn" {
  description = "Secrets Manager ARN for the Infisical DB password"
  value       = module.infisical_host.db_password_secret_arn
  sensitive   = true
}
