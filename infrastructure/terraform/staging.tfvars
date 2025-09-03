# Staging 환경 변수

environment = "staging"
aws_region  = "us-east-1"

# 도메인 설정
domain_name = "staging.hooklabs-elite.com"
github_repo = "your-org/hooklabs-elite"

# VPC 설정
vpc_cidr = "10.1.0.0/16"

# 알림 설정
alert_email       = "dev-alerts@hooklabs-elite.com"
slack_webhook_url = ""  # 선택적

# 백업 설정
backup_schedule       = "0 3 * * *"  # 매일 새벽 3시
backup_retention_days = 7

# 비용 최적화 (Staging은 더 공격적인 절감)
enable_spot_instances = true
spot_max_price       = "0.03"

# 자동 스케일링 (제한적)
enable_auto_scaling       = true
target_cpu_utilization    = 80
target_memory_utilization = 85
scale_up_cooldown        = 600
scale_down_cooldown      = 1800

# CDN 설정 (제한적)
cdn_cache_ttl = {
  default = 3600    # 1시간
  max     = 86400   # 1일
  min     = 0
}
cdn_compress = true

# 보안 설정
allowed_ip_ranges = [
  "0.0.0.0/0"  # Staging은 더 개방적
]
enable_waf             = false
enable_ddos_protection = false

# 모니터링 (간소화)
enable_detailed_monitoring = false
log_retention_days        = 30
metrics_retention_days    = 90

# 비용 알림
cost_alert_thresholds = {
  warning  = 100
  critical = 200
}

# 멀티 리전 (비활성화)
enable_multi_region = false
secondary_regions   = []

# 데이터베이스 (복제본 없음)
enable_read_replicas = false
replica_count       = 0

# 태그
tags = {
  Owner       = "Dev Team"
  CostCenter  = "Engineering"
  Environment = "Staging"
}