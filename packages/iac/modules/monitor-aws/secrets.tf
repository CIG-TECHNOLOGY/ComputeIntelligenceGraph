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
