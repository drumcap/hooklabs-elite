# 🚀 HookLabs Elite 배포 가이드

이 가이드는 HookLabs Elite 애플리케이션을 프로덕션 환경에 배포하는 방법을 설명합니다.

## 📋 목차

- [배포 아키텍처](#배포-아키텍처)
- [환경 준비](#환경-준비)
- [배포 방법](#배포-방법)
- [모니터링 설정](#모니터링-설정)
- [트러블슈팅](#트러블슈팅)
- [운영 가이드](#운영-가이드)

## 🏗️ 배포 아키텍처

### 전체 구조

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel CDN    │    │  GitHub Actions │    │   Monitoring    │
│   (Frontend)    │    │     (CI/CD)     │    │   (Sentry)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │◄──►│  Convex Backend │    │  Redis Cache    │
│   (Vercel)      │    │   (Serverless)  │    │   (Upstash)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      Clerk      │    │ Lemon Squeezy   │    │   Analytics     │
│ (Authentication)│    │   (Payments)    │    │ (GA, Mixpanel)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 주요 컴포넌트

- **Frontend**: Vercel에서 호스팅되는 Next.js 애플리케이션
- **Backend**: Convex 서버리스 함수
- **Authentication**: Clerk 인증 서비스
- **Payments**: Lemon Squeezy 결제 시스템
- **Caching**: Upstash Redis (Rate Limiting 및 캐싱)
- **Monitoring**: Sentry 에러 추적, Vercel Analytics
- **CI/CD**: GitHub Actions 자동 배포

## 🔧 환경 준비

### 1. 필수 계정 및 서비스

다음 서비스들의 계정이 필요합니다:

- ✅ [Vercel](https://vercel.com) - 프론트엔드 호스팅
- ✅ [Convex](https://convex.dev) - 백엔드 서버리스 플랫폼  
- ✅ [Clerk](https://clerk.dev) - 사용자 인증
- ✅ [Lemon Squeezy](https://lemonsqueezy.com) - 결제 처리
- ✅ [Sentry](https://sentry.io) - 에러 추적
- ✅ [Upstash](https://upstash.com) - Redis 캐싱 (선택사항)

### 2. 환경 변수 설정

각 환경별로 다음 변수들을 설정해야 합니다:

#### Vercel 환경 변수

```bash
# 기본 설정
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_VERSION=1.0.0

# Convex 설정
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk 설정
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://...

# Lemon Squeezy 설정
LEMONSQUEEZY_API_KEY=lsqls_...
LEMONSQUEEZY_STORE_ID=12345

# 모니터링 설정
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=...

# Redis 설정 (선택사항)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

#### Convex 환경 변수 (Dashboard에서 설정)

```bash
# 웹훅 시크릿
CLERK_WEBHOOK_SECRET=whsec_...
LEMONSQUEEZY_WEBHOOK_SECRET=...

# API 키들
LEMONSQUEEZY_API_KEY=lsqls_...
LEMONSQUEEZY_STORE_ID=12345
```

#### GitHub Secrets

```bash
# Vercel 배포
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...

# Convex 배포
CONVEX_DEPLOY_KEY=...

# 프로덕션 환경 변수
PRODUCTION_CLERK_PUBLISHABLE_KEY=pk_live_...
PRODUCTION_LEMONSQUEEZY_API_KEY=lsqls_...
PRODUCTION_LEMONSQUEEZY_STORE_ID=12345

# 모니터링
SENTRY_AUTH_TOKEN=...
LHCI_GITHUB_APP_TOKEN=... # Lighthouse CI

# 알림 (선택사항)
SLACK_WEBHOOK_URL=...
DISCORD_WEBHOOK=...
```

### 3. 도메인 및 DNS 설정

1. **도메인 구입** 및 DNS 설정
2. **Vercel에서 도메인 연결**
3. **SSL 인증서 자동 설정** (Vercel에서 자동)
4. **CDN 설정 확인**

## 🚀 배포 방법

### 방법 1: 자동 배포 (권장)

1. **GitHub Repository 설정**
   ```bash
   git push origin main
   ```

2. **GitHub Actions 워크플로우가 자동 실행**
   - 코드 품질 검사 (Lint, TypeScript)
   - 테스트 실행 (Unit, Integration, E2E)
   - 보안 스캔
   - Convex 배포
   - Vercel 배포
   - 배포 후 테스트

3. **배포 완료 알림**
   - Slack/Discord 알림
   - 배포 URL 확인

### 방법 2: 수동 배포

#### Convex 배포

```bash
# 프로덕션 환경으로 배포
npx convex deploy --prod

# 환경 변수 설정
npx convex env set CLERK_WEBHOOK_SECRET "whsec_..."
npx convex env set LEMONSQUEEZY_WEBHOOK_SECRET "..."
```

#### Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 프로젝트 연결
vercel link

# 프로덕션 배포
vercel --prod
```

### 방법 3: Docker 배포

#### 로컬 테스트

```bash
# Docker 이미지 빌드
npm run docker:build

# 컨테이너 실행
npm run docker:run

# 또는 Docker Compose 사용
npm run docker:prod
```

#### 프로덕션 배포 (Container Registry)

```bash
# GitHub Container Registry에 푸시
docker build -t ghcr.io/yourorg/hooklabs-elite:latest .
docker push ghcr.io/yourorg/hooklabs-elite:latest

# 프로덕션 서버에서 실행
docker pull ghcr.io/yourorg/hooklabs-elite:latest
docker run -d -p 3000:3000 --env-file .env.production ghcr.io/yourorg/hooklabs-elite:latest
```

## 📊 모니터링 설정

### 1. Sentry 에러 추적

```typescript
// lib/monitoring/sentry.ts에서 자동 초기화
// 추가 설정은 필요 없음
```

### 2. Vercel Analytics

Vercel 대시보드에서 자동으로 활성화됩니다.

### 3. 커스텀 메트릭

```typescript
import analytics from '@/lib/monitoring/analytics'

// 사용자 행동 추적
analytics.track('Button Clicked', { button: 'subscribe' })

// 성능 메트릭
analytics.trackPerformance('Page Load', 1234)
```

### 4. Health Check 설정

```bash
# 헬스체크 URL
curl https://yourdomain.com/api/health

# 헬스체크 모니터링 (Uptime Robot, Pingdom 등)
# URL: https://yourdomain.com/api/health
# Method: GET
# Expected: HTTP 200, {"status": "healthy"}
```

## 🔍 트러블슈팅

### 일반적인 문제들

#### 1. 빌드 실패

```bash
# 타입 에러 확인
npm run type-check

# 린트 에러 수정
npm run lint:fix

# 의존성 문제 해결
rm -rf node_modules package-lock.json
npm install
```

#### 2. 환경 변수 문제

```bash
# 환경 변수 확인 (개발 환경)
node -e "console.log(process.env)"

# Vercel 환경 변수 확인
vercel env ls

# Convex 환경 변수 확인
npx convex env list
```

#### 3. 인증 문제

- **Clerk JWT 템플릿** 확인 ("convex"라는 이름으로 생성됨)
- **웹훅 URL** 확인 (`/api/webhooks/clerk`)
- **도메인 허용 목록** 확인

#### 4. 결제 문제

- **Lemon Squeezy 웹훅** 설정 확인
- **Store ID와 API Key** 일치 확인
- **테스트/라이브 모드** 확인

#### 5. 성능 문제

```bash
# 번들 크기 분석
npm run build:analyze

# Lighthouse 성능 측정
npm run lighthouse

# 메모리 사용량 확인
node --inspect server.js
```

### 로그 확인 방법

#### Vercel 함수 로그

```bash
# Vercel CLI로 로그 확인
vercel logs

# 실시간 로그
vercel logs --follow
```

#### Convex 로그

Convex 대시보드의 "Functions" 탭에서 확인

#### Sentry 에러 로그

Sentry 대시보드에서 실시간 에러 확인

## 🛠️ 운영 가이드

### 일일 운영 체크리스트

- [ ] **Health Check** 상태 확인 (`/api/health`)
- [ ] **Sentry** 새로운 에러 확인
- [ ] **Vercel Analytics** 트래픽 모니터링
- [ ] **응답 시간** 및 **가용성** 확인
- [ ] **보안 알림** 확인

### 주간 운영 체크리스트

- [ ] **의존성 보안 업데이트** (`npm audit`)
- [ ] **성능 메트릭 리뷰** (Core Web Vitals)
- [ ] **비용 모니터링** (Vercel, Convex, Clerk 사용량)
- [ ] **백업 상태 확인**
- [ ] **SSL 인증서 만료일** 확인

### 월간 운영 체크리스트

- [ ] **의존성 업데이트** (`npm run deps:update`)
- [ ] **보안 스캔 리포트** 리뷰
- [ ] **성능 최적화** 검토
- [ ] **사용자 피드백** 분석
- [ ] **로그 정리** 및 아카이브

### 비상 대응 절차

#### 1. 서비스 장애 시

1. **상황 파악**
   - Health Check 상태 확인
   - Sentry 에러 로그 확인
   - Vercel 상태 페이지 확인

2. **즉시 대응**
   - 이전 버전으로 롤백
   - 사용자 공지
   - 개발팀 알림

3. **장기 대응**
   - 원인 분석
   - 수정사항 개발
   - 테스트 후 재배포

#### 2. 보안 사고 시

1. **즉시 조치**
   - 의심스러운 트래픽 차단
   - API 키 재발급
   - 관련 로그 수집

2. **사후 조치**
   - 보안 패치 적용
   - 사용자 비밀번호 재설정 권고
   - 보안 정책 업데이트

### 백업 및 복구

#### 데이터 백업

- **Convex 데이터**: 자동 백업됨 (Point-in-time recovery 지원)
- **환경 변수**: 별도 문서로 관리
- **소스 코드**: Git repository

#### 재해 복구 계획

1. **새로운 Vercel 프로젝트** 생성
2. **환경 변수 재설정**
3. **Convex 데이터베이스** 복구
4. **DNS 설정** 업데이트
5. **SSL 인증서** 재발급

### 성능 최적화

#### 정기 최적화 작업

```bash
# 번들 크기 최적화
npm run build:analyze

# 이미지 최적화 확인
# Next.js Image 컴포넌트 사용 확인

# 데이터베이스 쿼리 최적화
# Convex 함수 실행 시간 모니터링

# CDN 캐시 설정 확인
# Vercel Edge Functions 활용 검토
```

#### 모니터링 메트릭

- **Core Web Vitals**: LCP, FID, CLS
- **응답 시간**: API 응답 시간 < 200ms 목표
- **에러율**: < 1% 목표
- **가용성**: > 99.9% 목표

---

## 🆘 지원 및 문의

문제 발생 시 다음 순서로 해결을 시도하세요:

1. **이 문서 확인**
2. **GitHub Issues 검색**
3. **개발팀 Slack 채널 문의**
4. **새로운 Issue 생성**

**긴급 상황 시**: 개발팀 리더에게 직접 연락

---

**배포 성공을 축하합니다! 🎉**

정기적으로 이 문서를 업데이트하여 최신 상태를 유지하세요.