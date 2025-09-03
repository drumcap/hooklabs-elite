/**
 * Rate Limiting 시스템
 * - API 요청 제한
 * - 사용자별 제한
 * - IP별 제한
 * - 엔드포인트별 제한
 */

import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate Limit 설정
 */
export interface RateLimitConfig {
  window: number;      // 시간 창 (초)
  max: number;         // 최대 요청 수
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  onLimitReached?: (req: NextRequest) => void;
}

/**
 * 기본 Rate Limit 설정들
 */
export const RATE_LIMITS = {
  // API 기본 제한
  DEFAULT: {
    window: 60,        // 1분
    max: 100,          // 100 요청/분
  },
  
  // 인증 관련 (더 엄격)
  AUTH: {
    window: 900,       // 15분
    max: 5,            // 5 요청/15분
  },
  
  // 로그인 시도
  LOGIN: {
    window: 900,       // 15분
    max: 10,           // 10 요청/15분
  },
  
  // 결제 관련 (매우 엄격)
  PAYMENT: {
    window: 3600,      // 1시간
    max: 10,           // 10 요청/시간
  },
  
  // AI 생성 요청
  AI_GENERATION: {
    window: 3600,      // 1시간
    max: 100,          // 100 요청/시간 (유료 사용자)
  },
  
  // 무료 사용자 AI 요청
  AI_GENERATION_FREE: {
    window: 86400,     // 24시간
    max: 10,           // 10 요청/일
  },
  
  // 파일 업로드
  UPLOAD: {
    window: 3600,      // 1시간
    max: 50,           // 50 요청/시간
  },
  
  // 소셜 미디어 게시
  SOCIAL_POST: {
    window: 3600,      // 1시간
    max: 20,           // 20 게시물/시간
  },
  
  // 메트릭 조회
  METRICS: {
    window: 300,       // 5분
    max: 30,           // 30 요청/5분
  },
  
  // 웹훅
  WEBHOOK: {
    window: 60,        // 1분
    max: 1000,         // 1000 요청/분
  },
  
  // 전역 IP 제한 (매우 관대)
  GLOBAL_IP: {
    window: 3600,      // 1시간
    max: 10000,        // 10,000 요청/시간
  },
} as const;

/**
 * Rate Limiter 클래스
 */
export class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    this.config = config;
  }

  /**
   * Rate Limit 체크
   */
  async check(
    key: string
  ): Promise<{
    success: boolean;
    remaining: number;
    resetTime: number;
    totalRequests: number;
  }> {
    const now = Date.now();
    const window = this.config.window * 1000; // 밀리초로 변환
    const windowStart = now - window;

    try {
      // 현재 윈도우의 요청 수 조회
      const current = await this.redis.zcount(key, windowStart, now);
      const remaining = Math.max(0, this.config.max - current);
      
      if (current >= this.config.max) {
        // 제한 초과
        return {
          success: false,
          remaining: 0,
          resetTime: Math.ceil((windowStart + window) / 1000),
          totalRequests: current,
        };
      }

      // 요청 기록
      await this.redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
      
      // 만료된 요청 정리
      await this.redis.zremrangebyscore(key, 0, windowStart);
      
      // 키 만료 시간 설정
      await this.redis.expire(key, this.config.window);

      return {
        success: true,
        remaining: remaining - 1,
        resetTime: Math.ceil((now + window) / 1000),
        totalRequests: current + 1,
      };

    } catch (error) {
      console.error('Rate limiting error:', error);
      // Redis 오류시 요청 허용 (장애 시 서비스 계속 제공)
      return {
        success: true,
        remaining: this.config.max,
        resetTime: Math.ceil((now + window) / 1000),
        totalRequests: 0,
      };
    }
  }

  /**
   * Rate Limit 초기화
   */
  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Rate limit reset error:', error);
    }
  }

  /**
   * 현재 사용량 조회
   */
  async getUsage(key: string): Promise<number> {
    try {
      const now = Date.now();
      const windowStart = now - (this.config.window * 1000);
      return await this.redis.zcount(key, windowStart, now);
    } catch (error) {
      console.error('Rate limit usage error:', error);
      return 0;
    }
  }
}

/**
 * Rate Limit 미들웨어 생성기
 */
export function createRateLimitMiddleware(
  config: RateLimitConfig & {
    keyPrefix?: string;
    message?: string;
  }
) {
  const limiter = new RateLimiter(config);
  const keyPrefix = config.keyPrefix || 'rate_limit';
  const message = config.message || 'Too many requests';

  return async (req: NextRequest): Promise<NextResponse | null> => {
    try {
      // 키 생성
      const key = config.keyGenerator 
        ? config.keyGenerator(req)
        : `${keyPrefix}:${getClientIP(req)}`;

      // Rate limit 체크
      const result = await limiter.check(key);

      if (!result.success) {
        // 제한 초과시 콜백 실행
        if (config.onLimitReached) {
          config.onLimitReached(req);
        }

        // 429 응답 반환
        const response = NextResponse.json(
          {
            error: message,
            resetTime: result.resetTime,
            remaining: result.remaining,
          },
          { status: 429 }
        );

        // Rate limit 헤더 추가
        response.headers.set('X-RateLimit-Limit', config.max.toString());
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
        response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
        response.headers.set('Retry-After', config.window.toString());

        return response;
      }

      // 성공시 헤더만 추가하고 다음 미들웨어로
      return null;

    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // 에러시 요청 허용
      return null;
    }
  };
}

/**
 * 사용자별 Rate Limit 키 생성
 */
export function createUserRateLimitKey(
  userId: string,
  endpoint: string
): string {
  return `rate_limit:user:${userId}:${endpoint}`;
}

/**
 * IP별 Rate Limit 키 생성
 */
export function createIPRateLimitKey(
  ip: string,
  endpoint: string
): string {
  return `rate_limit:ip:${ip}:${endpoint}`;
}

/**
 * 구독 계층별 Rate Limit 설정
 */
export function getRateLimitByPlan(
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
): Record<string, RateLimitConfig> {
  const baseLimits = {
    free: {
      aiGeneration: { ...RATE_LIMITS.AI_GENERATION_FREE },
      socialPost: { ...RATE_LIMITS.SOCIAL_POST, max: 5 },
      upload: { ...RATE_LIMITS.UPLOAD, max: 10 },
    },
    starter: {
      aiGeneration: { ...RATE_LIMITS.AI_GENERATION, max: 50 },
      socialPost: { ...RATE_LIMITS.SOCIAL_POST, max: 10 },
      upload: { ...RATE_LIMITS.UPLOAD, max: 25 },
    },
    pro: {
      aiGeneration: { ...RATE_LIMITS.AI_GENERATION, max: 200 },
      socialPost: { ...RATE_LIMITS.SOCIAL_POST, max: 50 },
      upload: { ...RATE_LIMITS.UPLOAD },
    },
    enterprise: {
      aiGeneration: { ...RATE_LIMITS.AI_GENERATION, max: 1000 },
      socialPost: { ...RATE_LIMITS.SOCIAL_POST, max: 200 },
      upload: { ...RATE_LIMITS.UPLOAD, max: 200 },
    },
  };

  return baseLimits[plan];
}

/**
 * 클라이언트 IP 주소 추출
 */
export function getClientIP(req: NextRequest): string {
  // Vercel/Cloudflare/Nginx 등의 프록시 헤더 확인
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  // 기본값
  return req.ip || '127.0.0.1';
}

/**
 * Rate Limit 우회 조건 체크
 */
export function shouldBypassRateLimit(req: NextRequest): boolean {
  // 개발 환경
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // 내부 서비스 요청
  const userAgent = req.headers.get('user-agent') || '';
  if (userAgent.includes('uptime-robot') || 
      userAgent.includes('github-actions')) {
    return true;
  }

  // 웹훅 요청 (서명 검증 별도 필요)
  if (req.nextUrl.pathname.includes('/webhook')) {
    return false; // 웹훅도 Rate Limit 적용
  }

  return false;
}

/**
 * Rate Limit 현황 모니터링
 */
export class RateLimitMonitor {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  /**
   * 상위 Rate Limit 사용자 조회
   */
  async getTopUsers(limit: number = 10): Promise<Array<{
    key: string;
    requests: number;
  }>> {
    try {
      const keys = await this.redis.keys('rate_limit:user:*');
      const results = await Promise.all(
        keys.map(async (key) => ({
          key,
          requests: await this.redis.zcard(key),
        }))
      );

      return results
        .filter(r => r.requests > 0)
        .sort((a, b) => b.requests - a.requests)
        .slice(0, limit);
        
    } catch (error) {
      console.error('Rate limit monitoring error:', error);
      return [];
    }
  }

  /**
   * Rate Limit 통계
   */
  async getStats(): Promise<{
    totalKeys: number;
    totalRequests: number;
    topEndpoints: Array<{ endpoint: string; requests: number }>;
  }> {
    try {
      const keys = await this.redis.keys('rate_limit:*');
      const totalKeys = keys.length;
      
      const requests = await Promise.all(
        keys.map(key => this.redis.zcard(key))
      );
      const totalRequests = requests.reduce((sum, count) => sum + count, 0);

      // 엔드포인트별 통계
      const endpointStats = new Map<string, number>();
      for (let i = 0; i < keys.length; i++) {
        const endpoint = keys[i].split(':').pop() || 'unknown';
        const current = endpointStats.get(endpoint) || 0;
        endpointStats.set(endpoint, current + requests[i]);
      }

      const topEndpoints = Array.from(endpointStats.entries())
        .map(([endpoint, requests]) => ({ endpoint, requests }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);

      return {
        totalKeys,
        totalRequests,
        topEndpoints,
      };
      
    } catch (error) {
      console.error('Rate limit stats error:', error);
      return {
        totalKeys: 0,
        totalRequests: 0,
        topEndpoints: [],
      };
    }
  }
}

// 기본 Rate Limiter 인스턴스들
export const defaultRateLimiter = new RateLimiter(RATE_LIMITS.DEFAULT);
export const authRateLimiter = new RateLimiter(RATE_LIMITS.AUTH);
export const paymentRateLimiter = new RateLimiter(RATE_LIMITS.PAYMENT);
export const aiRateLimiter = new RateLimiter(RATE_LIMITS.AI_GENERATION);

// Rate Limit 미들웨어들
export const defaultRateLimit = createRateLimitMiddleware({
  ...RATE_LIMITS.DEFAULT,
  keyPrefix: 'api',
  message: 'API 요청 한도를 초과했습니다.',
});

export const authRateLimit = createRateLimitMiddleware({
  ...RATE_LIMITS.AUTH,
  keyPrefix: 'auth',
  message: '인증 요청 한도를 초과했습니다.',
});

export const paymentRateLimit = createRateLimitMiddleware({
  ...RATE_LIMITS.PAYMENT,
  keyPrefix: 'payment',
  message: '결제 요청 한도를 초과했습니다.',
});

export const aiRateLimit = createRateLimitMiddleware({
  ...RATE_LIMITS.AI_GENERATION,
  keyPrefix: 'ai',
  message: 'AI 요청 한도를 초과했습니다.',
});