# 네트워킹 모듈 변수

variable "environment" {
  description = "환경 이름"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "가용 영역 목록"
  type        = list(string)
}

variable "common_tags" {
  description = "공통 태그"
  type        = map(string)
  default     = {}
}