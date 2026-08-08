terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.region
}

locals {
  name_prefix = "authentik"

  common_tags = merge(var.tags, {
    cig-managed = "true"
    domain      = var.domain
  })
}

################################################################################
# Networking — use default VPC for minimal cost
################################################################################

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_subnet" "first" {
  id = data.aws_subnets.default.ids[0]
}

################################################################################
# Security Groups
################################################################################

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "ALB: allow HTTPS inbound"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-alb-sg" })
}

resource "aws_security_group" "ec2" {
  name        = "${local.name_prefix}-ec2-sg"
  description = "EC2: allow ALB + SSH"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Authentik from ALB"
    from_port       = 9000
    to_port         = 9000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "SSH (restrict to your IP in production)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-ec2-sg" })
}

################################################################################
# EC2 Key Pair (optional — pass public key to enable SSH)
################################################################################

resource "aws_key_pair" "authentik" {
  count      = var.ssh_public_key != "" ? 1 : 0
  key_name   = "${local.name_prefix}-key"
  public_key = var.ssh_public_key

  tags = local.common_tags
}

################################################################################
# IAM — EC2 instance role (SSM + Secrets Manager read)
################################################################################

resource "aws_iam_role" "ec2" {
  name = "${local.name_prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "secrets" {
  name = "${local.name_prefix}-secrets-policy"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
      Resource = [
        aws_secretsmanager_secret.authentik_secret_key.arn,
        aws_secretsmanager_secret.authentik_admin_password.arn,
        aws_secretsmanager_secret.db_password.arn,
      ]
    }]
  })
}

# Required for Caddy's DNS-01 challenge (github.com/caddy-dns/route53) to issue
# and renew the TLS cert directly on the instance, without a load balancer.
resource "aws_iam_role_policy" "route53_dns01" {
  name = "${local.name_prefix}-route53-dns01"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["route53:GetChange"]
        Resource = "arn:aws:route53:::change/*"
      },
      {
        Effect   = "Allow"
        Action   = ["route53:ChangeResourceRecordSets", "route53:ListResourceRecordSets"]
        Resource = "arn:aws:route53:::hostedzone/${var.route53_zone_id}"
      },
      {
        Effect   = "Allow"
        Action   = ["route53:ListHostedZonesByName", "route53:ListHostedZones"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2.name

  tags = local.common_tags
}

################################################################################
# EC2 t3.small — Authentik 2026.x + PostgreSQL via Docker Compose (no Redis)
################################################################################

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail

    # ── Swap (2 GB) — prevents OOM on t3.small ────────────────────────────────
    if [ ! -f /swapfile ]; then
      fallocate -l 2G /swapfile
      chmod 600 /swapfile
      mkswap /swapfile
      swapon /swapfile
      echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi

    # ── System setup ─────────────────────────────────────────────────────────
    dnf update -y
    dnf install -y docker aws-cli jq
    systemctl enable --now docker

    # Docker Compose v2
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -fsSL "https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-x86_64" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    # ── Fetch secrets ─────────────────────────────────────────────────────────
    REGION="${var.region}"
    SECRET_KEY=$(aws secretsmanager get-secret-value \
      --secret-id "${aws_secretsmanager_secret.authentik_secret_key.id}" \
      --region "$REGION" --query SecretString --output text)
    ADMIN_PASS=$(aws secretsmanager get-secret-value \
      --secret-id "${aws_secretsmanager_secret.authentik_admin_password.id}" \
      --region "$REGION" --query SecretString --output text)
    DB_PASS=$(aws secretsmanager get-secret-value \
      --secret-id "${aws_secretsmanager_secret.db_password.id}" \
      --region "$REGION" --query SecretString --output text)

    # ── Authentik directories ─────────────────────────────────────────────────
    mkdir -p /opt/authentik/{media,certs,custom-templates}

    # ── .env file ─────────────────────────────────────────────────────────────
    cat > /opt/authentik/.env <<ENV
    PG_PASS=$${DB_PASS}
    AUTHENTIK_SECRET_KEY=$${SECRET_KEY}
    AUTHENTIK_ERROR_REPORTING__ENABLED=false
    AUTHENTIK_EMAIL__HOST=${var.smtp_host}
    AUTHENTIK_EMAIL__PORT=${var.smtp_port}
    AUTHENTIK_EMAIL__USERNAME=${var.smtp_username}
    AUTHENTIK_EMAIL__PASSWORD=${var.smtp_password}
    AUTHENTIK_EMAIL__USE_TLS=true
    AUTHENTIK_EMAIL__FROM=${var.smtp_from}
    COMPOSE_PROJECT_NAME=authentik
    ENV

    # ── docker-compose.yml ────────────────────────────────────────────────────
    # Authentik 2026.x: no Redis required (built-in task queue)
    cat > /opt/authentik/docker-compose.yml <<COMPOSE
    services:
      postgresql:
        image: postgres:16-alpine
        restart: unless-stopped
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -d authentik -U authentik"]
          interval: 30s
          timeout: 5s
          retries: 5
        volumes:
          - pg_data:/var/lib/postgresql/data
        environment:
          POSTGRES_PASSWORD: \$${PG_PASS}
          POSTGRES_USER: authentik
          POSTGRES_DB: authentik
        env_file: /opt/authentik/.env

      server:
        image: ghcr.io/goauthentik/server:${var.authentik_image_tag}
        restart: unless-stopped
        command: server
        environment:
          AUTHENTIK_POSTGRESQL__HOST: postgresql
          AUTHENTIK_POSTGRESQL__USER: authentik
          AUTHENTIK_POSTGRESQL__NAME: authentik
          AUTHENTIK_POSTGRESQL__PASSWORD: \$${PG_PASS}
        volumes:
          - /opt/authentik/media:/media
          - /opt/authentik/custom-templates:/templates
        env_file: /opt/authentik/.env
        ports:
          - "9000:9000"
          - "9443:9443"
        depends_on:
          postgresql:
            condition: service_healthy

      worker:
        image: ghcr.io/goauthentik/server:${var.authentik_image_tag}
        restart: unless-stopped
        command: worker
        user: root
        environment:
          AUTHENTIK_POSTGRESQL__HOST: postgresql
          AUTHENTIK_POSTGRESQL__USER: authentik
          AUTHENTIK_POSTGRESQL__NAME: authentik
          AUTHENTIK_POSTGRESQL__PASSWORD: \$${PG_PASS}
        volumes:
          - /var/run/docker.sock:/var/run/docker.sock
          - /opt/authentik/media:/media
          - /opt/authentik/certs:/certs
          - /opt/authentik/custom-templates:/templates
        env_file: /opt/authentik/.env
        depends_on:
          postgresql:
            condition: service_healthy

    volumes:
      pg_data:
    COMPOSE

    # ── systemd service ───────────────────────────────────────────────────────
    cat > /etc/systemd/system/authentik.service <<SVC
    [Unit]
    Description=Authentik SSO
    After=docker.service network-online.target
    Requires=docker.service

    [Service]
    Type=oneshot
    RemainAfterExit=yes
    WorkingDirectory=/opt/authentik
    ExecStart=/usr/local/lib/docker/cli-plugins/docker-compose up -d
    ExecStop=/usr/local/lib/docker/cli-plugins/docker-compose down
    TimeoutStartSec=300

    [Install]
    WantedBy=multi-user.target
    SVC

    systemctl daemon-reload
    systemctl enable --now authentik

    echo "Authentik bootstrap complete" > /var/log/authentik-init.log
  EOF
}

resource "aws_instance" "authentik" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = "t3.small"
  subnet_id              = data.aws_subnet.first.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.ssh_public_key != "" ? aws_key_pair.authentik[0].key_name : null

  user_data                   = local.user_data
  user_data_replace_on_change = false # avoid instance replacement on tfvars changes

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
    encrypted             = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-server"
  })

  lifecycle {
    ignore_changes = [ami, user_data] # don't replace on AMI updates
  }
}

################################################################################
# Elastic IP — stable public IP for the instance
################################################################################

resource "aws_eip" "authentik" {
  instance = aws_instance.authentik.id
  domain   = "vpc"

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-eip" })
}

################################################################################
# ACM Certificate (DNS validated via Route 53)
################################################################################

resource "aws_acm_certificate" "authentik" {
  domain_name       = var.domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-cert" })
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.authentik.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

resource "aws_acm_certificate_validation" "authentik" {
  certificate_arn         = aws_acm_certificate.authentik.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

################################################################################
# ALB — HTTPS termination → HTTP:9000 on EC2
################################################################################

resource "aws_lb" "authentik" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.default.ids

  enable_deletion_protection = true

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-alb" })
}

resource "aws_lb_target_group" "authentik" {
  name        = "${local.name_prefix}-tg"
  port        = 9000
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/-/health/live/"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-tg" })
}

resource "aws_lb_target_group_attachment" "authentik" {
  target_group_arn = aws_lb_target_group.authentik.arn
  target_id        = aws_instance.authentik.id
  port             = 9000
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.authentik.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.authentik.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.authentik.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.authentik.arn
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-https-listener" })
}

################################################################################
# Route 53 — auth.cig.technology → ALB
################################################################################

resource "aws_route53_record" "authentik" {
  zone_id = var.route53_zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = aws_lb.authentik.dns_name
    zone_id                = aws_lb.authentik.zone_id
    evaluate_target_health = true
  }
}
