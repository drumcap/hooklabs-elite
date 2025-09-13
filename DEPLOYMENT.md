# 🚀 소셜 미디어 자동화 플랫폼 배포 가이드

## 📋 목차

1. [프로덕션 배포 준비](#프로덕션-배포-준비)
2. [환경별 배포 전략](#환경별-배포-전략)
3. [CI/CD 파이프라인](#cicd-파이프라인)
4. [Docker 컨테이너 배포](#docker-컨테이너-배포)
5. [모니터링 및 로깅](#모니터링-및-로깅)
6. [롤백 전략](#롤백-전략)
7. [성능 최적화](#성능-최적화)
8. [보안 설정](#보안-설정)
9. [트러블슈팅](#트러블슈팅)

---

## 🏗️ 프로덕션 배포 준비

### 1. 사전 요구사항

#### 필수 서비스 계정
- [Vercel](https://vercel.com) - 프론트엔드 호스팅
- [Convex](https://convex.dev) - 백엔드 데이터베이스
- [Clerk](https://clerk.dev) - 사용자 인증
- [Lemon Squeezy](https://lemonsqueezy.com) - 결제 시스템
- [Google AI Studio](https://aistudio.google.com) - AI 서비스
- [Twitter Developer](https://developer.twitter.com) - 소셜 미디어 API

#### 개발 도구
```bash
# Bun 설치 (패키지 매니저)
curl -fsSL https://bun.sh/install | bash

# Convex CLI 설치
bun install -g convex

# Vercel CLI 설치 (선택사항)
bun install -g vercel
```

### 2. 환경 변수 설정

#### Convex 환경 변수 (dashboard.convex.dev에서 설정)
```bash
# 인증 웹훅
CLERK_WEBHOOK_SECRET=whsec_your_clerk_webhook_secret
LEMONSQUEEZY_WEBHOOK_SECRET=your_lemonsqueezy_webhook_secret

# 소셜 미디어 토큰 암호화
SOCIAL_TOKEN_ENCRYPTION_KEY=your-32-character-encryption-key

# 외부 API 키
GOOGLE_AI_API_KEY=your_google_ai_api_key
TWITTER_CLIENT_SECRET=your_twitter_client_secret
META_APP_SECRET=your_meta_app_secret
```

#### Vercel 환경 변수 (vercel.com dashboard에서 설정)
```bash
# Convex 연결
CONVEX_DEPLOYMENT=prod:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk 인증
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_key
CLERK_SECRET_KEY=sk_live_your_clerk_secret

# Lemon Squeezy 결제
LEMONSQUEEZY_API_KEY=your_lemonsqueezy_api_key
LEMONSQUEEZY_STORE_ID=your_store_id

# 소셜 미디어 API
TWITTER_CLIENT_ID=your_twitter_client_id
META_APP_ID=your_meta_app_id

# 모니터링
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_MIXPANEL_PROJECT_TOKEN=your_mixpanel_token
```

---

## 🌟 환경별 배포 전략

### Development (개발환경)
```bash
# 1. 의존성 설치
bun install

# 2. 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 편집

# 3. Convex 개발 서버 시작
bunx convex dev

# 4. Next.js 개발 서버 시작
bun dev
```

### Staging (스테이징환경)
```bash
# 1. 스테이징 브랜치로 푸시
git push origin develop

# 2. GitHub Actions가 자동으로:
#    - 테스트 실행
#    - 빌드 검증
#    - 스테이징 환경에 배포
```

### Production (프로덕션환경)
```bash
# 1. 메인 브랜치로 푸시 또는 PR 머지
git push origin main

# 2. GitHub Actions가 자동으로:
#    - 전체 테스트 스위트 실행
#    - 보안 스캔
#    - 성능 테스트
#    - 프로덕션 배포
#    - 헬스 체크
```

---

## ⚙️ CI/CD 파이프라인

### GitHub Actions 워크플로우

#### 1. 코드 품질 검사
- TypeScript 타입 체크
- ESLint 코드 품질 검사
- Prettier 포맷 검사
- 보안 취약점 스캔

#### 2. 테스트 실행
- 유닛 테스트 (Convex 함수)
- 통합 테스트 (API 엔드포인트)
- 컴포넌트 테스트 (React)
- 소셜 미디어 기능 테스트
- E2E 테스트 (Playwright)

#### 3. 빌드 및 배포
- Next.js 프로덕션 빌드
- Convex 함수 배포
- Vercel 배포
- 배포 후 헬스 체크

### 배포 트리거
```yaml
# 자동 배포 트리거
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

# 수동 배포 트리거
workflow_dispatch:
```

---

## 🐳 Docker 컨테이너 배포

### 로컬 Docker 개발환경

```bash
# 개발환경 컨테이너 시작
docker-compose -f docker-compose.dev.yml up --build

# 특정 서비스만 시작
docker-compose -f docker-compose.dev.yml up app-dev redis-dev

# 백그라운드 실행
docker-compose -f docker-compose.dev.yml up -d
```

### 프로덕션 Docker 환경

```bash
# 프로덕션 컨테이너 빌드 및 시작
docker-compose up --build -d

# 로그 확인
docker-compose logs -f app

# 헬스 체크
curl -f http://localhost:3000/api/health
```

### Docker 이미지 관리

```bash
# 이미지 빌드
docker build -t hooklabs-elite:latest .

# 이미지 푸시 (Docker Hub)
docker tag hooklabs-elite:latest username/hooklabs-elite:latest
docker push username/hooklabs-elite:latest

# 이미지 정리
docker system prune -f
```

---

## 📊 모니터링 및 로깅

### Grafana 대시보드 접속
- URL: http://localhost:3001 (개발) / https://grafana.yourdomain.com (프로덕션)
- 기본 계정: admin / admin123

### 주요 모니터링 메트릭

#### 애플리케이션 메트릭
- 응답 시간 (Response Time)
- 처리량 (Throughput)
- 에러율 (Error Rate)
- 메모리 사용량

#### 소셜 미디어 기능 메트릭
- AI 콘텐츠 생성 성공률
- 토큰 만료 알림
- 게시물 변형 A/B 테스트 결과
- 소셜 계정 연동 상태

#### 비즈니스 메트릭
- 사용자 활성도
- 크레딧 사용량
- 구독 전환율
- 수익 메트릭

### 로그 수집 및 분석

#### Loki를 통한 로그 수집
```bash
# 로그 조회 (Grafana Explore)
{job="hooklabs-elite-app"} |= "error"
{module="socialAccounts"} |= "token_expired"
{level="error"} | json | action="ai_generation"
```

#### 주요 로그 패턴
```bash
# 에러 로그
{level="error"} |= "social_media"

# 성능 로그
{module="analytics"} |= "slow_query"

# 보안 로그
{job="hooklabs-elite-app"} |= "unauthorized"
```

---

## 🔄 롤백 전략

### Vercel 롤백
```bash
# Vercel CLI를 통한 롤백
vercel rollback

# 특정 버전으로 롤백
vercel rollback --url=deployment-url
```

### Convex 롤백
```bash
# Convex 함수 롤백
bunx convex deploy --cmd "git checkout HEAD~1"

# 특정 버전으로 롤백
bunx convex deploy --cmd "git checkout commit-hash"
```

### Docker 롤백
```bash
# 이전 이미지로 롤백
docker-compose down
docker tag hooklabs-elite:previous hooklabs-elite:latest
docker-compose up -d
```

### 데이터베이스 마이그레이션 롤백
```bash
# Convex 스키마 롤백 (수동)
# 1. 이전 스키마 파일로 복원
# 2. 데이터 마이그레이션 스크립트 실행
# 3. 애플리케이션 재배포
```

---

## ⚡ 성능 최적화

### Next.js 최적화
```javascript
// next.config.js
module.exports = {
  // 이미지 최적화
  images: {
    domains: ['images.unsplash.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 번들 분석
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // 실험적 기능
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
};
```

### Convex 최적화
```typescript
// 인덱스 최적화
export default defineSchema({
  socialAccounts: defineTable({
    userId: v.id("users"),
    platform: v.string(),
    accountId: v.string(),
    // ...
  })
  .index("byUserId", ["userId"])
  .index("byAccountId", ["accountId", "platform"])
  .index("byUserPlatform", ["userId", "platform"]),
});
```

### 캐싱 전략
```typescript
// Redis 캐싱
const cacheKey = `social_metrics:${userId}:${date}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const metrics = await computeMetrics(userId, date);
await redis.setex(cacheKey, 3600, JSON.stringify(metrics));
```

---

## 🔒 보안 설정

### 환경 변수 보안
```bash
# 민감한 정보는 Convex 환경 변수에 저장
SOCIAL_TOKEN_ENCRYPTION_KEY=random-32-character-key
WEBHOOK_SECRETS=separate-for-each-service

# 프론트엔드에 노출되지 않는 서버 전용 변수
API_KEYS=server-only
PRIVATE_KEYS=never-expose-to-client
```

### API 보안
```typescript
// Rate Limiting
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

// 입력 검증
import { z } from "zod";

const schema = z.object({
  content: z.string().max(280),
  platform: z.enum(["twitter", "threads", "linkedin"]),
});
```

### 토큰 보안
```typescript
// 토큰 암호화
export class SocialTokenManager {
  static encryptToken(token: string, platform: string, userId: string): string {
    const key = crypto.scryptSync(
      process.env.SOCIAL_TOKEN_ENCRYPTION_KEY!, 
      `${platform}:${userId}`, 
      32
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    // ...암호화 로직
  }
}
```

---

## 🔧 트러블슈팅

### 일반적인 문제들

#### 1. 빌드 실패
```bash
# TypeScript 에러
bun run type-check

# 의존성 문제
rm -rf node_modules bun.lockb
bun install

# 메모리 부족
NODE_OPTIONS="--max-old-space-size=4096" bun run build
```

#### 2. Convex 연결 문제
```bash
# Convex 배포 상태 확인
bunx convex logs

# 환경 변수 확인
bunx convex env list

# 함수 재배포
bunx convex deploy --cmd "bun run build"
```

#### 3. 소셜 미디어 API 에러
```typescript
// 토큰 만료 확인
const isExpired = SocialTokenManager.isTokenExpired(account.tokenExpiresAt);
if (isExpired) {
  // 토큰 새로고침 로직
  await refreshSocialToken(account);
}

// API 응답 에러 처리
try {
  const response = await twitterApi.post('/tweets', data);
} catch (error) {
  if (error.status === 429) {
    // Rate limit 에러
    throw new Error('API 요청 한도 초과');
  }
  // 기타 에러 처리
}
```

#### 4. 성능 문제
```bash
# Lighthouse 성능 분석
bun run lighthouse

# 번들 분석
ANALYZE=true bun run build

# 메모리 누수 확인
node --inspect bun start
```

### 로그 분석

#### 에러 로그 패턴
```bash
# Grafana에서 에러 패턴 검색
{level="error"} |= "social_media"
{module="aiGenerations"} |= "failed"
{action="token_refresh"} |= "error"
```

#### 성능 로그 분석
```bash
# 느린 쿼리 찾기
{job="hooklabs-elite-app"} |= "slow_query" | json | duration > 1000

# 메모리 사용량 확인
{container="hooklabs-elite-app"} |= "memory_usage"
```

### 응급 대응 절차

#### 1. 서비스 장애 발생 시
1. 즉시 롤백 실행
2. 에러 로그 확인
3. 모니터링 대시보드 점검
4. 사용자에게 상황 안내
5. 문제 해결 후 재배포

#### 2. 데이터 문제 발생 시
1. 백업에서 데이터 복구
2. 데이터 일관성 검증
3. 사용자 영향도 평가
4. 보상 조치 계획

#### 3. 보안 문제 발생 시
1. 즉시 서비스 중단
2. 보안 패치 적용
3. 사용자 데이터 확인
4. 사고 보고서 작성

---

## 📞 지원 및 연락처

### 긴급 상황
- 개발팀 슬랙: #dev-emergency
- 온콜 엔지니어: +82-10-xxxx-xxxx

### 일반 지원
- 기술 문의: tech@hooklabs.com
- 비즈니스 문의: business@hooklabs.com

### 유용한 링크
- [Convex 문서](https://docs.convex.dev)
- [Next.js 문서](https://nextjs.org/docs)
- [Vercel 문서](https://vercel.com/docs)
- [Docker 문서](https://docs.docker.com)

---

## 📝 체크리스트

### 배포 전 체크리스트
- [ ] 모든 테스트 통과
- [ ] 환경 변수 설정 완료
- [ ] 백업 계획 수립
- [ ] 모니터링 설정 확인
- [ ] 롤백 계획 준비
- [ ] 사용자 알림 준비

### 배포 후 체크리스트
- [ ] 헬스 체크 통과
- [ ] 주요 기능 동작 확인
- [ ] 성능 메트릭 정상
- [ ] 에러율 정상 범위
- [ ] 사용자 피드백 모니터링
- [ ] 로그 수집 정상 동작

---

*이 문서는 소셜 미디어 자동화 플랫폼의 안정적인 운영을 위한 종합 가이드입니다. 문의사항이 있으시면 언제든지 개발팀에 연락해 주세요.*