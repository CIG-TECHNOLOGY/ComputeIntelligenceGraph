################################################################################
# Infisical encryption key (cryptographic key for DB encryption, 16 bytes hex)
################################################################################

resource "random_id" "infisical_encryption_key" {
  byte_length = 16
}

resource "aws_secretsmanager_secret" "infisical_encryption_key" {
  name                    = "infisical/${var.domain}/encryption-key"
  description             = "Infisical ENCRYPTION_KEY for ${var.domain}"
  recovery_window_in_days = 7
  tags                    = merge(var.tags, { Name = "infisical-encryption-key", cig-managed = "true" })
}

resource "aws_secretsmanager_secret_version" "infisical_encryption_key" {
  secret_id     = aws_secretsmanager_secret.infisical_encryption_key.id
  secret_string = random_id.infisical_encryption_key.hex
}

################################################################################
# Infisical auth secret (cryptographic key for JWT/session signing)
################################################################################

resource "random_password" "infisical_auth_secret" {
  length  = 50
  special = false # Auth secret can be alphanumeric
}

resource "aws_secretsmanager_secret" "infisical_auth_secret" {
  name                    = "infisical/${var.domain}/auth-secret"
  description             = "Infisical AUTH_SECRET for ${var.domain}"
  recovery_window_in_days = 7
  tags                    = merge(var.tags, { Name = "infisical-auth-secret", cig-managed = "true" })
}

resource "aws_secretsmanager_secret_version" "infisical_auth_secret" {
  secret_id     = aws_secretsmanager_secret.infisical_auth_secret.id
  secret_string = random_password.infisical_auth_secret.result
}

################################################################################
# PostgreSQL password (local on EC2)
################################################################################

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "infisical/${var.domain}/db-password"
  description             = "PostgreSQL password for Infisical on ${var.domain}"
  recovery_window_in_days = 7
  tags                    = merge(var.tags, { Name = "infisical-db-password", cig-managed = "true" })
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}
