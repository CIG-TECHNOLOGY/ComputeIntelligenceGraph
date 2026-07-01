terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region                      = var.region
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true

  default_tags {
    tags = {
      Project     = "CIG"
      Environment = "bootstrap"
      ManagedBy   = "terraform"
      Repository  = "edwardcalderon/ComputeIntelligenceGraph"
      Stack       = "bootstrap-account"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  account_id                   = data.aws_caller_identity.current.account_id
  state_bucket                 = "${var.state_bucket_prefix}-${local.account_id}"
  prod_github_actions_role_arn = "arn:aws:iam::520900722378:role/github-actions-role"

  common_tags = merge(var.tags, {
    cig-managed = "true"
    Stack       = "bootstrap-account"
    Component   = "bootstrap"
  })
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = local.state_bucket

  tags = merge(local.common_tags, {
    Name = local.state_bucket
  })
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket                  = aws_s3_bucket.terraform_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_policy" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowProdGithubActionsListState"
        Effect = "Allow"
        Principal = {
          AWS = local.prod_github_actions_role_arn
        }
        Action = [
          "s3:GetBucketLocation",
          "s3:ListBucket",
          "s3:ListBucketVersions"
        ]
        Resource = aws_s3_bucket.terraform_state.arn
        Condition = {
          StringLike = {
            "s3:prefix" = [
              "prod/*"
            ]
          }
        }
      },
      {
        Sid    = "AllowProdGithubActionsStateObjectAccess"
        Effect = "Allow"
        Principal = {
          AWS = local.prod_github_actions_role_arn
        }
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.terraform_state.arn}/prod/*"
      }
    ]
  })
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = merge(local.common_tags, {
    Name = var.lock_table_name
  })
}

resource "aws_dynamodb_resource_policy" "terraform_locks" {
  resource_arn = aws_dynamodb_table.terraform_locks.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowProdGithubActionsTerraformLocks"
        Effect = "Allow"
        Principal = {
          AWS = local.prod_github_actions_role_arn
        }
        Action = [
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:ConditionCheckItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.terraform_locks.arn
      }
    ]
  })
}

resource "aws_route53_zone" "cig" {
  name = var.domain

  tags = merge(local.common_tags, {
    Name = "${var.domain}-zone"
  })
}

resource "aws_route53_record" "mail_mx" {
  allow_overwrite = true
  zone_id         = aws_route53_zone.cig.zone_id
  name            = var.domain
  type            = "MX"
  ttl             = 300
  records         = ["${var.mail_mx_priority} ${var.mail_mx_host}"]
}

resource "aws_route53_record" "mail_spf" {
  allow_overwrite = true
  zone_id         = aws_route53_zone.cig.zone_id
  name            = var.domain
  type            = "TXT"
  ttl             = 300
  records         = [var.mail_spf_record]
}

resource "aws_route53_record" "mail_dmarc" {
  allow_overwrite = true
  zone_id         = aws_route53_zone.cig.zone_id
  name            = "_dmarc.${var.domain}"
  type            = "TXT"
  ttl             = 300
  records         = [var.mail_dmarc_record]
}

resource "aws_route53_record" "mail_dkim" {
  allow_overwrite = true
  zone_id         = aws_route53_zone.cig.zone_id
  name            = "mail._domainkey.${var.domain}"
  type            = "TXT"
  ttl             = 300
  records         = [var.mail_dkim_record]
}

resource "aws_route53_record" "mail_imaps" {
  allow_overwrite = true
  zone_id         = aws_route53_zone.cig.zone_id
  name            = "_imaps._tcp.${var.domain}"
  type            = "SRV"
  ttl             = 300
  records         = ["0 1 ${var.mail_imaps_port} ${var.mail_target_host}"]
}

resource "aws_route53_record" "mail_submission" {
  allow_overwrite = true
  zone_id         = aws_route53_zone.cig.zone_id
  name            = "_submission._tcp.${var.domain}"
  type            = "SRV"
  ttl             = 300
  records         = ["0 1 ${var.mail_submission_port} ${var.mail_target_host}"]
}
