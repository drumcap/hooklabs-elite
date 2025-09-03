# HookLabs Elite 클라우드 인프라 - 메인 구성
# Terraform 버전 및 프로바이더 설정

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.5"
    }
  }
  
  # 상태 파일 원격 저장 (S3 + DynamoDB)
  backend "s3" {
    bucket         = "hooklabs-elite-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

# 프로바이더 설정
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "HookLabs Elite"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "Engineering"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}

# 로컬 변수 정의
locals {
  common_tags = {
    Project     = "HookLabs Elite"
    Environment = var.environment
    Terraform   = "true"
    CreatedAt   = timestamp()
  }
  
  # 지역별 설정
  regions = {
    primary   = "us-east-1"      # 메인 리전 (버지니아)
    secondary = "eu-west-1"      # 보조 리전 (아일랜드)
    asia      = "ap-northeast-1" # 아시아 리전 (도쿄)
  }
  
  # 환경별 설정
  env_config = {
    production = {
      instance_type   = "t3.medium"
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      redis_plan     = "pay-as-you-go"
      cdn_price_class = "PriceClass_All"
    }
    staging = {
      instance_type   = "t3.small"
      min_size       = 1
      max_size       = 3
      desired_size   = 1
      redis_plan     = "free"
      cdn_price_class = "PriceClass_100"
    }
    development = {
      instance_type   = "t3.micro"
      min_size       = 1
      max_size       = 1
      desired_size   = 1
      redis_plan     = "free"
      cdn_price_class = "PriceClass_100"
    }
  }
  
  # 현재 환경 설정
  current_config = local.env_config[var.environment]
}

# 데이터 소스
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# 메인 모듈 호출
module "networking" {
  source = "./modules/networking"
  
  environment     = var.environment
  vpc_cidr       = var.vpc_cidr
  azs            = data.aws_availability_zones.available.names
  common_tags    = local.common_tags
}

module "cdn" {
  source = "./modules/cdn"
  
  environment     = var.environment
  domain_name     = var.domain_name
  price_class     = local.current_config.cdn_price_class
  common_tags     = local.common_tags
}

module "redis_cache" {
  source = "./modules/redis"
  
  environment    = var.environment
  redis_plan     = local.current_config.redis_plan
  common_tags    = local.common_tags
}

module "monitoring" {
  source = "./modules/monitoring"
  
  environment         = var.environment
  alert_email        = var.alert_email
  slack_webhook_url  = var.slack_webhook_url
  common_tags        = local.common_tags
}

module "autoscaling" {
  source = "./modules/autoscaling"
  
  environment     = var.environment
  min_size       = local.current_config.min_size
  max_size       = local.current_config.max_size
  desired_size   = local.current_config.desired_size
  instance_type  = local.current_config.instance_type
  common_tags    = local.common_tags
}

module "backup" {
  source = "./modules/backup"
  
  environment     = var.environment
  backup_schedule = var.backup_schedule
  retention_days  = var.backup_retention_days
  common_tags     = local.common_tags
}

module "security" {
  source = "./modules/security"
  
  environment     = var.environment
  vpc_id         = module.networking.vpc_id
  common_tags    = local.common_tags
}

# Vercel 프로젝트 설정
resource "vercel_project" "hooklabs_elite" {
  name      = "hooklabs-elite-${var.environment}"
  framework = "nextjs"
  
  git_repository = {
    type = "github"
    repo = var.github_repo
  }
  
  environment = [
    {
      key    = "NODE_ENV"
      value  = var.environment
      target = ["production", "preview"]
    },
    {
      key    = "NEXT_PUBLIC_APP_ENV"
      value  = var.environment
      target = ["production", "preview"]
    },
    {
      key    = "UPSTASH_REDIS_REST_URL"
      value  = module.redis_cache.redis_url
      target = ["production", "preview"]
    },
    {
      key    = "UPSTASH_REDIS_REST_TOKEN"
      value  = module.redis_cache.redis_token
      target = ["production", "preview"]
    }
  ]
  
  build_command       = "npm run build"
  output_directory    = ".next"
  install_command     = "npm install"
  dev_command        = "npm run dev"
  
  # 성능 최적화 설정
  serverless_function_region = "iad1" # US East
  
  # 빌드 최적화
  root_directory = ""
}

# Vercel 도메인 설정
resource "vercel_project_domain" "main" {
  project_id = vercel_project.hooklabs_elite.id
  domain     = var.domain_name
}

resource "vercel_project_domain" "www" {
  project_id = vercel_project.hooklabs_elite.id
  domain     = "www.${var.domain_name}"
  
  redirect             = vercel_project_domain.main.domain
  redirect_status_code = 308
}

# 출력 값
output "vercel_project_id" {
  value       = vercel_project.hooklabs_elite.id
  description = "Vercel 프로젝트 ID"
}

output "vercel_url" {
  value       = "https://${vercel_project.hooklabs_elite.name}.vercel.app"
  description = "Vercel 배포 URL"
}

output "cdn_distribution_id" {
  value       = module.cdn.distribution_id
  description = "CloudFront 배포 ID"
}

output "redis_endpoint" {
  value       = module.redis_cache.redis_endpoint
  description = "Redis 캐시 엔드포인트"
  sensitive   = true
}

output "monitoring_dashboard_url" {
  value       = module.monitoring.dashboard_url
  description = "모니터링 대시보드 URL"
}

output "estimated_monthly_cost" {
  value       = module.monitoring.estimated_cost
  description = "예상 월간 비용 (USD)"
}