# Redis 모듈 변수

variable "environment" {
  description = "환경 이름"
  type        = string
}

variable "redis_plan" {
  description = "Upstash Redis 플랜"
  type        = string
  default     = "pay-as-you-go"
}

variable "enable_elasticache" {
  description = "AWS ElastiCache 사용 여부"
  type        = bool
  default     = false
}

variable "node_type" {
  description = "ElastiCache 노드 타입"
  type        = string
  default     = "cache.t3.micro"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "서브넷 ID 목록"
  type        = list(string)
  default     = []
}

variable "allowed_cidr_blocks" {
  description = "허용된 CIDR 블록"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "common_tags" {
  description = "공통 태그"
  type        = map(string)
  default     = {}
}