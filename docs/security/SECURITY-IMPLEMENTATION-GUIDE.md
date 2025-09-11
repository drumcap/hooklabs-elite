# 🛠️ HookLabs Elite 보안 구현 가이드

## 📌 즉시 적용 가능한 보안 개선사항

### 1. 암호화 키 생성 및 설정

#### 안전한 암호화 키 생성
```bash
# 32바이트 (64자 hex) 암호화 키 생성
openssl rand -hex 32

# 또는 Node.js로 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### .env.local 설정
```env
# 생성된 64자 hex 문자열 사용
SOCIAL_TOKEN_ENCRYPTION_KEY=a1b2c3d4e5f6....[64자]
```

### 2. 웹훅 시크릿 설정

#### Clerk 웹훅 설정
1. Clerk Dashboard → Webhooks 섹션 이동
2. 엔드포인트 추가: `https://your-domain/convex/clerk-users-webhook`
3. 이벤트 선택: `user.created`, `user.updated`, `user.deleted`
4. 생성된 Signing Secret을 Convex Dashboard 환경변수에 추가

#### Lemon Squeezy 웹훅 설정
1. Lemon Squeezy Dashboard → Settings → Webhooks
2. 엔드포인트 추가: `https://your-domain/convex/lemonsqueezy-webhook`
3. 시크릿 생성 및 Convex Dashboard에 추가
4. 필요한 이벤트 선택

### 3. Zod 스키마 구현 예제

```typescript
// lib/validation-schemas.ts
import { z } from 'zod';

// 사용자 입력 스키마
export const userInputSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
});

// 소셜 미디어 포스트 스키마
export const socialPostSchema = z.object({
  content: z.string().min(1).max(5000),
  platform: z.enum(['twitter', 'threads', 'linkedin']),
  scheduledAt: z.string().datetime().optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  hashtags: z.array(z.string().max(100)).max(30).optional(),
});

// 결제 요청 스키마
export const paymentRequestSchema = z.object({
  variantId: z.string().regex(/^\d+$/),
  quantity: z.number().int().min(1).max(100),
  couponCode: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});
```

### 4. API 라우트 보안 템플릿

```typescript
// app/api/[your-endpoint]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { RateLimiter } from '@/lib/rate-limiting';
import { InputValidator, SecurityAuditLogger } from '@/lib/security';

// 스키마 정의
const schema = z.object({
  // 여기에 필드 정의
});

// Rate Limiter 설정
const rateLimiter = new RateLimiter({
  window: 60,
  max: 30,
});

export async function POST(req: NextRequest) {
  try {
    // 1. 인증
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate Limiting
    const limitKey = `api:${userId}:${req.nextUrl.pathname}`;
    const { success, remaining, resetTime } = await rateLimiter.check(limitKey);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime },
        { status: 429 }
      );
    }

    // 3. Body 파싱 및 검증
    const body = await req.json();
    const validation = schema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // 4. 추가 보안 검증
    const securityCheck = InputValidator.validate(JSON.stringify(body), {
      maxLength: 10000,
      allowHTML: false,
    });

    if (!securityCheck.isValid) {
      SecurityAuditLogger.logSuspiciousActivity(
        `Security check failed: ${securityCheck.errors.join(', ')}`,
        req
      );
      return NextResponse.json(
        { error: 'Invalid input detected' },
        { status: 400 }
      );
    }

    // 5. 비즈니스 로직
    // ... 여기에 실제 로직 구현 ...

    // 6. 응답
    const response = NextResponse.json({ success: true });
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    
    return response;

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5. Convex 함수 보안 강화

```typescript
// convex/secureFunction.ts
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "./auth";

// 공개 쿼리 - 민감한 정보 제거
export const publicQuery = query({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id);
    
    if (!item) {
      throw new Error("Item not found");
    }

    // 민감한 필드 제거
    const { secretField, internalData, ...safeItem } = item;
    
    return safeItem;
  },
});

// 인증된 쿼리
export const authenticatedQuery = query({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Authentication required");
    }

    const item = await ctx.db.get(id);
    
    if (!item || item.userId !== userId) {
      throw new Error("Access denied");
    }

    return item;
  },
});

// 내부 전용 뮤테이션 (API에서 호출 불가)
export const internalOnlyMutation = internalMutation({
  args: { 
    userId: v.id("users"),
    sensitiveData: v.string(),
  },
  handler: async (ctx, args) => {
    // 이 함수는 오직 서버 내부에서만 호출 가능
    // 민감한 작업 수행
    return await ctx.db.insert("sensitiveTable", args);
  },
});
```

### 6. 보안 미들웨어 적용 순서

```typescript
// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // 1. CORS 체크 (OPTIONS 요청 처리)
  if (req.method === 'OPTIONS') {
    return handleCORS(req);
  }

  // 2. 보안 헤더 적용
  let response = NextResponse.next();
  response = applySecurityHeaders(response);

  // 3. Rate Limiting
  const rateLimitResult = await checkRateLimit(req);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult);
  }

  // 4. 입력 검증 (POST/PUT/PATCH)
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const validationResult = await validateInput(req);
    if (!validationResult.valid) {
      return validationErrorResponse(validationResult);
    }
  }

  // 5. 인증 체크 (보호된 경로)
  if (isProtectedRoute(req)) {
    const { userId } = await auth.protect();
    response.headers.set('x-user-id', userId);
  }

  return response;
});
```

### 7. 환경별 보안 설정

```typescript
// lib/config/security.config.ts
export const securityConfig = {
  development: {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true,
    },
    rateLimit: {
      window: 60,
      max: 1000, // 개발 환경은 관대하게
    },
    logging: {
      level: 'debug',
      console: true,
    },
  },
  
  staging: {
    cors: {
      origin: ['https://staging.hooklabs.io'],
      credentials: true,
    },
    rateLimit: {
      window: 60,
      max: 100,
    },
    logging: {
      level: 'info',
      service: 'datadog', // 또는 다른 로깅 서비스
    },
  },
  
  production: {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
      credentials: true,
    },
    rateLimit: {
      window: 60,
      max: 60,
    },
    logging: {
      level: 'warn',
      service: 'sentry',
    },
  },
};

// 현재 환경 설정 가져오기
export function getSecurityConfig() {
  const env = process.env.NODE_ENV as keyof typeof securityConfig;
  return securityConfig[env] || securityConfig.development;
}
```

### 8. 보안 테스트 스크립트

```json
// package.json에 추가
{
  "scripts": {
    "security:audit": "npm audit --audit-level moderate",
    "security:check": "npm run security:audit && npm run lint",
    "security:headers": "curl -I http://localhost:3000 | grep -E '^(X-|Strict-|Content-Security)'",
    "security:test": "jest --testMatch='**/__tests__/security/**/*.test.ts'",
    "security:scan": "trivy fs --severity HIGH,CRITICAL ."
  }
}
```

### 9. GitHub Actions 보안 워크플로우

```yaml
# .github/workflows/security.yml
name: Security Checks

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 1' # 매주 월요일

jobs:
  security:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run security audit
      run: npm audit --audit-level moderate
    
    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
    
    - name: Check for secrets
      uses: trufflesecurity/trufflehog@main
      with:
        path: ./
    
    - name: SAST Scan
      uses: github/super-linter@v4
      env:
        DEFAULT_BRANCH: main
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 10. 프로덕션 체크리스트

#### 배포 전 확인사항
```bash
# 1. 환경변수 확인
vercel env pull
grep -E "KEY|SECRET|TOKEN" .env.production

# 2. 의존성 취약점 확인
npm audit fix
npm outdated

# 3. 빌드 최적화
npm run build
npm run analyze

# 4. 보안 헤더 테스트
npm run security:headers

# 5. Rate Limiting 테스트
npm run test:rate-limit
```

#### Vercel 환경변수 설정
```bash
# Vercel CLI로 환경변수 설정
vercel env add SOCIAL_TOKEN_ENCRYPTION_KEY production
vercel env add CLERK_WEBHOOK_SECRET production
vercel env add LEMONSQUEEZY_WEBHOOK_SECRET production
```

## 🔥 Hot Fix 템플릿

긴급 보안 패치가 필요한 경우:

```bash
# 1. hotfix 브랜치 생성
git checkout -b hotfix/security-patch-$(date +%Y%m%d)

# 2. 수정 적용
# ... 코드 수정 ...

# 3. 테스트
npm run test:security
npm run security:check

# 4. 커밋 및 푸시
git add .
git commit -m "🔒 SECURITY: [설명]

- 영향 범위: [영향받는 기능]
- 심각도: [Critical/High/Medium/Low]
- 해결 방법: [수정 내용]"

git push origin hotfix/security-patch-$(date +%Y%m%d)

# 5. PR 생성 및 긴급 배포
gh pr create --title "🔒 Security Hotfix" --body "긴급 보안 패치"
```

## 📚 추가 리소스

- [OWASP 보안 가이드](https://owasp.org/www-project-web-security-testing-guide/)
- [Node.js 보안 베스트 프랙티스](https://nodejs.org/en/docs/guides/security/)
- [Convex 보안 문서](https://docs.convex.dev/production/security)
- [Clerk 보안 문서](https://clerk.com/docs/security)
- [Vercel 보안 가이드](https://vercel.com/docs/security)

---

**작성일**: 2025년 1월 3일  
**담당**: Security Team  
**문의**: security@hooklabs.io