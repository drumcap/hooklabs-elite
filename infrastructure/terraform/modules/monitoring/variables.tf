# 모니터링 모듈 변수

variable "environment" {
  description = "환경 이름"
  type        = string
}

variable "alert_email" {
  description = "알림 이메일 주소"
  type        = string
}

variable "slack_webhook_url" {
  description = "Slack 웹훅 URL"
  type        = string
  default     = ""
}

variable "cost_threshold" {
  description = "비용 알람 임계값 (USD)"
  type        = number
  default     = 1000
}

variable "min_size" {
  description = "최소 인스턴스 수 (비용 계산용)"
  type        = number
  default     = 1
}

variable "common_tags" {
  description = "공통 태그"
  type        = map(string)
  default     = {}
}