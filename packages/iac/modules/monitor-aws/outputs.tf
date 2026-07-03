output "monitor_url" {
  description = "Public HTTPS URL for the monitor dashboard"
  value       = "https://${var.domain}"
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.monitor.id
}

output "elastic_ip" {
  description = "Elastic IP of the monitor server"
  value       = aws_eip.monitor.public_ip
}

output "wildcard_record" {
  description = "Wildcard DNS record covering all tenant subdomains"
  value       = "*.${var.domain} A ${aws_eip.monitor.public_ip}"
}

output "backup_bucket" {
  description = "S3 bucket name for pg_dump backups"
  value       = aws_s3_bucket.backup.bucket
}

output "db_password_secret_arn" {
  description = "Secrets Manager ARN for the PostgreSQL password"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "nextauth_secret_arn" {
  description = "Secrets Manager ARN for NEXTAUTH_SECRET"
  value       = aws_secretsmanager_secret.nextauth_secret.arn
}
