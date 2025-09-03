# CDN 모듈 - CloudFront 및 Cloudflare 설정

# CloudFront 배포
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled    = true
  comment            = "HookLabs Elite CDN - ${var.environment}"
  default_root_object = "index.html"
  price_class        = var.price_class
  
  # 오리진 설정 - Vercel
  origin {
    domain_name = "${var.domain_name}.vercel.app"
    origin_id   = "vercel-origin"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2", "TLSv1.3"]
      origin_keepalive_timeout = 30
      origin_read_timeout      = 30
    }
    
    custom_header {
      name  = "X-Environment"
      value = var.environment
    }
  }
  
  # 정적 자산 오리진 (S3)
  origin {
    domain_name = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id   = "s3-static-assets"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.static_assets.cloudfront_access_identity_path
    }
  }
  
  # 기본 캐시 동작
  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "vercel-origin"
    
    forwarded_values {
      query_string = true
      headers      = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]
      
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
    
    # 실시간 로그 설정
    realtime_log_config_arn = aws_cloudfront_realtime_log_config.main.arn
  }
  
  # 정적 자산 캐시 동작
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "s3-static-assets"
    
    forwarded_values {
      query_string = false
      headers      = []
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 604800  # 7일
    max_ttl                = 31536000 # 1년
    compress               = true
  }
  
  # Next.js 정적 자산
  ordered_cache_behavior {
    path_pattern     = "/_next/static/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "vercel-origin"
    
    forwarded_values {
      query_string = false
      headers      = []
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 31536000 # 1년
    max_ttl                = 31536000
    compress               = true
  }
  
  # 이미지 최적화
  ordered_cache_behavior {
    path_pattern     = "/_next/image*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "vercel-origin"
    
    forwarded_values {
      query_string = true
      headers      = ["Accept"]
      
      cookies {
        forward = "none"
      }
    }
    
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 60
    max_ttl                = 31536000
    compress               = true
  }
  
  # API 경로 (캐시 없음)
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "vercel-origin"
    
    forwarded_values {
      query_string = true
      headers      = ["*"]
      
      cookies {
        forward = "all"
      }
    }
    
    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = false
  }
  
  # 지리적 제한 (필요시)
  restrictions {
    geo_restriction {
      restriction_type = "none"
      # locations        = ["US", "CA", "GB", "DE", "KR", "JP"]
    }
  }
  
  # SSL 인증서
  viewer_certificate {
    cloudfront_default_certificate = false
    acm_certificate_arn            = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }
  
  # WAF 설정
  web_acl_id = aws_wafv2_web_acl.main.arn
  
  # 로깅
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.cdn_logs.bucket_domain_name
    prefix          = "cloudfront/"
  }
  
  # 사용자 정의 오류 페이지
  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404"
    error_caching_min_ttl = 300
  }
  
  custom_error_response {
    error_code         = 500
    response_code      = 500
    response_page_path = "/500"
    error_caching_min_ttl = 60
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-cdn-${var.environment}"
      Type = "CDN"
    }
  )
}

# S3 버킷 - 정적 자산
resource "aws_s3_bucket" "static_assets" {
  bucket = "hooklabs-elite-static-${var.environment}"
  
  tags = merge(
    var.common_tags,
    {
      Name = "Static Assets"
      Type = "Storage"
    }
  )
}

# S3 버킷 정책
resource "aws_s3_bucket_policy" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.static_assets.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.static_assets.arn}/*"
      }
    ]
  })
}

# CloudFront OAI
resource "aws_cloudfront_origin_access_identity" "static_assets" {
  comment = "OAI for HookLabs Elite static assets"
}

# S3 버킷 - CDN 로그
resource "aws_s3_bucket" "cdn_logs" {
  bucket = "hooklabs-elite-cdn-logs-${var.environment}"
  
  tags = merge(
    var.common_tags,
    {
      Name = "CDN Logs"
      Type = "Logging"
    }
  )
}

# S3 버킷 수명 주기 정책
resource "aws_s3_bucket_lifecycle_configuration" "cdn_logs" {
  bucket = aws_s3_bucket.cdn_logs.id
  
  rule {
    id     = "delete-old-logs"
    status = "Enabled"
    
    expiration {
      days = 90
    }
    
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 60
      storage_class = "GLACIER"
    }
  }
}

# ACM 인증서
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-cert-${var.environment}"
    }
  )
  
  lifecycle {
    create_before_destroy = true
  }
}

# ACM 인증서 검증
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route53 인증서 검증 레코드
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# WAF Web ACL
resource "aws_wafv2_web_acl" "main" {
  name  = "hooklabs-elite-waf-${var.environment}"
  scope = "CLOUDFRONT"
  
  default_action {
    allow {}
  }
  
  # Rate limiting 규칙
  rule {
    name     = "RateLimitRule"
    priority = 1
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }
  
  # SQL 인젝션 방지
  rule {
    name     = "SQLiRule"
    priority = 2
    
    action {
      block {}
    }
    
    statement {
      sqli_match_statement {
        field_to_match {
          all_query_arguments {}
        }
        
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
        
        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiRule"
      sampled_requests_enabled   = true
    }
  }
  
  # XSS 방지
  rule {
    name     = "XSSRule"
    priority = 3
    
    action {
      block {}
    }
    
    statement {
      xss_match_statement {
        field_to_match {
          all_query_arguments {}
        }
        
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
        
        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "XSSRule"
      sampled_requests_enabled   = true
    }
  }
  
  # AWS Managed Rules
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10
    
    override_action {
      none {}
    }
    
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "hooklabs-elite-waf"
    sampled_requests_enabled   = true
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "WAF-${var.environment}"
      Type = "Security"
    }
  )
}

# CloudFront 실시간 로그 설정
resource "aws_cloudfront_realtime_log_config" "main" {
  name = "hooklabs-elite-realtime-logs-${var.environment}"
  
  endpoint {
    stream_type = "Kinesis"
    
    kinesis_stream_config {
      role_arn   = aws_iam_role.cloudfront_logs.arn
      stream_arn = aws_kinesis_data_stream.cloudfront_logs.arn
    }
  }
  
  fields = [
    "timestamp",
    "c-ip",
    "sc-status",
    "cs-uri-stem",
    "cs-bytes",
    "time-taken",
    "cs-user-agent"
  ]
  
  sampling_rate = var.environment == "production" ? 1 : 10
}

# Kinesis Data Stream
resource "aws_kinesis_data_stream" "cloudfront_logs" {
  name             = "hooklabs-elite-cloudfront-logs-${var.environment}"
  shard_count      = var.environment == "production" ? 2 : 1
  retention_period = 24
  
  stream_mode_details {
    stream_mode = "PROVISIONED"
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "CloudFront Logs Stream"
      Type = "Logging"
    }
  )
}

# IAM 역할 - CloudFront 로그
resource "aws_iam_role" "cloudfront_logs" {
  name = "hooklabs-elite-cloudfront-logs-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.common_tags
}

# IAM 정책 연결
resource "aws_iam_role_policy" "cloudfront_logs" {
  role = aws_iam_role.cloudfront_logs.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kinesis:PutRecord",
          "kinesis:PutRecords"
        ]
        Resource = aws_kinesis_data_stream.cloudfront_logs.arn
      }
    ]
  })
}

# 데이터 소스 - Route53 Zone
data "aws_route53_zone" "main" {
  name = var.domain_name
}

# CloudWatch 알람 - 오리진 응답 시간
resource "aws_cloudwatch_metric_alarm" "origin_latency" {
  alarm_name          = "hooklabs-elite-origin-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "OriginLatency"
  namespace           = "AWS/CloudFront"
  period              = "300"
  statistic           = "Average"
  threshold           = var.environment == "production" ? 1000 : 2000
  alarm_description   = "오리진 응답 시간이 임계값을 초과했습니다"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
  }
  
  tags = var.common_tags
}

# CloudWatch 알람 - 4xx 오류율
resource "aws_cloudwatch_metric_alarm" "error_4xx_rate" {
  alarm_name          = "hooklabs-elite-4xx-error-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  threshold           = var.environment == "production" ? 5 : 10
  alarm_description   = "4xx 오류율이 임계값을 초과했습니다"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  metric_query {
    id          = "e1"
    expression  = "m1/m2*100"
    label       = "4xx Error Rate"
    return_data = true
  }
  
  metric_query {
    id = "m1"
    metric {
      metric_name = "4xxErrorRate"
      namespace   = "AWS/CloudFront"
      period      = "300"
      stat        = "Sum"
      dimensions = {
        DistributionId = aws_cloudfront_distribution.main.id
      }
    }
  }
  
  metric_query {
    id = "m2"
    metric {
      metric_name = "Requests"
      namespace   = "AWS/CloudFront"
      period      = "300"
      stat        = "Sum"
      dimensions = {
        DistributionId = aws_cloudfront_distribution.main.id
      }
    }
  }
  
  tags = var.common_tags
}

# SNS Topic
resource "aws_sns_topic" "alerts" {
  name = "hooklabs-elite-cdn-alerts-${var.environment}"
  
  tags = var.common_tags
}

# 출력
output "distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "static_bucket_name" {
  value = aws_s3_bucket.static_assets.id
}

output "waf_web_acl_id" {
  value = aws_wafv2_web_acl.main.id
}