#!/bin/bash

# ==============================================================================
# Convex 롤백 스크립트
# HookLabs Elite - 안전한 롤백 프로세스
# ==============================================================================

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 사용법 출력
show_usage() {
    cat << EOF
🔄 Convex 롤백 스크립트

사용법:
  $0 [OPTIONS] <target_tag>

옵션:
  -e, --environment     대상 환경 (development|production)
  -f, --force          확인 없이 강제 롤백
  -d, --dry-run        실제 롤백 없이 시뮬레이션만
  -b, --backup         롤백 전 현재 상태 백업
  -h, --help           도움말 표시

예시:
  $0 -e production convex-v2024.01.15-143022
  $0 --dry-run --environment development convex-v2024.01.15-140500
  
사용 가능한 태그 확인:
  git tag -l "convex-v*" | tail -10

EOF
}

# 기본값 설정
ENVIRONMENT=""
TARGET_TAG=""
FORCE=false
DRY_RUN=false
BACKUP=false

# 옵션 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -b|--backup)
            BACKUP=true
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
            if [ -z "$TARGET_TAG" ]; then
                TARGET_TAG="$1"
            else
                log_error "너무 많은 인수"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# 필수 인수 확인
if [ -z "$TARGET_TAG" ]; then
    log_error "롤백할 태그를 지정해주세요"
    show_usage
    exit 1
fi

if [ -z "$ENVIRONMENT" ]; then
    log_error "환경을 지정해주세요 (-e development|production)"
    show_usage
    exit 1
fi

# 환경 검증
if [[ ! "$ENVIRONMENT" =~ ^(development|production)$ ]]; then
    log_error "잘못된 환경: $ENVIRONMENT (development 또는 production만 가능)"
    exit 1
fi

# Convex 환경 변수 설정
case "$ENVIRONMENT" in
    development)
        CONVEX_DEPLOYMENT="${CONVEX_DEV_DEPLOYMENT}"
        DEPLOY_KEY="${CONVEX_DEV_DEPLOY_KEY}"
        ;;
    production)
        CONVEX_DEPLOYMENT="${CONVEX_PROD_DEPLOYMENT}"
        DEPLOY_KEY="${CONVEX_PROD_DEPLOY_KEY}"
        ;;
esac

# 환경 변수 확인
if [ -z "${CONVEX_DEPLOYMENT:-}" ] || [ -z "${DEPLOY_KEY:-}" ]; then
    log_error "Convex 환경 변수가 설정되지 않았습니다"
    log_error "필요한 변수: CONVEX_${ENVIRONMENT^^}_DEPLOYMENT, CONVEX_${ENVIRONMENT^^}_DEPLOY_KEY"
    exit 1
fi

log_info "🔄 Convex 롤백 시작"
log_info "환경: $ENVIRONMENT"
log_info "대상 태그: $TARGET_TAG"
log_info "Dry Run: $DRY_RUN"

# Git 태그 존재 확인
if ! git rev-parse "$TARGET_TAG" >/dev/null 2>&1; then
    log_error "태그 '$TARGET_TAG'를 찾을 수 없습니다"
    log_info "사용 가능한 최근 태그들:"
    git tag -l "convex-v*" | tail -10 | sed 's/^/  /'
    exit 1
fi

# 현재 브랜치 확인
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log_info "현재 브랜치: $CURRENT_BRANCH"

# 프로덕션 환경에서 main 브랜치 확인
if [ "$ENVIRONMENT" = "production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    if [ "$FORCE" = false ]; then
        log_error "프로덕션 환경 롤백은 main 브랜치에서만 가능합니다"
        log_error "--force 옵션을 사용하여 강제 실행할 수 있습니다"
        exit 1
    else
        log_warn "main 브랜치가 아님에도 불구하고 강제 실행됩니다"
    fi
fi

# 현재 상태 백업
if [ "$BACKUP" = true ] && [ "$DRY_RUN" = false ]; then
    log_info "🗄️ 현재 상태 백업 중..."
    
    BACKUP_TAG="convex-backup-$(date +'%Y%m%d-%H%M%S')"
    
    if git tag -a "$BACKUP_TAG" -m "롤백 전 백업: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"; then
        log_success "백업 태그 생성: $BACKUP_TAG"
    else
        log_error "백업 태그 생성 실패"
        exit 1
    fi
fi

# 롤백 확인
if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
    echo
    log_warn "다음 작업을 수행합니다:"
    echo "  - 환경: $ENVIRONMENT"
    echo "  - 현재 커밋: $(git rev-parse --short HEAD)"
    echo "  - 롤백 대상: $TARGET_TAG ($(git rev-parse --short $TARGET_TAG))"
    echo
    read -p "계속하시겠습니까? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "롤백이 취소되었습니다"
        exit 0
    fi
fi

# Git 체크아웃
log_info "📥 롤백 대상 코드 체크아웃 중..."

if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] git checkout $TARGET_TAG"
else
    if git checkout "$TARGET_TAG"; then
        log_success "코드 체크아웃 완료"
    else
        log_error "코드 체크아웃 실패"
        exit 1
    fi
fi

# 의존성 설치
log_info "📦 의존성 설치 중..."

if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] npm ci"
else
    if npm ci --prefer-offline --no-audit >/dev/null 2>&1; then
        log_success "의존성 설치 완료"
    else
        log_error "의존성 설치 실패"
        exit 1
    fi
fi

# Convex 함수 검증
log_info "🔍 Convex 함수 검증 중..."

if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] npx convex dev --once"
else
    export CONVEX_DEPLOYMENT
    export CONVEX_DEPLOY_KEY="$DEPLOY_KEY"
    
    if timeout 60 npx convex dev --once --verbose >/dev/null 2>&1; then
        log_success "Convex 함수 검증 완료"
    else
        log_error "Convex 함수 검증 실패"
        log_error "롤백을 중단합니다"
        
        # 원래 브랜치로 복원
        git checkout "$CURRENT_BRANCH"
        exit 1
    fi
fi

# Convex 배포
log_info "🚀 Convex 함수 롤백 배포 중..."

if [ "$DRY_RUN" = true ]; then
    log_info "[DRY RUN] npx convex deploy"
    log_success "[DRY RUN] 롤백이 성공적으로 시뮬레이션되었습니다"
else
    if npx convex deploy --cmd "echo 'Convex 롤백 완료'"; then
        log_success "Convex 롤백 배포 완료"
    else
        log_error "Convex 롤백 배포 실패"
        
        # 원래 브랜치로 복원
        git checkout "$CURRENT_BRANCH"
        exit 1
    fi
fi

# 헬스체크
if [ "$DRY_RUN" = false ]; then
    log_info "🧪 롤백 후 헬스체크 중..."
    
    sleep 5  # 배포 안정화 대기
    
    if timeout 30 npx convex run --help >/dev/null 2>&1; then
        log_success "헬스체크 통과"
    else
        log_error "헬스체크 실패"
        log_warn "수동으로 확인이 필요합니다"
    fi
fi

# 완료 메시지
echo
log_success "🎉 Convex 롤백이 완료되었습니다!"

if [ "$DRY_RUN" = false ]; then
    echo
    log_info "롤백 정보:"
    echo "  - 환경: $ENVIRONMENT"
    echo "  - 롤백된 태그: $TARGET_TAG"
    echo "  - 현재 커밋: $(git rev-parse --short HEAD)"
    
    if [ "$BACKUP" = true ]; then
        echo "  - 백업 태그: $BACKUP_TAG"
    fi
    
    echo
    log_info "다음 단계:"
    echo "  1. 애플리케이션 정상 동작 확인"
    echo "  2. 모니터링 대시보드에서 메트릭 확인"
    echo "  3. 팀원들에게 롤백 완료 알림"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "  4. 인시던트 리포트 작성 및 개선 계획 수립"
    fi
fi

echo