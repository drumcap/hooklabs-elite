# 소셜 미디어 자동화 플랫폼 - 보안 아키텍처

## 1. 보안 개요

### 1.1 보안 원칙
- **최소 권한 원칙**: 사용자는 필요한 최소한의 권한만 부여
- **심층 방어**: 여러 계층의 보안 메커니즘 적용
- **데이터 암호화**: 민감한 데이터는 저장 및 전송 시 암호화
- **감사 추적**: 모든 중요한 작업은 로깅 및 추적
- **Zero Trust**: 모든 요청은 검증 후 처리

### 1.2 위험 요소 분석
- **높은 위험**: OAuth 토큰, API 키, 사용자 콘텐츠
- **중간 위험**: 사용자 프로필 정보, 스케줄링 데이터
- **낮은 위험**: 공개 메트릭, 일반적인 설정

## 2. 인증 및 권한 관리

### 2.1 사용자 인증 (Clerk)
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/convex(.*)',
  '/api/social(.*)',
]);

export default clerkMiddleware((auth, req) => {
  // API 키 기반 인증 (외부 도구용)
  if (req.nextUrl.pathname.startsWith('/api/v1/')) {
    const apiKey = req.headers.get('X-API-Key');
    if (!apiKey) {
      return new Response('API 키가 필요합니다', { status: 401 });
    }
    // API 키 검증 로직
    return validateApiKey(apiKey, req);
  }

  // 일반 사용자 인증
  if (isProtectedRoute(req)) {
    auth().protect();
  }

  // Rate limiting
  return applyRateLimit(req);
});

// Rate limiting 구현
async function applyRateLimit(req: Request) {
  const identifier = getClientIdentifier(req);
  const limits = getRateLimits(req.nextUrl.pathname);
  
  // Redis 또는 Convex에서 사용량 확인
  const usage = await checkUsage(identifier, limits.window);
  
  if (usage >= limits.max) {
    return new Response('요청 한도 초과', { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': limits.max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': (Date.now() + limits.window).toString(),
      }
    });
  }
  
  // 사용량 기록
  await recordUsage(identifier, limits.window);
  return null;
}
```

### 2.2 API 키 관리 시스템
```typescript
// convex/apiKeys.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

// API 키 생성
export const generateApiKey = mutation({
  args: {
    name: v.string(),
    permissions: v.array(v.string()),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, { name, permissions, expiresAt }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // API 키 생성 (암호화된 형태로 저장)
    const apiKey = generateSecureApiKey();
    const hashedKey = await hashApiKey(apiKey);
    
    const keyId = await ctx.db.insert("apiKeys", {
      userId,
      name,
      keyHash: hashedKey,
      permissions,
      isActive: true,
      lastUsedAt: null,
      usageCount: 0,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    // 실제 키는 한 번만 반환 (보안)
    return {
      id: keyId,
      apiKey, // 생성 시에만 반환
      name,
      permissions,
      expiresAt,
    };
  },
});

// API 키 검증
export const validateApiKey = query({
  args: { keyHash: v.string() },
  handler: async (ctx, { keyHash }) => {
    const apiKeyRecord = await ctx.db
      .query("apiKeys")
      .withIndex("byKeyHash", (q) => q.eq("keyHash", keyHash))
      .first();

    if (!apiKeyRecord) {
      return { valid: false, reason: "키를 찾을 수 없습니다" };
    }

    if (!apiKeyRecord.isActive) {
      return { valid: false, reason: "비활성화된 키입니다" };
    }

    if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) <= new Date()) {
      return { valid: false, reason: "만료된 키입니다" };
    }

    // 사용량 업데이트
    await ctx.db.patch(apiKeyRecord._id, {
      lastUsedAt: new Date().toISOString(),
      usageCount: apiKeyRecord.usageCount + 1,
    });

    return {
      valid: true,
      userId: apiKeyRecord.userId,
      permissions: apiKeyRecord.permissions,
    };
  },
});
```

### 2.3 권한 기반 접근 제어 (RBAC)
```typescript
// convex/permissions.ts

// 권한 정의
export const PERMISSIONS = {
  // 페르소나 관련
  'personas:read': '페르소나 조회',
  'personas:write': '페르소나 생성/수정',
  'personas:delete': '페르소나 삭제',
  
  // 게시물 관련
  'posts:read': '게시물 조회',
  'posts:write': '게시물 생성/수정',
  'posts:delete': '게시물 삭제',
  'posts:publish': '게시물 발행',
  
  // AI 생성 관련
  'ai:generate': 'AI 콘텐츠 생성',
  'ai:optimize': 'AI 콘텐츠 최적화',
  
  // 소셜 계정 관리
  'accounts:read': '소셜 계정 조회',
  'accounts:write': '소셜 계정 연동/수정',
  'accounts:delete': '소셜 계정 연동 해제',
  
  // 스케줄링
  'schedule:read': '스케줄 조회',
  'schedule:write': '스케줄 생성/수정',
  'schedule:delete': '스케줄 취소',
  
  // 분석
  'analytics:read': '분석 데이터 조회',
  'analytics:export': '분석 데이터 내보내기',
  
  // 관리
  'admin:users': '사용자 관리',
  'admin:system': '시스템 관리',
} as const;

// 역할별 기본 권한
export const ROLE_PERMISSIONS = {
  'free': [
    'personas:read', 'personas:write',
    'posts:read', 'posts:write',
    'ai:generate', // 제한된 크레딧
    'accounts:read', 'accounts:write',
    'schedule:read', 'schedule:write',
    'analytics:read',
  ],
  'pro': [
    ...ROLE_PERMISSIONS.free,
    'personas:delete',
    'posts:delete', 'posts:publish',
    'ai:optimize',
    'accounts:delete',
    'schedule:delete',
    'analytics:export',
  ],
  'business': [
    ...ROLE_PERMISSIONS.pro,
    // 모든 기능 접근 가능
  ],
} as const;

// 권한 확인 함수
export const checkPermission = async (
  ctx: any,
  permission: keyof typeof PERMISSIONS,
  apiKey?: string
): Promise<boolean> => {
  let userId;
  let userPermissions: string[];

  if (apiKey) {
    // API 키 기반 인증
    const validation = await ctx.runQuery(api.apiKeys.validateApiKey, { 
      keyHash: await hashApiKey(apiKey) 
    });
    
    if (!validation.valid) {
      return false;
    }
    
    userId = validation.userId;
    userPermissions = validation.permissions;
  } else {
    // 일반 사용자 인증
    userId = await getAuthUserId(ctx);
    if (!userId) return false;
    
    // 사용자 구독 정보에서 역할 확인
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    
    const userRole = subscription ? getUserRole(subscription.planName) : 'free';
    userPermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.free;
  }

  return userPermissions.includes(permission);
};

// 구독 플랜에서 역할 추출
function getUserRole(planName: string): keyof typeof ROLE_PERMISSIONS {
  if (planName.includes('Pro')) return 'pro';
  if (planName.includes('Business')) return 'business';
  return 'free';
}
```

## 3. 데이터 보안

### 3.1 민감한 데이터 암호화
```typescript
// lib/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32바이트 키
const ALGORITHM = 'aes-256-gcm';

export class DataEncryption {
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    cipher.setAAD(iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  static decrypt(encryptedText: string): string {
    const [ivHex, tagHex, encrypted] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAAD(iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// 사용 예시: 소셜 계정 토큰 암호화
export const encryptSocialToken = (token: string): string => {
  return DataEncryption.encrypt(token);
};

export const decryptSocialToken = (encryptedToken: string): string => {
  return DataEncryption.decrypt(encryptedToken);
};
```

### 3.2 데이터 마스킹 및 로깅
```typescript
// lib/security.ts

// 민감한 데이터 마스킹
export const maskSensitiveData = (data: any): any => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'accessToken', 'refreshToken', 'password', 'apiKey',
    'email', 'phone', 'creditCard', 'ssn'
  ];

  const masked = { ...data };

  Object.keys(masked).forEach(key => {
    if (sensitiveFields.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    )) {
      if (typeof masked[key] === 'string' && masked[key].length > 0) {
        masked[key] = '***' + masked[key].slice(-4);
      }
    } else if (typeof masked[key] === 'object') {
      masked[key] = maskSensitiveData(masked[key]);
    }
  });

  return masked;
};

// 보안 감사 로그
export const securityLogger = {
  logAuthAttempt: (userId: string, success: boolean, ip: string, userAgent: string) => {
    console.log(JSON.stringify({
      type: 'auth_attempt',
      userId,
      success,
      ip,
      userAgent: userAgent.substring(0, 100),
      timestamp: new Date().toISOString(),
    }));
  },
  
  logApiAccess: (userId: string, endpoint: string, method: string, ip: string) => {
    console.log(JSON.stringify({
      type: 'api_access',
      userId,
      endpoint,
      method,
      ip,
      timestamp: new Date().toISOString(),
    }));
  },
  
  logSocialTokenRefresh: (userId: string, platform: string, success: boolean) => {
    console.log(JSON.stringify({
      type: 'token_refresh',
      userId,
      platform,
      success,
      timestamp: new Date().toISOString(),
    }));
  },
  
  logSuspiciousActivity: (userId: string, activity: string, metadata: any) => {
    console.log(JSON.stringify({
      type: 'suspicious_activity',
      userId,
      activity,
      metadata: maskSensitiveData(metadata),
      timestamp: new Date().toISOString(),
    }));
  },
};
```

## 4. API 보안

### 4.1 Rate Limiting 구현
```typescript
// convex/rateLimiting.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Rate limit 규칙 정의
const RATE_LIMITS = {
  '/api/convex/content/generate-variants': {
    windowMs: 60000, // 1분
    max: 5, // 분당 5회
    creditCost: 10,
  },
  '/api/convex/posts/create': {
    windowMs: 60000,
    max: 20, // 분당 20회
    creditCost: 1,
  },
  '/api/social/publish': {
    windowMs: 3600000, // 1시간
    max: 100, // 시간당 100회
    creditCost: 5,
  },
} as const;

// 사용량 추적
export const trackUsage = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
    ip: v.string(),
    userAgent: v.string(),
  },
  handler: async (ctx, { userId, endpoint, ip, userAgent }) => {
    const now = new Date().toISOString();
    const windowStart = new Date(Date.now() - 60000).toISOString(); // 1분 전

    // 현재 사용량 확인
    const recentUsage = await ctx.db
      .query("apiUsage")
      .withIndex("byUserIdAndEndpoint", (q) => 
        q.eq("userId", userId).eq("endpoint", endpoint)
      )
      .filter((q) => q.gte(q.field("timestamp"), windowStart))
      .collect();

    const limit = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS];
    if (limit && recentUsage.length >= limit.max) {
      throw new Error(`Rate limit exceeded: ${limit.max} requests per minute`);
    }

    // 사용량 기록
    await ctx.db.insert("apiUsage", {
      userId,
      endpoint,
      ip,
      userAgent: userAgent.substring(0, 255),
      timestamp: now,
    });

    return { success: true, remaining: limit ? limit.max - recentUsage.length - 1 : 999 };
  },
});

// 사용자별 사용량 조회
export const getUserUsage = query({
  args: {
    userId: v.id("users"),
    endpoint: v.optional(v.string()),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, { userId, endpoint, hours = 24 }) => {
    const windowStart = new Date(Date.now() - hours * 3600000).toISOString();

    let query = ctx.db
      .query("apiUsage")
      .withIndex("byUserIdAndTimestamp", (q) => 
        q.eq("userId", userId).gte("timestamp", windowStart)
      );

    if (endpoint) {
      query = query.filter((q) => q.eq(q.field("endpoint"), endpoint));
    }

    const usage = await query.collect();
    
    // 시간별 사용량 집계
    const hourlyUsage: Record<string, number> = {};
    usage.forEach(record => {
      const hour = record.timestamp.substring(0, 13); // YYYY-MM-DDTHH
      hourlyUsage[hour] = (hourlyUsage[hour] || 0) + 1;
    });

    return {
      totalRequests: usage.length,
      hourlyBreakdown: hourlyUsage,
      uniqueEndpoints: [...new Set(usage.map(u => u.endpoint))],
    };
  },
});
```

### 4.2 입력 검증 및 정제
```typescript
// lib/validation.ts
import { z } from 'zod';

// 페르소나 검증 스키마
export const personaSchema = z.object({
  name: z.string()
    .min(1, "이름은 필수입니다")
    .max(50, "이름은 50자 이하여야 합니다")
    .regex(/^[a-zA-Z0-9가-힣\s\-_]+$/, "특수문자는 - _ 만 허용됩니다"),
  
  role: z.string()
    .min(1, "역할은 필수입니다")
    .max(100, "역할은 100자 이하여야 합니다"),
    
  tone: z.enum(["전문적", "친근한", "유머러스", "격식있는", "캐주얼"]),
  
  interests: z.array(z.string().max(30))
    .max(10, "관심사는 최대 10개까지 설정할 수 있습니다"),
    
  expertise: z.array(z.string().max(30))
    .max(10, "전문분야는 최대 10개까지 설정할 수 있습니다"),
});

// 게시물 검증 스키마
export const postSchema = z.object({
  originalContent: z.string()
    .min(10, "내용은 최소 10자 이상이어야 합니다")
    .max(5000, "내용은 5000자 이하여야 합니다")
    .refine(content => !containsSuspiciousContent(content), {
      message: "부적절한 내용이 포함되어 있습니다"
    }),
    
  platforms: z.array(z.enum(["twitter", "threads", "linkedin"]))
    .min(1, "최소 하나의 플랫폼을 선택해야 합니다")
    .max(5, "최대 5개 플랫폼까지 선택할 수 있습니다"),
    
  hashtags: z.array(z.string().regex(/^[a-zA-Z0-9가-힣_]+$/))
    .max(10, "해시태그는 최대 10개까지 설정할 수 있습니다")
    .optional(),
    
  mediaUrls: z.array(z.string().url())
    .max(4, "미디어는 최대 4개까지 첨부할 수 있습니다")
    .optional(),
});

// 콘텐츠 필터링
function containsSuspiciousContent(content: string): boolean {
  const blacklistedPatterns = [
    /스팸/i,
    /광고(?!.*(?:차단|방지))/i, // '광고' 단어가 있지만 '광고차단', '광고방지'는 제외
    /도박/i,
    /불법/i,
    /해킹/i,
    // 더 많은 패턴 추가...
  ];
  
  return blacklistedPatterns.some(pattern => pattern.test(content));
}

// XSS 방지를 위한 HTML 정제
export const sanitizeHtml = (input: string): string => {
  // 기본적인 HTML 태그 제거
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};

// SQL 인젝션 방지 (Convex는 기본적으로 안전하지만 외부 API 호출 시)
export const sanitizeForQuery = (input: string): string => {
  return input.replace(/['";\\]/g, '');
};
```

## 5. 컴플라이언스 및 개인정보 보호

### 5.1 GDPR 준수
```typescript
// convex/privacy.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

// 개인정보 처리 동의 기록
export const recordConsent = mutation({
  args: {
    consentType: v.string(), // "data_processing", "marketing", "analytics"
    granted: v.boolean(),
    version: v.string(), // 이용약관 버전
  },
  handler: async (ctx, { consentType, granted, version }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    await ctx.db.insert("userConsents", {
      userId,
      consentType,
      granted,
      version,
      timestamp: new Date().toISOString(),
      ipAddress: ctx.metadata?.ipAddress || "unknown",
    });

    return { success: true };
  },
});

// 개인정보 내보내기 (GDPR Article 20)
export const exportUserData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 사용자의 모든 데이터 수집
    const [
      personas,
      posts,
      socialAccounts,
      aiGenerations,
      subscriptions,
      credits
    ] = await Promise.all([
      ctx.db.query("personas").withIndex("byUserId", q => q.eq("userId", userId)).collect(),
      ctx.db.query("socialPosts").withIndex("byUserId", q => q.eq("userId", userId)).collect(),
      ctx.db.query("socialAccounts").withIndex("byUserId", q => q.eq("userId", userId)).collect(),
      ctx.db.query("aiGenerations").withIndex("byUserId", q => q.eq("userId", userId)).collect(),
      ctx.db.query("subscriptions").withIndex("byUserId", q => q.eq("userId", userId)).collect(),
      ctx.db.query("credits").withIndex("byUserId", q => q.eq("userId", userId)).collect(),
    ]);

    // 민감한 정보 제거
    const sanitizedSocialAccounts = socialAccounts.map(account => ({
      ...account,
      accessToken: undefined,
      refreshToken: undefined,
    }));

    return {
      exportDate: new Date().toISOString(),
      userData: {
        personas,
        posts,
        socialAccounts: sanitizedSocialAccounts,
        aiGenerations,
        subscriptions,
        credits,
      },
    };
  },
});

// 개인정보 삭제 (GDPR Article 17 - Right to be forgotten)
export const deleteUserData = mutation({
  args: {
    confirmDeletion: v.boolean(),
  },
  handler: async (ctx, { confirmDeletion }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    if (!confirmDeletion) {
      throw new Error("삭제 확인이 필요합니다");
    }

    // 관련된 모든 데이터 삭제
    const collections = [
      "personas", "socialPosts", "postVariants", "scheduledPosts",
      "socialAccounts", "aiGenerations", "contentSources", 
      "contentItems", "postAnalytics"
    ];

    for (const collection of collections) {
      const items = await ctx.db.query(collection)
        .withIndex("byUserId", q => q.eq("userId", userId))
        .collect();
        
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
    }

    // 삭제 로그 기록 (감사 목적)
    await ctx.db.insert("dataDeletionLogs", {
      userId,
      deletedAt: new Date().toISOString(),
      reason: "user_requested",
      collectionsDeleted: collections,
    });

    return { success: true, deletedCollections: collections };
  },
});
```

### 5.2 보안 모니터링
```typescript
// convex/securityMonitoring.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 보안 이벤트 로깅
export const logSecurityEvent = mutation({
  args: {
    eventType: v.string(),
    severity: v.string(), // "low", "medium", "high", "critical"
    userId: v.optional(v.id("users")),
    ipAddress: v.string(),
    userAgent: v.string(),
    details: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("securityEvents", {
      ...args,
      timestamp: new Date().toISOString(),
    });

    // 높은 심각도 이벤트는 즉시 알림
    if (args.severity === "critical" || args.severity === "high") {
      // 알림 발송 로직 (이메일, Slack 등)
      await sendSecurityAlert(args);
    }

    return { success: true };
  },
});

// 의심스러운 활동 탐지
export const detectSuspiciousActivity = query({
  args: {
    userId: v.id("users"),
    hours: v.optional(v.number()),
  },
  handler: async (ctx, { userId, hours = 24 }) => {
    const windowStart = new Date(Date.now() - hours * 3600000).toISOString();

    const recentActivity = await ctx.db
      .query("apiUsage")
      .withIndex("byUserIdAndTimestamp", q => 
        q.eq("userId", userId).gte("timestamp", windowStart)
      )
      .collect();

    const suspiciousPatterns = [];

    // 패턴 1: 비정상적으로 높은 요청 수
    if (recentActivity.length > 1000) {
      suspiciousPatterns.push({
        type: "high_request_volume",
        severity: "medium",
        description: `${hours}시간 동안 ${recentActivity.length}회 요청`,
      });
    }

    // 패턴 2: 다양한 IP에서 동시 접근
    const uniqueIPs = new Set(recentActivity.map(a => a.ip));
    if (uniqueIPs.size > 10) {
      suspiciousPatterns.push({
        type: "multiple_ip_access",
        severity: "high",
        description: `${uniqueIPs.size}개의 서로 다른 IP에서 접근`,
      });
    }

    // 패턴 3: 짧은 시간 내 대량 AI 생성 요청
    const aiRequests = recentActivity.filter(a => 
      a.endpoint.includes("generate") || a.endpoint.includes("optimize")
    );
    
    if (aiRequests.length > 50) {
      suspiciousPatterns.push({
        type: "ai_abuse",
        severity: "high",
        description: `${aiRequests.length}회 AI 생성 요청`,
      });
    }

    return {
      userId,
      timeWindow: `${hours}시간`,
      totalActivity: recentActivity.length,
      suspiciousPatterns,
      riskLevel: suspiciousPatterns.length > 0 ? 
        suspiciousPatterns.some(p => p.severity === "high") ? "HIGH" : "MEDIUM" 
        : "LOW",
    };
  },
});

async function sendSecurityAlert(event: any) {
  // 실제 구현에서는 이메일, Slack, Discord 등으로 알림
  console.error("🚨 보안 경고:", {
    type: event.eventType,
    severity: event.severity,
    userId: event.userId,
    details: event.details,
    timestamp: new Date().toISOString(),
  });
}
```

## 6. 환경 변수 보안 관리

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // 데이터베이스
  CONVEX_DEPLOYMENT: z.string(),
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  
  // 인증
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_WEBHOOK_SECRET: z.string(),
  
  // 외부 API
  GEMINI_API_KEY: z.string(),
  TWITTER_CLIENT_ID: z.string(),
  TWITTER_CLIENT_SECRET: z.string(),
  
  // 보안
  ENCRYPTION_KEY: z.string().length(64), // 32바이트 hex
  JWT_SECRET: z.string().min(32),
  
  // 결제
  LEMONSQUEEZY_API_KEY: z.string(),
  LEMONSQUEEZY_WEBHOOK_SECRET: z.string(),
});

// 환경 변수 검증
export const env = envSchema.parse(process.env);

// 보안 검사
if (process.env.NODE_ENV === 'production') {
  const requiredSecureSettings = [
    process.env.ENCRYPTION_KEY?.length === 64,
    process.env.JWT_SECRET?.length >= 32,
    process.env.CLERK_WEBHOOK_SECRET?.startsWith('whsec_'),
  ];

  if (!requiredSecureSettings.every(Boolean)) {
    throw new Error("프로덕션 환경에서 보안 설정이 부족합니다");
  }
}
```

## 7. 보안 체크리스트

### ✅ 완료해야 할 보안 작업

#### 인증 및 권한
- [x] Clerk 기반 사용자 인증
- [x] API 키 기반 인증 시스템
- [x] 권한 기반 접근 제어 (RBAC)
- [x] 세션 관리 및 토큰 검증

#### 데이터 보안
- [x] 민감한 데이터 암호화 (OAuth 토큰, API 키)
- [x] 데이터 마스킹 및 로깅
- [x] 입력 검증 및 정제
- [x] XSS/SQL 인젝션 방지

#### API 보안
- [x] Rate limiting 구현
- [x] CORS 정책 설정
- [x] 요청 크기 제한
- [x] API 사용량 모니터링

#### 컴플라이언스
- [x] GDPR 준수 (데이터 내보내기/삭제)
- [x] 개인정보 처리 동의 관리
- [x] 감사 로그 시스템
- [x] 보안 이벤트 모니터링

### 🔄 지속적인 보안 관리

1. **정기 보안 감사**: 월 1회 보안 로그 검토
2. **취약점 스캔**: 분기 1회 자동화된 보안 스캔
3. **의존성 업데이트**: 주 1회 보안 패치 확인
4. **침투 테스트**: 연 1회 외부 보안 전문가 테스트
5. **직원 교육**: 분기 1회 보안 인식 교육

이 보안 아키텍처는 소셜 미디어 자동화 플랫폼의 모든 측면을 보호하며, 확장 가능하고 유지보수하기 쉬운 구조로 설계되었습니다.