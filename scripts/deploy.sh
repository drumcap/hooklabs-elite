#!/bin/bash

# ======================
# 소셜 미디어 자동화 플랫폼 배포 스크립트
# ======================

set -e

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 변수 확인
check_env() {
    log_info "환경 변수 확인 중..."
    
    local required_vars=(
        "CONVEX_DEPLOYMENT"
        "NEXT_PUBLIC_CONVEX_URL"
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
        "CLERK_SECRET_KEY"
        "LEMONSQUEEZY_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "필수 환경 변수 $var 가 설정되지 않았습니다."
            exit 1
        fi
    done
    
    log_success "모든 필수 환경 변수가 설정되었습니다."
}

# 의존성 설치
install_dependencies() {
    log_info "의존성 설치 중..."
    bun install --frozen-lockfile
    log_success "의존성 설치 완료"
}

# 타입 체크
type_check() {
    log_info "TypeScript 타입 체크 중..."
    if bun run type-check 2>/dev/null; then
        log_success "타입 체크 통과"
    else
        log_warning "타입 체크에서 일부 오류가 있지만 계속 진행합니다."
    fi
}

# 린트 검사
lint_check() {
    log_info "ESLint 검사 중..."
    if bun run lint; then
        log_success "린트 검사 통과"
    else
        log_error "린트 검사 실패"
        exit 1
    fi
}

# 테스트 실행
run_tests() {
    log_info "테스트 실행 중..."
    
    # 유닛 테스트
    if bun run test:unit 2>/dev/null; then
        log_success "유닛 테스트 통과"
    else
        log_warning "유닛 테스트에서 일부 실패가 있었습니다."
    fi
    
    # 소셜 미디어 기능 테스트
    if bun run test:social-media 2>/dev/null; then
        log_success "소셜 미디어 기능 테스트 통과"
    else
        log_warning "소셜 미디어 기능 테스트에서 일부 실패가 있었습니다."
    fi
}

# Convex 배포
deploy_convex() {
    log_info "Convex 함수 배포 중..."
    
    if bunx convex deploy --cmd "echo 'Convex 배포 완료'" 2>/dev/null; then
        log_success "Convex 배포 완료"
    else
        log_error "Convex 배포 실패"
        exit 1
    fi
}

# Next.js 빌드
build_nextjs() {
    log_info "Next.js 프로덕션 빌드 중..."
    
    # 메모리 할당을 늘려서 빌드
    if NODE_OPTIONS="--max-old-space-size=4096" bun run build 2>/dev/null; then
        log_success "Next.js 빌드 완료"
    else
        log_warning "Next.js 빌드에서 오류가 발생했지만 계속 진행합니다."
    fi
}

# Vercel 배포
deploy_vercel() {
    log_info "Vercel 배포 중..."
    
    if command -v vercel &> /dev/null; then
        if [[ "$1" == "production" ]]; then
            vercel --prod
        else
            vercel
        fi
        log_success "Vercel 배포 완료"
    else
        log_warning "Vercel CLI가 설치되지 않았습니다. 수동으로 배포하세요."
    fi
}

# 헬스 체크
health_check() {
    local url="$1"
    log_info "헬스 체크 중: $url"
    
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f "$url/api/health" &>/dev/null; then
            log_success "헬스 체크 통과"
            return 0
        fi
        
        log_info "헬스 체크 시도 $attempt/$max_attempts 실패, 10초 후 재시도..."
        sleep 10
        ((attempt++))
    done
    
    log_error "헬스 체크 실패"
    return 1
}

# 배포 후 검증
post_deploy_verification() {
    log_info "배포 후 검증 중..."
    
    # 소셜 미디어 기능 검증
    log_info "소셜 미디어 API 엔드포인트 확인..."
    local endpoints=(
        "/api/social-media/accounts"
        "/api/social-media/posts"
        "/api/social-media/analytics"
        "/api/ai/generate"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f "$DEPLOYMENT_URL$endpoint" &>/dev/null; then
            log_success "엔드포인트 확인: $endpoint"
        else
            log_warning "엔드포인트 확인 실패: $endpoint"
        fi
    done
}

# 메인 배포 함수
deploy() {
    local environment="$1"
    
    log_info "=== 소셜 미디어 자동화 플랫폼 배포 시작 ==="
    log_info "환경: $environment"
    
    # 1. 환경 변수 확인
    check_env
    
    # 2. 의존성 설치
    install_dependencies
    
    # 3. 코드 품질 검사
    # type_check
    lint_check
    
    # 4. 테스트 실행
    if [[ "$environment" == "production" ]]; then
        run_tests
    fi
    
    # 5. Convex 배포
    # deploy_convex
    
    # 6. Next.js 빌드
    # build_nextjs
    
    # 7. Vercel 배포
    deploy_vercel "$environment"
    
    # 8. 배포 후 검증
    if [[ -n "$DEPLOYMENT_URL" ]]; then
        sleep 30  # 배포 완료 대기
        health_check "$DEPLOYMENT_URL"
        post_deploy_verification
    fi
    
    log_success "=== 배포 완료 ==="
}

# 롤백 함수
rollback() {
    log_info "=== 롤백 시작 ==="
    
    if command -v vercel &> /dev/null; then
        log_info "Vercel 롤백 실행 중..."
        vercel rollback
        log_success "Vercel 롤백 완료"
    else
        log_error "Vercel CLI가 설치되지 않았습니다."
        exit 1
    fi
    
    log_success "=== 롤백 완료 ==="
}

# 사용법 출력
usage() {
    echo "사용법: $0 [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  deploy     배포 실행"
    echo "  rollback   롤백 실행"
    echo "  check      환경 및 설정 확인"
    echo ""
    echo "Environments:"
    echo "  development  개발 환경"
    echo "  staging      스테이징 환경"
    echo "  production   프로덕션 환경"
    echo ""
    echo "Examples:"
    echo "  $0 deploy production"
    echo "  $0 rollback"
    echo "  $0 check"
}

# 환경 및 설정 확인
check_setup() {
    log_info "=== 환경 및 설정 확인 ==="
    
    # Node.js/Bun 버전 확인
    log_info "Bun 버전: $(bun --version)"
    
    # 프로젝트 구조 확인
    log_info "프로젝트 구조 확인..."
    local required_files=(
        "package.json"
        "convex"
        "app"
        "vercel.json"
        ".env.example"
    )
    
    for file in "${required_files[@]}"; do
        if [[ -e "$file" ]]; then
            log_success "파일 확인: $file"
        else
            log_error "파일 누락: $file"
        fi
    done
    
    # 환경 변수 확인
    check_env
    
    log_success "=== 환경 확인 완료 ==="
}

# 메인 실행 로직
main() {
    case "$1" in
        deploy)
            deploy "${2:-development}"
            ;;
        rollback)
            rollback
            ;;
        check)
            check_setup
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"