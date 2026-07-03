################################################################################
# Auto-generated secrets (random, never in user_data or state as plaintext)
################################################################################

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "monitor/${var.domain}/db-password"
  description             = "PostgreSQL password for monitor on ${var.domain}"
  recovery_window_in_days = 7
  tags                    = merge(var.tags, { Name = "monitor-db-password", cig-managed = "true" })
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

resource "random_password" "nextauth_secret" {
  length  = 50
  special = false
}

resource "aws_secretsmanager_secret" "nextauth_secret" {
  name                    = "monitor/${var.domain}/nextauth-secret"
  description             = "NEXTAUTH_SECRET for monitor-ui on ${var.domain}"
  recovery_window_in_days = 7
  tags                    = merge(var.tags, { Name = "monitor-nextauth-secret", cig-managed = "true" })
}

resource "aws_secretsmanager_secret_version" "nextauth_secret" {
  secret_id     = aws_secretsmanager_secret.nextauth_secret.id
  secret_string = random_password.nextauth_secret.result
}

################################################################################
# Operator-supplied secrets — kept in Secrets Manager so they never appear in
# user_data, EC2 instance metadata, or Terraform state as plaintext.
# Each block is conditional on the variable being set so the module works in
# environments where a given integration is not yet configured.
################################################################################

resource "aws_secretsmanager_secret" "smtp_password" {
  count                   = var.smtp_password != "" ? 1 : 0
  name                    = "monitor/${var.domain}/smtp-password"
  description             = "SMTP password for monitor alert notifications on ${var.domain}"
  recovery_window_in_days = 7
  tags                    = merge(var.tags, { Name = "monitor-smtp-password", cig-managed = "true" })
}

resource "aws_secretsmanager_secret_version" "smtp_password" {
  count         = var.smtp_password != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.smtp_password[0].id
  secret_string = var.smtp_password
}

resource "aws_secretsmanager_secret" "authentik_client_id" {
  count                   = var.authentik_client_id != "" ? 1 : 0
  name                    = "monitor/${var.domain}/authentik-client-id"
  description             = "Authentik OIDC client ID for monitor-ui on ${var.domain}"
  recovery_window_in_days = 7
  tags                    = merge(var.tags, { Name = "monitor-authentik-client-id", cig-managed = "true" })
}

resource "aws_secretsmanager_secret_version" "authentik_client_id" {
  count         = var.authentik_client_id != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.authentik_client_id[0].id
  secret_string = var.authentik_client_id
}

resource "aws_secretsmanager_secret" "authentik_client_secret" {
  count                   = var.authentik_client_secret != "" ? 1 : 0
  name                    = "monitor/${var.domain}/authentik-client-secret"
  description             = "Authentik OIDC client secret for monitor-ui on ${var.domain}"
  recovery_window_in_days = 7
  tags                    = merge(var.tags, { Name = "monitor-authentik-client-secret", cig-managed = "true" })
}

resource "aws_secretsmanager_secret_version" "authentik_client_secret" {
  count         = var.authentik_client_secret != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.authentik_client_secret[0].id
  secret_string = var.authentik_client_secret
}

resource "aws_secretsmanager_secret" "ghcr_pull_token" {
  count                   = var.ghcr_pull_token != "" ? 1 : 0
  name                    = "monitor/${var.domain}/ghcr-pull-token"
  description             = "GHCR PAT for pulling ghcr.io/cig-technology private images on ${var.domain}"
  recovery_window_in_days = 7
  tags                    = merge(var.tags, { Name = "monitor-ghcr-pull-token", cig-managed = "true" })
}

resource "aws_secretsmanager_secret_version" "ghcr_pull_token" {
  count         = var.ghcr_pull_token != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.ghcr_pull_token[0].id
  secret_string = var.ghcr_pull_token
}
