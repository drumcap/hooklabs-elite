# 🔧 환경 설정 상세 가이드

이 문서는 HookLabs Elite의 각 환경별 상세 설정 방법을 설명합니다.

## 📚 목차

- [개발 환경 (Development)](#개발-환경-development)
- [스테이징 환경 (Staging)](#스테이징-환경-staging)
- [프로덕션 환경 (Production)](#프로덕션-환경-production)
- [환경 변수 관리](#환경-변수-관리)
- [서비스별 설정](#서비스별-설정)

## 🛠️ 개발 환경 (Development)

### 로컬 개발 설정

#### 1. 저장소 클론

```bash
git clone https://github.com/yourorg/hooklabs-elite.git
cd hooklabs-elite
```

#### 2. 의존성 설치

```bash
npm install
```

#### 3. 환경 변수 설정

`.env.local` 파일 생성:

```bash
cp .env.example .env.local
```

필수 개발 환경 변수:

```bash
# 개발 환경 식별
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Convex 개발 환경
NEXT_PUBLIC_CONVEX_URL=https://your-dev-deployment.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment-name

# Clerk 개발 키
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-dev-clerk.clerk.accounts.dev

# Lemon Squeezy 테스트 키
LEMONSQUEEZY_API_KEY=lsqls_test_...
LEMONSQUEEZY_STORE_ID=12345

# 개발 도구 (선택사항)
DEBUG_MODE=true
NEXT_PUBLIC_LOG_LEVEL=debug
NEXT_TELEMETRY_DISABLED=1
```

#### 4. Convex 설정

```bash
# Convex 초기화 (처음 한 번만)
npx convex dev

# 스키마 배포
npx convex deploy --cmd-url-env-var-name=NEXT_PUBLIC_CONVEX_URL

# 환경 변수 설정 (Convex Dashboard)
npx convex env set CLERK_WEBHOOK_SECRET "whsec_test_..."
npx convex env set LEMONSQUEEZY_WEBHOOK_SECRET "test_webhook_secret"
```

#### 5. 개발 서버 실행

```bash
# Convex 개발 서버 (터미널 1)
npx convex dev

# Next.js 개발 서버 (터미널 2)
npm run dev
```

### 개발 환경 특징

- **Hot Reload**: 코드 변경 시 자동 새로고침
- **상세한 로깅**: 모든 레벨의 로그 출력
- **개발 도구**: React DevTools, Redux DevTools 활성화
- **소스맵**: 디버깅을 위한 완전한 소스맵
- **Rate Limiting**: 완화된 제한 (1000 req/15min)

## 🧪 스테이징 환경 (Staging)

스테이징 환경은 프로덕션과 동일한 설정으로 테스트를 수행합니다.

### Vercel 스테이징 설정

#### 1. 별도 Vercel 프로젝트 생성

```bash
# Vercel CLI 설치
npm install -g vercel

# 스테이징 프로젝트 생성
vercel --name hooklabs-elite-staging
```

#### 2. 스테이징 환경 변수

```bash
# Vercel 대시보드에서 설정
NEXT_PUBLIC_APP_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging-hooklabs-elite.vercel.app

# Convex 스테이징 환경
NEXT_PUBLIC_CONVEX_URL=https://staging-deployment.convex.cloud

# Clerk 스테이징 환경
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_staging_...
CLERK_SECRET_KEY=sk_test_staging_...

# Lemon Squeezy 스테이징
LEMONSQUEEZY_API_KEY=lsqls_test_staging_...
LEMONSQUEEZY_STORE_ID=23456

# 모니터링 (선택적)
NEXT_PUBLIC_SENTRY_DSN=https://staging-sentry-dsn...
```

#### 3. 자동 배포 설정

`.github/workflows/deploy-staging.yml`:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_STAGING_PROJECT_ID }}
          working-directory: ./
```

### 스테이징 환경 특징

- **프로덕션 유사**: 프로덕션과 동일한 설정
- **테스트 데이터**: 실제 사용자와 분리된 테스트 데이터
- **모니터링**: Sentry, Analytics 활성화
- **Rate Limiting**: 중간 수준 제한 (500 req/15min)
- **SSL**: 자동 HTTPS 인증서

## 🚀 프로덕션 환경 (Production)

### Vercel 프로덕션 설정

#### 1. 커스텀 도메인 연결

```bash
# Vercel 대시보드에서 도메인 추가
# Domain: hooklabs-elite.com
# DNS 설정: A 레코드 또는 CNAME
```

#### 2. 프로덕션 환경 변수

**필수 변수**:

```bash
# 환경 식별
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://hooklabs-elite.com

# Convex 프로덕션
NEXT_PUBLIC_CONVEX_URL=https://prod-deployment.convex.cloud

# Clerk 프로덕션 키
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://prod-clerk.clerk.accounts.dev

# Lemon Squeezy 라이브 키
LEMONSQUEEZY_API_KEY=lsqls_live_...
LEMONSQUEEZY_STORE_ID=34567

# 모니터링 (필수)
NEXT_PUBLIC_SENTRY_DSN=https://prod-sentry-dsn...
SENTRY_ORG=your-org
SENTRY_PROJECT=hooklabs-elite
SENTRY_AUTH_TOKEN=sntrys_...

# 성능 및 보안
UPSTASH_REDIS_REST_URL=https://prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=...
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 프로덕션 환경 특징

- **성능 최적화**: 최대 압축, 캐싱 활성화
- **보안 강화**: CSP, HSTS, Rate Limiting
- **모니터링**: 실시간 에러 추적, 성능 모니터링
- **로깅**: 구조화된 JSON 로그
- **Rate Limiting**: 엄격한 제한 (100 req/15min)

## 🔐 환경 변수 관리

### 보안 원칙

1. **민감한 정보는 절대 Git에 포함하지 않기**
2. **환경별로 다른 키 사용하기**
3. **정기적인 키 로테이션**
4. **최소 권한 원칙 적용**

### 환경 변수 우선순위

```
1. 시스템 환경 변수
2. .env.local (Git에서 제외)
3. .env.production, .env.staging, .env.development
4. .env
5. .env.example (템플릿용)
```

### 환경 변수 검증

`config/environments.ts`에서 자동 검증:

```typescript
export function validateEnvironmentVariables() {
  const requiredVars = [
    'NEXT_PUBLIC_CONVEX_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'LEMONSQUEEZY_API_KEY',
    'LEMONSQUEEZY_STORE_ID',
  ]
  
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }
}
```

## ⚙️ 서비스별 설정

### Convex 설정

#### 개발 환경

```bash
# 개발 배포
npx convex dev

# 실시간 함수 업데이트
# 파일 저장 시 자동 재배포
```

#### 프로덕션 환경

```bash
# 프로덕션 배포
npx convex deploy --prod

# 환경 변수 설정 (프로덕션)
npx convex env set --prod CLERK_WEBHOOK_SECRET "whsec_live_..."
npx convex env set --prod LEMONSQUEEZY_WEBHOOK_SECRET "live_webhook_secret"
```

### Clerk 설정

#### 개발 환경

1. **Clerk Dashboard**에서 새 애플리케이션 생성
2. **JWT Templates**에서 "convex" 템플릿 생성
3. **Webhooks** 설정:
   - URL: `http://localhost:3000/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`

#### 프로덕션 환경

1. **Production Instance** 생성 또는 기존 앱을 Production으로 승격
2. **도메인 설정**:
   - Authorized domains: `hooklabs-elite.com`
   - Redirect URLs: `https://hooklabs-elite.com/dashboard`
3. **Webhooks** 업데이트:
   - URL: `https://hooklabs-elite.com/api/webhooks/clerk`

### Lemon Squeezy 설정

#### 개발 환경

1. **Test Mode** 활성화
2. **Test Store** 생성
3. **Webhooks** 설정:
   - URL: `http://localhost:3000/api/webhooks/lemonsqueezy`
   - Events: 모든 subscription 및 payment 이벤트

#### 프로덕션 환경

1. **Live Mode**로 전환
2. **Production Store** 설정
3. **Webhooks** 업데이트:
   - URL: `https://hooklabs-elite.com/api/webhooks/lemonsqueezy`
   - Secret: 안전한 시크릿으로 업데이트

### Sentry 설정

#### 프로젝트 생성

```bash
# Sentry CLI 설치
npm install -g @sentry/cli

# Sentry 로그인
sentry-cli login

# 프로젝트 생성
sentry-cli projects create hooklabs-elite
```

#### 환경별 설정

- **Development**: 선택적 활성화
- **Staging**: 활성화 (별도 environment)
- **Production**: 활성화 (프로덕션 environment)

### Redis (Upstash) 설정

#### 개발 환경

```bash
# 로컬 Redis 사용 (Docker)
docker run -d -p 6379:6379 redis:alpine
```

#### 프로덕션 환경

1. **Upstash Console**에서 데이터베이스 생성
2. **Global** 또는 **Regional** 선택
3. **REST API** 자격 증명 복사
4. **환경 변수** 설정

---

## 🔄 환경 전환 체크리스트

### 개발 → 스테이징

- [ ] 스테이징 환경 변수 설정 완료
- [ ] Convex 스테이징 배포 완료
- [ ] 테스트 데이터 준비 완료
- [ ] 웹훅 URL 업데이트 완료
- [ ] 모니터링 설정 완료

### 스테이징 → 프로덕션

- [ ] 프로덕션 환경 변수 설정 완료
- [ ] 도메인 및 SSL 설정 완료
- [ ] Clerk 프로덕션 인스턴스 설정 완료
- [ ] Lemon Squeezy 라이브 모드 설정 완료
- [ ] Sentry 프로덕션 환경 설정 완료
- [ ] 모니터링 및 알림 설정 완료
- [ ] 백업 및 복구 계획 수립 완료
- [ ] 성능 테스트 완료
- [ ] 보안 스캔 완료

---

환경 설정에 문제가 있으시면 [배포 가이드](./README.md)의 트러블슈팅 섹션을 확인하세요.