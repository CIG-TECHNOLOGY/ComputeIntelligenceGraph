output "infisical_url" {
  description = "Public HTTPS URL for the Infisical instance"
  value       = "https://${var.domain}"
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.infisical.dns_name
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.infisical.id
}

output "elastic_ip" {
  description = "Elastic IP of the Infisical server"
  value       = aws_eip.infisical.public_ip
}

output "encryption_key_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the Infisical encryption key"
  value       = aws_secretsmanager_secret.infisical_encryption_key.arn
}

output "auth_secret_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the Infisical auth secret"
  value       = aws_secretsmanager_secret.infisical_auth_secret.arn
}

output "db_password_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the PostgreSQL password"
  value       = aws_secretsmanager_secret.db_password.arn
}
