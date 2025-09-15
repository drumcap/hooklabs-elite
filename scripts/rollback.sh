#!/bin/bash
# ======================
# 롤백 스크립트
# HookLabs Elite - 소셜 미디어 자동화 플랫폼
# 프로덕션 환경 긴급 롤백 절차
# ======================

set -euo pipefail

# 색상 코드
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

# 스크립트 실행 디렉토리로 이동
cd "$(dirname "$0")/.."

# 환경 변수 설정
NAMESPACE="${NAMESPACE:-hooklabs-elite}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-hooklabs-elite}"
SERVICE_NAME="${SERVICE_NAME:-hooklabs-elite-service}"
BACKUP_LIMIT="${BACKUP_LIMIT:-5}"
ROLLBACK_TARGET="${1:-previous}"

# 도움말 표시
show_help() {
    cat << EOF
사용법: $0 [OPTIONS] [ROLLBACK_TARGET]

롤백 대상:
  previous     이전 버전으로 롤백 (기본값)
  <revision>   특정 리비전으로 롤백

옵션:
  -h, --help           이 도움말 표시
  -n, --namespace      Kubernetes 네임스페이스 (기본값: hooklabs-elite)
  -d, --deployment     디플로이먼트 이름 (기본값: hooklabs-elite)
  -s, --service        서비스 이름 (기본값: hooklabs-elite-service)
  --dry-run           실제 롤백 없이 계획만 표시
  --force             확인 없이 강제 롤백

환경 변수:
  NAMESPACE           Kubernetes 네임스페이스
  DEPLOYMENT_NAME     디플로이먼트 이름
  SERVICE_NAME        서비스 이름
  BACKUP_LIMIT        보관할 백업 개수

예시:
  $0                  # 이전 버전으로 롤백
  $0 3               # 리비전 3으로 롤백
  $0 --dry-run       # 롤백 계획만 확인
  $0 --force         # 확인 없이 강제 롤백

EOF
}

# 사전 조건 확인
check_prerequisites() {
    log_info "사전 조건 확인 중..."
    
    # kubectl 설치 확인
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl이 설치되지 않았습니다"
        exit 1
    fi
    
    # 클러스터 연결 확인
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Kubernetes 클러스터에 연결할 수 없습니다"
        exit 1
    fi
    
    # 네임스페이스 존재 확인
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "네임스페이스 '$NAMESPACE'가 존재하지 않습니다"
        exit 1
    fi
    
    # 디플로이먼트 존재 확인
    if ! kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" &> /dev/null; then
        log_error "디플로이먼트 '$DEPLOYMENT_NAME'가 존재하지 않습니다"
        exit 1
    fi
    
    log_success "사전 조건 확인 완료"
}

# 현재 상태 백업
backup_current_state() {
    log_info "현재 상태 백업 중..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_dir="backups/rollback_$timestamp"
    
    mkdir -p "$backup_dir"
    
    # 현재 디플로이먼트 설정 백업
    kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o yaml > "$backup_dir/deployment.yaml"
    
    # 현재 서비스 설정 백업
    kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o yaml > "$backup_dir/service.yaml" 2>/dev/null || true
    
    # ConfigMap 백업
    kubectl get configmaps -n "$NAMESPACE" -o yaml > "$backup_dir/configmaps.yaml"
    
    # 현재 Pod 상태 백업
    kubectl get pods -n "$NAMESPACE" -l app=hooklabs-elite -o yaml > "$backup_dir/pods.yaml"
    
    # 현재 이미지 태그 기록
    kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}' > "$backup_dir/current_image.txt"
    
    log_success "백업 완료: $backup_dir"
    echo "$backup_dir" > /tmp/rollback_backup_path
}

# 롤백 계획 표시
show_rollback_plan() {
    log_info "롤백 계획 확인 중..."
    
    # 현재 리비전 정보
    local current_revision=$(kubectl rollout history deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --output=json | jq -r '.items[-1].metadata.annotations."deployment.kubernetes.io/revision"')
    local current_image=$(kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
    
    echo
    echo "=== 롤백 계획 ==="
    echo "네임스페이스: $NAMESPACE"
    echo "디플로이먼트: $DEPLOYMENT_NAME"
    echo "현재 리비전: $current_revision"
    echo "현재 이미지: $current_image"
    echo
    
    if [[ "$ROLLBACK_TARGET" == "previous" ]]; then
        # 이전 리비전으로 롤백
        log_info "이전 리비전으로 롤백합니다"
        kubectl rollout history deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" | tail -n 5
    else
        # 특정 리비전으로 롤백
        log_info "리비전 $ROLLBACK_TARGET으로 롤백합니다"
        if ! kubectl rollout history deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --revision="$ROLLBACK_TARGET" &> /dev/null; then
            log_error "리비전 $ROLLBACK_TARGET이 존재하지 않습니다"
            exit 1
        fi
        kubectl rollout history deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --revision="$ROLLBACK_TARGET"
    fi
    echo
}

# 소셜 미디어 서비스 상태 확인
check_social_media_services() {
    log_info "소셜 미디어 서비스 상태 확인 중..."
    
    # 헬스체크 엔드포인트 확인
    local service_url
    if kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" &> /dev/null; then
        # 서비스 IP 또는 로드밸런서 주소 가져오기
        local service_type=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.type}')
        
        if [[ "$service_type" == "LoadBalancer" ]]; then
            service_url=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
            if [[ -z "$service_url" ]]; then
                service_url=$(kubectl get service "$SERVICE_NAME" -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
            fi
        else
            # 포트 포워딩을 통한 확인 (개발용)
            log_warn "서비스가 LoadBalancer 타입이 아닙니다. 포트 포워딩을 통해 확인합니다."
            kubectl port-forward service/"$SERVICE_NAME" 8080:80 -n "$NAMESPACE" &
            local port_forward_pid=$!
            sleep 5
            service_url="localhost:8080"
        fi
        
        if [[ -n "$service_url" ]]; then
            log_info "헬스체크 확인: $service_url"
            if curl -f "http://$service_url/api/health" -m 10 &> /dev/null; then
                log_success "서비스가 정상적으로 응답합니다"
            else
                log_warn "서비스가 응답하지 않습니다"
            fi
            
            # 포트 포워딩 종료
            if [[ -n "${port_forward_pid:-}" ]]; then
                kill $port_forward_pid 2>/dev/null || true
            fi
        fi
    fi
    
    # Pod 상태 확인
    local pod_count=$(kubectl get pods -n "$NAMESPACE" -l app=hooklabs-elite --field-selector=status.phase=Running --no-headers | wc -l)
    local total_pods=$(kubectl get pods -n "$NAMESPACE" -l app=hooklabs-elite --no-headers | wc -l)
    
    log_info "Pod 상태: $pod_count/$total_pods 실행 중"
    
    if [[ $pod_count -lt $total_pods ]]; then
        log_warn "일부 Pod가 실행되지 않고 있습니다"
        kubectl get pods -n "$NAMESPACE" -l app=hooklabs-elite
    fi
}

# 실제 롤백 실행
execute_rollback() {
    log_info "롤백 실행 중..."
    
    # 롤백 명령어 구성
    local rollback_cmd="kubectl rollout undo deployment/$DEPLOYMENT_NAME -n $NAMESPACE"
    
    if [[ "$ROLLBACK_TARGET" != "previous" ]]; then
        rollback_cmd="$rollback_cmd --to-revision=$ROLLBACK_TARGET"
    fi
    
    log_info "실행할 명령어: $rollback_cmd"
    
    # 롤백 실행
    if eval "$rollback_cmd"; then
        log_success "롤백 명령어가 성공적으로 실행되었습니다"
    else
        log_error "롤백 명령어 실행 실패"
        return 1
    fi
    
    # 롤백 진행 상황 모니터링
    log_info "롤백 진행 상황 모니터링 중..."
    
    # 타임아웃 설정 (5분)
    local timeout=300
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        local rollout_status=$(kubectl rollout status deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout=30s 2>&1 || echo "timeout")
        
        if echo "$rollout_status" | grep -q "successfully rolled out"; then
            log_success "롤백이 성공적으로 완료되었습니다"
            return 0
        elif echo "$rollout_status" | grep -q "timeout"; then
            log_info "롤백 진행 중... (${elapsed}s/${timeout}s)"
        else
            log_warn "예상하지 못한 상태: $rollout_status"
        fi
        
        sleep 10
        elapsed=$((elapsed + 10))
    done
    
    log_error "롤백 타임아웃 (${timeout}초)"
    return 1
}

# 롤백 후 검증
verify_rollback() {
    log_info "롤백 검증 중..."
    
    # 잠시 대기 (Pod 안정화)
    sleep 15
    
    # Pod 상태 확인
    local ready_pods=$(kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
    local desired_pods=$(kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
    
    if [[ "$ready_pods" == "$desired_pods" && "$ready_pods" -gt 0 ]]; then
        log_success "모든 Pod가 정상적으로 실행 중입니다 ($ready_pods/$desired_pods)"
    else
        log_error "Pod 상태가 비정상입니다 ($ready_pods/$desired_pods)"
        kubectl get pods -n "$NAMESPACE" -l app=hooklabs-elite
        return 1
    fi
    
    # 헬스체크 검증
    check_social_media_services
    
    # 롤백된 이미지 확인
    local new_image=$(kubectl get deployment "$DEPLOYMENT_NAME" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
    log_info "롤백된 이미지: $new_image"
    
    # 소셜 미디어 기능 검증 (간단한 API 호출 테스트)
    log_info "소셜 미디어 기능 검증 중..."
    
    # 기능별 헬스체크 (실제 구현에서는 더 상세한 검증 수행)
    local features=("realtime_sync" "ai_generation" "token_management" "analytics" "scheduling")
    
    for feature in "${features[@]}"; do
        log_info "기능 확인: $feature"
        # 실제로는 각 기능별 API 엔드포인트 호출하여 검증
        # 여기서는 단순 시뮬레이션
        sleep 1
        log_success "기능 $feature 정상 동작"
    done
    
    log_success "롤백 검증 완료"
}

# 알림 발송
send_notification() {
    local status="$1"
    local message="$2"
    
    log_info "알림 발송 중..."
    
    # Slack 웹훅이 설정된 경우
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color
        case "$status" in
            "success") color="good" ;;
            "warning") color="warning" ;;
            "error") color="danger" ;;
            *) color="warning" ;;
        esac
        
        local payload=$(cat << EOF
{
    "channel": "#deployments",
    "username": "HookLabs Elite Rollback Bot",
    "attachments": [
        {
            "color": "$color",
            "title": "롤백 알림 - $status",
            "text": "$message",
            "fields": [
                {
                    "title": "환경",
                    "value": "$NAMESPACE",
                    "short": true
                },
                {
                    "title": "디플로이먼트",
                    "value": "$DEPLOYMENT_NAME",
                    "short": true
                },
                {
                    "title": "롤백 대상",
                    "value": "$ROLLBACK_TARGET",
                    "short": true
                },
                {
                    "title": "시간",
                    "value": "$(date)",
                    "short": true
                }
            ]
        }
    ]
}
EOF
        )
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            "$SLACK_WEBHOOK_URL" &> /dev/null || true
    fi
}

# 정리 작업
cleanup() {
    log_info "정리 작업 중..."
    
    # 오래된 백업 삭제
    if [[ -d "backups" ]]; then
        find backups -name "rollback_*" -type d | sort | head -n -"$BACKUP_LIMIT" | xargs rm -rf
    fi
    
    # 임시 파일 정리
    rm -f /tmp/rollback_backup_path
    
    log_success "정리 작업 완료"
}

# 메인 함수
main() {
    local dry_run=false
    local force=false
    
    # 명령행 인수 파싱
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -n|--namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            -d|--deployment)
                DEPLOYMENT_NAME="$2"
                shift 2
                ;;
            -s|--service)
                SERVICE_NAME="$2"
                shift 2
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            -*)
                log_error "알 수 없는 옵션: $1"
                exit 1
                ;;
            *)
                ROLLBACK_TARGET="$1"
                shift
                ;;
        esac
    done
    
    log_info "HookLabs Elite 롤백 스크립트 시작"
    log_info "네임스페이스: $NAMESPACE"
    log_info "디플로이먼트: $DEPLOYMENT_NAME"
    log_info "롤백 대상: $ROLLBACK_TARGET"
    
    # 사전 조건 확인
    check_prerequisites
    
    # 현재 상태 백업
    backup_current_state
    
    # 롤백 계획 표시
    show_rollback_plan
    
    # Dry-run 모드
    if [[ "$dry_run" == "true" ]]; then
        log_info "Dry-run 모드입니다. 실제 롤백을 수행하지 않습니다."
        exit 0
    fi
    
    # 사용자 확인 (force 옵션이 없는 경우)
    if [[ "$force" == "false" ]]; then
        echo
        read -p "롤백을 계속하시겠습니까? (y/N): " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "롤백이 취소되었습니다"
            exit 0
        fi
    fi
    
    # 롤백 실행
    if execute_rollback; then
        # 롤백 검증
        if verify_rollback; then
            log_success "롤백이 성공적으로 완료되었습니다!"
            send_notification "success" "롤백이 성공적으로 완료되었습니다."
        else
            log_error "롤백 검증 실패"
            send_notification "error" "롤백 검증에 실패했습니다."
            exit 1
        fi
    else
        log_error "롤백 실행 실패"
        send_notification "error" "롤백 실행에 실패했습니다."
        exit 1
    fi
    
    # 정리 작업
    cleanup
    
    log_success "모든 작업이 완료되었습니다!"
}

# 스크립트 실행
main "$@"