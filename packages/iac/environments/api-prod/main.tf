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
    key            = "prod/api-core/terraform.tfstate"
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
      Stack       = "api-core"
    }
  }
}

locals {
  tags = {
    Environment = "prod"
    Service     = "api-core"
  }
}

module "networking" {
  source = "../../modules/networking"

  region               = var.region
  name_prefix          = var.name_prefix
  vpc_cidr             = var.vpc_cidr
  api_container_port   = var.api_container_port
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  tags                 = local.tags
}

module "neo4j" {
  source = "../../modules/neo4j"

  region            = var.region
  name_prefix       = var.name_prefix
  instance_type     = var.neo4j_instance_type
  subnet_id         = module.networking.private_subnet_ids[0]
  security_group_id = module.networking.neo4j_security_group_id
  volume_size_gb    = var.neo4j_volume_size_gb
  neo4j_version     = var.neo4j_version
  tags              = local.tags
}
