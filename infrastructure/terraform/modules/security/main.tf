# 보안 모듈 - IAM, 시크릿, 컴플라이언스

# KMS 키 - 암호화
resource "aws_kms_key" "main" {
  description             = "HookLabs Elite 암호화 키 - ${var.environment}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-kms-${var.environment}"
      Type = "Security"
    }
  )
}

# KMS 키 별칭
resource "aws_kms_alias" "main" {
  name          = "alias/hooklabs-elite-${var.environment}"
  target_key_id = aws_kms_key.main.key_id
}

# IAM 정책 - 최소 권한
resource "aws_iam_policy" "app_policy" {
  name        = "hooklabs-elite-app-policy-${var.environment}"
  description = "애플리케이션 최소 권한 정책"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::hooklabs-elite-*/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:*:*:secret:hooklabs-elite-*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.main.arn
      }
    ]
  })
  
  tags = var.common_tags
}

# Secrets Manager - API 키
resource "aws_secretsmanager_secret" "api_keys" {
  name                    = "hooklabs-elite-api-keys-${var.environment}"
  description            = "API 키 및 시크릿"
  recovery_window_in_days = 7
  kms_key_id             = aws_kms_key.main.id
  
  tags = var.common_tags
}

# Secrets Manager 버전
resource "aws_secretsmanager_secret_version" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  
  secret_string = jsonencode({
    CLERK_SECRET_KEY        = "placeholder"
    LEMONSQUEEZY_API_KEY   = "placeholder"
    GOOGLE_AI_API_KEY      = "placeholder"
    TWITTER_CLIENT_SECRET  = "placeholder"
    META_APP_SECRET        = "placeholder"
  })
  
  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Secrets Manager 로테이션
resource "aws_secretsmanager_secret_rotation" "api_keys" {
  secret_id = aws_secretsmanager_secret.api_keys.id
  
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn
  
  rotation_rules {
    automatically_after_days = 90
  }
}

# Lambda 함수 - 시크릿 로테이션
resource "aws_lambda_function" "secret_rotation" {
  filename      = "secret_rotation.zip"
  function_name = "hooklabs-elite-secret-rotation-${var.environment}"
  role          = aws_iam_role.secret_rotation.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 30
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }
  
  tags = var.common_tags
}

# IAM 역할 - 시크릿 로테이션
resource "aws_iam_role" "secret_rotation" {
  name = "hooklabs-elite-secret-rotation-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.common_tags
}

# IAM 정책 연결
resource "aws_iam_role_policy_attachment" "secret_rotation_basic" {
  role       = aws_iam_role.secret_rotation.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "secret_rotation" {
  role = aws_iam_role.secret_rotation.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = aws_secretsmanager_secret.api_keys.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.main.arn
      }
    ]
  })
}

# GuardDuty - 위협 탐지
resource "aws_guardduty_detector" "main" {
  enable = true
  
  finding_publishing_frequency = var.environment == "production" ? "FIFTEEN_MINUTES" : "ONE_HOUR"
  
  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }
  
  tags = var.common_tags
}

# Security Hub
resource "aws_securityhub_account" "main" {
  count = var.environment == "production" ? 1 : 0
  
  enable_default_standards = true
  control_finding_generator = "SECURITY_CONTROL"
  auto_enable_controls     = true
}

# Config 규칙 - 컴플라이언스
resource "aws_config_config_rule" "required_tags" {
  name = "hooklabs-elite-required-tags-${var.environment}"
  
  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }
  
  input_parameters = jsonencode({
    tag1Key = "Environment"
    tag2Key = "Owner"
    tag3Key = "CostCenter"
  })
  
  tags = var.common_tags
}

resource "aws_config_config_rule" "encrypted_volumes" {
  name = "hooklabs-elite-encrypted-volumes-${var.environment}"
  
  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }
  
  tags = var.common_tags
}

# CloudTrail - 감사 로깅
resource "aws_cloudtrail" "main" {
  name                          = "hooklabs-elite-trail-${var.environment}"
  s3_bucket_name               = aws_s3_bucket.trail.id
  include_global_service_events = true
  is_multi_region_trail        = true
  enable_log_file_validation   = true
  
  event_selector {
    read_write_type           = "All"
    include_management_events = true
    
    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::hooklabs-elite-*/*"]
    }
  }
  
  insight_selector {
    insight_type = "ApiCallRateInsight"
  }
  
  kms_key_id = aws_kms_key.main.arn
  
  tags = var.common_tags
}

# S3 버킷 - CloudTrail 로그
resource "aws_s3_bucket" "trail" {
  bucket        = "hooklabs-elite-trail-${data.aws_caller_identity.current.account_id}-${var.environment}"
  force_destroy = false
  
  tags = merge(
    var.common_tags,
    {
      Name = "CloudTrail Logs"
      Type = "Audit"
    }
  )
}

# S3 버킷 정책 - CloudTrail
resource "aws_s3_bucket_policy" "trail" {
  bucket = aws_s3_bucket.trail.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.trail.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.trail.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# S3 버킷 암호화
resource "aws_s3_bucket_server_side_encryption_configuration" "trail" {
  bucket = aws_s3_bucket.trail.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.main.arn
    }
  }
}

# S3 버킷 버저닝
resource "aws_s3_bucket_versioning" "trail" {
  bucket = aws_s3_bucket.trail.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 버킷 수명 주기
resource "aws_s3_bucket_lifecycle_configuration" "trail" {
  bucket = aws_s3_bucket.trail.id
  
  rule {
    id     = "archive-old-logs"
    status = "Enabled"
    
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
    
    transition {
      days          = 365
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 2555 # 7년 보관
    }
  }
}

# Systems Manager Parameter Store - 설정 관리
resource "aws_ssm_parameter" "app_config" {
  name  = "/hooklabs-elite/${var.environment}/config"
  type  = "SecureString"
  value = jsonencode({
    environment = var.environment
    features = {
      enable_analytics = true
      enable_ai        = true
      enable_social    = true
    }
  })
  
  key_id = aws_kms_key.main.id
  
  tags = var.common_tags
}

# IAM 정책 - 읽기 전용 액세스
resource "aws_iam_policy" "readonly" {
  name        = "hooklabs-elite-readonly-${var.environment}"
  description = "읽기 전용 액세스 정책"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "secretsmanager:GetSecretValue",
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = var.common_tags
}

# 데이터 소스
data "aws_caller_identity" "current" {}

# 출력
output "kms_key_id" {
  value       = aws_kms_key.main.id
  description = "KMS 키 ID"
}

output "kms_key_arn" {
  value       = aws_kms_key.main.arn
  description = "KMS 키 ARN"
}

output "secrets_manager_arn" {
  value       = aws_secretsmanager_secret.api_keys.arn
  description = "Secrets Manager ARN"
}

output "cloudtrail_name" {
  value       = aws_cloudtrail.main.name
  description = "CloudTrail 이름"
}

output "guardduty_detector_id" {
  value       = aws_guardduty_detector.main.id
  description = "GuardDuty 탐지기 ID"
}