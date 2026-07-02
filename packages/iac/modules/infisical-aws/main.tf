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
  name_prefix = "infisical"

  common_tags = merge(var.tags, {
    cig-managed = "true"
    domain      = var.domain
  })

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    region                   = var.region
    domain                   = var.domain
    infisical_image_tag      = var.infisical_image_tag
    smtp_host                = var.smtp_host
    smtp_port                = var.smtp_port
    smtp_username            = var.smtp_username
    smtp_password            = var.smtp_password
    smtp_from                = var.smtp_from
    encryption_key_secret_id = aws_secretsmanager_secret.infisical_encryption_key.id
    auth_secret_id           = aws_secretsmanager_secret.infisical_auth_secret.id
    db_password_secret_id    = aws_secretsmanager_secret.db_password.id
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
    description     = "Infisical HTTP from ALB"
    from_port       = 80
    to_port         = 80
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

resource "aws_key_pair" "infisical" {
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
        aws_secretsmanager_secret.infisical_encryption_key.arn,
        aws_secretsmanager_secret.infisical_auth_secret.arn,
        aws_secretsmanager_secret.db_password.arn,
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2.name

  tags = local.common_tags
}

################################################################################
# EC2 Instance
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

resource "aws_instance" "infisical" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnet.first.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  key_name               = var.ssh_public_key != "" ? aws_key_pair.infisical[0].key_name : null

  user_data                   = local.user_data
  user_data_replace_on_change = false

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
    ignore_changes = [ami, user_data]
  }
}

################################################################################
# Elastic IP — stable public IP for the instance
################################################################################

resource "aws_eip" "infisical" {
  instance = aws_instance.infisical.id
  domain   = "vpc"

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-eip" })
}

################################################################################
# ACM Certificate (DNS validated via Route 53)
################################################################################

resource "aws_acm_certificate" "infisical" {
  domain_name       = var.domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-cert" })
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.infisical.domain_validation_options : dvo.domain_name => {
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

resource "aws_acm_certificate_validation" "infisical" {
  certificate_arn         = aws_acm_certificate.infisical.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

################################################################################
# ALB — HTTPS termination → HTTP:80 on EC2
################################################################################

resource "aws_lb" "infisical" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.default.ids

  enable_deletion_protection = false # Set to false to allow easy destroy when working, or configurable

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-alb" })
}

resource "aws_lb_target_group" "infisical" {
  name        = "${local.name_prefix}-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/api/status"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-tg" })
}

resource "aws_lb_target_group_attachment" "infisical" {
  target_group_arn = aws_lb_target_group.infisical.arn
  target_id        = aws_instance.infisical.id
  port             = 80
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.infisical.arn
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
  load_balancer_arn = aws_lb.infisical.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.infisical.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.infisical.arn
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-https-listener" })
}

################################################################################
# Route 53 — domain → ALB
################################################################################

resource "aws_route53_record" "infisical" {
  zone_id = var.route53_zone_id
  name    = var.domain
  type    = "A"

  alias {
    name                   = aws_lb.infisical.dns_name
    zone_id                = aws_lb.infisical.zone_id
    evaluate_target_health = true
  }
}
