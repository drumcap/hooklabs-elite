# 백업 및 재해 복구 모듈

# AWS Backup Vault
resource "aws_backup_vault" "main" {
  name        = "hooklabs-elite-vault-${var.environment}"
  kms_key_arn = aws_kms_key.backup.arn
  
  tags = merge(
    var.common_tags,
    {
      Name = "Backup Vault"
      Type = "Backup"
    }
  )
}

# KMS 키 - 백업 암호화
resource "aws_kms_key" "backup" {
  description             = "HookLabs Elite 백업 암호화 키"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = var.common_tags
}

# KMS 키 별칭
resource "aws_kms_alias" "backup" {
  name          = "alias/hooklabs-elite-backup-${var.environment}"
  target_key_id = aws_kms_key.backup.key_id
}

# 백업 계획
resource "aws_backup_plan" "main" {
  name = "hooklabs-elite-backup-plan-${var.environment}"
  
  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = var.backup_schedule
    start_window      = 60
    completion_window = 120
    
    lifecycle {
      delete_after = var.retention_days
      cold_storage_after = var.environment == "production" ? 30 : null
    }
    
    recovery_point_tags = merge(
      var.common_tags,
      {
        Type = "DailyBackup"
      }
    )
  }
  
  # 주간 백업 (프로덕션만)
  dynamic "rule" {
    for_each = var.environment == "production" ? [1] : []
    content {
      rule_name         = "weekly_backup"
      target_vault_name = aws_backup_vault.main.name
      schedule          = "cron(0 3 ? * SUN *)"
      start_window      = 60
      completion_window = 180
      
      lifecycle {
        delete_after = 90
        cold_storage_after = 7
      }
      
      recovery_point_tags = merge(
        var.common_tags,
        {
          Type = "WeeklyBackup"
        }
      )
    }
  }
  
  # 월간 백업 (프로덕션만)
  dynamic "rule" {
    for_each = var.environment == "production" ? [1] : []
    content {
      rule_name         = "monthly_backup"
      target_vault_name = aws_backup_vault.main.name
      schedule          = "cron(0 3 1 * ? *)"
      start_window      = 60
      completion_window = 360
      
      lifecycle {
        delete_after = 365
        cold_storage_after = 30
      }
      
      recovery_point_tags = merge(
        var.common_tags,
        {
          Type = "MonthlyBackup"
        }
      )
    }
  }
  
  tags = var.common_tags
}

# 백업 선택
resource "aws_backup_selection" "main" {
  name         = "hooklabs-elite-backup-selection-${var.environment}"
  plan_id      = aws_backup_plan.main.id
  iam_role_arn = aws_iam_role.backup.arn
  
  # EBS 볼륨 백업
  selection_tag {
    type  = "STRINGEQUALS"
    key   = "Backup"
    value = "true"
  }
  
  # RDS 백업
  resources = [
    "arn:aws:rds:*:*:db:hooklabs-elite-*",
    "arn:aws:rds:*:*:cluster:hooklabs-elite-*"
  ]
  
  # DynamoDB 백업
  condition {
    string_equals {
      key   = "aws:ResourceTag/Environment"
      value = var.environment
    }
  }
}

# IAM 역할 - AWS Backup
resource "aws_iam_role" "backup" {
  name = "hooklabs-elite-backup-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.common_tags
}

# IAM 정책 연결
resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# S3 버킷 - 백업 저장소
resource "aws_s3_bucket" "backup" {
  bucket = "hooklabs-elite-backups-${data.aws_caller_identity.current.account_id}-${var.environment}"
  
  tags = merge(
    var.common_tags,
    {
      Name = "Backup Storage"
      Type = "Backup"
    }
  )
}

# S3 버킷 암호화
resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  bucket = aws_s3_bucket.backup.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.backup.arn
    }
  }
}

# S3 버킷 버저닝
resource "aws_s3_bucket_versioning" "backup" {
  bucket = aws_s3_bucket.backup.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 버킷 복제 (크로스 리전 - 프로덕션만)
resource "aws_s3_bucket_replication_configuration" "backup" {
  count = var.environment == "production" ? 1 : 0
  
  role   = aws_iam_role.replication[0].arn
  bucket = aws_s3_bucket.backup.id
  
  rule {
    id     = "replicate-all"
    status = "Enabled"
    
    filter {}
    
    delete_marker_replication {
      status = "Enabled"
    }
    
    destination {
      bucket        = aws_s3_bucket.backup_replica[0].arn
      storage_class = "STANDARD_IA"
      
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.backup_replica[0].arn
      }
    }
  }
  
  depends_on = [aws_s3_bucket_versioning.backup]
}

# S3 버킷 - 복제본 (다른 리전)
resource "aws_s3_bucket" "backup_replica" {
  count = var.environment == "production" ? 1 : 0
  
  provider = aws.secondary
  bucket   = "hooklabs-elite-backups-replica-${data.aws_caller_identity.current.account_id}-${var.environment}"
  
  tags = merge(
    var.common_tags,
    {
      Name = "Backup Storage Replica"
      Type = "Backup"
    }
  )
}

# KMS 키 - 복제본 리전
resource "aws_kms_key" "backup_replica" {
  count = var.environment == "production" ? 1 : 0
  
  provider                = aws.secondary
  description             = "HookLabs Elite 백업 복제본 암호화 키"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  tags = var.common_tags
}

# IAM 역할 - S3 복제
resource "aws_iam_role" "replication" {
  count = var.environment == "production" ? 1 : 0
  
  name = "hooklabs-elite-s3-replication-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.common_tags
}

# IAM 정책 - S3 복제
resource "aws_iam_role_policy" "replication" {
  count = var.environment == "production" ? 1 : 0
  
  role = aws_iam_role.replication[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = aws_s3_bucket.backup.arn
      },
      {
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.backup.arn}/*"
      },
      {
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.backup_replica[0].arn}/*"
      }
    ]
  })
}

# Lambda 함수 - 백업 검증
resource "aws_lambda_function" "backup_validator" {
  filename      = "backup_validator.zip"
  function_name = "hooklabs-elite-backup-validator-${var.environment}"
  role          = aws_iam_role.backup_validator.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 60
  
  environment {
    variables = {
      BACKUP_VAULT = aws_backup_vault.main.name
      ENVIRONMENT  = var.environment
      SNS_TOPIC    = aws_sns_topic.backup_alerts.arn
    }
  }
  
  tags = var.common_tags
}

# IAM 역할 - 백업 검증
resource "aws_iam_role" "backup_validator" {
  name = "hooklabs-elite-backup-validator-${var.environment}"
  
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

# EventBridge 규칙 - 백업 검증
resource "aws_cloudwatch_event_rule" "backup_validation" {
  name                = "hooklabs-elite-backup-validation-${var.environment}"
  description         = "백업 검증 스케줄"
  schedule_expression = "cron(0 6 * * ? *)" # 매일 오전 6시
  
  tags = var.common_tags
}

# EventBridge 타겟
resource "aws_cloudwatch_event_target" "backup_validator" {
  rule      = aws_cloudwatch_event_rule.backup_validation.name
  target_id = "BackupValidatorLambda"
  arn       = aws_lambda_function.backup_validator.arn
}

# Lambda 권한
resource "aws_lambda_permission" "backup_validator" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backup_validator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.backup_validation.arn
}

# SNS Topic - 백업 알림
resource "aws_sns_topic" "backup_alerts" {
  name = "hooklabs-elite-backup-alerts-${var.environment}"
  
  tags = var.common_tags
}

# CloudWatch 알람 - 백업 실패
resource "aws_cloudwatch_metric_alarm" "backup_failed" {
  alarm_name          = "hooklabs-elite-backup-failed-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "NumberOfBackupJobsFailed"
  namespace           = "AWS/Backup"
  period              = "86400"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "백업 작업이 실패했습니다"
  alarm_actions       = [aws_sns_topic.backup_alerts.arn]
  
  tags = var.common_tags
}

# 데이터 소스
data "aws_caller_identity" "current" {}

# 프로바이더 - 보조 리전
provider "aws" {
  alias  = "secondary"
  region = "eu-west-1"
}

# 출력
output "backup_vault_name" {
  value       = aws_backup_vault.main.name
  description = "백업 볼트 이름"
}

output "backup_vault_arn" {
  value       = aws_backup_vault.main.arn
  description = "백업 볼트 ARN"
}

output "backup_plan_id" {
  value       = aws_backup_plan.main.id
  description = "백업 계획 ID"
}

output "backup_bucket_name" {
  value       = aws_s3_bucket.backup.id
  description = "백업 S3 버킷 이름"
}