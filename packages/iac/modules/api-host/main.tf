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
  region                      = var.region
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
}

data "aws_availability_zones" "available" {
  state = "available"
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

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 1)

  secret_prefix = endswith(var.secret_prefix, "/") ? var.secret_prefix : "${var.secret_prefix}/"

  common_tags = merge(var.tags, {
    cig-managed = "true"
    module      = "api-host"
    Stack       = "api-core"
    Component   = "api-host"
  })

  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    region               = var.region
    domain               = var.domain
    api_image_uri        = var.api_image_uri
    secret_prefix        = local.secret_prefix
    api_container_port   = var.api_container_port
    neo4j_version        = var.neo4j_version
    cors_origins         = join(",", var.cors_origins)
    smtp_host            = var.smtp_host
    smtp_port            = var.smtp_port
    smtp_secure          = var.smtp_secure
    smtp_auth_enabled    = var.smtp_auth_enabled
    smtp_from_email      = var.smtp_from_email
    smtp_user            = var.smtp_user
    smtp_otp_subject     = var.smtp_otp_subject
    neo4j_volume_size_gb = var.neo4j_volume_size_gb
    infisical_token      = var.infisical_token
    infisical_url        = var.infisical_url
  })
}

resource "aws_vpc" "api" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(local.common_tags, {
    Name = "${var.name_prefix}-vpc"
  })
}

resource "aws_internet_gateway" "api" {
  vpc_id = aws_vpc.api.id

  tags = merge(local.common_tags, {
    Name = "${var.name_prefix}-igw"
  })
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.api.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = local.azs[0]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${var.name_prefix}-public-1"
    Tier = "public"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.api.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.api.id
  }

  tags = merge(local.common_tags, {
    Name = "${var.name_prefix}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "host" {
  name        = "${var.name_prefix}-host-sg"
  description = "Allow public HTTPS access to the API host"
  vpc_id      = aws_vpc.api.id

  ingress {
    description = "HTTP"
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

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.name_prefix}-host-sg"
  })
}

resource "aws_security_group_rule" "ssh" {
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
  key_name   = "${var.name_prefix}-key"
  public_key = var.ssh_public_key

  tags = local.common_tags
}

resource "aws_iam_role" "host" {
  name = "${var.name_prefix}-host-role"

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
  role       = aws_iam_role.host.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  role       = aws_iam_role.host.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy" "secrets" {
  name = "${var.name_prefix}-host-secrets"
  role = aws_iam_role.host.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
      ]
      Resource = [
        "arn:aws:secretsmanager:${var.region}:*:secret:${local.secret_prefix}*"
      ]
    }]
  })
}

resource "aws_iam_instance_profile" "host" {
  name = "${var.name_prefix}-host-profile"
  role = aws_iam_role.host.name

  tags = local.common_tags
}

resource "random_password" "neo4j" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "neo4j_password" {
  name                    = "${local.secret_prefix}neo4j-password"
  recovery_window_in_days = 7

  tags = merge(local.common_tags, {
    Name = "${var.name_prefix}-neo4j-password"
  })
}

resource "aws_secretsmanager_secret_version" "neo4j_password" {
  secret_id     = aws_secretsmanager_secret.neo4j_password.id
  secret_string = random_password.neo4j.result
}

resource "aws_instance" "api_host" {
  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.host.id]
  iam_instance_profile        = aws_iam_instance_profile.host.name
  associate_public_ip_address = true
  key_name                    = var.ssh_public_key != "" ? aws_key_pair.host[0].key_name : null
  user_data                   = local.user_data
  user_data_replace_on_change = false

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_size_gb
    delete_on_termination = true
    encrypted             = true

    tags = merge(local.common_tags, {
      Name = "${var.name_prefix}-root-disk"
    })
  }

  tags = merge(local.common_tags, {
    Name = "${var.name_prefix}-host"
  })

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

resource "aws_eip" "api" {
  domain   = "vpc"
  instance = aws_instance.api_host.id

  tags = merge(local.common_tags, {
    Name = "${var.name_prefix}-eip"
  })
}

resource "aws_ebs_volume" "neo4j" {
  availability_zone = aws_instance.api_host.availability_zone
  size              = var.neo4j_volume_size_gb
  type              = "gp3"
  encrypted         = true

  tags = merge(local.common_tags, {
    Name = "${var.name_prefix}-neo4j-data"
  })
}

resource "aws_volume_attachment" "neo4j" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.neo4j.id
  instance_id = aws_instance.api_host.id
}

resource "aws_route53_record" "api" {
  zone_id         = var.route53_zone_id
  name            = var.domain
  type            = "A"
  ttl             = 60
  records         = [aws_eip.api.public_ip]
  allow_overwrite = true
}
