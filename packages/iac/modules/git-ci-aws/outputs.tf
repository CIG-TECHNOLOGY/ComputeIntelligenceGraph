output "host_instance_id" {
  description = "EC2 instance ID for the Forgejo host — used by patch-env.mjs (SSM live-patch)"
  value       = aws_instance.host.id
}

output "host_public_ip" {
  description = "Elastic IP of the Forgejo host"
  value       = aws_eip.host.public_ip
}

output "runner_instance_id" {
  description = "EC2 instance ID for the on-demand runner — used by runner-start.mjs / runner-stop.mjs"
  value       = aws_instance.runner.id
}

output "url" {
  description = "Canonical HTTPS URL for the Forgejo instance"
  value       = "https://${var.domain}"
}
