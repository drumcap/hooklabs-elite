# 보안 아키텍처 설계서 - 쿠폰 관리 시스템

## 개요

HookLabs Elite 쿠폰 관리 시스템의 보안 아키텍처는 다층 방어 전략(Defense in Depth)을 기반으로 설계됩니다. Clerk 인증 시스템과의 완전한 통합, 역할 기반 접근 제어, 그리고 쿠폰 시스템 특유의 보안 취약점들을 방어하는 종합적인 보안 프레임워크를 제공합니다.

## 보안 위협 모델 분석

### 1. 쿠폰 시스템 고유 위협

#### A. 쿠폰 남용 (Coupon Abuse)
- **위협**: 단일 사용자가 쿠폰을 여러 번 사용하려는 시도
- **영향**: 비즈니스 손실, 할인 혜택 남용
- **대응**: 사용자별 사용 횟수 제한, 세션 기반 추적

#### B. 쿠폰 코드 무차별 대입 공격 (Brute Force)
- **위협**: 자동화된 도구로 유효한 쿠폰 코드를 찾으려는 시도
- **영향**: 시스템 부하, 예상치 못한 쿠폰 사용
- **대응**: Rate limiting, CAPTCHA, 계정 잠금

#### C. 권한 상승 (Privilege Escalation)
- **위협**: 일반 사용자가 관리자 기능에 접근하려는 시도
- **영향**: 무단 쿠폰 생성/수정, 시스템 무결성 손상
- **대응**: 엄격한 권한 검증, 다단계 인증

#### D. 데이터 조작 (Data Manipulation)
- **위협**: 클라이언트 측에서 할인 금액이나 쿠폰 정보 조작
- **영향**: 부정한 할인 적용, 재정적 손실
- **대응**: 서버 측 검증, 암호화된 데이터 전송

### 2. 일반적인 웹 보안 위협

#### A. XSS (Cross-Site Scripting)
- **위협**: 악성 스크립트 삽입을 통한 사용자 데이터 탈취
- **대응**: 입력 데이터 sanitization, CSP 헤더 설정

#### B. CSRF (Cross-Site Request Forgery)
- **위협**: 사용자 모르게 악성 요청 실행
- **대응**: CSRF 토큰, SameSite 쿠키 설정

#### C. 인젝션 공격
- **위협**: SQL/NoSQL 인젝션을 통한 데이터베이스 접근
- **대응**: 매개변수화된 쿼리, 입력 검증

## 인증 및 권한 관리 아키텍처

### 1. Clerk 기반 인증 시스템

```typescript
// 인증 컨텍스트 및 권한 관리
import { useAuth, useUser } from '@clerk/nextjs';

export interface UserRole {
  role: 'user' | 'admin' | 'manager';
  permissions: Permission[];
}

export interface Permission {
  resource: 'coupons' | 'users' | 'analytics';
  actions: ('read' | 'write' | 'delete' | 'create')[];
}

// 권한 검증 훅
export const usePermissions = () => {
  const { user } = useUser();
  
  const hasPermission = useCallback((
    resource: string, 
    action: string
  ): boolean => {
    const userRole = user?.publicMetadata?.role as string;
    const permissions = user?.publicMetadata?.permissions as Permission[];
    
    if (userRole === 'admin') return true; // 관리자는 모든 권한
    
    return permissions?.some(permission => 
      permission.resource === resource && 
      permission.actions.includes(action as any)
    ) ?? false;
  }, [user]);
  
  const isAdmin = useMemo(() => 
    user?.publicMetadata?.role === 'admin'
  , [user]);
  
  const isManager = useMemo(() => 
    user?.publicMetadata?.role === 'manager'
  , [user]);
  
  return { hasPermission, isAdmin, isManager };
};
```

### 2. 역할 기반 접근 제어 (RBAC)

```typescript
// 권한 기반 컴포넌트 래퍼
export const PermissionGate = ({ 
  resource, 
  action, 
  fallback = null,
  children 
}: {
  resource: string;
  action: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission(resource, action)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// 사용 예시
export const CouponManagementSection = () => (
  <div>
    <PermissionGate 
      resource="coupons" 
      action="read"
      fallback={<AccessDeniedMessage />}
    >
      <CouponList />
    </PermissionGate>
    
    <PermissionGate 
      resource="coupons" 
      action="create"
    >
      <CreateCouponButton />
    </PermissionGate>
  </div>
);
```

### 3. API 레벨 권한 검증

```typescript
// Convex 함수에서의 권한 검증
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

// 권한 검증 헬퍼
const requirePermission = async (
  ctx: any, 
  resource: string, 
  action: string
) => {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new ConvexError("인증이 필요합니다.");
  }
  
  const userRole = identity.publicMetadata?.role;
  
  if (userRole === 'admin') return; // 관리자는 모든 권한
  
  const permissions = identity.publicMetadata?.permissions as Permission[];
  const hasPermission = permissions?.some(permission => 
    permission.resource === resource && 
    permission.actions.includes(action)
  );
  
  if (!hasPermission) {
    throw new ConvexError(`${resource}에 대한 ${action} 권한이 없습니다.`);
  }
};

// 보안이 강화된 쿠폰 생성 함수
export const createCouponSecure = mutation({
  args: { /* 쿠폰 생성 인자들 */ },
  handler: async (ctx, args) => {
    // 권한 검증
    await requirePermission(ctx, 'coupons', 'create');
    
    // 입력 검증
    validateCouponInput(args);
    
    // 중복 코드 검증
    await checkDuplicateCode(ctx, args.code);
    
    // 쿠폰 생성
    const couponId = await ctx.db.insert("coupons", {
      ...args,
      code: sanitizeCouponCode(args.code),
      createdAt: new Date().toISOString(),
      createdBy: ctx.auth.getUserIdentity()?.subject
    });
    
    // 감사 로그 기록
    await logAuditEvent(ctx, 'COUPON_CREATED', { couponId, ...args });
    
    return couponId;
  }
});
```

## 입력 검증 및 데이터 보안

### 1. 클라이언트 측 검증

```typescript
// Zod 스키마를 활용한 타입 안전 검증
import { z } from 'zod';

export const couponValidationSchema = z.object({
  code: z.string()
    .min(3, "쿠폰 코드는 최소 3자 이상이어야 합니다")
    .max(20, "쿠폰 코드는 최대 20자까지 가능합니다")
    .regex(/^[A-Z0-9]+$/, "쿠폰 코드는 영문 대문자와 숫자만 사용 가능합니다")
    .refine(
      (code) => !BLOCKED_CODES.includes(code),
      "사용할 수 없는 쿠폰 코드입니다"
    ),
  
  name: z.string()
    .min(1, "쿠폰명은 필수입니다")
    .max(100, "쿠폰명은 최대 100자까지 가능합니다")
    .refine(
      (name) => !containsProfanity(name),
      "부적절한 단어가 포함되어 있습니다"
    ),
  
  description: z.string()
    .max(500, "설명은 최대 500자까지 가능합니다")
    .optional(),
  
  type: z.enum(['percentage', 'fixed_amount', 'credits'], {
    errorMap: () => ({ message: "올바른 쿠폰 타입을 선택해주세요" })
  }),
  
  value: z.number()
    .min(0, "할인 값은 0 이상이어야 합니다")
    .max(1000000, "할인 값이 너무 큽니다")
    .refine((value, ctx) => {
      if (ctx.parent.type === 'percentage' && value > 100) {
        return false;
      }
      return true;
    }, "퍼센트 할인은 100%를 초과할 수 없습니다"),
  
  validFrom: z.date({
    required_error: "시작일은 필수입니다"
  }).refine(
    (date) => date >= new Date(),
    "시작일은 현재 시간 이후여야 합니다"
  ),
  
  validUntil: z.date().optional(),
  
  usageLimit: z.number()
    .int("사용 한도는 정수여야 합니다")
    .min(1, "사용 한도는 1 이상이어야 합니다")
    .max(1000000, "사용 한도가 너무 큽니다")
    .optional()
}).refine((data) => {
  if (data.validUntil && data.validFrom >= data.validUntil) {
    return false;
  }
  return true;
}, {
  message: "종료일은 시작일보다 늦어야 합니다",
  path: ["validUntil"]
});

// 블랙리스트 코드 및 욕설 필터링
const BLOCKED_CODES = ['ADMIN', 'TEST', 'DEBUG', 'NULL', 'UNDEFINED'];

const containsProfanity = (text: string): boolean => {
  const profanityList = ['욕설1', '욕설2']; // 실제 욕설 리스트
  const lowerText = text.toLowerCase();
  return profanityList.some(word => lowerText.includes(word));
};
```

### 2. 서버 측 검증

```typescript
// 서버 측 추가 검증 로직
export const validateCouponInput = (input: any) => {
  // HTML/Script 태그 제거
  const sanitizedInput = {
    ...input,
    name: DOMPurify.sanitize(input.name),
    description: DOMPurify.sanitize(input.description || ''),
    code: input.code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  };
  
  // 추가 비즈니스 로직 검증
  if (sanitizedInput.type === 'percentage' && sanitizedInput.value > 100) {
    throw new ConvexError("퍼센트 할인은 100%를 초과할 수 없습니다.");
  }
  
  if (sanitizedInput.usageLimit && sanitizedInput.usageLimit > 100000) {
    throw new ConvexError("사용 한도가 너무 큽니다.");
  }
  
  return sanitizedInput;
};

// 쿠폰 코드 중복 검사
export const checkDuplicateCode = async (ctx: any, code: string) => {
  const existingCoupon = await ctx.db
    .query("coupons")
    .withIndex("byCode", (q) => q.eq("code", code))
    .first();
  
  if (existingCoupon) {
    throw new ConvexError("이미 존재하는 쿠폰 코드입니다.");
  }
};
```

## 쿠폰 남용 방지 시스템

### 1. Rate Limiting

```typescript
// Redis 기반 Rate Limiting (또는 Convex에서 구현)
interface RateLimitConfig {
  windowMs: number;  // 시간 창 (밀리초)
  maxAttempts: number; // 최대 시도 횟수
  blockDurationMs: number; // 차단 시간
}

export const createRateLimiter = (config: RateLimitConfig) => {
  const attempts = new Map<string, { count: number; resetTime: number; blockedUntil?: number }>();
  
  return {
    checkLimit: async (identifier: string): Promise<boolean> => {
      const now = Date.now();
      const userAttempts = attempts.get(identifier) || { count: 0, resetTime: now + config.windowMs };
      
      // 차단 중인지 확인
      if (userAttempts.blockedUntil && userAttempts.blockedUntil > now) {
        throw new ConvexError(`너무 많은 시도로 인해 ${Math.ceil((userAttempts.blockedUntil - now) / 1000)}초 후에 다시 시도해주세요.`);
      }
      
      // 시간 창 초기화
      if (now > userAttempts.resetTime) {
        userAttempts.count = 0;
        userAttempts.resetTime = now + config.windowMs;
        userAttempts.blockedUntil = undefined;
      }
      
      // 한도 초과 검사
      if (userAttempts.count >= config.maxAttempts) {
        userAttempts.blockedUntil = now + config.blockDurationMs;
        attempts.set(identifier, userAttempts);
        throw new ConvexError("너무 많은 시도가 감지되었습니다. 잠시 후 다시 시도해주세요.");
      }
      
      userAttempts.count++;
      attempts.set(identifier, userAttempts);
      return true;
    }
  };
};

// 쿠폰 검증용 Rate Limiter
const couponValidationLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1분
  maxAttempts: 10,     // 10회 시도
  blockDurationMs: 5 * 60 * 1000 // 5분 차단
});

// 보호된 쿠폰 검증 함수
export const validateCouponWithRateLimit = mutation({
  args: { code: v.string(), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const identifier = identity?.subject || ctx.remoteAddress;
    
    // Rate Limit 검사
    await couponValidationLimiter.checkLimit(identifier);
    
    // 원래 검증 로직 실행
    return await validateCouponLogic(ctx, args);
  }
});
```

### 2. 사용자별 사용 제한 추적

```typescript
// 쿠폰 사용 추적 및 제한
export const trackCouponUsage = async (
  ctx: any, 
  userId: Id<"users">, 
  couponId: Id<"coupons">
) => {
  const coupon = await ctx.db.get(couponId);
  if (!coupon) throw new ConvexError("쿠폰을 찾을 수 없습니다.");
  
  // 사용자별 사용 횟수 확인
  if (coupon.userLimit) {
    const userUsageCount = await ctx.db
      .query("couponUsages")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("couponId"), couponId))
      .collect();
    
    if (userUsageCount.length >= coupon.userLimit) {
      throw new ConvexError("이 쿠폰의 사용자당 사용 한도에 도달했습니다.");
    }
  }
  
  // 전체 사용 횟수 확인
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    throw new ConvexError("이 쿠폰의 전체 사용 한도에 도달했습니다.");
  }
  
  // 동시성 제어를 위한 트랜잭션 처리
  const usageId = await ctx.db.insert("couponUsages", {
    userId,
    couponId,
    usedAt: new Date().toISOString(),
    ipAddress: ctx.remoteAddress,
    userAgent: ctx.userAgent
  });
  
  await ctx.db.patch(couponId, {
    usageCount: coupon.usageCount + 1,
    updatedAt: new Date().toISOString()
  });
  
  return usageId;
};
```

## 데이터 보호 및 암호화

### 1. 민감한 데이터 암호화

```typescript
// 암호화 유틸리티 (서버 측에서만 사용)
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32바이트 키
const ALGORITHM = 'aes-256-gcm';

export const encrypt = (text: string): { encrypted: string; iv: string; tag: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY, { iv });
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
};

export const decrypt = (encryptedData: { encrypted: string; iv: string; tag: string }): string => {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY, { 
    iv: Buffer.from(encryptedData.iv, 'hex') 
  });
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// 민감한 쿠폰 정보 암호화 저장
export const createSecureCoupon = mutation({
  args: { /* 쿠폰 인자들 */ },
  handler: async (ctx, args) => {
    // 민감한 정보 암호화 (필요한 경우)
    const encryptedMetadata = args.metadata ? encrypt(JSON.stringify(args.metadata)) : null;
    
    const couponId = await ctx.db.insert("coupons", {
      ...args,
      metadata: encryptedMetadata,
      createdAt: new Date().toISOString()
    });
    
    return couponId;
  }
});
```

### 2. PII 데이터 보호

```typescript
// 개인정보 마스킹 함수
export const maskSensitiveData = (data: any, userRole: string) => {
  if (userRole === 'admin') return data; // 관리자는 전체 데이터 접근
  
  return {
    ...data,
    // 이메일 마스킹
    userEmail: data.userEmail?.replace(/(.{2}).*(@.*)/, '$1***$2'),
    // IP 주소 마스킹
    ipAddress: data.ipAddress?.replace(/\.\d+$/, '.***'),
    // 사용자 ID 일부 마스킹
    userId: data.userId?.replace(/.{8}$/, '********')
  };
};

// 마스킹된 사용량 데이터 조회
export const getCouponUsagesSecure = query({
  args: { couponId: v.id("coupons") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userRole = identity?.publicMetadata?.role;
    
    const usages = await ctx.db
      .query("couponUsages")
      .withIndex("byCouponId", (q) => q.eq("couponId", args.couponId))
      .collect();
    
    // 권한에 따른 데이터 마스킹
    return usages.map(usage => maskSensitiveData(usage, userRole));
  }
});
```

## 감사 로그 및 모니터링

### 1. 보안 이벤트 로깅

```typescript
// 감사 로그 스키마
interface AuditLogEntry {
  userId: Id<"users">;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

// 감사 로그 기록
export const logSecurityEvent = async (
  ctx: any,
  eventType: 'COUPON_CREATED' | 'COUPON_USED' | 'UNAUTHORIZED_ACCESS' | 'RATE_LIMIT_EXCEEDED',
  details: any
) => {
  const identity = await ctx.auth.getUserIdentity();
  
  await ctx.db.insert("auditLogs", {
    userId: identity?.subject,
    action: eventType,
    resource: 'coupon',
    resourceId: details.resourceId,
    details: JSON.stringify(details),
    timestamp: new Date().toISOString(),
    ipAddress: ctx.remoteAddress,
    userAgent: ctx.userAgent,
    success: details.success ?? true,
    errorMessage: details.error
  });
  
  // 심각한 보안 이벤트의 경우 즉시 알림
  if (['UNAUTHORIZED_ACCESS', 'RATE_LIMIT_EXCEEDED'].includes(eventType)) {
    await sendSecurityAlert(eventType, details);
  }
};

// 보안 알림 시스템
const sendSecurityAlert = async (eventType: string, details: any) => {
  // 슬랙, 이메일 등으로 보안팀에 알림
  console.error(`[SECURITY ALERT] ${eventType}:`, details);
  
  // 실제 구현에서는 외부 알림 서비스 연동
  // await notificationService.send({
  //   channel: 'security',
  //   message: `보안 이벤트 감지: ${eventType}`,
  //   details
  // });
};
```

### 2. 실시간 보안 모니터링

```typescript
// 이상 행위 탐지
export const detectAnomalousActivity = async (
  userId: Id<"users">,
  action: string,
  context: any
) => {
  const recentActions = await db
    .query("auditLogs")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .filter((q) => 
      q.gte(q.field("timestamp"), 
        new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5분 내
      )
    )
    .collect();
  
  // 이상 패턴 감지
  const suspiciousPatterns = [
    // 짧은 시간 내 과도한 쿠폰 검증 시도
    () => recentActions.filter(log => 
      log.action === 'COUPON_VALIDATION' && !log.success
    ).length > 10,
    
    // 다양한 IP에서의 동시 접근
    () => new Set(recentActions.map(log => log.ipAddress)).size > 3,
    
    // 관리자 기능에 대한 반복적인 무권한 접근 시도
    () => recentActions.filter(log => 
      log.action === 'UNAUTHORIZED_ACCESS' &&
      log.details.includes('admin')
    ).length > 3
  ];
  
  const isAnomalous = suspiciousPatterns.some(pattern => pattern());
  
  if (isAnomalous) {
    await logSecurityEvent(context, 'ANOMALOUS_ACTIVITY_DETECTED', {
      userId,
      recentActionCount: recentActions.length,
      suspiciousPatterns: suspiciousPatterns.map((_, index) => index).filter(i => suspiciousPatterns[i]())
    });
    
    // 일시적 계정 제한 고려
    await considerAccountSuspension(userId, recentActions);
  }
};
```

## 클라이언트 측 보안 강화

### 1. Content Security Policy (CSP)

```typescript
// next.config.js에서 CSP 헤더 설정
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://clerk.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.convex.cloud https://clerk.com",
      "frame-src https://challenges.cloudflare.com",
    ].join('; ')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];
```

### 2. 안전한 데이터 처리

```typescript
// XSS 방지를 위한 안전한 렌더링
export const SafeText = ({ children }: { children: string }) => {
  const sanitizedText = DOMPurify.sanitize(children, {
    ALLOWED_TAGS: [], // HTML 태그 완전 제거
    ALLOWED_ATTR: []
  });
  
  return <span>{sanitizedText}</span>;
};

// 안전한 쿠폰 코드 표시
export const SecureCouponDisplay = ({ coupon }: { coupon: Coupon }) => (
  <div className="font-mono bg-gray-100 p-2 rounded">
    <SafeText>{coupon.code}</SafeText>
  </div>
);

// CSRF 토큰 자동 포함
export const SecureForm = ({ onSubmit, children, ...props }) => {
  const { getToken } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getToken();
    
    // CSRF 토큰과 함께 요청
    await onSubmit(e, { csrfToken: token });
  };
  
  return (
    <form onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
};
```

## 인시던트 대응 계획

### 1. 보안 인시던트 분류

```typescript
enum SecurityIncidentLevel {
  LOW = 1,     // 의심스러운 활동 감지
  MEDIUM = 2,  // 권한 없는 접근 시도
  HIGH = 3,    // 데이터 무결성 위험
  CRITICAL = 4 // 시스템 침해 확인
}

interface SecurityIncident {
  id: string;
  level: SecurityIncidentLevel;
  type: string;
  description: string;
  affectedUsers: string[];
  detectionTime: Date;
  status: 'detected' | 'investigating' | 'contained' | 'resolved';
  actions: SecurityAction[];
}

interface SecurityAction {
  timestamp: Date;
  action: string;
  performer: string;
  result: string;
}
```

### 2. 자동 대응 시스템

```typescript
// 자동 보안 대응 시스템
export const automaticSecurityResponse = async (
  incidentType: string,
  severity: SecurityIncidentLevel,
  context: any
) => {
  const responses: Record<string, () => Promise<void>> = {
    'BRUTE_FORCE_DETECTED': async () => {
      // IP 기반 일시 차단
      await blockIPAddress(context.ipAddress, 30 * 60 * 1000); // 30분
      await logSecurityEvent(context, 'IP_BLOCKED', { 
        ipAddress: context.ipAddress,
        reason: 'brute_force' 
      });
    },
    
    'PRIVILEGE_ESCALATION_ATTEMPT': async () => {
      // 사용자 계정 일시 정지
      await suspendUserAccount(context.userId, 60 * 60 * 1000); // 1시간
      await notifySecurityTeam('URGENT: Privilege escalation attempt detected', context);
    },
    
    'DATA_MANIPULATION_DETECTED': async () => {
      // 트랜잭션 롤백
      await rollbackSuspiciousTransactions(context.transactionIds);
      // 즉시 관리자 알림
      await emergencyNotification('Data manipulation detected', context);
    }
  };
  
  const response = responses[incidentType];
  if (response) {
    await response();
  }
  
  // 모든 인시던트는 로그에 기록
  await recordSecurityIncident({
    type: incidentType,
    level: severity,
    context,
    timestamp: new Date(),
    autoResponseApplied: !!response
  });
};
```

## 보안 테스트 전략

### 1. 자동화된 보안 테스트

```typescript
// 보안 테스트 스위트
describe('Security Tests', () => {
  describe('Authentication & Authorization', () => {
    it('should reject unauthorized admin access', async () => {
      const unauthorizedUser = createMockUser({ role: 'user' });
      
      await expect(
        adminOnlyFunction.call({ auth: { getUserIdentity: () => unauthorizedUser } })
      ).rejects.toThrow('권한이 없습니다');
    });
    
    it('should validate JWT tokens properly', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      await expect(
        authenticatedFunction.call({ auth: { getToken: () => invalidToken } })
      ).rejects.toThrow('인증이 필요합니다');
    });
  });
  
  describe('Input Validation', () => {
    it('should sanitize coupon codes', () => {
      const maliciousCode = '<script>alert("xss")</script>COUPON20';
      const sanitized = sanitizeCouponCode(maliciousCode);
      
      expect(sanitized).toBe('COUPON20');
      expect(sanitized).not.toContain('<script>');
    });
    
    it('should reject SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE coupons; --";
      
      await expect(
        searchCoupons(maliciousInput)
      ).not.toThrow(); // 안전하게 처리되어야 함
    });
  });
  
  describe('Rate Limiting', () => {
    it('should block excessive coupon validation attempts', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxAttempts: 5,
        blockDurationMs: 300000
      });
      
      // 5번의 시도는 성공해야 함
      for (let i = 0; i < 5; i++) {
        await expect(rateLimiter.checkLimit('test-user')).resolves.toBe(true);
      }
      
      // 6번째 시도는 차단되어야 함
      await expect(rateLimiter.checkLimit('test-user')).rejects.toThrow();
    });
  });
});
```

### 2. 침투 테스트 시나리오

```typescript
// 침투 테스트용 시뮬레이터
export class SecurityTestSimulator {
  async simulateBruteForceAttack(targetEndpoint: string, attempts: number = 100) {
    const results = {
      successful: 0,
      blocked: 0,
      errors: 0
    };
    
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(targetEndpoint, {
          method: 'POST',
          body: JSON.stringify({ code: `TEST${i}` })
        });
        
        if (response.ok) results.successful++;
        else if (response.status === 429) results.blocked++;
        else results.errors++;
        
      } catch (error) {
        results.errors++;
      }
      
      // 짧은 간격으로 요청 (실제 공격 시뮬레이션)
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return results;
  }
  
  async testPrivilegeEscalation(userToken: string, adminEndpoints: string[]) {
    const results: Array<{ endpoint: string; accessible: boolean }> = [];
    
    for (const endpoint of adminEndpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        
        results.push({
          endpoint,
          accessible: response.ok
        });
      } catch (error) {
        results.push({
          endpoint,
          accessible: false
        });
      }
    }
    
    return results;
  }
}
```

---

**문서 버전**: v1.0  
**작성일**: 2025년 9월 3일  
**작성자**: Security Architecture Specialist  
**검토자**: [검토 예정]  
**승인자**: [승인 예정]