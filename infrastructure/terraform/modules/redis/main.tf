# Redis 캐싱 레이어 모듈 - Upstash Redis

# Upstash Redis 데이터베이스
resource "upstash_redis_database" "main" {
  database_name = "hooklabs-elite-${var.environment}"
  region        = "us-east-1"
  
  # 플랜 선택 (free, pay-as-you-go, fixed)
  plan = var.redis_plan
  
  # TLS 활성화
  tls = true
  
  # 자동 백업 설정 (프로덕션만)
  eviction = var.environment == "production" ? false : true
  
  # 다중 가용 영역 (프로덕션만)
  multizone = var.environment == "production" ? true : false
}

# Redis 보조 리전 복제본 (프로덕션만)
resource "upstash_redis_database" "replica_eu" {
  count = var.environment == "production" ? 1 : 0
  
  database_name = "hooklabs-elite-${var.environment}-eu"
  region        = "eu-west-1"
  plan          = var.redis_plan
  tls           = true
  eviction      = false
  
  # 메인 데이터베이스 복제
  primary_region = upstash_redis_database.main.region
}

resource "upstash_redis_database" "replica_asia" {
  count = var.environment == "production" ? 1 : 0
  
  database_name = "hooklabs-elite-${var.environment}-asia"
  region        = "ap-northeast-1"
  plan          = var.redis_plan
  tls           = true
  eviction      = false
  
  # 메인 데이터베이스 복제
  primary_region = upstash_redis_database.main.region
}

# ElastiCache Redis 클러스터 (AWS 네이티브 옵션)
resource "aws_elasticache_replication_group" "main" {
  count = var.enable_elasticache ? 1 : 0
  
  replication_group_id       = "hooklabs-elite-${var.environment}"
  description               = "HookLabs Elite Redis 캐싱 레이어"
  node_type                 = var.node_type
  parameter_group_name      = aws_elasticache_parameter_group.main[0].name
  subnet_group_name         = aws_elasticache_subnet_group.main[0].name
  security_group_ids        = [aws_security_group.redis[0].id]
  
  # 클러스터 모드
  automatic_failover_enabled = var.environment == "production" ? true : false
  multi_az_enabled          = var.environment == "production" ? true : false
  
  # 노드 설정
  replicas_per_node_group = var.environment == "production" ? 2 : 0
  num_node_groups        = var.environment == "production" ? 2 : 1
  
  # 엔진 설정
  engine               = "redis"
  engine_version       = "7.0"
  port                 = 6379
  
  # 백업 설정
  snapshot_retention_limit = var.environment == "production" ? 7 : 1
  snapshot_window         = "03:00-05:00"
  
  # 유지보수 윈도우
  maintenance_window = "sun:05:00-sun:07:00"
  
  # 알림 설정
  notification_topic_arn = aws_sns_topic.redis_alerts.arn
  
  # 암호화
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = random_password.redis_auth_token[0].result
  
  # 로깅
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis[0].name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type        = "slow-log"
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "Redis-${var.environment}"
      Type = "Cache"
    }
  )
}

# ElastiCache 파라미터 그룹
resource "aws_elasticache_parameter_group" "main" {
  count = var.enable_elasticache ? 1 : 0
  
  name   = "hooklabs-elite-redis-params-${var.environment}"
  family = "redis7"
  
  # 성능 최적화 파라미터
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }
  
  parameter {
    name  = "timeout"
    value = "300"
  }
  
  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }
  
  parameter {
    name  = "tcp-backlog"
    value = "511"
  }
  
  parameter {
    name  = "maxclients"
    value = "65000"
  }
  
  tags = var.common_tags
}

# ElastiCache 서브넷 그룹
resource "aws_elasticache_subnet_group" "main" {
  count = var.enable_elasticache ? 1 : 0
  
  name       = "hooklabs-elite-redis-subnet-${var.environment}"
  subnet_ids = var.subnet_ids
  
  tags = var.common_tags
}

# 보안 그룹 - Redis
resource "aws_security_group" "redis" {
  count = var.enable_elasticache ? 1 : 0
  
  name        = "hooklabs-elite-redis-sg-${var.environment}"
  description = "Security group for Redis cluster"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "Redis-SG-${var.environment}"
      Type = "Security"
    }
  )
}

# Redis 인증 토큰
resource "random_password" "redis_auth_token" {
  count = var.enable_elasticache ? 1 : 0
  
  length  = 32
  special = true
}

# CloudWatch 로그 그룹
resource "aws_cloudwatch_log_group" "redis" {
  count = var.enable_elasticache ? 1 : 0
  
  name              = "/aws/elasticache/redis/${var.environment}"
  retention_in_days = 30
  
  tags = var.common_tags
}

# SNS Topic - Redis 알림
resource "aws_sns_topic" "redis_alerts" {
  name = "hooklabs-elite-redis-alerts-${var.environment}"
  
  tags = var.common_tags
}

# CloudWatch 알람 - Redis CPU 사용률
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count = var.enable_elasticache ? 1 : 0
  
  alarm_name          = "hooklabs-elite-redis-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.environment == "production" ? 75 : 90
  alarm_description   = "Redis CPU 사용률이 임계값을 초과했습니다"
  alarm_actions       = [aws_sns_topic.redis_alerts.arn]
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main[0].id
  }
  
  tags = var.common_tags
}

# CloudWatch 알람 - Redis 메모리 사용률
resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  count = var.enable_elasticache ? 1 : 0
  
  alarm_name          = "hooklabs-elite-redis-memory-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.environment == "production" ? 80 : 90
  alarm_description   = "Redis 메모리 사용률이 임계값을 초과했습니다"
  alarm_actions       = [aws_sns_topic.redis_alerts.arn]
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main[0].id
  }
  
  tags = var.common_tags
}

# CloudWatch 알람 - Redis 연결 수
resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  count = var.enable_elasticache ? 1 : 0
  
  alarm_name          = "hooklabs-elite-redis-connections-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = "300"
  statistic           = "Average"
  threshold           = var.environment == "production" ? 50000 : 10000
  alarm_description   = "Redis 연결 수가 임계값을 초과했습니다"
  alarm_actions       = [aws_sns_topic.redis_alerts.arn]
  
  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.main[0].id
  }
  
  tags = var.common_tags
}

# Lambda 함수 - 캐시 워밍
resource "aws_lambda_function" "cache_warmer" {
  count = var.environment == "production" ? 1 : 0
  
  filename      = "cache_warmer.zip"
  function_name = "hooklabs-elite-cache-warmer-${var.environment}"
  role          = aws_iam_role.cache_warmer[0].arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 60
  memory_size   = 256
  
  environment {
    variables = {
      REDIS_URL   = var.enable_elasticache ? aws_elasticache_replication_group.main[0].primary_endpoint_address : upstash_redis_database.main.endpoint
      ENVIRONMENT = var.environment
    }
  }
  
  tags = var.common_tags
}

# IAM 역할 - 캐시 워머
resource "aws_iam_role" "cache_warmer" {
  count = var.environment == "production" ? 1 : 0
  
  name = "hooklabs-elite-cache-warmer-role-${var.environment}"
  
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
resource "aws_iam_role_policy_attachment" "cache_warmer_basic" {
  count = var.environment == "production" ? 1 : 0
  
  role       = aws_iam_role.cache_warmer[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# EventBridge 규칙 - 정기 캐시 워밍
resource "aws_cloudwatch_event_rule" "cache_warmer" {
  count = var.environment == "production" ? 1 : 0
  
  name                = "hooklabs-elite-cache-warmer-${var.environment}"
  description         = "정기적으로 캐시를 워밍합니다"
  schedule_expression = "rate(1 hour)"
  
  tags = var.common_tags
}

# EventBridge 타겟
resource "aws_cloudwatch_event_target" "cache_warmer" {
  count = var.environment == "production" ? 1 : 0
  
  rule      = aws_cloudwatch_event_rule.cache_warmer[0].name
  target_id = "CacheWarmerLambda"
  arn       = aws_lambda_function.cache_warmer[0].arn
}

# Lambda 권한
resource "aws_lambda_permission" "cache_warmer" {
  count = var.environment == "production" ? 1 : 0
  
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cache_warmer[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cache_warmer[0].arn
}

# 출력
output "redis_endpoint" {
  value     = upstash_redis_database.main.endpoint
  sensitive = true
}

output "redis_url" {
  value     = upstash_redis_database.main.rest_url
  sensitive = true
}

output "redis_token" {
  value     = upstash_redis_database.main.rest_token
  sensitive = true
}

output "elasticache_endpoint" {
  value = var.enable_elasticache ? aws_elasticache_replication_group.main[0].primary_endpoint_address : null
}

output "elasticache_reader_endpoint" {
  value = var.enable_elasticache ? aws_elasticache_replication_group.main[0].reader_endpoint_address : null
}