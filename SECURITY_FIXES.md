# 🔧 보안 취약점 수정 가이드

이 문서는 보안 감사에서 발견된 취약점들에 대한 구체적인 수정 코드를 제공합니다.

## 🔴 Critical - 즉시 수정 필요

### 1. TokenCrypto 클래스 완전 수정

**파일**: `/workspace/hooklabs-elite/lib/security.ts`

```typescript
/**
 * 안전한 토큰 암호화/복호화 클래스
 */
export class TokenCrypto {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyLength = 32;
  private static readonly ivLength = 16;
  private static readonly saltLength = 32;
  private static readonly tagLength = 16;
  private static readonly iterations = 10000;

  /**
   * 키 유도 함수 (KDF)
   */
  private static deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, this.iterations, this.keyLength, 'sha256');
  }

  /**
   * 안전한 토큰 암호화
   */
  static encrypt(text: string, password?: string): string {
    try {
      const masterPassword = password || process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
      if (!masterPassword) {
        throw new Error('Encryption key not configured');
      }

      // 랜덤 salt와 IV 생성
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // 키 유도
      const key = this.deriveKey(masterPassword, salt);
      
      // 암호화
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
      ]);
      
      const tag = cipher.getAuthTag();
      
      // 결과 조합: salt:iv:tag:encrypted
      const combined = Buffer.concat([salt, iv, tag, encrypted]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * 안전한 토큰 복호화
   */
  static decrypt(encryptedText: string, password?: string): string {
    try {
      const masterPassword = password || process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
      if (!masterPassword) {
        throw new Error('Decryption key not configured');
      }

      const combined = Buffer.from(encryptedText, 'base64');
      
      // 구성 요소 분리
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const tag = combined.slice(
        this.saltLength + this.ivLength, 
        this.saltLength + this.ivLength + this.tagLength
      );
      const encrypted = combined.slice(this.saltLength + this.ivLength + this.tagLength);
      
      // 키 유도
      const key = this.deriveKey(masterPassword, salt);
      
      // 복호화
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * 토큰 해시 생성 (비교용)
   */
  static hash(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  /**
   * 안전한 토큰 비교
   */
  static compare(token1: string, token2: string): boolean {
    const hash1 = Buffer.from(this.hash(token1));
    const hash2 = Buffer.from(this.hash(token2));
    
    if (hash1.length !== hash2.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(hash1, hash2);
  }
}
```

---

## 🟠 High - 빠른 수정 필요

### 2. Webhook 서명 검증 개선

**파일**: `/workspace/hooklabs-elite/convex/http.ts`

```typescript
import crypto from 'crypto';

async function validateLemonSqueezyRequest(req: Request): Promise<any | null> {
  const body = await req.text();
  const signature = req.headers.get('X-Signature');
  
  if (!signature) {
    console.error('Missing Lemon Squeezy signature');
    return null;
  }

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing LEMONSQUEEZY_WEBHOOK_SECRET');
    return null;
  }

  try {
    // HMAC-SHA256 서명 생성
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    
    // 헤더에서 서명 추출 (sha256= 접두사 제거)
    const providedSignature = signature.replace(/^sha256=/, '');
    
    // Timing-safe 비교
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(providedSignature, 'hex');
    
    // 길이가 다른 경우 먼저 체크
    if (expectedBuffer.length !== providedBuffer.length) {
      console.error('Signature length mismatch');
      return null;
    }
    
    // Timing-safe 비교
    if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
      console.error('Signature verification failed');
      SecurityAuditLogger.logSuspiciousActivity(
        'Invalid webhook signature attempt',
        req
      );
      return null;
    }
    
    return JSON.parse(body);
  } catch (error) {
    console.error('Error verifying Lemon Squeezy webhook:', error);
    return null;
  }
}

// Clerk webhook 검증도 개선
async function validateClerkRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  
  // 헤더 검증
  if (!svixHeaders["svix-id"] || !svixHeaders["svix-timestamp"] || !svixHeaders["svix-signature"]) {
    console.error('Missing required Svix headers');
    return null;
  }
  
  // 타임스탬프 검증 (5분 이내)
  const timestamp = parseInt(svixHeaders["svix-timestamp"]);
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - timestamp) > 300) {
    console.error('Webhook timestamp too old or too far in future');
    return null;
  }
  
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error('Error verifying webhook event', error);
    SecurityAuditLogger.logSuspiciousActivity(
      'Invalid Clerk webhook signature',
      req
    );
    return null;
  }
}
```

---

### 3. 소셜 계정 토큰 암호화 저장

**파일**: `/workspace/hooklabs-elite/convex/socialAccounts.ts`

```typescript
import { TokenCrypto } from '@/lib/security';

// 토큰을 포함한 계정 생성/업데이트
export const createSecure = mutation({
  args: {
    platform: v.string(),
    accountId: v.string(),
    username: v.string(),
    displayName: v.string(),
    profileImage: v.optional(v.string()),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.string()),
    // ... 기타 필드
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 토큰 암호화
    const encryptedAccessToken = TokenCrypto.encrypt(args.accessToken);
    const encryptedRefreshToken = args.refreshToken 
      ? TokenCrypto.encrypt(args.refreshToken) 
      : undefined;

    // 토큰 해시 생성 (빠른 검색용)
    const tokenHash = TokenCrypto.hash(args.accessToken);

    const now = new Date().toISOString();

    // 기존 계정 확인
    const existingAccount = await ctx.db
      .query("socialAccounts")
      .withIndex("byAccountId", (q) => q.eq("accountId", args.accountId))
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();

    if (existingAccount) {
      if (existingAccount.userId !== userId) {
        throw new Error("이미 다른 사용자에게 연동된 계정입니다");
      }
      
      // 토큰 업데이트
      await ctx.db.patch(existingAccount._id, {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenHash,
        tokenExpiresAt: args.tokenExpiresAt,
        // ... 기타 업데이트
        updatedAt: now,
      });

      return existingAccount._id;
    }

    // 새 계정 생성
    return await ctx.db.insert("socialAccounts", {
      userId,
      platform: args.platform,
      accountId: args.accountId,
      username: args.username,
      displayName: args.displayName,
      profileImage: args.profileImage,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenHash,
      tokenExpiresAt: args.tokenExpiresAt,
      // ... 기타 필드
      createdAt: now,
      updatedAt: now,
    });
  },
});

// 토큰 복호화하여 사용
export const getDecryptedTokens = query({
  args: { id: v.id("socialAccounts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const account = await ctx.db.get(id);
    if (!account || account.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    // 토큰 복호화
    const accessToken = TokenCrypto.decrypt(account.accessToken);
    const refreshToken = account.refreshToken 
      ? TokenCrypto.decrypt(account.refreshToken)
      : undefined;

    return {
      accessToken,
      refreshToken,
      tokenExpiresAt: account.tokenExpiresAt,
    };
  },
});
```

---

## 🟡 Medium - 개선 권장

### 4. Rate Limiting 에러 처리 개선

**파일**: `/workspace/hooklabs-elite/lib/rate-limiting.ts`

```typescript
export class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;
  private fallbackStore: Map<string, { count: number; resetTime: number }>;

  constructor(config: RateLimitConfig) {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    this.config = config;
    this.fallbackStore = new Map(); // 메모리 기반 폴백
  }

  async check(key: string): Promise<{
    success: boolean;
    remaining: number;
    resetTime: number;
    totalRequests: number;
  }> {
    const now = Date.now();
    const window = this.config.window * 1000;
    const windowStart = now - window;

    try {
      // Redis 사용
      const current = await this.redis.zcount(key, windowStart, now);
      const remaining = Math.max(0, this.config.max - current);
      
      if (current >= this.config.max) {
        return {
          success: false,
          remaining: 0,
          resetTime: Math.ceil((windowStart + window) / 1000),
          totalRequests: current,
        };
      }

      await this.redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
      await this.redis.zremrangebyscore(key, 0, windowStart);
      await this.redis.expire(key, this.config.window);

      return {
        success: true,
        remaining: remaining - 1,
        resetTime: Math.ceil((now + window) / 1000),
        totalRequests: current + 1,
      };

    } catch (error) {
      console.error('Rate limiting Redis error, using fallback:', error);
      
      // 메모리 기반 폴백 사용
      return this.checkWithFallback(key, now, window);
    }
  }

  private checkWithFallback(
    key: string, 
    now: number, 
    window: number
  ): {
    success: boolean;
    remaining: number;
    resetTime: number;
    totalRequests: number;
  } {
    const resetTime = Math.ceil((now + window) / 1000);
    
    // 만료된 항목 정리
    for (const [k, v] of this.fallbackStore.entries()) {
      if (v.resetTime < now / 1000) {
        this.fallbackStore.delete(k);
      }
    }
    
    const current = this.fallbackStore.get(key) || { count: 0, resetTime };
    
    if (current.resetTime < now / 1000) {
      // 윈도우 리셋
      current.count = 0;
      current.resetTime = resetTime;
    }
    
    if (current.count >= this.config.max) {
      return {
        success: false,
        remaining: 0,
        resetTime: current.resetTime,
        totalRequests: current.count,
      };
    }
    
    current.count++;
    this.fallbackStore.set(key, current);
    
    // 메모리 크기 제한 (1000개 항목)
    if (this.fallbackStore.size > 1000) {
      const firstKey = this.fallbackStore.keys().next().value;
      this.fallbackStore.delete(firstKey);
    }
    
    return {
      success: true,
      remaining: this.config.max - current.count,
      resetTime: current.resetTime,
      totalRequests: current.count,
    };
  }
}
```

---

### 5. 보안 로깅 구현

**파일**: `/workspace/hooklabs-elite/lib/security-logger.ts`

```typescript
import * as Sentry from "@sentry/nextjs";
import { NextRequest } from "next/server";

export interface SecurityEvent {
  timestamp: string;
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  details: any;
}

export class EnhancedSecurityLogger {
  private static queue: SecurityEvent[] = [];
  private static flushInterval: NodeJS.Timeout | null = null;
  
  static init() {
    // 배치 전송을 위한 큐 플러시 (5초마다)
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000);
  }
  
  static destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
  
  private static async flush() {
    if (this.queue.length === 0) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    try {
      // Sentry로 전송
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        for (const event of events) {
          Sentry.captureEvent({
            message: event.event,
            level: this.mapSeverityToSentryLevel(event.severity),
            tags: {
              security: true,
              severity: event.severity,
            },
            extra: {
              ...event.details,
              ip: event.ip,
              userAgent: event.userAgent,
              url: event.url,
              userId: event.userId,
            },
            timestamp: new Date(event.timestamp).getTime() / 1000,
          });
        }
      }
      
      // 추가 로깅 서비스로 전송 (예: CloudWatch, DataDog)
      if (process.env.NODE_ENV === 'production') {
        await this.sendToExternalLogger(events);
      }
      
      // 개발 환경에서는 콘솔 출력
      if (process.env.NODE_ENV === 'development') {
        events.forEach(event => {
          console.log('[SECURITY]', JSON.stringify(event, null, 2));
        });
      }
      
    } catch (error) {
      console.error('Failed to flush security logs:', error);
    }
  }
  
  private static mapSeverityToSentryLevel(severity: string): Sentry.SeverityLevel {
    switch (severity) {
      case 'critical': return 'fatal';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  }
  
  private static async sendToExternalLogger(events: SecurityEvent[]) {
    // CloudWatch Logs 예제
    if (process.env.AWS_CLOUDWATCH_LOG_GROUP) {
      // AWS SDK를 사용하여 CloudWatch로 전송
      // const cloudwatch = new AWS.CloudWatch();
      // await cloudwatch.putLogEvents({ ... });
    }
    
    // 또는 다른 로깅 서비스 API 호출
    if (process.env.EXTERNAL_LOGGER_ENDPOINT) {
      await fetch(process.env.EXTERNAL_LOGGER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXTERNAL_LOGGER_API_KEY}`,
        },
        body: JSON.stringify(events),
      });
    }
  }
  
  static logSecurityEvent(
    event: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    req?: NextRequest
  ): void {
    const securityEvent: SecurityEvent = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      ip: req ? this.getClientIP(req) : undefined,
      userAgent: req?.headers.get('user-agent') || undefined,
      url: req?.url,
      userId: req?.headers.get('x-user-id') || undefined,
    };
    
    this.queue.push(securityEvent);
    
    // Critical 이벤트는 즉시 전송
    if (severity === 'critical') {
      this.flush();
    }
  }
  
  private static getClientIP(req: NextRequest): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           req.headers.get('x-real-ip') ||
           req.headers.get('cf-connecting-ip') ||
           req.ip ||
           'unknown';
  }
  
  // 특정 보안 이벤트 메서드들
  static logAuthFailure(userId: string, reason: string, req: NextRequest) {
    this.logSecurityEvent('auth_failure', { userId, reason }, 'medium', req);
  }
  
  static logSuspiciousActivity(activity: string, req: NextRequest) {
    this.logSecurityEvent('suspicious_activity', { activity }, 'high', req);
  }
  
  static logDataBreach(details: any, req?: NextRequest) {
    this.logSecurityEvent('data_breach_attempt', details, 'critical', req);
  }
  
  static logInjectionAttempt(type: string, input: string, req: NextRequest) {
    this.logSecurityEvent(`${type}_injection_attempt`, { input }, 'high', req);
  }
}

// 초기화
if (typeof window === 'undefined') {
  EnhancedSecurityLogger.init();
  
  // 프로세스 종료 시 큐 플러시
  process.on('exit', () => EnhancedSecurityLogger.destroy());
  process.on('SIGTERM', () => EnhancedSecurityLogger.destroy());
  process.on('SIGINT', () => EnhancedSecurityLogger.destroy());
}
```

---

## 테스트 코드

### 암호화 테스트

```typescript
// __tests__/security/encryption.test.ts
import { TokenCrypto } from '@/lib/security';

describe('TokenCrypto', () => {
  const testToken = 'test_token_12345';
  const testPassword = 'test_password_secure_32_chars!!';
  
  it('should encrypt and decrypt tokens correctly', () => {
    const encrypted = TokenCrypto.encrypt(testToken, testPassword);
    const decrypted = TokenCrypto.decrypt(encrypted, testPassword);
    
    expect(decrypted).toBe(testToken);
    expect(encrypted).not.toBe(testToken);
  });
  
  it('should produce different ciphertexts for same plaintext', () => {
    const encrypted1 = TokenCrypto.encrypt(testToken, testPassword);
    const encrypted2 = TokenCrypto.encrypt(testToken, testPassword);
    
    expect(encrypted1).not.toBe(encrypted2);
  });
  
  it('should fail with wrong password', () => {
    const encrypted = TokenCrypto.encrypt(testToken, testPassword);
    
    expect(() => {
      TokenCrypto.decrypt(encrypted, 'wrong_password');
    }).toThrow();
  });
  
  it('should handle timing-safe comparison', () => {
    const result1 = TokenCrypto.compare('token1', 'token1');
    const result2 = TokenCrypto.compare('token1', 'token2');
    
    expect(result1).toBe(true);
    expect(result2).toBe(false);
  });
});
```

---

## 배포 체크리스트

수정 사항 적용 후 확인:

- [ ] `TokenCrypto` 클래스 수정 및 테스트 통과
- [ ] Webhook 서명 검증 timing-safe 구현
- [ ] 소셜 계정 토큰 암호화 마이그레이션
- [ ] Rate Limiting 폴백 메커니즘 테스트
- [ ] 보안 로깅 시스템 연동 및 모니터링
- [ ] 환경변수 암호화 키 설정 (32자 이상)
- [ ] 스테이징 환경에서 전체 테스트
- [ ] 프로덕션 배포 전 보안 스캔
- [ ] 모니터링 대시보드 설정
- [ ] 인시던트 대응 계획 수립

---

**수정 완료 예상 시간**: 
- Critical 수정: 1-2일
- High 수정: 3-5일
- Medium 수정: 1주일
- 전체 테스트 및 배포: 2주일