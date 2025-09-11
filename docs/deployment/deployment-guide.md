# 🚀 프로덕션 배포 가이드

## 개요

이 가이드는 HookLabs Elite 소셜 미디어 자동화 플랫폼을 프로덕션 환경에 배포하는 방법을 설명합니다.

## 📋 사전 요구사항

### 필수 서비스 계정

1. **Vercel** (호스팅)
   - 계정 생성: https://vercel.com
   - GitHub 연동 필수

2. **Convex** (데이터베이스)
   - 계정 생성: https://convex.dev
   - 새 프로젝트 생성

3. **Clerk** (인증)
   - 계정 생성: https://clerk.dev
   - 애플리케이션 생성

4. **Lemon Squeezy** (결제)
   - 계정 생성: https://lemonsqueezy.com
   - 스토어 설정

5. **Upstash Redis** (캐싱)
   - 계정 생성: https://upstash.com
   - Redis 인스턴스 생성

### API 키 및 서비스

6. **Google AI (Gemini)** (AI 생성)
   - Google AI Studio: https://aistudio.google.com
   - API 키 생성

7. **Twitter API** (소셜 연동)
   - 개발자 계정: https://developer.twitter.com
   - v2 API 액세스

8. **Meta for Developers** (Threads)
   - 개발자 계정: https://developers.facebook.com
   - Threads API 액세스

9. **Sentry** (에러 추적)
   - 계정 생성: https://sentry.io
   - 프로젝트 생성

## 🔧 1단계: 환경 변수 설정

### Vercel 환경 변수 설정

1. Vercel 대시보드에서 프로젝트 선택
2. Settings → Environment Variables 이동
3. 다음 변수들을 설정:

#### 기본 설정
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_VERSION=1.0.0
```

#### Convex 설정
```bash
CONVEX_DEPLOYMENT=your-production-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

#### Clerk 인증
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key
CLERK_SECRET_KEY=sk_live_your_key
NEXT_PUBLIC_CLERK_FRONTEND_API_URL=https://your-app.clerk.accounts.dev
```

#### Lemon Squeezy 결제
```bash
LEMONSQUEEZY_API_KEY=lsqls_your_api_key
LEMONSQUEEZY_STORE_ID=your_store_id
```

#### Redis 캐싱
```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

#### AI 서비스
```bash
GOOGLE_AI_API_KEY=your_gemini_api_key
GOOGLE_AI_MODEL=gemini-1.5-pro
OPENAI_API_KEY=sk-your_openai_key (선택사항)
```

#### 소셜 미디어 API
```bash
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_BEARER_TOKEN=your_bearer_token
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
```

#### 보안 및 모니터링
```bash
SOCIAL_TOKEN_ENCRYPTION_KEY=your_32_character_random_key
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
SENTRY_AUTH_TOKEN=your_auth_token
```

### Convex 환경 변수 (Convex 대시보드에서 설정)

```bash
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
TWITTER_WEBHOOK_SECRET=your_twitter_webhook_secret
THREADS_WEBHOOK_SECRET=your_threads_webhook_secret
```

## 🛠️ 2단계: Convex 설정

### 1. Convex 프로젝트 연결

```bash
npx convex login
npx convex init --url https://your-deployment.convex.cloud
```

### 2. 스키마 배포

```bash
npx convex deploy
```

### 3. 웹훅 설정

Convex 대시보드에서 다음 HTTP 액션 등록:

- **Clerk Webhooks**: `/convex/clerk-users-webhook`
- **Lemon Squeezy Webhooks**: `/convex/lemonsqueezy-webhook`

## 🔐 3단계: Clerk 설정

### 1. JWT 템플릿 생성

1. Clerk 대시보드 → JWT Templates
2. 새 템플릿 생성, 이름: "convex"
3. Claims 추가:
```json
{
  "iss": "https://your-app.clerk.accounts.dev",
  "sub": "{{user.id}}",
  "name": "{{user.first_name}} {{user.last_name}}",
  "email": "{{user.primary_email_address}}"
}
```

### 2. 웹훅 설정

1. Webhooks 섹션에서 새 웹훅 생성
2. Endpoint URL: `https://your-app.vercel.app/convex/clerk-users-webhook`
3. Events:
   - user.created
   - user.updated  
   - user.deleted

### 3. 도메인 설정

1. Domains에서 프로덕션 도메인 추가
2. Sign-in/Sign-up URLs 설정

## 💳 4단계: Lemon Squeezy 설정

### 1. 제품 및 변형 생성

1. Products에서 구독 플랜 생성
2. 각 플랜의 Variant ID 기록

### 2. 웹훅 설정

1. Settings → Webhooks
2. 새 웹훅 생성: `https://your-app.vercel.app/convex/lemonsqueezy-webhook`
3. 이벤트 선택:
   - Subscription created/updated/cancelled
   - Order created/refunded
   - License key events

## 📊 5단계: 모니터링 설정

### Sentry 설정

1. Sentry 프로젝트 생성
2. DSN 및 Auth Token 복사
3. Vercel에서 환경 변수 설정

### Uptime 모니터링

```bash
# Health check 엔드포인트 설정
curl https://your-app.vercel.app/api/health
```

추천 서비스:
- UptimeRobot
- Pingdom
- StatusCake

## 🚀 6단계: GitHub Actions CI/CD 설정

### 1. GitHub Secrets 설정

Repository → Settings → Secrets and variables → Actions

```bash
# Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# Convex
CONVEX_DEPLOYMENT=your_deployment
CONVEX_DEPLOY_KEY=your_deploy_key

# 기타
SENTRY_AUTH_TOKEN=your_auth_token
SLACK_WEBHOOK_URL=your_slack_webhook (선택사항)
```

### 2. 브랜치 보호 규칙

1. Settings → Branches
2. main 브랜치 보호 규칙 추가:
   - Require status checks
   - Require up-to-date branches
   - Require review

## 🔧 7단계: 도메인 및 SSL 설정

### 1. 커스텀 도메인

1. Vercel 프로젝트 → Domains
2. 커스텀 도메인 추가
3. DNS 설정 (A/CNAME 레코드)

### 2. SSL 인증서

- Vercel이 자동으로 Let's Encrypt 인증서 발급
- HSTS 헤더 자동 적용 (next.config.ts에서 설정)

## 🧪 8단계: 배포 후 테스트

### 1. Health Check 확인

```bash
curl -I https://your-app.vercel.app/api/health
# HTTP/1.1 200 OK
# X-Health-Status: healthy
```

### 2. 기능별 테스트

1. **인증 테스트**
   - 회원가입/로그인 프로세스
   - JWT 토큰 발급 확인

2. **결제 테스트**
   - 구독 결제 플로우
   - 웹훅 이벤트 수신 확인

3. **AI 기능 테스트**
   - 콘텐츠 생성 API
   - 크레딧 소비 확인

4. **소셜 연동 테스트**
   - OAuth 인증
   - 게시물 발행

### 3. 성능 테스트

```bash
# Lighthouse 점수 확인
npx lighthouse https://your-app.vercel.app --output html

# 로드 테스트
npx artillery quick --count 10 --num 5 https://your-app.vercel.app
```

## 📈 9단계: 모니터링 및 알림

### 1. 대시보드 설정

- Vercel Analytics 활성화
- Sentry Performance Monitoring
- Custom 메트릭 대시보드

### 2. 알림 설정

1. **Sentry 알림**
   - 에러 발생시 즉시 알림
   - 성능 이슈 임계값 설정

2. **Uptime 알림**
   - Health check 실패시 알림
   - 응답 시간 임계값 설정

3. **Slack 통합**
   - 배포 성공/실패 알림
   - 중요 이벤트 알림

## 🔄 10단계: 백업 및 재해복구

### 1. 데이터 백업

- Convex: 자동 백업 (7일 보관)
- 중요 설정 파일들을 별도 저장소에 보관

### 2. 재해복구 계획

1. **데이터베이스 복구**
   ```bash
   npx convex import backup-YYYY-MM-DD.json
   ```

2. **환경 변수 복구**
   - 백업된 `.env` 템플릿 사용
   - 비밀 키들 재발급

3. **DNS 장애 대응**
   - 백업 도메인 준비
   - CDN failover 설정

## 🎯 성능 최적화 체크리스트

### 1. 빌드 최적화

- [ ] Bundle analyzer로 번들 크기 확인
- [ ] 불필요한 dependencies 제거
- [ ] Code splitting 적용
- [ ] Dynamic imports 활용

### 2. 런타임 최적화

- [ ] 이미지 최적화 (WebP/AVIF)
- [ ] 캐싱 전략 구현
- [ ] Database query 최적화
- [ ] API response 압축

### 3. 보안 체크

- [ ] CSP 헤더 설정
- [ ] Rate limiting 구현
- [ ] 입력 검증 및 sanitization
- [ ] HTTPS 강제 적용

## 🚨 트러블슈팅 가이드

### 일반적인 문제들

1. **빌드 실패**
   ```bash
   # 의존성 문제
   rm -rf node_modules package-lock.json
   npm install
   
   # 타입 에러
   npm run type-check
   ```

2. **웹훅 실패**
   - Webhook 서명 검증 확인
   - 엔드포인트 URL 확인
   - 로그에서 에러 메시지 확인

3. **인증 문제**
   - JWT 템플릿 설정 확인
   - Clerk 도메인 설정 확인
   - 환경 변수 값 재확인

4. **API 연결 실패**
   - API 키 유효성 확인
   - 네트워크 연결 확인
   - Rate limit 상태 확인

## 📞 지원 및 문의

### 공식 문서

- Next.js: https://nextjs.org/docs
- Convex: https://docs.convex.dev
- Clerk: https://clerk.dev/docs
- Lemon Squeezy: https://docs.lemonsqueezy.com

### 커뮤니티

- GitHub Issues: 버그 리포트 및 기능 요청
- Discord: 실시간 지원 (링크 제공시)

### 긴급 상황 대응

1. Health check 모니터링
2. Error tracking (Sentry)
3. 로그 분석 (Vercel Functions)
4. 롤백 절차 실행

---

## 📝 배포 후 체크리스트

- [ ] 모든 환경 변수 설정 완료
- [ ] Health check 통과
- [ ] 인증 시스템 정상 작동
- [ ] 결제 시스템 테스트 완료
- [ ] AI 기능 테스트 완료
- [ ] 소셜 연동 테스트 완료
- [ ] 모니터링 시스템 활성화
- [ ] 백업 시스템 구성
- [ ] 성능 최적화 적용
- [ ] 보안 설정 완료
- [ ] 문서화 업데이트

**축하합니다! 🎉 HookLabs Elite이 성공적으로 배포되었습니다.**