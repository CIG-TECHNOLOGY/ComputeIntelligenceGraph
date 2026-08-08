terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

locals {
  name_prefix = "git-ci"

  common_tags = merge(var.tags, {
    cig-managed = "true"
    domain      = var.domain
  })

  host_user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    region                  = var.region
    domain                  = var.domain
    forgejo_image_tag       = var.forgejo_image_tag
    infisical_token         = var.infisical_token
    infisical_url           = var.infisical_url
    infisical_project_id    = var.infisical_project_id
    authentik_url           = var.authentik_url
    authentik_client_id     = var.authentik_client_id
    authentik_client_secret = var.authentik_client_secret
  })
}

################################################################################
# Networking — default VPC (same pattern as monitor-aws / api-host)
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

################################################################################
# Security Group — Caddy terminates TLS directly on 80/443 (no ALB)
################################################################################

resource "aws_security_group" "host" {
  name        = "${local.name_prefix}-host-sg"
  description = "Forgejo host: Caddy handles TLS directly on 80/443"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP (ACME HTTP-01 challenge + Caddy redirect)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Forgejo Actions server (gRPC) — runner-only, restricted to the runner SG
  ingress {
    description     = "Forgejo Actions runner registration/dispatch"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.runner.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-host-sg" })
}

# Separate resource (not a dynamic block) because `count` — unlike a dynamic
# block's `for_each` — tolerates a condition derived from a sensitive
# variable; ssh_public_key is marked sensitive.
resource "aws_security_group_rule" "host_ssh" {
  count             = var.ssh_public_key != "" ? 1 : 0
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  security_group_id = aws_security_group.host.id
  cidr_blocks       = ["0.0.0.0/0"]
  description       = "SSH"
}

resource "aws_key_pair" "host" {
  count      = var.ssh_public_key != "" ? 1 : 0
  key_name   = "${local.name_prefix}-key"
  public_key = var.ssh_public_key

  tags = local.common_tags
}

################################################################################
# IAM — SSM only. No stored AWS creds; the sole secret is the Infisical token
# baked into user_data, matching the api-host module's mandate-compliant
# pattern (no aws_secretsmanager_secret resources in this module at all).
################################################################################

resource "aws_iam_role" "host" {
  name = "${local.name_prefix}-host-role"

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

resource "aws_iam_role_policy_attachment" "host_ssm" {
  role       = aws_iam_role.host.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "host" {
  name = "${local.name_prefix}-host-profile"
  role = aws_iam_role.host.name

  tags = local.common_tags
}

################################################################################
# EC2 — Forgejo host (always-on, t3.small)
################################################################################

resource "aws_instance" "host" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.host_instance_type
  subnet_id              = data.aws_subnet.first.id
  vpc_security_group_ids = [aws_security_group.host.id]
  iam_instance_profile   = aws_iam_instance_profile.host.name
  key_name               = var.ssh_public_key != "" ? aws_key_pair.host[0].key_name : null

  user_data                   = local.host_user_data
  user_data_replace_on_change = false

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.host_root_volume_size_gb
    delete_on_termination = true
    encrypted             = true

    tags = merge(local.common_tags, { Name = "${local.name_prefix}-host-root" })
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-host" })

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

resource "aws_eip" "host" {
  instance = aws_instance.host.id
  domain   = "vpc"

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-host-eip" })
}

################################################################################
# Route 53 — single apex A record. No wildcard: Forgejo namespaces tenants by
# URL path (ci.cig.technology/<org>/<repo>), not by subdomain.
################################################################################

resource "aws_route53_record" "apex" {
  zone_id = var.route53_zone_id
  name    = var.domain
  type    = "A"
  ttl     = 300
  records = [aws_eip.host.public_ip]
}
