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

locals {
  name_prefix = "monitor"

  common_tags = merge(var.tags, {
    cig-managed = "true"
    domain      = var.domain
  })

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    region                  = var.region
    domain                  = var.domain
    monitor_ui_image_tag    = var.monitor_ui_image_tag
    gatus_image_tag         = var.gatus_image_tag
    smtp_host               = var.smtp_host
    smtp_port               = var.smtp_port
    smtp_username           = var.smtp_username
    smtp_password           = var.smtp_password
    smtp_from               = var.smtp_from
    authentik_url           = var.authentik_url
    authentik_client_id     = var.authentik_client_id
    authentik_client_secret = var.authentik_client_secret
    db_password_secret_id   = aws_secretsmanager_secret.db_password.id
    nextauth_secret_id      = aws_secretsmanager_secret.nextauth_secret.id
    route53_zone_id         = var.route53_zone_id
  })
}

################################################################################
# Networking — default VPC (same pattern as other CIG modules)
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
# Security Group — Caddy terminates TLS directly (no ALB)
################################################################################

resource "aws_security_group" "monitor" {
  name        = "${local.name_prefix}-sg"
  description = "Monitor: Caddy handles TLS directly on 80/443"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP (ACME challenge + Caddy redirect)"
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

  # Full outbound — monitors must reach arbitrary internet endpoints + ACME
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-sg" })
}

################################################################################
# IAM — SSM + Secrets Manager + Route53 DNS-01 + S3 backup
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
        aws_secretsmanager_secret.db_password.arn,
        aws_secretsmanager_secret.nextauth_secret.arn,
      ]
    }]
  })
}

# Caddy uses Route53 to solve DNS-01 challenges for *.status.cig.technology
resource "aws_iam_role_policy" "route53_acme" {
  name = "${local.name_prefix}-route53-acme"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets",
          "route53:ListResourceRecordSets",
        ]
        Resource = "arn:aws:route53:::hostedzone/${var.route53_zone_id}"
      },
      {
        Effect   = "Allow"
        Action   = ["route53:GetChange"]
        Resource = "arn:aws:route53:::change/*"
      },
      {
        Effect   = "Allow"
        Action   = ["route53:ListHostedZonesByName"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "s3_backup" {
  name = "${local.name_prefix}-s3-backup"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
      Resource = [aws_s3_bucket.backup.arn, "${aws_s3_bucket.backup.arn}/*"]
    }]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2.name

  tags = local.common_tags
}

################################################################################
# EC2 — t3.micro with 2 GB swap
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

resource "aws_instance" "monitor" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = "t3.micro"
  subnet_id              = data.aws_subnet.first.id
  vpc_security_group_ids = [aws_security_group.monitor.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  user_data                   = local.user_data
  user_data_replace_on_change = false

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
    encrypted             = true
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-server" })

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

################################################################################
# Elastic IP
################################################################################

resource "aws_eip" "monitor" {
  instance = aws_instance.monitor.id
  domain   = "vpc"

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-eip" })
}

################################################################################
# Route 53
# *.status.cig.technology → EIP  (covers all tenant subdomains automatically)
#  status.cig.technology  → EIP  (operator apex)
################################################################################

resource "aws_route53_record" "apex" {
  zone_id = var.route53_zone_id
  name    = var.domain
  type    = "A"
  ttl     = 300
  records = [aws_eip.monitor.public_ip]
}

resource "aws_route53_record" "wildcard" {
  zone_id = var.route53_zone_id
  name    = "*.${var.domain}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.monitor.public_ip]
}

################################################################################
# S3 — daily pg_dump backups
################################################################################

resource "aws_s3_bucket" "backup" {
  bucket = "cig-monitor-backups-${substr(md5(var.domain), 0, 8)}"
  tags   = merge(local.common_tags, { Name = "${local.name_prefix}-backups" })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id
  rule {
    id     = "expire-old-backups"
    status = "Enabled"
    expiration { days = 30 }
  }
}

resource "aws_s3_bucket_public_access_block" "backup" {
  bucket                  = aws_s3_bucket.backup.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
