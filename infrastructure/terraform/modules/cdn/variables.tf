# CDN 모듈 변수

variable "environment" {
  description = "환경 이름"
  type        = string
}

variable "domain_name" {
  description = "도메인 이름"
  type        = string
}

variable "price_class" {
  description = "CloudFront 가격 클래스"
  type        = string
  default     = "PriceClass_All"
}

variable "common_tags" {
  description = "공통 태그"
  type        = map(string)
  default     = {}
}