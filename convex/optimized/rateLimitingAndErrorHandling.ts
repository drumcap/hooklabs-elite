import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { getAuthUserId } from "../auth";

// 🚦 Rate Limiting 및 에러 처리 시스템

interface RateLimitConfig {
  windowMs: number; // 시간 창 (밀리초)
  maxRequests: number; // 최대 요청 수
  keyGenerator: (ctx: any, args: any) => string;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  message: string;
}

interface ErrorTrackingData {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  userId?: string;
  endpoint: string;
  timestamp: string;
  requestData: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs?: number;
}

// 메모리 기반 Rate Limiter (실제로는 Redis 사용 권장)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const errorTracking = new Map<string, ErrorTrackingData>();

// 🎯 Rate Limiting 미들웨어
export function withRateLimit<T>(
  config: RateLimitConfig,
  handler: (ctx: any, args: any) => Promise<T>
) {
  return async (ctx: any, args: any): Promise<T> => {
    const key = config.keyGenerator(ctx, args);
    const now = Date.now();
    
    // 현재 시간 창 확인
    const record = rateLimitStore.get(key);
    
    if (record) {
      if (now > record.resetTime) {
        // 새로운 시간 창 시작
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.windowMs,
        });
      } else if (record.count >= config.maxRequests) {
        // Rate limit 초과
        const remainingTime = Math.ceil((record.resetTime - now) / 1000);
        throw new Error(
          `${config.message} (${remainingTime}초 후 다시 시도해주세요)`
        );
      } else {
        // 카운트 증가
        record.count++;
      }
    } else {
      // 첫 요청
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
    }

    try {
      const result = await handler(ctx, args);
      
      // 성공한 요청은 카운트에서 제외하는 옵션
      if (config.skipSuccessfulRequests) {
        const currentRecord = rateLimitStore.get(key);
        if (currentRecord && currentRecord.count > 0) {
          currentRecord.count--;
        }
      }
      
      return result;
    } catch (error) {
      // 실패한 요청은 카운트에서 제외하는 옵션
      if (config.skipFailedRequests) {
        const currentRecord = rateLimitStore.get(key);
        if (currentRecord && currentRecord.count > 0) {
          currentRecord.count--;
        }
      }
      throw error;
    }
  };
}

// 🔄 재시도 로직 with Exponential Backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  shouldRetry: (error: any) => boolean = () => true
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === config.maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );
      
      const jitter = config.jitterMs ? Math.random() * config.jitterMs : 0;
      const totalDelay = delay + jitter;
      
      console.log(`Retry attempt ${attempt} after ${totalDelay}ms delay`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError;
}

// 🚨 에러 추적 및 알림 시스템
export function trackError(
  errorType: string,
  error: Error,
  context: {
    userId?: string;
    endpoint: string;
    requestData?: any;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }
) {
  const errorKey = `${errorType}:${error.message}`;
  const existing = errorTracking.get(errorKey);
  
  if (existing) {
    existing.count++;
    existing.timestamp = new Date().toISOString();
  } else {
    errorTracking.set(errorKey, {
      errorType,
      errorMessage: error.message,
      stackTrace: error.stack,
      userId: context.userId,
      endpoint: context.endpoint,
      timestamp: new Date().toISOString(),
      requestData: context.requestData,
      severity: context.severity || 'medium',
      count: 1,
    });
  }
  
  // Critical 에러는 즉시 알림 (실제 구현에서는 Slack, Email 등)
  if (context.severity === 'critical') {
    console.error('🚨 CRITICAL ERROR:', {
      type: errorType,
      message: error.message,
      endpoint: context.endpoint,
      userId: context.userId,
    });
  }
}

// 📊 Rate Limit이 적용된 게시물 생성 API
export const createPostWithRateLimit = mutation({
  args: {
    personaId: v.id("personas"),
    originalContent: v.string(),
    platforms: v.array(v.string()),
  },
  handler: withRateLimit(
    {
      windowMs: 60 * 1000, // 1분
      maxRequests: 10, // 분당 10개 게시물
      keyGenerator: (ctx, args) => {
        // Note: keyGenerator는 동기 함수여야 함
        return `create_post:default`;
      },
      skipSuccessfulRequests: false,
      skipFailedRequests: true,
      message: 'API 호출 한도를 초과했습니다',
    },
    async (ctx, { personaId, originalContent, platforms }) => {
      const userId = await getAuthUserId(ctx);
      if (!userId) {
        throw new Error("인증이 필요합니다");
      }

      try {
        // 재시도 로직을 포함한 게시물 생성
        return await withRetry(
          async () => {
            const postId = await ctx.db.insert("socialPosts", {
              userId,
              personaId,
              originalContent,
              finalContent: originalContent,
              platforms,
              status: "draft",
              hashtags: [],
              creditsUsed: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            return { success: true, postId };
          },
          {
            maxAttempts: 3,
            baseDelayMs: 500,
            maxDelayMs: 2000,
            backoffMultiplier: 2,
            jitterMs: 100,
          },
          (error) => {
            // 특정 에러만 재시도
            const message = (error as any)?.message || '';
            return !message.includes('validation failed') &&
                   !message.includes('unauthorized');
          }
        );
      } catch (error) {
        trackError('CREATE_POST_ERROR', error as Error, {
          userId,
          endpoint: 'createPost',
          requestData: { personaId, originalContent, platforms },
          severity: 'medium',
        });
        throw error;
      }
    }
  ),
});

// 🎯 AI 생성을 위한 Rate Limited API
export const generateContentWithRateLimit = action({
  args: {
    postId: v.id("socialPosts"),
    personaId: v.id("personas"),
    variantCount: v.optional(v.number()),
  },
  handler: withRateLimit(
    {
      windowMs: 60 * 1000, // 1분
      maxRequests: 5, // 분당 5회 AI 생성
      keyGenerator: (ctx, args) => {
        // Note: keyGenerator는 동기 함수여야 함
        return `ai_generate:default`;
      },
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'AI 생성 API 호출 한도를 초과했습니다',
    },
    async (ctx, { postId, personaId, variantCount = 3 }) => {
      const userId = await getAuthUserId(ctx);
      if (!userId) {
        throw new Error("인증이 필요합니다");
      }

      try {
        return await withRetry(
          async () => {
            const result = await ctx.runAction('actions/contentGeneration:generateVariants', {
              postId,
              personaId,
              originalContent: '', // 실제로는 게시물에서 가져옴
              platforms: ['twitter'],
              variantCount,
            });

            return result;
          },
          {
            maxAttempts: 2, // AI 생성은 비용이 높으므로 재시도 제한
            baseDelayMs: 1000,
            maxDelayMs: 3000,
            backoffMultiplier: 1.5,
          },
          (error) => {
            // API 키 오류나 할당량 초과는 재시도 안함
            const message = (error as any)?.message || '';
            return !message.includes('API key') &&
                   !message.includes('quota exceeded') &&
                   !message.includes('insufficient credits');
          }
        );
      } catch (error) {
        trackError('AI_GENERATION_ERROR', error as Error, {
          userId,
          endpoint: 'generateContent',
          requestData: { postId, personaId, variantCount },
          severity: (error as any)?.message?.includes('quota') ? 'high' : 'medium',
        });
        throw error;
      }
    }
  ),
});

// 📈 Rate Limit 상태 조회
export const getRateLimitStatus = query({
  args: {
    keys: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { keys }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const defaultKeys = [
      `create_post:${userId}`,
      `ai_generate:${userId}`,
      `social_publish:${userId}`,
    ];

    const keysToCheck = keys || defaultKeys;
    const now = Date.now();
    
    const status: Record<string, {
      remaining: number;
      resetTime: number;
      resetIn: number;
    }> = {};

    keysToCheck.forEach(key => {
      const record = rateLimitStore.get(key);
      
      if (record && now <= record.resetTime) {
        const maxRequests = getMaxRequestsForKey(key);
        status[key] = {
          remaining: Math.max(0, maxRequests - record.count),
          resetTime: record.resetTime,
          resetIn: Math.ceil((record.resetTime - now) / 1000),
        };
      } else {
        const maxRequests = getMaxRequestsForKey(key);
        status[key] = {
          remaining: maxRequests,
          resetTime: now + getWindowMsForKey(key),
          resetIn: getWindowMsForKey(key) / 1000,
        };
      }
    });

    return status;
  },
});

// 도우미 함수들
function getMaxRequestsForKey(key: string): number {
  if (key.includes('create_post')) return 10;
  if (key.includes('ai_generate')) return 5;
  if (key.includes('social_publish')) return 20;
  return 100; // 기본값
}

function getWindowMsForKey(key: string): number {
  if (key.includes('create_post')) return 60 * 1000; // 1분
  if (key.includes('ai_generate')) return 60 * 1000; // 1분
  if (key.includes('social_publish')) return 60 * 1000; // 1분
  return 60 * 1000; // 기본값
}

// 🚨 에러 통계 조회
export const getErrorStatistics = query({
  args: {
    timeRange: v.optional(v.string()),
    severity: v.optional(v.string()),
  },
  handler: async (ctx, { timeRange = '24h', severity }) => {
    const now = Date.now();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[timeRange] || 24 * 60 * 60 * 1000;

    const cutoffTime = new Date(now - timeRangeMs).toISOString();
    
    const errors = Array.from(errorTracking.values())
      .filter(error => {
        const errorTime = new Date(error.timestamp).getTime();
        const isInRange = errorTime >= now - timeRangeMs;
        const matchesSeverity = !severity || error.severity === severity;
        return isInRange && matchesSeverity;
      });

    // 에러 통계 집계
    const statistics = {
      totalErrors: errors.reduce((sum, error) => sum + error.count, 0),
      uniqueErrors: errors.length,
      errorsByType: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      errorsByEndpoint: {} as Record<string, number>,
      topErrors: errors
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(error => ({
          type: error.errorType,
          message: error.errorMessage,
          count: error.count,
          severity: error.severity,
          endpoint: error.endpoint,
          lastSeen: error.timestamp,
        })),
      trends: {
        hourly: calculateHourlyTrends(errors, timeRangeMs),
        daily: timeRangeMs >= 24 * 60 * 60 * 1000 ? calculateDailyTrends(errors, timeRangeMs) : null,
      },
    };

    // 집계 계산
    errors.forEach(error => {
      statistics.errorsByType[error.errorType] = 
        (statistics.errorsByType[error.errorType] || 0) + error.count;
      
      statistics.errorsBySeverity[error.severity] = 
        (statistics.errorsBySeverity[error.severity] || 0) + error.count;
      
      statistics.errorsByEndpoint[error.endpoint] = 
        (statistics.errorsByEndpoint[error.endpoint] || 0) + error.count;
    });

    return statistics;
  },
});

function calculateHourlyTrends(errors: ErrorTrackingData[], timeRangeMs: number): Array<{ hour: string; count: number }> {
  const hours = Math.min(24, Math.ceil(timeRangeMs / (60 * 60 * 1000)));
  const now = new Date();
  const trends = [];
  
  for (let i = hours - 1; i >= 0; i--) {
    const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
    
    const count = errors
      .filter(error => {
        const errorTime = new Date(error.timestamp);
        return errorTime >= hourStart && errorTime < hourEnd;
      })
      .reduce((sum, error) => sum + error.count, 0);
    
    trends.push({
      hour: hourStart.toISOString().slice(11, 16), // HH:MM 형식
      count,
    });
  }
  
  return trends;
}

function calculateDailyTrends(errors: ErrorTrackingData[], timeRangeMs: number): Array<{ date: string; count: number }> {
  const days = Math.min(30, Math.ceil(timeRangeMs / (24 * 60 * 60 * 1000)));
  const now = new Date();
  const trends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const count = errors
      .filter(error => {
        const errorTime = new Date(error.timestamp);
        return errorTime >= dayStart && errorTime < dayEnd;
      })
      .reduce((sum, error) => sum + error.count, 0);
    
    trends.push({
      date: dayStart.toISOString().slice(0, 10), // YYYY-MM-DD 형식
      count,
    });
  }
  
  return trends;
}

// 🧹 에러 추적 정리
export const cleanupErrorTracking = action({
  args: {
    olderThanHours: v.optional(v.number()),
  },
  handler: async (ctx, { olderThanHours = 168 }) => { // 기본 7일
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
    let cleanedCount = 0;
    
    for (const [key, error] of errorTracking) {
      if (error.timestamp < cutoffTime) {
        errorTracking.delete(key);
        cleanedCount++;
      }
    }
    
    return {
      success: true,
      cleanedCount,
      remainingCount: errorTracking.size,
    };
  },
});

// 🔧 Rate Limit 설정 업데이트
export const updateRateLimitConfig = mutation({
  args: {
    endpoint: v.string(),
    maxRequests: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, { endpoint, maxRequests, windowMs }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 관리자 권한 확인 (실제 구현에서)
    // const user = await ctx.db.get(userId);
    // if (!user.isAdmin) throw new Error("관리자 권한이 필요합니다");

    // 설정을 데이터베이스에 저장 (실제 구현에서)
    // await ctx.db.insert('rate_limit_configs', {
    //   endpoint,
    //   maxRequests,
    //   windowMs,
    //   updatedBy: userId,
    //   updatedAt: new Date().toISOString(),
    // });

    return {
      success: true,
      message: `${endpoint}의 Rate Limit 설정이 업데이트되었습니다`,
      config: { endpoint, maxRequests, windowMs },
    };
  },
});