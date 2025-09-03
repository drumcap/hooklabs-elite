# Production 환경 변수

environment = "production"
aws_region  = "us-east-1"

# 도메인 설정
domain_name = "hooklabs-elite.com"
github_repo = "your-org/hooklabs-elite"

# VPC 설정
vpc_cidr = "10.0.0.0/16"

# API 토큰 (환경 변수로 관리 권장)
# export TF_VAR_vercel_api_token="your-token"
# export TF_VAR_cloudflare_api_token="your-token"
# export TF_VAR_upstash_email="your-email"
# export TF_VAR_upstash_api_key="your-key"

# 알림 설정
alert_email       = "alerts@hooklabs-elite.com"
slack_webhook_url = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# 백업 설정
backup_schedule       = "0 2 * * *"  # 매일 새벽 2시
backup_retention_days = 30

# 비용 최적화
enable_spot_instances = true
spot_max_price       = "0.05"

# 자동 스케일링
enable_auto_scaling       = true
target_cpu_utilization    = 70
target_memory_utilization = 80
scale_up_cooldown        = 300
scale_down_cooldown      = 900

# CDN 설정
cdn_cache_ttl = {
  default = 86400     # 1일
  max     = 31536000  # 1년
  min     = 0
}
cdn_compress = true

# 보안 설정
allowed_ip_ranges = [
  "0.0.0.0/0"  # 프로덕션에서는 실제 IP 범위로 제한
]
enable_waf             = true
enable_ddos_protection = true

# 모니터링
enable_detailed_monitoring = true
log_retention_days        = 90
metrics_retention_days    = 365

# 비용 알림
cost_alert_thresholds = {
  warning  = 500
  critical = 1000
}

# 멀티 리전
enable_multi_region = true
secondary_regions   = ["eu-west-1", "ap-northeast-1"]

# 데이터베이스
enable_read_replicas = true
replica_count       = 2

# 태그
tags = {
  Owner       = "DevOps Team"
  CostCenter  = "Engineering"
  Compliance  = "SOC2"
  DataClass   = "Confidential"
}