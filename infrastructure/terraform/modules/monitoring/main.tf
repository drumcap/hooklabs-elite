# 모니터링 모듈 - CloudWatch, X-Ray, Cost Explorer

# CloudWatch 대시보드
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "hooklabs-elite-${var.environment}"
  
  dashboard_body = jsonencode({
    widgets = [
      # 개요 위젯
      {
        type = "metric"
        properties = {
          title   = "시스템 개요"
          period  = 300
          stat    = "Average"
          region  = data.aws_region.current.name
          metrics = [
            ["AWS/ECS", "CPUUtilization", { label = "ECS CPU" }],
            [".", "MemoryUtilization", { label = "ECS Memory" }],
            ["AWS/ElastiCache", "CPUUtilization", { label = "Redis CPU" }],
            ["AWS/CloudFront", "Requests", { stat = "Sum", label = "CDN Requests" }]
          ]
        }
      },
      # API 응답 시간
      {
        type = "metric"
        properties = {
          title  = "API 응답 시간"
          period = 60
          stat   = "Average"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", { label = "Response Time (ms)" }]
          ]
        }
      },
      # 오류율
      {
        type = "metric"
        properties = {
          title  = "오류율"
          period = 300
          stat   = "Sum"
          region = data.aws_region.current.name
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", { label = "4xx Errors" }],
            [".", "HTTPCode_Target_5XX_Count", { label = "5xx Errors" }]
          ]
        }
      },
      # 비용 추적
      {
        type = "metric"
        properties = {
          title  = "일일 예상 비용"
          period = 86400
          stat   = "Maximum"
          region = "us-east-1"
          metrics = [
            ["AWS/Billing", "EstimatedCharges", { label = "Total Cost (USD)" }]
          ]
        }
      }
    ]
  })
}

# X-Ray 추적 설정
resource "aws_xray_sampling_rule" "main" {
  rule_name      = "hooklabs-elite-${var.environment}"
  priority       = 1000
  version        = 1
  reservoir_size = 1
  fixed_rate     = var.environment == "production" ? 0.1 : 0.5
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"
  
  tags = var.common_tags
}

# Cost and Usage Report
resource "aws_cur_report_definition" "main" {
  count = var.environment == "production" ? 1 : 0
  
  report_name                = "hooklabs-elite-cost-report"
  time_unit                  = "DAILY"
  format                     = "Parquet"
  compression                = "GZIP"
  additional_schema_elements = ["RESOURCES"]
  s3_bucket                  = aws_s3_bucket.cost_reports[0].bucket
  s3_region                  = data.aws_region.current.name
  s3_prefix                  = "cost-reports"
  report_versioning          = "OVERWRITE_REPORT"
  refresh_closed_reports     = true
}

# S3 버킷 - 비용 리포트
resource "aws_s3_bucket" "cost_reports" {
  count = var.environment == "production" ? 1 : 0
  
  bucket = "hooklabs-elite-cost-reports-${data.aws_caller_identity.current.account_id}"
  
  tags = merge(
    var.common_tags,
    {
      Name = "Cost Reports"
      Type = "Analytics"
    }
  )
}

# S3 버킷 정책 - 비용 리포트
resource "aws_s3_bucket_policy" "cost_reports" {
  count = var.environment == "production" ? 1 : 0
  
  bucket = aws_s3_bucket.cost_reports[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "billingreports.amazonaws.com"
        }
        Action = [
          "s3:GetBucketAcl",
          "s3:GetBucketPolicy"
        ]
        Resource = aws_s3_bucket.cost_reports[0].arn
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "billingreports.amazonaws.com"
        }
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.cost_reports[0].arn}/*"
      }
    ]
  })
}

# CloudWatch 알람 - 고비용 경고
resource "aws_cloudwatch_metric_alarm" "cost_alarm" {
  alarm_name          = "hooklabs-elite-cost-alarm-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400"
  statistic           = "Maximum"
  threshold           = var.cost_threshold
  alarm_description   = "월간 AWS 비용이 임계값을 초과했습니다"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    Currency = "USD"
  }
  
  tags = var.common_tags
}

# CloudWatch 알람 - 높은 CPU 사용률
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "hooklabs-elite-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU 사용률이 80%를 초과했습니다"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  tags = var.common_tags
}

# CloudWatch 알람 - 높은 메모리 사용률
resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "hooklabs-elite-high-memory-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS 메모리 사용률이 85%를 초과했습니다"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  tags = var.common_tags
}

# CloudWatch 알람 - API 응답 시간
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "hooklabs-elite-api-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = 2000 # 2초
  alarm_description   = "API 응답 시간이 2초를 초과했습니다"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  
  tags = var.common_tags
}

# CloudWatch 알람 - 5xx 오류
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "hooklabs-elite-5xx-errors-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "5xx 오류가 10개 이상 발생했습니다"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"
  
  tags = var.common_tags
}

# SNS Topic
resource "aws_sns_topic" "alerts" {
  name = "hooklabs-elite-alerts-${var.environment}"
  
  tags = var.common_tags
}

# SNS 구독 - 이메일
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# SNS 구독 - Slack
resource "aws_sns_topic_subscription" "slack" {
  count = var.slack_webhook_url != "" ? 1 : 0
  
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url
}

# Lambda 함수 - 비용 최적화 추천
resource "aws_lambda_function" "cost_optimizer" {
  count = var.environment == "production" ? 1 : 0
  
  filename      = "cost_optimizer.zip"
  function_name = "hooklabs-elite-cost-optimizer-${var.environment}"
  role          = aws_iam_role.cost_optimizer[0].arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 300
  memory_size   = 512
  
  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.alerts.arn
      ENVIRONMENT   = var.environment
    }
  }
  
  tags = var.common_tags
}

# IAM 역할 - Cost Optimizer
resource "aws_iam_role" "cost_optimizer" {
  count = var.environment == "production" ? 1 : 0
  
  name = "hooklabs-elite-cost-optimizer-${var.environment}"
  
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

# IAM 정책 - Cost Optimizer
resource "aws_iam_role_policy" "cost_optimizer" {
  count = var.environment == "production" ? 1 : 0
  
  role = aws_iam_role.cost_optimizer[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ce:GetCostAndUsage",
          "ce:GetCostForecast",
          "ce:GetReservationUtilization",
          "ce:GetSavingsPlansPurchaseRecommendation",
          "ce:GetRightsizingRecommendation",
          "compute-optimizer:GetRecommendationSummaries",
          "compute-optimizer:GetEC2InstanceRecommendations",
          "compute-optimizer:GetECSServiceRecommendations",
          "trusted-advisor:Describe*",
          "sns:Publish",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# EventBridge 규칙 - 일일 비용 리포트
resource "aws_cloudwatch_event_rule" "daily_cost_report" {
  count = var.environment == "production" ? 1 : 0
  
  name                = "hooklabs-elite-daily-cost-report"
  description         = "일일 비용 리포트 생성"
  schedule_expression = "cron(0 9 * * ? *)" # 매일 오전 9시 (UTC)
  
  tags = var.common_tags
}

# EventBridge 타겟
resource "aws_cloudwatch_event_target" "cost_optimizer" {
  count = var.environment == "production" ? 1 : 0
  
  rule      = aws_cloudwatch_event_rule.daily_cost_report[0].name
  target_id = "CostOptimizerLambda"
  arn       = aws_lambda_function.cost_optimizer[0].arn
}

# Lambda 권한
resource "aws_lambda_permission" "cost_optimizer" {
  count = var.environment == "production" ? 1 : 0
  
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cost_optimizer[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_cost_report[0].arn
}

# CloudWatch Logs Insights 쿼리
resource "aws_cloudwatch_query_definition" "error_analysis" {
  name = "hooklabs-elite-error-analysis"
  
  log_group_names = [
    "/ecs/hooklabs-elite-api-${var.environment}"
  ]
  
  query_string = <<-EOT
    fields @timestamp, @message, @logStream
    | filter @message like /ERROR/
    | stats count() by bin(5m)
  EOT
}

# 비용 이상 감지
resource "aws_ce_anomaly_detector" "main" {
  count = var.environment == "production" ? 1 : 0
  
  name                  = "hooklabs-elite-anomaly-detector"
  monitor_arn_list     = [aws_ce_anomaly_monitor.main[0].arn]
  frequency            = "DAILY"
  monitor_dimension    = "SERVICE"
}

resource "aws_ce_anomaly_monitor" "main" {
  count = var.environment == "production" ? 1 : 0
  
  name              = "hooklabs-elite-cost-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

resource "aws_ce_anomaly_subscription" "main" {
  count = var.environment == "production" ? 1 : 0
  
  name      = "hooklabs-elite-anomaly-subscription"
  frequency = "IMMEDIATE"
  
  monitor_arn_list = [
    aws_ce_anomaly_monitor.main[0].arn
  ]
  
  subscriber {
    type    = "SNS"
    address = aws_sns_topic.alerts.arn
  }
  
  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }
}

# 데이터 소스
data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# 비용 계산 (예상)
locals {
  # 월간 예상 비용 계산
  vercel_cost = var.environment == "production" ? 20 : 0 # Vercel Pro
  convex_cost = var.environment == "production" ? 25 : 0 # Convex Pro
  
  # AWS 비용 (예상)
  cloudfront_cost = var.environment == "production" ? 50 : 10
  fargate_cost = var.environment == "production" ? 
    (var.min_size * 0.04 * 24 * 30) : # Fargate Spot 비용
    (var.min_size * 0.02 * 24 * 30)
  redis_cost = var.environment == "production" ? 30 : 0
  alb_cost = var.environment == "production" ? 20 : 10
  storage_cost = 5 # S3, CloudWatch Logs 등
  
  total_estimated_cost = (
    vercel_cost +
    convex_cost +
    cloudfront_cost +
    fargate_cost +
    redis_cost +
    alb_cost +
    storage_cost
  )
}

# 출력
output "dashboard_url" {
  value = "https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}

output "estimated_cost" {
  value = local.total_estimated_cost
  description = "예상 월간 비용 (USD)"
}