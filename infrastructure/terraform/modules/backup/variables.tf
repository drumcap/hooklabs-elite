# 백업 모듈 변수

variable "environment" {
  description = "환경 이름"
  type        = string
}

variable "backup_schedule" {
  description = "백업 스케줄 (cron 표현식)"
  type        = string
  default     = "cron(0 2 * * ? *)"
}

variable "retention_days" {
  description = "백업 보관 기간 (일)"
  type        = number
  default     = 30
}

variable "common_tags" {
  description = "공통 태그"
  type        = map(string)
  default     = {}
}