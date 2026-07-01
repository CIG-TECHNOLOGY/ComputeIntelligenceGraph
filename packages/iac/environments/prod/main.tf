terraform {
  required_version = ">= 1.6"

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

  backend "s3" {
    bucket         = "cig-terraform-state-058264267235"
    key            = "prod/authentik/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "cig-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "CIG"
      Environment = "prod"
      ManagedBy   = "terraform"
      Repository  = "CIG-TECHNOLOGY/ComputeIntelligenceGraph"
    }
  }
}

module "authentik" {
  source = "../../modules/authentik-aws"

  domain              = var.domain
  region              = var.region
  route53_zone_id     = var.route53_zone_id
  authentik_image_tag = var.authentik_image_tag
  ssh_public_key      = var.ssh_public_key
  smtp_host           = var.smtp_host
  smtp_port           = var.smtp_port
  smtp_username       = var.smtp_username
  smtp_password       = var.smtp_password
  smtp_from           = var.smtp_from

  tags = {
    Environment = "prod"
    Service     = "authentik-sso"
  }
}
