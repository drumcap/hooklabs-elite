#!/bin/bash

# HookLabs Elite 인프라 배포 스크립트
# 사용법: ./deploy.sh [environment] [action]
# 예시: ./deploy.sh production plan
#      ./deploy.sh staging apply
#      ./deploy.sh production destroy

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 환경 변수 확인
ENVIRONMENT=${1:-staging}
ACTION=${2:-plan}

# 지원되는 환경 확인
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}오류: 지원되지 않는 환경입니다. (development|staging|production)${NC}"
    exit 1
fi

# 지원되는 액션 확인
if [[ ! "$ACTION" =~ ^(init|plan|apply|destroy|output)$ ]]; then
    echo -e "${RED}오류: 지원되지 않는 액션입니다. (init|plan|apply|destroy|output)${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}HookLabs Elite 인프라 배포${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "환경: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "액션: ${YELLOW}$ACTION${NC}"
echo ""

# 작업 디렉토리 이동
cd "$(dirname "$0")/terraform"

# 환경 변수 파일 확인
ENV_FILE="${ENVIRONMENT}.tfvars"
if [[ ! -f "$ENV_FILE" ]]; then
    echo -e "${RED}오류: 환경 변수 파일을 찾을 수 없습니다: $ENV_FILE${NC}"
    exit 1
fi

# API 토큰 확인
check_env_vars() {
    local missing_vars=()
    
    [[ -z "$TF_VAR_vercel_api_token" ]] && missing_vars+=("TF_VAR_vercel_api_token")
    [[ -z "$TF_VAR_cloudflare_api_token" ]] && missing_vars+=("TF_VAR_cloudflare_api_token")
    [[ -z "$TF_VAR_upstash_email" ]] && missing_vars+=("TF_VAR_upstash_email")
    [[ -z "$TF_VAR_upstash_api_key" ]] && missing_vars+=("TF_VAR_upstash_api_key")
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        echo -e "${YELLOW}경고: 다음 환경 변수가 설정되지 않았습니다:${NC}"
        printf '%s\n' "${missing_vars[@]}"
        echo ""
        echo "계속하시겠습니까? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 백엔드 설정
setup_backend() {
    echo -e "${GREEN}백엔드 설정 중...${NC}"
    
    # S3 버킷 생성 (이미 존재하면 무시)
    aws s3api create-bucket \
        --bucket hooklabs-elite-terraform-state \
        --region us-east-1 \
        2>/dev/null || true
    
    # 버킷 버저닝 활성화
    aws s3api put-bucket-versioning \
        --bucket hooklabs-elite-terraform-state \
        --versioning-configuration Status=Enabled \
        2>/dev/null || true
    
    # DynamoDB 테이블 생성 (이미 존재하면 무시)
    aws dynamodb create-table \
        --table-name terraform-state-lock \
        --attribute-definitions AttributeName=LockID,AttributeType=S \
        --key-schema AttributeName=LockID,KeyType=HASH \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --region us-east-1 \
        2>/dev/null || true
    
    echo -e "${GREEN}백엔드 설정 완료${NC}"
}

# Terraform 실행
run_terraform() {
    case $ACTION in
        init)
            setup_backend
            echo -e "${GREEN}Terraform 초기화 중...${NC}"
            terraform init -backend-config="key=${ENVIRONMENT}/terraform.tfstate"
            ;;
        plan)
            check_env_vars
            echo -e "${GREEN}실행 계획 생성 중...${NC}"
            terraform plan -var-file="$ENV_FILE" -out="${ENVIRONMENT}.tfplan"
            echo ""
            echo -e "${YELLOW}계획을 검토하고 적용하려면 다음 명령을 실행하세요:${NC}"
            echo -e "${GREEN}./deploy.sh $ENVIRONMENT apply${NC}"
            ;;
        apply)
            check_env_vars
            if [[ -f "${ENVIRONMENT}.tfplan" ]]; then
                echo -e "${GREEN}계획 적용 중...${NC}"
                terraform apply "${ENVIRONMENT}.tfplan"
                rm -f "${ENVIRONMENT}.tfplan"
            else
                echo -e "${YELLOW}계획 파일이 없습니다. 직접 적용을 진행합니다.${NC}"
                echo -e "${RED}프로덕션 환경에서는 권장하지 않습니다!${NC}"
                echo "계속하시겠습니까? (y/N)"
                read -r response
                if [[ "$response" =~ ^[Yy]$ ]]; then
                    terraform apply -var-file="$ENV_FILE"
                fi
            fi
            ;;
        destroy)
            echo -e "${RED}경고: 이 작업은 모든 리소스를 삭제합니다!${NC}"
            echo -e "${RED}환경: $ENVIRONMENT${NC}"
            echo "정말로 계속하시겠습니까? '$ENVIRONMENT'를 입력하세요:"
            read -r confirmation
            if [[ "$confirmation" == "$ENVIRONMENT" ]]; then
                check_env_vars
                terraform destroy -var-file="$ENV_FILE"
            else
                echo -e "${YELLOW}작업이 취소되었습니다.${NC}"
            fi
            ;;
        output)
            echo -e "${GREEN}출력 값:${NC}"
            terraform output
            ;;
    esac
}

# 비용 추정
estimate_cost() {
    if [[ "$ACTION" == "plan" ]]; then
        echo ""
        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}예상 월간 비용 (USD)${NC}"
        echo -e "${GREEN}========================================${NC}"
        
        case $ENVIRONMENT in
            production)
                echo "Vercel Pro: $20"
                echo "Convex Pro: $25"
                echo "CloudFront: $50"
                echo "Fargate: $60"
                echo "Redis: $30"
                echo "기타 (S3, 로그 등): $25"
                echo -e "${YELLOW}총계: ~$210/월${NC}"
                ;;
            staging)
                echo "Vercel: $0"
                echo "Convex: $0"
                echo "CloudFront: $10"
                echo "Fargate: $20"
                echo "Redis: $0"
                echo "기타: $10"
                echo -e "${YELLOW}총계: ~$40/월${NC}"
                ;;
            development)
                echo "모든 서비스 프리 티어 사용"
                echo -e "${YELLOW}총계: ~$0/월${NC}"
                ;;
        esac
    fi
}

# 메인 실행
run_terraform
estimate_cost

echo ""
echo -e "${GREEN}작업이 완료되었습니다!${NC}"