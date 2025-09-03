# 자동 스케일링 모듈 - Vercel 및 컨테이너 오케스트레이션

# ECS 클러스터 (Fargate Spot 활용)
resource "aws_ecs_cluster" "main" {
  name = "hooklabs-elite-${var.environment}"
  
  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      
      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs.name
      }
    }
  }
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "ECS-Cluster-${var.environment}"
      Type = "Compute"
    }
  )
}

# ECS 클러스터 용량 프로바이더
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name
  
  capacity_providers = [
    "FARGATE",
    "FARGATE_SPOT"
  ]
  
  default_capacity_provider_strategy {
    base              = 1
    weight            = 1
    capacity_provider = "FARGATE"
  }
  
  default_capacity_provider_strategy {
    weight            = 4
    capacity_provider = "FARGATE_SPOT"
  }
}

# ECS 작업 정의 - API 서버
resource "aws_ecs_task_definition" "api" {
  family                   = "hooklabs-elite-api-${var.environment}"
  network_mode            = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                     = var.task_cpu
  memory                  = var.task_memory
  execution_role_arn      = aws_iam_role.ecs_execution.arn
  task_role_arn          = aws_iam_role.ecs_task.arn
  
  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${aws_ecr_repository.api.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ]
      
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.database_url.arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = aws_secretsmanager_secret.redis_url.arn
        }
      ]
      
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "api"
        }
      }
      
      essential = true
    }
  ])
  
  tags = var.common_tags
}

# ECS 서비스
resource "aws_ecs_service" "api" {
  name            = "hooklabs-elite-api-${var.environment}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_size
  
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight           = 1
    base             = 1
  }
  
  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight           = 4
  }
  
  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets         = var.private_subnet_ids
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }
  
  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
    
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }
  
  service_registries {
    registry_arn = aws_service_discovery_service.api.arn
  }
  
  tags = var.common_tags
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "hooklabs-elite-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = var.public_subnet_ids
  
  enable_deletion_protection = var.environment == "production"
  enable_http2              = true
  enable_cross_zone_load_balancing = true
  
  tags = merge(
    var.common_tags,
    {
      Name = "ALB-${var.environment}"
      Type = "LoadBalancer"
    }
  )
}

# ALB 타겟 그룹
resource "aws_lb_target_group" "api" {
  name        = "hooklabs-elite-api-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/api/health"
    matcher             = "200"
  }
  
  deregistration_delay = 30
  
  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }
  
  tags = var.common_tags
}

# ALB 리스너
resource "aws_lb_listener" "api" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# HTTP to HTTPS 리다이렉트
resource "aws_lb_listener" "redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type = "redirect"
    
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Auto Scaling - ECS 서비스
resource "aws_appautoscaling_target" "ecs_service" {
  max_capacity       = var.max_size
  min_capacity       = var.min_size
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling 정책 - CPU 기반
resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "hooklabs-elite-cpu-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    
    target_value       = var.target_cpu_utilization
    scale_in_cooldown  = var.scale_down_cooldown
    scale_out_cooldown = var.scale_up_cooldown
  }
}

# Auto Scaling 정책 - 메모리 기반
resource "aws_appautoscaling_policy" "ecs_memory" {
  name               = "hooklabs-elite-memory-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    
    target_value       = var.target_memory_utilization
    scale_in_cooldown  = var.scale_down_cooldown
    scale_out_cooldown = var.scale_up_cooldown
  }
}

# Auto Scaling 정책 - 요청 수 기반
resource "aws_appautoscaling_policy" "ecs_requests" {
  name               = "hooklabs-elite-request-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label        = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.api.arn_suffix}"
    }
    
    target_value       = 1000 # 타겟당 초당 요청 수
    scale_in_cooldown  = var.scale_down_cooldown
    scale_out_cooldown = var.scale_up_cooldown
  }
}

# 예약 스케일링 - 피크 시간대
resource "aws_appautoscaling_scheduled_action" "scale_up_morning" {
  count = var.environment == "production" ? 1 : 0
  
  name               = "hooklabs-elite-scale-up-morning"
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  schedule           = "cron(0 8 * * ? *)" # 매일 오전 8시 (UTC)
  
  scalable_target_action {
    min_capacity = var.min_size * 2
    max_capacity = var.max_size
  }
}

resource "aws_appautoscaling_scheduled_action" "scale_down_night" {
  count = var.environment == "production" ? 1 : 0
  
  name               = "hooklabs-elite-scale-down-night"
  service_namespace  = aws_appautoscaling_target.ecs_service.service_namespace
  resource_id        = aws_appautoscaling_target.ecs_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service.scalable_dimension
  schedule           = "cron(0 22 * * ? *)" # 매일 오후 10시 (UTC)
  
  scalable_target_action {
    min_capacity = var.min_size
    max_capacity = var.max_size / 2
  }
}

# ECR 리포지토리
resource "aws_ecr_repository" "api" {
  name                 = "hooklabs-elite-api-${var.environment}"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  encryption_configuration {
    encryption_type = "AES256"
  }
  
  tags = var.common_tags
}

# ECR 수명 주기 정책
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "최근 10개 이미지만 유지"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Service Discovery
resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "hooklabs-elite-${var.environment}.local"
  description = "Private DNS namespace for service discovery"
  vpc         = var.vpc_id
  
  tags = var.common_tags
}

resource "aws_service_discovery_service" "api" {
  name = "api"
  
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    
    dns_records {
      ttl  = 10
      type = "A"
    }
    
    routing_policy = "MULTIVALUE"
  }
  
  health_check_custom_config {
    failure_threshold = 1
  }
}

# CloudWatch 로그 그룹
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/hooklabs-elite-${var.environment}"
  retention_in_days = 30
  
  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/hooklabs-elite-api-${var.environment}"
  retention_in_days = 30
  
  tags = var.common_tags
}

# 보안 그룹 - ALB
resource "aws_security_group" "alb" {
  name        = "hooklabs-elite-alb-sg-${var.environment}"
  description = "Security group for ALB"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
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
      Name = "ALB-SG-${var.environment}"
      Type = "Security"
    }
  )
}

# 보안 그룹 - ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name        = "hooklabs-elite-ecs-tasks-sg-${var.environment}"
  description = "Security group for ECS tasks"
  vpc_id      = var.vpc_id
  
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
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
      Name = "ECS-Tasks-SG-${var.environment}"
      Type = "Security"
    }
  )
}

# IAM 역할 - ECS 실행
resource "aws_iam_role" "ecs_execution" {
  name = "hooklabs-elite-ecs-execution-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.common_tags
}

# IAM 정책 연결 - ECS 실행
resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM 역할 - ECS Task
resource "aws_iam_role" "ecs_task" {
  name = "hooklabs-elite-ecs-task-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.common_tags
}

# Secrets Manager - 데이터베이스 URL
resource "aws_secretsmanager_secret" "database_url" {
  name = "hooklabs-elite-database-url-${var.environment}"
  
  tags = var.common_tags
}

# Secrets Manager - Redis URL
resource "aws_secretsmanager_secret" "redis_url" {
  name = "hooklabs-elite-redis-url-${var.environment}"
  
  tags = var.common_tags
}

# 데이터 소스
data "aws_region" "current" {}

# 출력
output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_zone_id" {
  value = aws_lb.main.zone_id
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.api.name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}