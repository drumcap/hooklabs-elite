# 배포 가이드 - HookLabs Elite 소셜 미디어 자동화 플랫폼

## 🚀 개요

이 문서는 HookLabs Elite 소셜 미디어 자동화 플랫폼의 프로덕션 배포에 대한 포괄적인 가이드입니다. 새로 연결된 백엔드-프론트엔드 고급 기능들의 안전하고 안정적인 배포를 보장합니다.

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [환경 설정](#환경-설정)
3. [CI/CD 파이프라인](#cicd-파이프라인)
4. [Docker 컨테이너화](#docker-컨테이너화)
5. [Kubernetes 배포](#kubernetes-배포)
6. [모니터링 및 관찰성](#모니터링-및-관찰성)
7. [피처 플래그](#피처-플래그)
8. [보안 고려사항](#보안-고려사항)
9. [성능 최적화](#성능-최적화)
10. [롤백 절차](#롤백-절차)
11. [트러블슈팅](#트러블슈팅)

## 🔧 사전 요구사항

### 필수 도구
- **Node.js** 20.x+
- **Bun** 1.0.15+
- **Docker** 24.x+
- **kubectl** 1.28+
- **Helm** 3.12+ (선택사항)

### 클라우드 인프라
- **Kubernetes 클러스터** (1.28+)
- **Container Registry** (Docker Hub, ECR, GCR 등)
- **도메인 및 SSL 인증서**
- **모니터링 스택** (Prometheus, Grafana)

### 서비스 계정
- **Convex** - 백엔드 서비스
- **Clerk** - 인증 서비스
- **Lemon Squeezy** - 결제 서비스
- **소셜 미디어 API** - Twitter, Facebook, LinkedIn, Instagram, TikTok
- **AI 서비스** - Google AI, OpenAI, Anthropic

## ⚙️ 환경 설정

### 1. 환경별 설정 파일

각 환경에 맞는 환경 변수 설정:

```bash
# 개발 환경
cp .env.development.template .env.development

# 스테이징 환경  
cp .env.staging.template .env.staging

# 프로덕션 환경
cp .env.production.template .env.production
```

### 2. 필수 환경 변수

#### 기본 애플리케이션
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_NAME="HookLabs Elite"
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

#### 백엔드 서비스 (Convex)
```bash
CONVEX_DEPLOYMENT=production:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.site
CONVEX_DEPLOY_KEY=prod_your-deploy-key
```

#### 인증 서비스 (Clerk)
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your-publishable-key
CLERK_SECRET_KEY=sk_live_your-secret-key
CLERK_WEBHOOK_SECRET=whsec_your-webhook-secret
```

#### 소셜 미디어 API 키
```bash
# Twitter/X
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
TWITTER_BEARER_TOKEN=your-twitter-bearer-token

# Facebook/Meta
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_ACCESS_TOKEN=your-facebook-access-token

# LinkedIn
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Instagram
INSTAGRAM_ACCESS_TOKEN=your-instagram-access-token
INSTAGRAM_CLIENT_ID=your-instagram-client-id

# TikTok
TIKTOK_CLIENT_KEY=your-tiktok-client-key
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret
```

#### AI 서비스
```bash
GOOGLE_AI_API_KEY=your-google-ai-api-key
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## 🔄 CI/CD 파이프라인

### GitHub Actions 워크플로우

#### 1. 소셜 미디어 고급 기능 테스트

```yaml
social-media-advanced-tests:
  name: 🐦 소셜 미디어 고급 기능 테스트
  runs-on: ubuntu-latest
  strategy:
    matrix:
      test-suite:
        - name: backend-integration
          tests: "tests/unit/convex/socialAccounts.test.ts tests/unit/convex/postVariants.test.ts"
        - name: frontend-components  
          tests: "tests/components/social-media/"
        - name: real-time-features
          tests: "tests/integration/real-time-sync.test.ts"
```

#### 2. 테스트 실행 단계

```bash
# 백엔드 API 통합 테스트
bun run test:social-media

# 성능 테스트
bun run test:performance

# 접근성 테스트
bun run test:accessibility

# E2E 테스트
bun run test:e2e:social-media
```

### 배포 트리거

- **자동 배포**: `main` 브랜치 푸시 시
- **수동 배포**: `workflow_dispatch` 이벤트
- **스테이징 배포**: `develop` 브랜치 푸시 시

## 🐳 Docker 컨테이너화

### 멀티스테이지 Dockerfile

```dockerfile
# 1단계: 베이스 이미지
FROM oven/bun:1.0.15-alpine AS base

# 2단계: 빌드 스테이지  
FROM base AS builder
RUN bun run test:social-media --silent || echo "테스트 건너뛰기"
RUN bun run build

# 3단계: 프로덕션 런타임
FROM oven/bun:1.0.15-alpine AS runner
# 소셜 미디어 고급 기능을 위한 추가 설정
ENV UV_THREADPOOL_SIZE=32
ENV VARIANT_CACHE_SIZE=1000
ENV ANALYTICS_BUFFER_SIZE=5000
```

### 이미지 빌드 및 푸시

```bash
# 이미지 빌드
docker build -t hooklabs-elite:latest .

# 태그 지정
docker tag hooklabs-elite:latest your-registry/hooklabs-elite:v1.0.0

# 레지스트리에 푸시
docker push your-registry/hooklabs-elite:v1.0.0
```

## ☸️ Kubernetes 배포

### 1. 네임스페이스 생성

```bash
kubectl create namespace hooklabs-elite
```

### 2. 시크릿 설정

```bash
# 기본 시크릿
kubectl create secret generic hooklabs-secrets \
  --from-literal=CONVEX_DEPLOYMENT="production:your-deployment" \
  --from-literal=CLERK_SECRET_KEY="sk_live_your-secret" \
  -n hooklabs-elite

# 소셜 미디어 API 시크릿
kubectl create secret generic social-media-secrets \
  --from-literal=TWITTER_CLIENT_SECRET="your-secret" \
  --from-literal=FACEBOOK_APP_SECRET="your-secret" \
  -n hooklabs-elite
```

### 3. 배포 명령어

```bash
# Kustomize를 사용한 배포
kubectl apply -k k8s/overlays/production

# 또는 개별 리소스 배포
kubectl apply -f k8s/base/deployment.yaml -n hooklabs-elite
kubectl apply -f k8s/base/service.yaml -n hooklabs-elite
kubectl apply -f k8s/base/ingress.yaml -n hooklabs-elite
```

### 4. 배포 상태 확인

```bash
# 디플로이먼트 상태 확인
kubectl rollout status deployment/hooklabs-elite -n hooklabs-elite

# Pod 상태 확인
kubectl get pods -n hooklabs-elite -l app=hooklabs-elite

# 서비스 확인
kubectl get services -n hooklabs-elite

# 로그 확인
kubectl logs -f deployment/hooklabs-elite -n hooklabs-elite
```

## 📊 모니터링 및 관찰성

### 1. 헬스체크 엔드포인트

- **라이브니스**: `/api/health`
- **레디니스**: `/api/ready`  
- **메트릭**: `/api/metrics` (Prometheus 형식)

### 2. 주요 모니터링 메트릭

#### 소셜 미디어 특화 메트릭
- `social_media_websocket_connections` - 실시간 연결 수
- `social_media_api_rate_limit_remaining` - API 호출 제한 잔여
- `social_media_token_expiry_days` - 토큰 만료까지 남은 일수
- `social_media_scheduler_queue_size` - 스케줄링 큐 크기
- `social_media_ai_generation_requests_total` - AI 생성 요청 총 수

#### 애플리케이션 메트릭
- `http_requests_total` - HTTP 요청 총 수
- `http_request_duration_seconds` - 응답 시간
- `nodejs_heap_size_used_bytes` - 메모리 사용량
- `feature_flag_enabled` - 피처 플래그 상태

### 3. Prometheus 설정

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hooklabs-elite-metrics
spec:
  selector:
    matchLabels:
      app: hooklabs-elite
  endpoints:
  - port: http
    path: /api/metrics
    interval: 30s
```

### 4. 알림 규칙

```yaml
- alert: SocialMediaTokenExpiringSoon
  expr: social_media_token_expiry_days{job="hooklabs-elite"} < 7
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "소셜 미디어 토큰 만료 임박"
```

## 🚩 피처 플래그

### 1. 소셜 미디어 기능 플래그

- `realtime_sync` - 실시간 동기화
- `ai_content_generation` - AI 콘텐츠 생성
- `ab_testing_variants` - A/B 테스트 변형
- `advanced_analytics` - 고급 분석 대시보드
- `token_expiry_alerts` - 토큰 만료 알림
- `auto_scheduling` - 자동 스케줄링

### 2. 점진적 배포 전략

```typescript
// 단계적 롤아웃 예시
const rolloutPlan = {
  phase1: { percentage: 10, duration: '2 hours' },
  phase2: { percentage: 25, duration: '4 hours' },
  phase3: { percentage: 50, duration: '8 hours' },
  phase4: { percentage: 100, duration: 'stable' }
};
```

### 3. 피처 플래그 사용법

```typescript
import { useFeatureFlag } from '@/lib/feature-flags';

function SocialMediaDashboard() {
  const realtimeSync = useFeatureFlag('realtime_sync');
  const aiGeneration = useFeatureFlag('ai_content_generation');
  
  return (
    <div>
      {realtimeSync.enabled && <RealtimeMonitor />}
      {aiGeneration.enabled && <AIContentGenerator />}
    </div>
  );
}
```

## 🔒 보안 고려사항

### 1. 시크릿 관리

- **절대 하지 말 것**: 시크릿을 코드에 직접 포함
- **권장사항**: Kubernetes Secrets, External Secrets Operator 사용
- **추가 보안**: HashiCorp Vault, AWS Secrets Manager 연동

### 2. API 보안

```typescript
// API 키 로테이션 체크
const checkTokenExpiry = async () => {
  const tokens = await getExpiringTokens();
  if (tokens.length > 0) {
    await sendTokenExpiryAlert(tokens);
  }
};
```

### 3. 네트워크 보안

- **TLS 1.3** 사용
- **CORS** 정책 적용
- **Rate Limiting** 구현
- **WAF** 설정 (CloudFlare, AWS WAF)

## ⚡ 성능 최적화

### 1. 컨테이너 최적화

```dockerfile
# 멀티스테이지 빌드로 이미지 크기 최소화
# 불필요한 패키지 제거
# .dockerignore 활용
```

### 2. Kubernetes 리소스 최적화

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "1Gi"
    cpu: "500m"
```

### 3. 실시간 기능 최적화

```yaml
# WebSocket 연결 최적화
env:
- name: UV_THREADPOOL_SIZE
  value: "32"
- name: WEBSOCKET_PING_INTERVAL
  value: "30000"
```

### 4. 오토스케일링

```yaml
spec:
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🔄 롤백 절차

### 1. 자동 롤백 스크립트

```bash
# 이전 버전으로 롤백
./scripts/rollback.sh

# 특정 리비전으로 롤백  
./scripts/rollback.sh 3

# Dry-run 모드
./scripts/rollback.sh --dry-run
```

### 2. 수동 롤백

```bash
# Kubernetes 롤백
kubectl rollout undo deployment/hooklabs-elite -n hooklabs-elite

# 특정 리비전으로 롤백
kubectl rollout undo deployment/hooklabs-elite --to-revision=2 -n hooklabs-elite

# 롤백 상태 확인
kubectl rollout status deployment/hooklabs-elite -n hooklabs-elite
```

### 3. 롤백 검증

```bash
# 헬스체크
curl -f https://yourdomain.com/api/health

# 소셜 미디어 기능 검증
curl -f https://yourdomain.com/api/health | jq '.services.social'

# 메트릭 확인
curl -f https://yourdomain.com/api/metrics | grep social_media
```

## 🔧 트러블슈팅

### 일반적인 문제들

#### 1. Pod가 시작되지 않음

```bash
# Pod 상태 확인
kubectl describe pod <pod-name> -n hooklabs-elite

# 로그 확인
kubectl logs <pod-name> -n hooklabs-elite

# 이벤트 확인
kubectl get events -n hooklabs-elite --sort-by=.metadata.creationTimestamp
```

#### 2. 소셜 미디어 API 연결 실패

```bash
# 시크릿 확인
kubectl get secrets -n hooklabs-elite

# 환경 변수 확인
kubectl exec <pod-name> -n hooklabs-elite -- printenv | grep TWITTER

# API 키 테스트
kubectl exec <pod-name> -n hooklabs-elite -- curl -f "https://api.twitter.com/2/users/me"
```

#### 3. 실시간 동기화 문제

```bash
# WebSocket 연결 확인
kubectl exec <pod-name> -n hooklabs-elite -- netstat -an | grep :3000

# 메트릭 확인
curl -f https://yourdomain.com/api/metrics | grep websocket_connections
```

#### 4. AI 생성 서비스 오류

```bash
# AI API 키 확인
kubectl get secret ai-services-secrets -n hooklabs-elite -o yaml

# AI 생성 로그 확인  
kubectl logs <pod-name> -n hooklabs-elite | grep "AI generation"
```

### 성능 문제 디버깅

```bash
# 메모리 사용량 확인
kubectl top pods -n hooklabs-elite

# CPU 사용량 확인
kubectl top nodes

# 네트워크 연결 확인
kubectl exec <pod-name> -n hooklabs-elite -- ss -tuln
```

### 로그 레벨 조정

```bash
# 디버그 모드 활성화
kubectl set env deployment/hooklabs-elite LOG_LEVEL=debug -n hooklabs-elite

# 구조화된 로깅 활성화
kubectl set env deployment/hooklabs-elite STRUCTURED_LOGGING=true -n hooklabs-elite
```

## 📝 배포 체크리스트

### 배포 전 확인사항

- [ ] 모든 테스트 통과 (단위, 통합, E2E)
- [ ] 환경 변수 설정 완료
- [ ] 시크릿 생성 및 확인
- [ ] 도메인 및 SSL 인증서 설정
- [ ] 데이터베이스 마이그레이션 확인
- [ ] 백업 생성
- [ ] 모니터링 대시보드 준비
- [ ] 알림 채널 설정
- [ ] 롤백 계획 수립

### 배포 후 확인사항

- [ ] 헬스체크 엔드포인트 응답
- [ ] 모든 Pod 정상 실행
- [ ] 서비스 가용성 확인
- [ ] 소셜 미디어 API 연결 테스트
- [ ] 실시간 기능 동작 확인
- [ ] AI 생성 기능 테스트
- [ ] 메트릭 수집 확인
- [ ] 알림 시스템 동작 확인
- [ ] 성능 지표 정상 범위
- [ ] 로그 수집 정상 동작

## 🆘 긴급 연락처 및 절차

### 비상 연락처
- **DevOps 팀**: devops@hooklabs-elite.com
- **백엔드 팀**: backend@hooklabs-elite.com
- **인프라 팀**: infra@hooklabs-elite.com

### 긴급 상황 대응
1. **즉시 롤백**: `./scripts/rollback.sh --force`
2. **서비스 스케일 다운**: `kubectl scale deployment hooklabs-elite --replicas=0 -n hooklabs-elite`
3. **트래픽 차단**: Ingress 또는 LoadBalancer 설정 수정
4. **알림 발송**: Slack, PagerDuty 등을 통한 팀 알림

---

## 📄 관련 문서

- [소셜 미디어 API 연동 가이드](./SOCIAL_MEDIA_APIS.md)
- [모니터링 설정 가이드](./MONITORING.md)
- [보안 가이드](./SECURITY.md)
- [성능 튜닝 가이드](./PERFORMANCE.md)

---

**마지막 업데이트**: 2024년 9월 14일  
**버전**: v1.0.0  
**담당자**: DevOps Team