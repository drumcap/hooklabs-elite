# Auto Scaling 모듈 변수

variable "environment" {
  description = "환경 이름"
  type        = string
}

variable "min_size" {
  description = "최소 인스턴스 수"
  type        = number
  default     = 1
}

variable "max_size" {
  description = "최대 인스턴스 수"
  type        = number
  default     = 10
}

variable "desired_size" {
  description = "원하는 인스턴스 수"
  type        = number
  default     = 2
}

variable "instance_type" {
  description = "인스턴스 타입"
  type        = string
  default     = "t3.small"
}

variable "task_cpu" {
  description = "ECS 작업 CPU (단위: vCPU * 1024)"
  type        = string
  default     = "256"
}

variable "task_memory" {
  description = "ECS 작업 메모리 (MB)"
  type        = string
  default     = "512"
}

variable "target_cpu_utilization" {
  description = "목표 CPU 사용률"
  type        = number
  default     = 70
}

variable "target_memory_utilization" {
  description = "목표 메모리 사용률"
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

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "퍼블릭 서브넷 ID 목록"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "프라이빗 서브넷 ID 목록"
  type        = list(string)
}

variable "certificate_arn" {
  description = "SSL 인증서 ARN"
  type        = string
  default     = ""
}

variable "common_tags" {
  description = "공통 태그"
  type        = map(string)
  default     = {}
}