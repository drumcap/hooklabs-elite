#!/bin/bash

# ==============================================================================
# HookLabs Elite - 최적화된 배포 스크립트
# 전체 배포 프로세스 자동화 및 최적화 적용
# ==============================================================================

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 로깅 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# 진행률 표시
show_progress() {
    local current=$1
    local total=$2
    local description=$3
    local percent=$((current * 100 / total))
    local bar_length=50
    local filled_length=$((percent * bar_length / 100))
    
    printf "\r${CYAN}[%3d%%]${NC} " $percent
    printf "["
    printf "%*s" $filled_length | tr ' ' '█'
    printf "%*s" $((bar_length - filled_length)) | tr ' ' '░'
    printf "] %s" "$description"
}

# 사용법 출력
show_usage() {
    cat << EOF
🚀 HookLabs Elite 최적화 배포 스크립트

사용법:
  $0 [OPTIONS] <environment>

환경:
  development     개발 환경 배포
  staging        스테이징 환경 배포  
  production     프로덕션 환경 배포

옵션:
  -f, --full         전체 배포 (인프라 + 애플리케이션)
  -a, --app-only     애플리케이션만 배포
  -i, --infra-only   인프라만 배포
  -c, --convex-only  Convex만 배포
  -d, --docker       Docker 컨테이너 배포
  -v, --vercel       Vercel 배포
  -m, --monitoring   모니터링 설정 배포
  -t, --test         테스트 실행 포함
  -s, --skip-tests   테스트 건너뛰기
  -q, --quick        빠른 배포 (캐시 활용)
  -h, --help         도움말 표시

예시:
  $0 --full production                    # 프로덕션 전체 배포
  $0 --app-only --test development        # 개발환경 앱 배포 + 테스트
  $0 --vercel --quick staging            # 스테이징 Vercel 빠른 배포
  $0 --docker --monitoring production    # 프로덕션 Docker + 모니터링

EOF
}

# 기본값 설정
ENVIRONMENT=""
DEPLOY_TYPE="full"
INCLUDE_TESTS=true
QUICK_MODE=false
DOCKER_MODE=false
VERCEL_MODE=false
MONITORING_MODE=false

# 옵션 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--full)
            DEPLOY_TYPE="full"
            shift
            ;;
        -a|--app-only)
            DEPLOY_TYPE="app"
            shift
            ;;
        -i|--infra-only)
            DEPLOY_TYPE="infra"
            shift
            ;;
        -c|--convex-only)
            DEPLOY_TYPE="convex"
            shift
            ;;
        -d|--docker)
            DOCKER_MODE=true
            shift
            ;;
        -v|--vercel)
            VERCEL_MODE=true
            shift
            ;;
        -m|--monitoring)
            MONITORING_MODE=true
            shift
            ;;
        -t|--test)
            INCLUDE_TESTS=true
            shift
            ;;
        -s|--skip-tests)
            INCLUDE_TESTS=false
            shift
            ;;
        -q|--quick)
            QUICK_MODE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        -*)
            log_error "알 수 없는 옵션: $1"
            show_usage
            exit 1
            ;;
        *)
            if [ -z "$ENVIRONMENT" ]; then
                ENVIRONMENT="$1"
            else
                log_error "너무 많은 인수"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# 환경 검증
if [ -z "$ENVIRONMENT" ]; then
    log_error "배포 환경을 지정해주세요"
    show_usage
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "잘못된 환경: $ENVIRONMENT"
    log_error "사용 가능한 환경: development, staging, production"
    exit 1
fi

# 프로덕션 배포 확인
if [ "$ENVIRONMENT" = "production" ] && [ "$DEPLOY_TYPE" = "full" ]; then
    echo
    log_warn "프로덕션 환경 전체 배포를 수행합니다!"
    echo "  - 환경: $ENVIRONMENT"
    echo "  - 배포 타입: $DEPLOY_TYPE"
    echo "  - 테스트 포함: $INCLUDE_TESTS"
    echo "  - 빠른 모드: $QUICK_MODE"
    echo
    read -p "계속하시겠습니까? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "배포가 취소되었습니다"
        exit 0
    fi
fi

# 배포 시작
echo
log_success "🚀 HookLabs Elite 최적화 배포 시작"
log_info "환경: $ENVIRONMENT"
log_info "타입: $DEPLOY_TYPE"
log_info "모드: $([ "$QUICK_MODE" = true ] && echo "빠른 배포" || echo "일반 배포")"
echo

START_TIME=$(date +%s)
TOTAL_STEPS=10
CURRENT_STEP=0

# Step 1: 환경 및 의존성 확인
((CURRENT_STEP++))
show_progress $CURRENT_STEP $TOTAL_STEPS "환경 및 의존성 확인 중..."
echo

# Git 상태 확인
if [ "$(git status --porcelain)" ]; then
    log_warn "커밋되지 않은 변경사항이 있습니다"
    if [ "$ENVIRONMENT" = "production" ]; then
        log_error "프로덕션 배포는 깨끗한 Git 상태에서만 가능합니다"
        exit 1
    fi
fi

# 현재 브랜치 확인
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
case "$ENVIRONMENT" in
    production)
        if [ "$CURRENT_BRANCH" != "main" ]; then
            log_error "프로덕션 배포는 main 브랜치에서만 가능합니다 (현재: $CURRENT_BRANCH)"
            exit 1
        fi
        ;;
    staging)
        if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "develop" ]; then
            log_warn "스테이징 배포는 일반적으로 main 또는 develop 브랜치에서 수행됩니다 (현재: $CURRENT_BRANCH)"
        fi
        ;;
esac

# 필수 도구 확인
REQUIRED_TOOLS=("node" "npm" "git")
[ "$DOCKER_MODE" = true ] && REQUIRED_TOOLS+=("docker")
[ "$VERCEL_MODE" = true ] && REQUIRED_TOOLS+=("vercel")

for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! command -v "$tool" &> /dev/null; then
        log_error "$tool 이 설치되어 있지 않습니다"
        exit 1
    fi
done

log_success "환경 확인 완료"

# Step 2: 의존성 설치
((CURRENT_STEP++))
show_progress $CURRENT_STEP $TOTAL_STEPS "의존성 설치 중..."
echo

if [ "$QUICK_MODE" = false ] || [ ! -d "node_modules" ]; then
    log_info "의존성 설치 중..."
    npm ci --prefer-offline --no-audit --silent
else
    log_info "빠른 모드: 기존 의존성 사용"
fi

log_success "의존성 설치 완료"

# Step 3: 코드 품질 검사
if [ "$INCLUDE_TESTS" = true ] && [ "$DEPLOY_TYPE" != "infra" ]; then
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "코드 품질 검사 중..."
    echo

    log_info "린팅 검사 실행 중..."
    npm run lint

    log_info "타입 검사 실행 중..."
    npm run type-check

    log_success "코드 품질 검사 완료"
else
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "코드 품질 검사 건너뛰기"
    echo
fi

# Step 4: 테스트 실행
if [ "$INCLUDE_TESTS" = true ] && [ "$DEPLOY_TYPE" != "infra" ]; then
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "테스트 실행 중..."
    echo

    log_info "단위 테스트 실행 중..."
    npm run test:unit || {
        log_error "단위 테스트 실패"
        exit 1
    }

    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "통합 테스트 실행 중..."
        npm run test:integration || {
            log_error "통합 테스트 실패"
            exit 1
        }
    fi

    log_success "테스트 완료"
else
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "테스트 건너뛰기"
    echo
fi

# Step 5: Convex 배포
if [ "$DEPLOY_TYPE" = "full" ] || [ "$DEPLOY_TYPE" = "app" ] || [ "$DEPLOY_TYPE" = "convex" ]; then
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "Convex 배포 중..."
    echo

    # Convex 환경 변수 설정
    case "$ENVIRONMENT" in
        production)
            export CONVEX_DEPLOYMENT="${CONVEX_PROD_DEPLOYMENT}"
            export CONVEX_DEPLOY_KEY="${CONVEX_PROD_DEPLOY_KEY}"
            ;;
        staging)
            export CONVEX_DEPLOYMENT="${CONVEX_STAGING_DEPLOYMENT}"
            export CONVEX_DEPLOY_KEY="${CONVEX_STAGING_DEPLOY_KEY}"
            ;;
        *)
            export CONVEX_DEPLOYMENT="${CONVEX_DEV_DEPLOYMENT}"
            export CONVEX_DEPLOY_KEY="${CONVEX_DEV_DEPLOY_KEY}"
            ;;
    esac

    if [ -z "${CONVEX_DEPLOYMENT:-}" ] || [ -z "${CONVEX_DEPLOY_KEY:-}" ]; then
        log_error "Convex 환경 변수가 설정되지 않았습니다"
        exit 1
    fi

    log_info "Convex 함수 배포 중..."
    npx convex deploy || {
        log_error "Convex 배포 실패"
        exit 1
    }

    log_success "Convex 배포 완료"
else
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "Convex 배포 건너뛰기"
    echo
fi

# Step 6: 애플리케이션 빌드
if [ "$DEPLOY_TYPE" = "full" ] || [ "$DEPLOY_TYPE" = "app" ]; then
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "애플리케이션 빌드 중..."
    echo

    # 환경별 빌드 설정
    export NODE_ENV=production
    export NEXT_TELEMETRY_DISABLED=1
    export NEXT_PUBLIC_APP_ENV=$ENVIRONMENT

    log_info "Next.js 애플리케이션 빌드 중..."
    npm run build || {
        log_error "빌드 실패"
        exit 1
    }

    # 번들 크기 분석 (프로덕션만)
    if [ "$ENVIRONMENT" = "production" ] && [ "$QUICK_MODE" = false ]; then
        log_info "번들 크기 분석 중..."
        npm run build:analyze || log_warn "번들 분석 실패"
    fi

    log_success "애플리케이션 빌드 완료"
else
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "애플리케이션 빌드 건너뛰기"
    echo
fi

# Step 7: Vercel 배포
if [ "$VERCEL_MODE" = true ] || ([ "$DEPLOY_TYPE" = "full" ] && [ "$DOCKER_MODE" = false ]); then
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "Vercel 배포 중..."
    echo

    # Vercel CLI 로그인 확인
    if ! vercel whoami &>/dev/null; then
        log_error "Vercel에 로그인되어 있지 않습니다"
        log_info "vercel login 명령으로 로그인하세요"
        exit 1
    fi

    # 환경별 배포 설정
    VERCEL_ARGS=""
    case "$ENVIRONMENT" in
        production)
            VERCEL_ARGS="--prod"
            ;;
        staging)
            VERCEL_ARGS="--target staging"
            ;;
        *)
            VERCEL_ARGS=""
            ;;
    esac

    log_info "Vercel 배포 중..."
    VERCEL_URL=$(vercel deploy $VERCEL_ARGS --token="${VERCEL_TOKEN}" 2>/dev/null | tail -1)
    
    if [ $? -eq 0 ] && [ -n "$VERCEL_URL" ]; then
        log_success "Vercel 배포 완료: $VERCEL_URL"
        echo "$VERCEL_URL" > .vercel-url
    else
        log_error "Vercel 배포 실패"
        exit 1
    fi
else
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "Vercel 배포 건너뛰기"
    echo
fi

# Step 8: Docker 배포
if [ "$DOCKER_MODE" = true ] || ([ "$DEPLOY_TYPE" = "full" ] && [ "$VERCEL_MODE" = false ]); then
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "Docker 이미지 빌드 중..."
    echo

    # Docker 이미지 태그 설정
    IMAGE_TAG="hooklabs/elite:${ENVIRONMENT}-$(git rev-parse --short HEAD)"
    LATEST_TAG="hooklabs/elite:${ENVIRONMENT}-latest"

    log_info "Docker 이미지 빌드 중..."
    docker build \
        --file Dockerfile.optimized \
        --target runner \
        --build-arg NEXT_PUBLIC_APP_ENV=$ENVIRONMENT \
        --build-arg NODE_ENV=production \
        --tag $IMAGE_TAG \
        --tag $LATEST_TAG \
        . || {
        log_error "Docker 이미지 빌드 실패"
        exit 1
    }

    # 프로덕션 환경에서만 이미지 푸시
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Docker 이미지 푸시 중..."
        docker push $IMAGE_TAG
        docker push $LATEST_TAG
    fi

    log_success "Docker 이미지 빌드 완료: $IMAGE_TAG"
else
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "Docker 빌드 건너뛰기"
    echo
fi

# Step 9: 모니터링 설정
if [ "$MONITORING_MODE" = true ] || [ "$DEPLOY_TYPE" = "full" ]; then
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "모니터링 설정 배포 중..."
    echo

    log_info "모니터링 스택 배포 중..."
    if [ -f "docker-compose.production.yml" ]; then
        # 모니터링 서비스만 시작
        docker-compose -f docker-compose.production.yml up -d prometheus grafana alertmanager || {
            log_warn "모니터링 서비스 시작 실패"
        }
    fi

    log_success "모니터링 설정 완료"
else
    ((CURRENT_STEP++))
    show_progress $CURRENT_STEP $TOTAL_STEPS "모니터링 설정 건너뛰기"
    echo
fi

# Step 10: 배포 후 검증
((CURRENT_STEP++))
show_progress $CURRENT_STEP $TOTAL_STEPS "배포 후 검증 중..."
echo

log_info "배포 검증 중..."

# Health Check
if [ -f ".vercel-url" ]; then
    HEALTH_URL="$(cat .vercel-url)/api/health"
else
    HEALTH_URL="http://localhost:3000/api/health"
fi

# 최대 30번 시도 (5분)
for i in {1..30}; do
    if curl -f -s "$HEALTH_URL" > /dev/null 2>&1; then
        log_success "Health Check 통과"
        break
    elif [ $i -eq 30 ]; then
        log_error "Health Check 실패 - 애플리케이션이 응답하지 않습니다"
        exit 1
    else
        log_info "Health Check 시도 중... ($i/30)"
        sleep 10
    fi
done

# 프로덕션 환경에서 E2E 테스트 실행
if [ "$ENVIRONMENT" = "production" ] && [ "$INCLUDE_TESTS" = true ]; then
    log_info "프로덕션 E2E 테스트 실행 중..."
    npm run test:e2e:prod || log_warn "E2E 테스트 실패"
fi

log_success "배포 후 검증 완료"

# 배포 완료
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))

echo
echo "============================================"
log_success "🎉 배포가 성공적으로 완료되었습니다!"
echo "============================================"
echo
log_info "배포 정보:"
echo "  - 환경: $ENVIRONMENT"
echo "  - 타입: $DEPLOY_TYPE"
echo "  - 브랜치: $CURRENT_BRANCH"
echo "  - 커밋: $(git rev-parse --short HEAD)"
echo "  - 소요 시간: ${DURATION_MIN}분 ${DURATION_SEC}초"
echo

if [ -f ".vercel-url" ]; then
    echo "  - 배포 URL: $(cat .vercel-url)"
fi

if [ "$DOCKER_MODE" = true ]; then
    echo "  - Docker 이미지: $IMAGE_TAG"
fi

echo
log_info "다음 단계:"
echo "  1. 애플리케이션 동작 확인"
echo "  2. 모니터링 대시보드에서 메트릭 확인"
echo "  3. 성능 테스트 실행 (필요시)"

if [ "$ENVIRONMENT" = "production" ]; then
    echo "  4. 팀에 배포 완료 알림"
    echo "  5. 릴리즈 노트 작성"
fi

echo
log_success "배포 스크립트 실행 완료! 🚀"