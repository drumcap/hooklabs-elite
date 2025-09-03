# 네트워킹 모듈 - VPC, 서브넷, 라우팅

# VPC 생성
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-vpc-${var.environment}"
      Type = "Network"
    }
  )
}

# 인터넷 게이트웨이
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-igw-${var.environment}"
    }
  )
}

# Elastic IP - NAT Gateway용
resource "aws_eip" "nat" {
  count  = length(var.azs) > 3 ? 3 : length(var.azs)
  domain = "vpc"
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-eip-${var.environment}-${count.index + 1}"
    }
  )
  
  depends_on = [aws_internet_gateway.main]
}

# NAT Gateway
resource "aws_nat_gateway" "main" {
  count         = length(var.azs) > 3 ? 3 : length(var.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-nat-${var.environment}-${count.index + 1}"
    }
  )
  
  depends_on = [aws_internet_gateway.main]
}

# 퍼블릭 서브넷
resource "aws_subnet" "public" {
  count                   = length(var.azs) > 3 ? 3 : length(var.azs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-public-${var.environment}-${var.azs[count.index]}"
      Type = "Public"
    }
  )
}

# 프라이빗 서브넷
resource "aws_subnet" "private" {
  count             = length(var.azs) > 3 ? 3 : length(var.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.azs[count.index]
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-private-${var.environment}-${var.azs[count.index]}"
      Type = "Private"
    }
  )
}

# 데이터베이스 서브넷
resource "aws_subnet" "database" {
  count             = length(var.azs) > 3 ? 3 : length(var.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = var.azs[count.index]
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-database-${var.environment}-${var.azs[count.index]}"
      Type = "Database"
    }
  )
}

# 퍼블릭 라우트 테이블
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-public-rt-${var.environment}"
      Type = "Public"
    }
  )
}

# 프라이빗 라우트 테이블
resource "aws_route_table" "private" {
  count  = length(var.azs) > 3 ? 3 : length(var.azs)
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-private-rt-${var.environment}-${count.index + 1}"
      Type = "Private"
    }
  )
}

# 라우트 테이블 연결 - 퍼블릭
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# 라우트 테이블 연결 - 프라이빗
resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# 라우트 테이블 연결 - 데이터베이스
resource "aws_route_table_association" "database" {
  count          = length(aws_subnet.database)
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# VPC 엔드포인트 - S3
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${data.aws_region.current.name}.s3"
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-s3-endpoint-${var.environment}"
    }
  )
}

# VPC 엔드포인트 라우트 테이블 연결
resource "aws_vpc_endpoint_route_table_association" "s3_public" {
  route_table_id  = aws_route_table.public.id
  vpc_endpoint_id = aws_vpc_endpoint.s3.id
}

resource "aws_vpc_endpoint_route_table_association" "s3_private" {
  count           = length(aws_route_table.private)
  route_table_id  = aws_route_table.private[count.index].id
  vpc_endpoint_id = aws_vpc_endpoint.s3.id
}

# VPC 엔드포인트 - DynamoDB
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${data.aws_region.current.name}.dynamodb"
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-dynamodb-endpoint-${var.environment}"
    }
  )
}

# VPC 엔드포인트 - ECR
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-ecr-api-endpoint-${var.environment}"
    }
  )
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${data.aws_region.current.name}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-ecr-dkr-endpoint-${var.environment}"
    }
  )
}

# 보안 그룹 - VPC 엔드포인트
resource "aws_security_group" "vpc_endpoints" {
  name        = "hooklabs-elite-vpc-endpoints-sg-${var.environment}"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main.id
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
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
      Name = "VPC-Endpoints-SG-${var.environment}"
      Type = "Security"
    }
  )
}

# NACL - 추가 보안 계층
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id
  
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }
  
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }
  
  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }
  
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-public-nacl-${var.environment}"
      Type = "Security"
    }
  )
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.flow_log.arn
  log_destination_arn = aws_cloudwatch_log_group.flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id
  
  tags = merge(
    var.common_tags,
    {
      Name = "hooklabs-elite-flow-logs-${var.environment}"
      Type = "Logging"
    }
  )
}

# CloudWatch 로그 그룹 - Flow Logs
resource "aws_cloudwatch_log_group" "flow_log" {
  name              = "/aws/vpc/hooklabs-elite-${var.environment}"
  retention_in_days = 30
  
  tags = var.common_tags
}

# IAM 역할 - Flow Logs
resource "aws_iam_role" "flow_log" {
  name = "hooklabs-elite-flow-log-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })
  
  tags = var.common_tags
}

# IAM 정책 - Flow Logs
resource "aws_iam_role_policy" "flow_log" {
  role = aws_iam_role.flow_log.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# 데이터 소스
data "aws_region" "current" {}

# 출력
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "퍼블릭 서브넷 ID 목록"
}

output "private_subnet_ids" {
  value       = aws_subnet.private[*].id
  description = "프라이빗 서브넷 ID 목록"
}

output "database_subnet_ids" {
  value       = aws_subnet.database[*].id
  description = "데이터베이스 서브넷 ID 목록"
}

output "nat_gateway_ids" {
  value       = aws_nat_gateway.main[*].id
  description = "NAT Gateway ID 목록"
}

output "vpc_cidr" {
  value       = aws_vpc.main.cidr_block
  description = "VPC CIDR 블록"
}