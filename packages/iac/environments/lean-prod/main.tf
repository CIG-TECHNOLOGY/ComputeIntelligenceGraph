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

  backend "s3" {}
}

provider "aws" {
  region                      = var.region
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true

  default_tags {
    tags = {
      Project     = "CIG"
      Environment = "prod"
      ManagedBy   = "terraform"
      Repository  = "CIG-TECHNOLOGY/ComputeIntelligenceGraph"
      Stack       = "lean-prod"
    }
  }
}

locals {
  tags = {
    Environment = "prod"
    Service     = "cig"
    Stack       = "lean-prod"
  }
}

module "api_host" {
  source = "../../modules/api-host"

  region               = var.region
  name_prefix          = var.api_name_prefix
  domain               = var.api_domain
  route53_zone_id      = var.route53_zone_id
  api_image_uri        = var.api_image_uri
  api_container_port   = var.api_container_port
  instance_type        = var.api_instance_type
  neo4j_volume_size_gb = var.neo4j_volume_size_gb
  neo4j_version        = var.neo4j_version
  ssh_public_key       = var.ssh_public_key
  infisical_token      = var.infisical_token
  infisical_url        = var.infisical_url
  tags                 = merge(local.tags, { Service = "api-core" })
}

module "authentik_host" {
  source = "../../modules/authentik-host"

  region                    = var.region
  name_prefix               = var.authentik_name_prefix
  domain                    = var.authentik_domain
  route53_zone_id           = var.route53_zone_id
  authentik_image_tag       = var.authentik_image_tag
  admin_email               = var.authentik_admin_email
  oidc_client_id            = var.authentik_oidc_client_id
  oidc_client_secret        = var.authentik_oidc_client_secret
  google_auth_client_id     = var.google_auth_client_id
  google_auth_client_secret = var.google_auth_client_secret
  github_auth_client_id     = var.github_auth_client_id
  github_auth_client_secret = var.github_auth_client_secret
  instance_type             = var.authentik_instance_type
  ssh_public_key            = var.ssh_public_key
  smtp_host                 = var.smtp_host
  smtp_port                 = var.smtp_port
  smtp_username             = var.smtp_username
  smtp_password             = var.smtp_password
  smtp_from                 = var.smtp_from
  tags                      = merge(local.tags, { Service = "authentik-sso" })
}

module "infisical_host" {
  source = "../../modules/infisical-aws"

  region              = var.region
  domain              = var.infisical_domain
  route53_zone_id     = var.route53_zone_id
  infisical_image_tag = var.infisical_image_tag
  instance_type       = var.infisical_instance_type
  ssh_public_key      = var.ssh_public_key
  smtp_host           = var.smtp_host
  smtp_port           = var.smtp_port
  smtp_username       = var.smtp_username
  smtp_password       = var.smtp_password
  smtp_from           = var.smtp_from
  multi_tenant        = var.infisical_multi_tenant

  tags = merge(local.tags, { Service = "infisical-secrets" })
}

module "monitor_host" {
  source = "../../modules/monitor-aws"

  region                  = var.region
  domain                  = var.monitor_domain
  route53_zone_id         = var.route53_zone_id
  monitor_ui_image_tag    = var.monitor_ui_image_tag
  gatus_image_tag         = var.gatus_image_tag
  smtp_host               = var.smtp_host
  smtp_port               = var.smtp_port
  smtp_username           = var.smtp_username
  smtp_password           = var.smtp_password
  smtp_from               = var.smtp_from
  authentik_url           = var.monitor_authentik_url
  authentik_client_id     = var.monitor_authentik_client_id
  authentik_client_secret = var.monitor_authentik_client_secret

  tags = merge(local.tags, { Service = "monitor" })
}

# Dummy module declaration to satisfy orphaned legacy provider inside authentik-aws
module "authentik" {
  source          = "../../modules/authentik-aws"
  domain          = "dummy"
  route53_zone_id = "dummy"
}
