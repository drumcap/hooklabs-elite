/**
 * 인증 및 권한 관리 헬퍼 함수들
 * JWT 토큰 처리, 사용자 인증, 권한 확인 등
 */

import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { DataModel } from "../schema";

// 권한 레벨 정의
export enum PermissionLevel {
  GUEST = 0,
  USER = 1,
  PREMIUM = 2,
  ADMIN = 3,
  SUPER_ADMIN = 4,
}

// 권한 에러
export const AUTH_ERRORS = {
  NOT_AUTHENTICATED: "인증되지 않은 사용자입니다",
  INSUFFICIENT_PERMISSION: "권한이 부족합니다",
  USER_NOT_FOUND: "사용자를 찾을 수 없습니다",
  INVALID_TOKEN: "유효하지 않은 토큰입니다",
  TOKEN_EXPIRED: "토큰이 만료되었습니다",
  ACCOUNT_DISABLED: "비활성화된 계정입니다",
} as const;

// 사용자 컨텍스트 인터페이스
export interface UserContext {
  userId: Id<"users">;
  externalId: string;
  name: string;
  email?: string;
  permissionLevel: PermissionLevel;
  subscription?: {
    status: string;
    plan: string;
  };
}

/**
 * 사용자 인증 확인 (필수)
 * JWT 토큰에서 사용자 정보를 추출하고 검증
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error(AUTH_ERRORS.NOT_AUTHENTICATED);
  }

  // Clerk에서 제공하는 subject가 사용자의 externalId
  const externalId = identity.subject;
  
  // DB에서 사용자 찾기
  const user = await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();

  if (!user) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  return user._id;
}

/**
 * 선택적 사용자 인증 확인
 * 로그인하지 않아도 접근 가능한 리소스에서 사용
 */
export async function getOptionalAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users"> | null> {
  try {
    return await requireAuth(ctx);
  } catch {
    return null;
  }
}

/**
 * 사용자 전체 컨텍스트 가져오기
 */
export async function getUserContext(ctx: QueryCtx | MutationCtx): Promise<UserContext> {
  const userId = await requireAuth(ctx);
  
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  // 구독 정보 조회
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "active"))
    .first();

  return {
    userId: user._id,
    externalId: user.externalId,
    name: user.name,
    permissionLevel: PermissionLevel.USER, // 기본 권한
    subscription: subscription ? {
      status: subscription.status,
      plan: subscription.planName,
    } : undefined,
  };
}

/**
 * 관리자 권한 확인 (DB 기반 역할 시스템)
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await requireAuth(ctx);
  
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error(AUTH_ERRORS.USER_NOT_FOUND);
  }

  // DB에서 사용자 역할 확인
  const isAdmin = await checkUserRole(ctx, userId, ['admin', 'super_admin']);
  if (!isAdmin) {
    // 환경변수 기반 백업 관리자 체크 (초기 설정용)
    const fallbackAdminEmails = process.env.FALLBACK_ADMIN_EMAILS?.split(',') || [];
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity?.email || !fallbackAdminEmails.includes(identity.email.trim())) {
      throw new Error(AUTH_ERRORS.INSUFFICIENT_PERMISSION);
    }
  }

  return userId;
}

/**
 * 사용자 역할 확인 헬퍼 함수
 */
export async function checkUserRole(
  ctx: QueryCtx | MutationCtx, 
  userId: Id<"users">, 
  allowedRoles: string[]
): Promise<boolean> {
  // 사용자 역할 테이블에서 확인
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  if (!userRole) {
    return false;
  }

  return allowedRoles.includes(userRole.role);
}

/**
 * 권한 레벨 기반 접근 제어
 */
export async function requirePermissionLevel(
  ctx: QueryCtx | MutationCtx, 
  requiredLevel: PermissionLevel
): Promise<Id<"users">> {
  const userId = await requireAuth(ctx);
  const userLevel = await getUserPermissionLevel(ctx, userId);
  
  if (userLevel < requiredLevel) {
    throw new Error(AUTH_ERRORS.INSUFFICIENT_PERMISSION);
  }
  
  return userId;
}

/**
 * 사용자 권한 레벨 조회
 */
export async function getUserPermissionLevel(
  ctx: QueryCtx | MutationCtx, 
  userId: Id<"users">
): Promise<PermissionLevel> {
  // 사용자 역할 확인
  const userRole = await ctx.db
    .query("userRoles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();

  if (!userRole) {
    return PermissionLevel.USER; // 기본 사용자 권한
  }

  // 역할을 권한 레벨로 매핑
  const roleToLevel: Record<string, PermissionLevel> = {
    'guest': PermissionLevel.GUEST,
    'user': PermissionLevel.USER,
    'premium': PermissionLevel.PREMIUM,
    'admin': PermissionLevel.ADMIN,
    'super_admin': PermissionLevel.SUPER_ADMIN,
  };

  return roleToLevel[userRole.role] || PermissionLevel.USER;
}

/**
 * 프리미엄 사용자 권한 확인
 */
export async function requirePremium(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await requireAuth(ctx);
  
  // 활성 구독 확인
  const activeSubscription = await ctx.db
    .query("subscriptions")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "active"))
    .first();

  if (!activeSubscription) {
    throw new Error("프리미엄 구독이 필요합니다");
  }

  return userId;
}

/**
 * 리소스 소유권 확인
 */
export async function requireResourceOwnership<T extends string>(
  ctx: QueryCtx | MutationCtx,
  tableName: T,
  resourceId: Id<any>,
  userIdField: string = "userId"
): Promise<Id<"users">> {
  const userId = await requireAuth(ctx);
  
  const resource = await ctx.db.get(resourceId);
  if (!resource) {
    throw new Error("리소스를 찾을 수 없습니다");
  }

  if ((resource as any)[userIdField] !== userId) {
    throw new Error(AUTH_ERRORS.INSUFFICIENT_PERMISSION);
  }

  return userId;
}

/**
 * 사용량 제한 확인
 */
export async function checkUsageLimit(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  resourceType: string,
  limit: number
): Promise<boolean> {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const usage = await ctx.db
    .query("usage")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .filter((q) => 
      q.and(
        q.eq(q.field("resourceType"), resourceType),
        q.gte(q.field("timestamp"), `${currentMonth}-01`)
      )
    )
    .collect();

  const totalUsage = usage.reduce((sum, record) => sum + record.amount, 0);
  return totalUsage < limit;
}

/**
 * 크레딧 잔액 확인
 */
export async function checkCreditBalance(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  requiredCredits: number
): Promise<boolean> {
  const creditBalance = await ctx.db
    .query("userCreditBalances" as any)
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  if (!creditBalance) {
    return false;
  }

  return creditBalance.availableCredits >= requiredCredits;
}

/**
 * 크레딧 차감
 */
export async function deductCredits(
  ctx: MutationCtx,
  userId: Id<"users">,
  amount: number,
  description: string,
  metadata?: any
): Promise<void> {
  // 잔액 확인
  const hasEnoughCredits = await checkCreditBalance(ctx, userId, amount);
  if (!hasEnoughCredits) {
    throw new Error("크레딧이 부족합니다");
  }

  // 크레딧 사용 기록 생성
  await ctx.db.insert("credits", {
    userId,
    amount: -amount, // 음수로 차감 표시
    type: "used",
    description,
    metadata,
    createdAt: new Date().toISOString(),
  });

  // 잔액 업데이트
  const balance = await ctx.db
    .query("userCreditBalances" as any)
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  if (balance) {
    await ctx.db.patch(balance._id, {
      availableCredits: (balance as any).availableCredits - amount,
      usedCredits: (balance as any).usedCredits + amount,
      lastUpdated: new Date().toISOString(),
    } as any);
  }
}

/**
 * 사용량 기록
 */
export async function recordUsage(
  ctx: MutationCtx,
  userId: Id<"users">,
  resourceType: string,
  amount: number,
  description: string,
  metadata?: any
): Promise<void> {
  await ctx.db.insert("usage", {
    userId,
    resourceType,
    amount,
    unit: "count",
    description,
    metadata,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
}

/**
 * IP 기반 접근 제한 확인 (간단한 예시)
 */
export function checkIPRestriction(request: Request, allowedIPs?: string[]): boolean {
  if (!allowedIPs || allowedIPs.length === 0) {
    return true; // 제한 없음
  }

  const clientIP = request.headers.get("x-forwarded-for") || 
                   request.headers.get("x-real-ip") || 
                   "unknown";

  return allowedIPs.includes(clientIP);
}

/**
 * Rate Limiting 체크 (간단한 인메모리 구현)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // 새로운 윈도우 시작
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }
  
  if (current.count >= maxRequests) {
    // 제한 초과
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
    };
  }
  
  // 요청 카운트 증가
  current.count++;
  rateLimitStore.set(key, current);
  
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime,
  };
}

/**
 * 세션 기반 인증 헬퍼 (WebSocket 등에서 사용)
 */
export class SessionManager {
  private static sessions = new Map<string, {
    userId: Id<"users">;
    expiresAt: number;
    metadata?: any;
  }>();

  static createSession(userId: Id<"users">, durationMs: number = 24 * 60 * 60 * 1000): string {
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + durationMs;
    
    this.sessions.set(sessionId, {
      userId,
      expiresAt,
    });
    
    return sessionId;
  }

  static validateSession(sessionId: string): Id<"users"> | null {
    const session = this.sessions.get(sessionId);
    
    if (!session || Date.now() > session.expiresAt) {
      if (session) {
        this.sessions.delete(sessionId);
      }
      return null;
    }
    
    return session.userId;
  }

  static destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  static cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

/**
 * 권한 기반 접근 제어 데코레이터
 */
export function withAuth<T extends any[], R>(
  handler: (ctx: QueryCtx | MutationCtx, ...args: T) => Promise<R>,
  options: {
    requireAuth?: boolean;
    requirePremium?: boolean;
    requireAdmin?: boolean;
    checkOwnership?: { table: keyof DataModel; idParam: number };
  } = {}
) {
  return async (ctx: QueryCtx | MutationCtx, ...args: T): Promise<R> => {
    let userId: Id<"users"> | null = null;

    // 인증 확인
    if (options.requireAuth !== false) {
      userId = await requireAuth(ctx);
    }

    // 프리미엄 확인
    if (options.requirePremium && userId) {
      await requirePremium(ctx);
    }

    // 관리자 확인
    if (options.requireAdmin && userId) {
      await requireAdmin(ctx);
    }

    // 소유권 확인
    if (options.checkOwnership && userId) {
      const resourceId = args[options.checkOwnership.idParam] as Id<any>;
      await requireResourceOwnership(ctx, options.checkOwnership.table, resourceId);
    }

    return handler(ctx, ...args);
  };
}