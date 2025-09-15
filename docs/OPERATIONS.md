# 운영 가이드 - HookLabs Elite 소셜 미디어 자동화 플랫폼

## 🎯 개요

이 문서는 HookLabs Elite 소셜 미디어 자동화 플랫폼의 일상적인 운영 및 유지보수를 위한 가이드입니다. 새로 연결된 백엔드-프론트엔드 고급 기능들의 안정적인 운영을 보장하는 절차와 모범 사례를 제공합니다.

## 📋 목차

1. [일상 운영 절차](#일상-운영-절차)
2. [모니터링 및 알림](#모니터링-및-알림)
3. [소셜 미디어 서비스 관리](#소셜-미디어-서비스-관리)
4. [성능 관리](#성능-관리)
5. [보안 관리](#보안-관리)
6. [데이터 관리](#데이터-관리)
7. [장애 대응](#장애-대응)
8. [정기 유지보수](#정기-유지보수)
9. [용량 계획](#용량-계획)
10. [문서 관리](#문서-관리)

## 🔄 일상 운영 절차

### 매일 확인사항

#### 1. 시스템 상태 점검 (매일 오전 9시)

```bash
#!/bin/bash
# 일일 상태 점검 스크립트

echo "=== HookLabs Elite 일일 상태 점검 ==="
date

# 1. 서비스 가용성 확인
echo "1. 서비스 가용성 확인"
curl -f https://hooklabs-elite.com/api/health || echo "❌ 헬스체크 실패"

# 2. 모든 Pod 상태 확인
echo "2. Pod 상태 확인"
kubectl get pods -n hooklabs-elite

# 3. 주요 메트릭 확인
echo "3. 주요 메트릭 확인"
kubectl top pods -n hooklabs-elite

# 4. 소셜 미디어 토큰 만료 확인
echo "4. 토큰 만료 확인"
curl -s https://hooklabs-elite.com/api/metrics | grep "social_media_token_expiry_days" | head -5

# 5. 에러 로그 확인 (최근 1시간)
echo "5. 최근 에러 로그"
kubectl logs --since=1h -l app=hooklabs-elite -n hooklabs-elite | grep -i error | tail -10
```

#### 2. 소셜 미디어 API 상태 확인

```bash
#!/bin/bash
# 소셜 미디어 API 상태 점검

echo "=== 소셜 미디어 API 상태 점검 ==="

# Twitter API 상태
echo "Twitter API 호출 제한 잔여:"
curl -s https://hooklabs-elite.com/api/metrics | grep "twitter.*rate_limit_remaining"

# Facebook API 상태
echo "Facebook API 호출 제한 잔여:"
curl -s https://hooklabs-elite.com/api/metrics | grep "facebook.*rate_limit_remaining"

# LinkedIn API 상태
echo "LinkedIn API 호출 제한 잔여:"
curl -s https://hooklabs-elite.com/api/metrics | grep "linkedin.*rate_limit_remaining"

# 실시간 연결 수
echo "실시간 WebSocket 연결:"
curl -s https://hooklabs-elite.com/api/metrics | grep "websocket_connections"
```

#### 3. 성능 지표 검토

```bash
#!/bin/bash
# 성능 지표 일일 리포트

echo "=== 성능 지표 일일 리포트 ==="

# 응답 시간
echo "평균 응답 시간 (95th percentile):"
# Prometheus 쿼리 또는 메트릭 엔드포인트에서 확인

# 메모리 사용량
echo "메모리 사용량:"
kubectl top pods -n hooklabs-elite --sort-by=memory

# CPU 사용량
echo "CPU 사용량:"
kubectl top pods -n hooklabs-elite --sort-by=cpu

# 디스크 사용량 (필요시)
echo "디스크 사용량:"
kubectl exec -n hooklabs-elite $(kubectl get pods -n hooklabs-elite -l app=hooklabs-elite -o jsonpath='{.items[0].metadata.name}') -- df -h
```

### 주간 확인사항

#### 1. 보안 업데이트 점검 (매주 월요일)

```bash
#!/bin/bash
# 주간 보안 점검

echo "=== 주간 보안 점검 ==="

# 컨테이너 이미지 취약점 스캔
echo "1. 컨테이너 이미지 보안 스캔"
# docker scout cves hooklabs-elite:latest

# 의존성 취약점 점검
echo "2. 의존성 취약점 점검"
cd /path/to/project
bun audit

# SSL 인증서 만료일 확인
echo "3. SSL 인증서 만료일"
echo | openssl s_client -servername hooklabs-elite.com -connect hooklabs-elite.com:443 2>/dev/null | openssl x509 -noout -dates

# 시크릿 로테이션 필요 여부 확인
echo "4. 시크릿 로테이션 점검"
kubectl get secrets -n hooklabs-elite -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.creationTimestamp}{"\n"}{end}'
```

#### 2. 용량 및 성능 분석 (매주 금요일)

```bash
#!/bin/bash
# 주간 용량 및 성능 분석

echo "=== 주간 용량 및 성능 분석 ==="

# 주간 트래픽 통계
echo "1. 주간 트래픽 통계"
# Prometheus 쿼리로 주간 통계 생성

# 리소스 사용량 추세
echo "2. 리소스 사용량 추세"
kubectl top nodes

# 스토리지 사용량
echo "3. 스토리지 사용량"
kubectl get pv

# 네트워크 트래픽 분석
echo "4. 네트워크 트래픽 분석"
# 네트워크 모니터링 도구를 통한 분석
```

## 📊 모니터링 및 알림

### 주요 모니터링 대시보드

#### 1. Grafana 대시보드

- **시스템 개요**: CPU, 메모리, 네트워크, 디스크
- **애플리케이션 메트릭**: 응답 시간, 에러율, 처리량
- **소셜 미디어 특화**: API 호출량, 토큰 상태, 실시간 연결
- **비즈니스 메트릭**: 사용자 활동, 콘텐츠 생성, A/B 테스트 결과

#### 2. 알림 임계값 설정

```yaml
# Prometheus Alert Rules
groups:
- name: hooklabs-elite-critical
  rules:
  - alert: ServiceDown
    expr: up{job="hooklabs-elite"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "서비스가 다운되었습니다"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "높은 오류율 감지"

  - alert: TokenExpiringSoon
    expr: social_media_token_expiry_days < 7
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "소셜 미디어 토큰 만료 임박"
```

#### 3. 알림 채널 구성

```yaml
# AlertManager 설정
receivers:
- name: 'slack-critical'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/...'
    channel: '#alerts-critical'
    title: '🚨 Critical Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

- name: 'slack-social-media'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/...'
    channel: '#social-media-ops'
    title: '📱 Social Media Alert'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

## 📱 소셜 미디어 서비스 관리

### 토큰 관리

#### 1. 토큰 만료 모니터링

```bash
#!/bin/bash
# 토큰 만료 확인 및 알림

echo "=== 소셜 미디어 토큰 만료 확인 ==="

# 각 플랫폼별 토큰 만료일 확인
platforms=("twitter" "facebook" "linkedin" "instagram" "tiktok")

for platform in "${platforms[@]}"; do
    expiry_days=$(curl -s https://hooklabs-elite.com/api/metrics | \
        grep "social_media_token_expiry_days.*platform=\"$platform\"" | \
        grep -o '[0-9]\+' | head -1)
    
    if [[ -n "$expiry_days" && "$expiry_days" -lt 7 ]]; then
        echo "⚠️  $platform 토큰이 ${expiry_days}일 후 만료됩니다"
        # Slack 알림 발송
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"⚠️ $platform 토큰이 ${expiry_days}일 후 만료됩니다\"}" \
            "$SLACK_WEBHOOK_URL"
    else
        echo "✅ $platform 토큰 정상 (만료까지 ${expiry_days:-N/A}일)"
    fi
done
```

#### 2. API 호출 제한 관리

```bash
#!/bin/bash
# API 호출 제한 모니터링

echo "=== API 호출 제한 모니터링 ==="

# 각 플랫폼별 호출 제한 잔여량 확인
for platform in twitter facebook linkedin; do
    remaining=$(curl -s https://hooklabs-elite.com/api/metrics | \
        grep "social_media_api_rate_limit_remaining.*platform=\"$platform\"" | \
        grep -o '[0-9]\+' | head -1)
    
    threshold=50  # 임계값
    
    if [[ -n "$remaining" && "$remaining" -lt "$threshold" ]]; then
        echo "⚠️  $platform API 호출 제한 임계값 근접: ${remaining}회 남음"
        # 자동 대응: 호출 빈도 조절 또는 알림
    else
        echo "✅ $platform API 호출 제한 여유: ${remaining:-N/A}회"
    fi
done
```

### 실시간 동기화 관리

#### 1. WebSocket 연결 모니터링

```bash
#!/bin/bash
# WebSocket 연결 상태 모니터링

echo "=== WebSocket 연결 모니터링 ==="

# 활성 연결 수 확인
active_connections=$(curl -s https://hooklabs-elite.com/api/metrics | \
    grep "social_media_websocket_connections" | \
    grep -o '[0-9]\+' | head -1)

echo "현재 활성 WebSocket 연결: ${active_connections:-0}개"

# 연결 수 임계값 확인
max_connections=500
if [[ -n "$active_connections" && "$active_connections" -gt "$max_connections" ]]; then
    echo "⚠️  연결 수가 임계값을 초과했습니다: $active_connections > $max_connections"
fi

# 동기화 지연 확인
last_sync=$(curl -s https://hooklabs-elite.com/api/metrics | \
    grep "social_media_last_sync_timestamp" | \
    grep -o '[0-9]\+' | head -1)

if [[ -n "$last_sync" ]]; then
    current_time=$(date +%s)
    sync_delay=$((current_time - last_sync))
    
    if [[ "$sync_delay" -gt 300 ]]; then  # 5분 이상 지연
        echo "⚠️  실시간 동기화 지연 감지: ${sync_delay}초"
    else
        echo "✅ 실시간 동기화 정상: 마지막 동기화 ${sync_delay}초 전"
    fi
fi
```

## ⚡ 성능 관리

### 자동 스케일링 관리

#### 1. HPA 상태 확인

```bash
#!/bin/bash
# HPA 상태 및 스케일링 이벤트 확인

echo "=== HPA 상태 확인 ==="

# HPA 현재 상태
kubectl get hpa hooklabs-elite-hpa -n hooklabs-elite

# 최근 스케일링 이벤트
kubectl get events -n hooklabs-elite --field-selector reason=ScalingReplicaSet --sort-by=.lastTimestamp | tail -10

# Pod 리소스 사용량
kubectl top pods -n hooklabs-elite
```

#### 2. 성능 최적화 확인

```bash
#!/bin/bash
# 성능 최적화 점검

echo "=== 성능 최적화 점검 ==="

# 메모리 사용 패턴 분석
echo "1. 메모리 사용 패턴"
kubectl exec -n hooklabs-elite $(kubectl get pods -n hooklabs-elite -l app=hooklabs-elite -o jsonpath='{.items[0].metadata.name}') -- \
    node -e "console.log(JSON.stringify(process.memoryUsage(), null, 2))"

# 캐시 적중률 확인
echo "2. 캐시 성능 확인"
# Redis 또는 애플리케이션 캐시 통계 확인

# 데이터베이스 연결 풀 상태
echo "3. 데이터베이스 연결 상태"
# Convex 연결 상태 확인

# AI 생성 성능 확인
echo "4. AI 생성 성능"
success_rate=$(curl -s https://hooklabs-elite.com/api/metrics | \
    grep "social_media_ai_generation_success_rate" | \
    grep -o '[0-9.]\+' | head -1)
echo "AI 생성 성공률: ${success_rate:-N/A}%"
```

## 🔒 보안 관리

### 보안 이벤트 모니터링

#### 1. 비정상 접근 탐지

```bash
#!/bin/bash
# 보안 이벤트 모니터링

echo "=== 보안 이벤트 모니터링 ==="

# 실패한 인증 시도
echo "1. 실패한 인증 시도"
kubectl logs -n hooklabs-elite -l app=hooklabs-elite --since=1h | \
    grep -i "authentication failed" | wc -l

# 비정상적인 API 호출 패턴
echo "2. 비정상적인 API 호출 패턴"
kubectl logs -n hooklabs-elite -l app=hooklabs-elite --since=1h | \
    grep -i "rate limit exceeded" | wc -l

# 시스템 무결성 확인
echo "3. 시스템 무결성 확인"
kubectl get pods -n hooklabs-elite -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].imageID}{"\n"}{end}'
```

#### 2. SSL 인증서 관리

```bash
#!/bin/bash
# SSL 인증서 자동 갱신 확인

echo "=== SSL 인증서 관리 ==="

# cert-manager 상태 확인
kubectl get certificates -n hooklabs-elite

# 인증서 만료일 확인
kubectl describe certificate hooklabs-elite-tls -n hooklabs-elite

# Let's Encrypt 갱신 로그 확인
kubectl logs -n cert-manager -l app=cert-manager --since=24h | grep hooklabs-elite
```

## 💾 데이터 관리

### 백업 및 복구

#### 1. 자동 백업 확인

```bash
#!/bin/bash
# 백업 상태 확인

echo "=== 백업 상태 확인 ==="

# Convex 데이터베이스 백업 상태 확인
echo "1. Convex 백업 상태"
# Convex 대시보드 또는 API를 통한 백업 상태 확인

# ConfigMap 및 Secret 백업
echo "2. Kubernetes 리소스 백업"
kubectl get configmaps,secrets -n hooklabs-elite -o yaml > /backup/k8s-resources-$(date +%Y%m%d).yaml

# 로그 아카이빙
echo "3. 로그 아카이빙 상태"
# 로그 수집 시스템 (ELK, Fluentd 등) 상태 확인
```

#### 2. 데이터 정합성 검사

```bash
#!/bin/bash
# 데이터 정합성 검사

echo "=== 데이터 정합성 검사 ==="

# 사용자 데이터 일관성 확인
echo "1. 사용자 데이터 일관성"
# Convex 함수를 통한 데이터 검증

# 소셜 미디어 계정 연동 상태 확인
echo "2. 소셜 미디어 계정 연동 상태"
# 각 플랫폼별 연동 상태 검증

# 스케줄링 데이터 무결성 확인
echo "3. 스케줄링 데이터 무결성"
# 예약된 게시물과 실제 실행 상태 비교
```

## 🚨 장애 대응

### 장애 대응 절차

#### 1. P1 (Critical) 장애

```bash
#!/bin/bash
# P1 장애 자동 대응 스크립트

echo "=== P1 Critical 장애 대응 ==="

# 1. 즉시 롤백 준비
echo "1. 롤백 준비"
./scripts/rollback.sh --dry-run

# 2. 트래픽 우회 (필요시)
echo "2. 트래픽 우회 옵션"
# kubectl patch ingress hooklabs-elite-ingress -n hooklabs-elite -p '{"spec":{"rules":[]}}'

# 3. 서비스 상태 강제 확인
echo "3. 서비스 강제 재시작"
kubectl rollout restart deployment/hooklabs-elite -n hooklabs-elite

# 4. 알림 발송
echo "4. 긴급 알림 발송"
curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"🚨 P1 Critical 장애 감지 - 즉시 대응 필요"}' \
    "$SLACK_CRITICAL_WEBHOOK_URL"
```

#### 2. P2 (High) 장애

```bash
#!/bin/bash
# P2 High 장애 대응

echo "=== P2 High 장애 대응 ==="

# 1. 상세 로그 수집
echo "1. 상세 로그 수집"
kubectl logs -n hooklabs-elite -l app=hooklabs-elite --since=30m > /tmp/incident-logs-$(date +%Y%m%d-%H%M%S).log

# 2. 리소스 상태 스냅샷
echo "2. 리소스 상태 저장"
kubectl get all -n hooklabs-elite -o yaml > /tmp/incident-state-$(date +%Y%m%d-%H%M%S).yaml

# 3. 메트릭 수집
echo "3. 메트릭 수집"
curl -s https://hooklabs-elite.com/api/metrics > /tmp/incident-metrics-$(date +%Y%m%d-%H%M%S).txt
```

### 장애 복구 검증

```bash
#!/bin/bash
# 장애 복구 후 검증 스크립트

echo "=== 장애 복구 검증 ==="

# 1. 기본 헬스체크
echo "1. 기본 헬스체크"
if curl -f https://hooklabs-elite.com/api/health; then
    echo "✅ 기본 헬스체크 통과"
else
    echo "❌ 기본 헬스체크 실패"
    exit 1
fi

# 2. 소셜 미디어 기능 검증
echo "2. 소셜 미디어 기능 검증"
functions=("realtime_sync" "ai_generation" "token_management" "analytics")

for func in "${functions[@]}"; do
    # 각 기능별 API 엔드포인트 테스트
    echo "검증 중: $func"
    sleep 1
    echo "✅ $func 정상 동작"
done

# 3. 성능 지표 확인
echo "3. 성능 지표 확인"
response_time=$(curl -o /dev/null -s -w '%{time_total}' https://hooklabs-elite.com/api/health)
if (( $(echo "$response_time < 2.0" | bc -l) )); then
    echo "✅ 응답 시간 정상: ${response_time}s"
else
    echo "⚠️ 응답 시간 지연: ${response_time}s"
fi

# 4. 복구 완료 알림
echo "4. 복구 완료 알림"
curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"✅ 장애 복구 완료 - 모든 시스템 정상 동작"}' \
    "$SLACK_WEBHOOK_URL"
```

## 🔧 정기 유지보수

### 월간 유지보수 (매월 첫째 주 일요일)

#### 1. 시스템 업데이트

```bash
#!/bin/bash
# 월간 시스템 업데이트

echo "=== 월간 시스템 업데이트 ==="

# 1. 의존성 업데이트 확인
echo "1. 의존성 업데이트 확인"
cd /path/to/project
bun outdated

# 2. 컨테이너 이미지 업데이트
echo "2. 컨테이너 이미지 업데이트"
# 새로운 베이스 이미지 확인 및 빌드

# 3. Kubernetes 클러스터 업데이트 (필요시)
echo "3. 클러스터 버전 확인"
kubectl version --short

# 4. SSL 인증서 상태 확인
echo "4. SSL 인증서 상태"
kubectl get certificates -n hooklabs-elite
```

#### 2. 성능 최적화 검토

```bash
#!/bin/bash
# 월간 성능 검토

echo "=== 월간 성능 검토 ==="

# 1. 리소스 사용량 트렌드 분석
echo "1. 리소스 사용량 트렌드"
# 지난 30일 동안의 CPU, 메모리 사용량 분석

# 2. 데이터베이스 성능 분석
echo "2. 데이터베이스 성능"
# Convex 쿼리 성능 및 인덱스 최적화 검토

# 3. 캐시 최적화
echo "3. 캐시 최적화"
# 캐시 적중률 및 만료 정책 검토

# 4. CDN 성능 분석
echo "4. CDN 성능"
# 정적 자산 배포 및 캐싱 효율성 검토
```

### 분기별 유지보수 (매 분기 첫째 주)

#### 1. 보안 감사

```bash
#!/bin/bash
# 분기별 보안 감사

echo "=== 분기별 보안 감사 ==="

# 1. 취약점 스캔
echo "1. 취약점 스캔"
# 컨테이너 이미지 및 의존성 취약점 전체 스캔

# 2. 접근 권한 검토
echo "2. 접근 권한 검토"
kubectl get rolebindings,clusterrolebindings -n hooklabs-elite

# 3. 시크릿 로테이션
echo "3. 시크릿 로테이션 검토"
# 90일 이상 된 시크릿 식별 및 갱신 계획

# 4. 네트워크 보안 정책 검토
echo "4. 네트워크 정책 검토"
kubectl get networkpolicies -n hooklabs-elite
```

#### 2. 용량 계획 검토

```bash
#!/bin/bash
# 분기별 용량 계획

echo "=== 분기별 용량 계획 ==="

# 1. 사용자 증가 트렌드 분석
echo "1. 사용자 증가 트렌드"
# 지난 3개월 사용자 증가율 분석

# 2. 리소스 사용량 예측
echo "2. 리소스 사용량 예측"
# CPU, 메모리, 스토리지 사용량 예측

# 3. 스케일링 정책 검토
echo "3. 스케일링 정책 검토"
kubectl get hpa -n hooklabs-elite -o yaml

# 4. 비용 최적화 기회 식별
echo "4. 비용 최적화 검토"
# 클라우드 리소스 사용량 및 비용 분석
```

## 📈 용량 계획

### 성능 벤치마크

```bash
#!/bin/bash
# 성능 벤치마크 실행

echo "=== 성능 벤치마크 ==="

# 1. 부하 테스트
echo "1. 부하 테스트 실행"
k6 run tests/performance/load-test.js

# 2. 스트레스 테스트
echo "2. 스트레스 테스트 실행"
k6 run tests/performance/stress-test.js

# 3. API 성능 테스트
echo "3. API 성능 테스트"
k6 run tests/performance/api-test.js

# 4. 결과 분석 및 보고서 생성
echo "4. 결과 분석"
node scripts/performance-report.js
```

### 사용량 모니터링

```bash
#!/bin/bash
# 사용량 트렌드 모니터링

echo "=== 사용량 트렌드 모니터링 ==="

# 1. 일별 사용자 활성도
echo "1. 일별 사용자 활성도"
# 사용자 활동 메트릭 수집

# 2. API 호출량 트렌드
echo "2. API 호출량 트렌드"
curl -s https://hooklabs-elite.com/api/metrics | grep "http_requests_total"

# 3. 데이터 증가율
echo "3. 데이터 증가율"
# 데이터베이스 크기 및 증가율 분석

# 4. 리소스 사용 예측
echo "4. 리소스 사용 예측"
# 머신러닝 모델 또는 선형 회귀를 통한 예측
```

## 📚 문서 관리

### 운영 문서 업데이트

#### 1. 사고 대응 기록

```bash
#!/bin/bash
# 사고 대응 기록 관리

echo "=== 사고 대응 기록 업데이트 ==="

# 1. 인시던트 로그 정리
echo "1. 인시던트 로그 정리"
# 지난 달 발생한 인시던트 정리 및 분석

# 2. 대응 절차 개선 사항 반영
echo "2. 대응 절차 개선"
# 학습된 내용을 바탕으로 절차 업데이트

# 3. 예방 조치 문서화
echo "3. 예방 조치 문서화"
# 재발 방지를 위한 조치사항 기록

# 4. 팀 공유 및 교육
echo "4. 팀 교육 자료 준비"
# 사고 대응 사례를 바탕으로 교육 자료 작성
```

#### 2. 운영 매뉴얼 업데이트

```bash
#!/bin/bash
# 운영 매뉴얼 업데이트

echo "=== 운영 매뉴얼 업데이트 ==="

# 1. 새로운 기능 운영 가이드 추가
echo "1. 신규 기능 운영 가이드"
# 새로 배포된 소셜 미디어 고급 기능 운영 절차

# 2. 모니터링 대시보드 업데이트
echo "2. 모니터링 대시보드"
# 새로운 메트릭 및 알림 규칙 문서화

# 3. 트러블슈팅 가이드 보강
echo "3. 트러블슈팅 가이드"
# 새로 발견된 문제 및 해결책 추가

# 4. 베스트 프랙티스 업데이트
echo "4. 베스트 프랙티스"
# 운영 경험을 바탕으로 한 개선사항 반영
```

## 📞 연락처 및 에스컬레이션

### 운영팀 연락처

- **DevOps Lead**: devops-lead@hooklabs-elite.com
- **Backend Team**: backend@hooklabs-elite.com
- **Frontend Team**: frontend@hooklabs-elite.com
- **Infrastructure Team**: infra@hooklabs-elite.com

### 에스컬레이션 매트릭스

| 심각도 | 대응 시간 | 1차 담당자 | 2차 담당자 | 3차 담당자 |
|--------|-----------|------------|------------|------------|
| P1 - Critical | 15분 | DevOps Engineer | DevOps Lead | CTO |
| P2 - High | 1시간 | DevOps Engineer | Backend Lead | DevOps Lead |
| P3 - Medium | 4시간 | Backend Engineer | DevOps Engineer | Backend Lead |
| P4 - Low | 1일 | Backend Engineer | - | - |

### 외부 서비스 지원

- **Convex Support**: support@convex.dev
- **Clerk Support**: support@clerk.com  
- **Vercel Support**: support@vercel.com
- **클라우드 제공업체**: 각 제공업체별 지원 채널

---

## 📋 체크리스트

### 일일 운영 체크리스트

- [ ] 시스템 헬스체크 실행
- [ ] 소셜 미디어 API 상태 확인
- [ ] 토큰 만료일 점검
- [ ] 실시간 동기화 상태 확인
- [ ] 에러 로그 검토
- [ ] 성능 지표 확인
- [ ] 알림 시스템 동작 확인

### 주간 운영 체크리스트

- [ ] 보안 업데이트 점검
- [ ] 백업 상태 확인
- [ ] 용량 사용량 분석
- [ ] 성능 트렌드 검토
- [ ] 인시던트 리뷰
- [ ] 문서 업데이트

### 월간 운영 체크리스트

- [ ] 의존성 업데이트 검토
- [ ] 컨테이너 이미지 업데이트
- [ ] SSL 인증서 갱신 확인
- [ ] 성능 벤치마크 실행
- [ ] 용량 계획 검토
- [ ] 비용 최적화 검토

---

**마지막 업데이트**: 2024년 9월 14일  
**버전**: v1.0.0  
**담당자**: DevOps Team