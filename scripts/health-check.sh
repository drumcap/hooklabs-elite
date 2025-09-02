#!/bin/sh
# ======================
# 애플리케이션 헬스체크 스크립트
# Docker 컨테이너 내부에서 실행됩니다
# ======================

set -e

# 기본 설정
HOST=${HOSTNAME:-localhost}
PORT=${PORT:-3000}
TIMEOUT=${HEALTH_CHECK_TIMEOUT:-10}

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo "${RED}[ERROR]${NC} $1"
}

# HTTP 요청 함수
http_check() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3
    
    log_info "Checking $description: $url"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$url")
    
    if [ "$response" = "$expected_status" ]; then
        log_info "$description: OK ($response)"
        return 0
    else
        log_error "$description: FAILED (HTTP $response)"
        return 1
    fi
}

# JSON 응답 확인
json_check() {
    local url=$1
    local description=$2
    
    log_info "Checking $description: $url"
    
    response=$(curl -s --connect-timeout $TIMEOUT "$url")
    
    if echo "$response" | grep -q "status.*ok\|healthy\|success"; then
        log_info "$description: OK"
        return 0
    else
        log_error "$description: FAILED - Invalid response"
        return 1
    fi
}

# 메인 헬스체크 함수
main_health_check() {
    local failed=0
    
    log_info "Starting health check for HookLabs Elite..."
    log_info "Host: $HOST, Port: $PORT, Timeout: ${TIMEOUT}s"
    
    # 1. 기본 HTTP 응답 확인
    if ! http_check "http://$HOST:$PORT" 200 "Main page"; then
        failed=$((failed + 1))
    fi
    
    # 2. API Health 엔드포인트 확인
    if ! json_check "http://$HOST:$PORT/api/health" "Health API"; then
        failed=$((failed + 1))
    fi
    
    # 3. 주요 페이지들 확인
    if ! http_check "http://$HOST:$PORT/dashboard" 200 "Dashboard page"; then
        # 로그인 페이지로 리디렉션 될 수 있으므로 302도 허용
        if ! http_check "http://$HOST:$PORT/dashboard" 302 "Dashboard redirect"; then
            failed=$((failed + 1))
        fi
    fi
    
    # 4. API 기본 경로 확인
    if ! http_check "http://$HOST:$PORT/api" 404 "API base path"; then
        failed=$((failed + 1))
    fi
    
    # 5. Static 파일 확인
    if ! http_check "http://$HOST:$PORT/_next/static" 404 "Static files path"; then
        log_warn "Static files check failed (might be normal)"
    fi
    
    # 결과 출력
    if [ $failed -eq 0 ]; then
        log_info "✅ All health checks passed!"
        return 0
    else
        log_error "❌ $failed health check(s) failed!"
        return 1
    fi
}

# 상세 진단 함수
detailed_check() {
    log_info "Running detailed diagnostics..."
    
    # 메모리 사용량 확인
    if command -v free >/dev/null 2>&1; then
        log_info "Memory usage:"
        free -h
    fi
    
    # 디스크 사용량 확인
    if command -v df >/dev/null 2>&1; then
        log_info "Disk usage:"
        df -h /
    fi
    
    # 프로세스 확인
    if command -v ps >/dev/null 2>&1; then
        log_info "Node.js processes:"
        ps aux | grep node | head -5
    fi
    
    # 네트워크 연결 확인
    if command -v netstat >/dev/null 2>&1; then
        log_info "Network connections:"
        netstat -tlnp | grep ":$PORT"
    elif command -v ss >/dev/null 2>&1; then
        log_info "Network connections:"
        ss -tlnp | grep ":$PORT"
    fi
}

# 응급 복구 시도
emergency_recovery() {
    log_warn "Attempting emergency recovery..."
    
    # Node.js 프로세스 재시작 신호
    if [ -f "/app/server.pid" ]; then
        pid=$(cat /app/server.pid)
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Sending SIGHUP to process $pid"
            kill -HUP "$pid"
            sleep 3
            return 0
        fi
    fi
    
    log_error "No recovery options available"
    return 1
}

# 스크립트 실행
case "${1:-check}" in
    "check")
        main_health_check
        ;;
    "detailed")
        main_health_check
        detailed_check
        ;;
    "recovery")
        if ! main_health_check; then
            emergency_recovery
            sleep 5
            main_health_check
        fi
        ;;
    "help")
        echo "Usage: $0 [check|detailed|recovery|help]"
        echo "  check    - Basic health check (default)"
        echo "  detailed - Health check with diagnostics"
        echo "  recovery - Health check with recovery attempt"
        echo "  help     - Show this help"
        ;;
    *)
        log_error "Unknown command: $1"
        exit 1
        ;;
esac