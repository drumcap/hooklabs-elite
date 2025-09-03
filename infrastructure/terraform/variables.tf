# 변수 정의 파일

variable "environment" {
  description = "배포 환경 (development, staging, production)"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "환경은 development, staging, production 중 하나여야 합니다."
  }
}

variable "aws_region" {
  description = "AWS 기본 리전"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "애플리케이션 도메인 이름"
  type        = string
}

variable "github_repo" {
  description = "GitHub 리포지토리 (예: username/repo)"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"
}

# API 토큰 및 인증
variable "vercel_api_token" {
  description = "Vercel API 토큰"
  type        = string
  sensitive   = true
}

variable "cloudflare_api_token" {
  description = "Cloudflare API 토큰"
  type        = string
  sensitive   = true
}

variable "upstash_email" {
  description = "Upstash 계정 이메일"
  type        = string
}

variable "upstash_api_key" {
  description = "Upstash API 키"
  type        = string
  sensitive   = true
}

# 알림 설정
variable "alert_email" {
  description = "알림을 받을 이메일 주소"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack 알림 웹훅 URL"
  type        = string
  sensitive   = true
  default     = ""
}

# 백업 설정
variable "backup_schedule" {
  description = "백업 스케줄 (cron 표현식)"
  type        = string
  default     = "0 2 * * *" # 매일 새벽 2시
}

variable "backup_retention_days" {
  description = "백업 보관 기간 (일)"
  type        = number
  default     = 30
}

# 비용 최적화 설정
variable "enable_spot_instances" {
  description = "스팟 인스턴스 사용 여부"
  type        = bool
  default     = true
}

variable "spot_max_price" {
  description = "스팟 인스턴스 최대 가격 (USD/시간)"
  type        = string
  default     = "0.05"
}

# 성능 설정
variable "enable_auto_scaling" {
  description = "자동 스케일링 활성화"
  type        = bool
  default     = true
}

variable "target_cpu_utilization" {
  description = "목표 CPU 사용률 (%)"
  type        = number
  default     = 70
}

variable "target_memory_utilization" {
  description = "목표 메모리 사용률 (%)"
  type        = number
  default     = 80
}

variable "scale_up_cooldown" {
  description = "스케일 업 대기 시간 (초)"
  type        = number
  default     = 300
}

variable "scale_down_cooldown" {
  description = "스케일 다운 대기 시간 (초)"
  type        = number
  default     = 900
}

# CDN 설정
variable "cdn_cache_ttl" {
  description = "CDN 캐시 TTL (초)"
  type = object({
    default = number
    max     = number
    min     = number
  })
  default = {
    default = 86400  # 1일
    max     = 31536000 # 1년
    min     = 0
  }
}

variable "cdn_compress" {
  description = "CDN 압축 활성화"
  type        = bool
  default     = true
}

# 보안 설정
variable "allowed_ip_ranges" {
  description = "허용된 IP 범위 목록"
  type        = list(string)
  default     = ["0.0.0.0/0"] # 프로덕션에서는 제한 필요
}

variable "enable_waf" {
  description = "WAF 활성화"
  type        = bool
  default     = true
}

variable "enable_ddos_protection" {
  description = "DDoS 보호 활성화"
  type        = bool
  default     = true
}

# 모니터링 설정
variable "enable_detailed_monitoring" {
  description = "상세 모니터링 활성화"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "로그 보관 기간 (일)"
  type        = number
  default     = 90
}

variable "metrics_retention_days" {
  description = "메트릭 보관 기간 (일)"
  type        = number
  default     = 365
}

# 비용 알림 임계값
variable "cost_alert_thresholds" {
  description = "비용 알림 임계값 (USD)"
  type = object({
    warning  = number
    critical = number
  })
  default = {
    warning  = 500
    critical = 1000
  }
}

# 지역별 설정
variable "enable_multi_region" {
  description = "다중 리전 배포 활성화"
  type        = bool
  default     = false
}

variable "secondary_regions" {
  description = "보조 리전 목록"
  type        = list(string)
  default     = ["eu-west-1", "ap-northeast-1"]
}

# 데이터베이스 설정 (Convex 외 추가 필요시)
variable "enable_read_replicas" {
  description = "읽기 전용 복제본 활성화"
  type        = bool
  default     = false
}

variable "replica_count" {
  description = "읽기 전용 복제본 수"
  type        = number
  default     = 0
}

# 태그
variable "tags" {
  description = "추가 태그"
  type        = map(string)
  default     = {}
}