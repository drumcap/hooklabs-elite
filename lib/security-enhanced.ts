/**
 * 강화된 보안 유틸리티
 * - 입력 검증 스키마
 * - 웹훅 서명 검증
 * - 보안 API 템플릿
 */

import { z } from 'zod';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { RateLimiter } from './rate-limiting';
import { SecurityAuditLogger, InputValidator } from './security';

/**
 * 공통 입력 검증 스키마
 */
export const commonSchemas = {
  // ID 검증
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format'),
  
  // 이메일 검증
  email: z.string().email('Invalid email format').max(255),
  
  // 사용자명 검증
  username: z.string()
    .min(3, 'Username too short')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid username format'),
  
  // URL 검증
  url: z.string().url('Invalid URL format').max(2048),
  
  // 날짜 검증
  date: z.string().datetime({ offset: true }),
  
  // 페이지네이션
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
  
  // 검색 쿼리
  searchQuery: z.string()
    .max(200, 'Search query too long')
    .transform(val => val.trim()),
};

/**
 * 웹훅 서명 검증 클래스
 */
export class WebhookVerifier {
  /**
   * HMAC-SHA256 서명 생성
   */
  static generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * 타이밍 안전 서명 검증
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const expectedSignature = this.generateSignature(payload, secret);
      
      // 타이밍 안전 비교
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Clerk 웹훅 검증
   */
  static async verifyClerkWebhook(
    req: Request
  ): Promise<{ verified: boolean; payload?: any }> {
    try {
      const payloadString = await req.text();
      const svixHeaders = {
        'svix-id': req.headers.get('svix-id'),
        'svix-timestamp': req.headers.get('svix-timestamp'),
        'svix-signature': req.headers.get('svix-signature'),
      };

      // 모든 헤더가 있는지 확인
      if (!svixHeaders['svix-id'] || !svixHeaders['svix-timestamp'] || !svixHeaders['svix-signature']) {
        return { verified: false };
      }

      // Svix 라이브러리 사용하여 검증 (import 필요)
      const { Webhook } = await import('svix');
      const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
      
      const payload = wh.verify(payloadString, svixHeaders as any);
      
      return { verified: true, payload };
    } catch (error) {
      console.error('Clerk webhook verification failed:', error);
      return { verified: false };
    }
  }

  /**
   * Lemon Squeezy 웹훅 검증 (개선된 버전)
   */
  static async verifyLemonSqueezyWebhook(
    req: Request
  ): Promise<{ verified: boolean; payload?: any }> {
    try {
      const body = await req.text();
      const signature = req.headers.get('X-Signature');
      
      if (!signature) {
        return { verified: false };
      }

      const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
      if (!secret) {
        console.error('Missing LEMONSQUEEZY_WEBHOOK_SECRET');
        return { verified: false };
      }

      // 서명 형식 처리 (sha256= 접두사 제거)
      const providedSig = signature.replace(/^sha256=/, '');
      
      // 서명 검증
      const isValid = this.verifySignature(body, providedSig, secret);
      
      if (!isValid) {
        return { verified: false };
      }
      
      return { verified: true, payload: JSON.parse(body) };
    } catch (error) {
      console.error('Lemon Squeezy webhook verification failed:', error);
      return { verified: false };
    }
  }

  /**
   * 커스텀 웹훅 검증
   */
  static verifyCustomWebhook(
    payload: string,
    signature: string,
    secret: string,
    algorithm: 'sha256' | 'sha512' = 'sha256'
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac(algorithm, secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      return false;
    }
  }
}

/**
 * API 보안 래퍼
 */
export class SecureAPIHandler {
  private rateLimiter: RateLimiter;
  private schema?: z.ZodSchema;

  constructor(options: {
    rateLimitConfig?: {
      window: number;
      max: number;
    };
    schema?: z.ZodSchema;
  }) {
    this.rateLimiter = new RateLimiter(
      options.rateLimitConfig || { window: 60, max: 100 }
    );
    this.schema = options.schema;
  }

  /**
   * 보안 핸들러 래퍼
   */
  async handle(
    req: NextRequest,
    handler: (
      req: NextRequest,
      context: {
        userId: string;
        body?: any;
      }
    ) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    
    try {
      // 1. 인증 확인
      const { userId } = await auth();
      if (!userId) {
        SecurityAuditLogger.logUnauthorizedAccess(req.url, req);
        return this.createErrorResponse('Unauthorized', 401);
      }

      // 2. Rate Limiting
      const rateLimitKey = `api:${userId}:${req.nextUrl.pathname}`;
      const rateLimitResult = await this.rateLimiter.check(rateLimitKey);
      
      if (!rateLimitResult.success) {
        SecurityAuditLogger.logRateLimitExceeded(rateLimitKey, req);
        return this.createRateLimitResponse(rateLimitResult);
      }

      // 3. 입력 처리 (POST/PUT/PATCH)
      let body = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        body = await this.parseAndValidateBody(req);
        if (body.error) {
          return body.error;
        }
        body = body.data;
      }

      // 4. 비즈니스 로직 실행
      const response = await handler(req, { userId, body });

      // 5. 응답 헤더 추가
      response.headers.set('X-Request-Duration', `${Date.now() - startTime}ms`);
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

      return response;

    } catch (error) {
      console.error('API Error:', error);
      SecurityAuditLogger.logSuspiciousActivity(
        `API Error: ${error instanceof Error ? error.message : 'Unknown'}`,
        req
      );

      return this.createErrorResponse('Internal server error', 500);
    }
  }

  /**
   * Body 파싱 및 검증
   */
  private async parseAndValidateBody(
    req: NextRequest
  ): Promise<{ data?: any; error?: NextResponse }> {
    try {
      const body = await req.json();

      // 스키마 검증
      if (this.schema) {
        const validation = this.schema.safeParse(body);
        if (!validation.success) {
          return {
            error: this.createErrorResponse(
              'Invalid input',
              400,
              validation.error.flatten()
            ),
          };
        }
        body = validation.data;
      }

      // 추가 보안 검증
      const bodyString = JSON.stringify(body);
      const inputValidation = InputValidator.validate(bodyString, {
        maxLength: 100000, // 100KB
        allowHTML: false,
      });

      if (!inputValidation.isValid) {
        SecurityAuditLogger.logSuspiciousActivity(
          `Input validation failed: ${inputValidation.errors.join(', ')}`,
          req
        );
        return {
          error: this.createErrorResponse('Invalid input detected', 400),
        };
      }

      return { data: body };
    } catch (error) {
      return {
        error: this.createErrorResponse('Invalid JSON', 400),
      };
    }
  }

  /**
   * 에러 응답 생성
   */
  private createErrorResponse(
    message: string,
    status: number,
    details?: any
  ): NextResponse {
    const response: any = { error: message };
    if (details) {
      response.details = details;
    }
    
    return NextResponse.json(response, { status });
  }

  /**
   * Rate Limit 응답 생성
   */
  private createRateLimitResponse(result: {
    resetTime: number;
    remaining: number;
  }): NextResponse {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        resetTime: result.resetTime,
        remaining: result.remaining,
      },
      { status: 429 }
    );

    response.headers.set('Retry-After', Math.ceil(result.resetTime - Date.now() / 1000).toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', result.resetTime.toString());

    return response;
  }
}

/**
 * 보안 설정 검증
 */
export class SecurityConfigValidator {
  /**
   * 환경변수 검증
   */
  static validateEnvironmentVariables(): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // 필수 환경변수 체크
    const requiredVars = [
      'CLERK_SECRET_KEY',
      'CONVEX_DEPLOYMENT',
      'LEMONSQUEEZY_API_KEY',
      'SOCIAL_TOKEN_ENCRYPTION_KEY',
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    }

    // 암호화 키 길이 검증
    if (process.env.SOCIAL_TOKEN_ENCRYPTION_KEY) {
      const key = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
      if (key.length !== 64) {
        errors.push('SOCIAL_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
      }
      if (!/^[0-9a-fA-F]+$/.test(key)) {
        errors.push('SOCIAL_TOKEN_ENCRYPTION_KEY must be a valid hex string');
      }
    }

    // 웹훅 시크릿 검증
    const webhookSecrets = [
      'CLERK_WEBHOOK_SECRET',
      'LEMONSQUEEZY_WEBHOOK_SECRET',
    ];

    for (const secret of webhookSecrets) {
      if (process.env[secret] && process.env[secret]!.length < 32) {
        errors.push(`${secret} is too short (minimum 32 characters recommended)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * CORS 설정 검증
   */
  static validateCORSConfig(config: any): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // 개발 환경에서 너무 관대한 설정 체크
    if (config.origin === true) {
      warnings.push('CORS origin set to true - this allows all origins');
    }

    if (config.allowedHeaders?.includes('*')) {
      warnings.push('CORS allows all headers - consider restricting');
    }

    if (config.credentials && config.origin === true) {
      warnings.push('Credentials allowed with wildcard origin - security risk');
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * CSP 정책 검증
   */
  static validateCSPPolicy(csp: string): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (csp.includes("'unsafe-inline'")) {
      issues.push("CSP contains 'unsafe-inline' - consider using nonces");
    }

    if (csp.includes("'unsafe-eval'")) {
      issues.push("CSP contains 'unsafe-eval' - security risk");
    }

    if (!csp.includes('upgrade-insecure-requests')) {
      issues.push('CSP missing upgrade-insecure-requests directive');
    }

    if (!csp.includes('frame-ancestors')) {
      issues.push('CSP missing frame-ancestors directive');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

/**
 * 보안 모니터링
 */
export class SecurityMonitor {
  private static readonly events: Array<{
    timestamp: Date;
    type: string;
    details: any;
  }> = [];

  /**
   * 보안 이벤트 기록
   */
  static recordEvent(type: string, details: any): void {
    this.events.push({
      timestamp: new Date(),
      type,
      details,
    });

    // 메모리 관리 - 최대 1000개 이벤트 유지
    if (this.events.length > 1000) {
      this.events.shift();
    }

    // 중요 이벤트는 즉시 로깅
    if (['auth_failure', 'rate_limit', 'injection_attempt'].includes(type)) {
      console.warn('[SECURITY EVENT]', type, details);
    }
  }

  /**
   * 최근 이벤트 조회
   */
  static getRecentEvents(
    limit: number = 100,
    type?: string
  ): typeof SecurityMonitor.events {
    let events = [...this.events].reverse();
    
    if (type) {
      events = events.filter(e => e.type === type);
    }

    return events.slice(0, limit);
  }

  /**
   * 보안 통계
   */
  static getStats(): {
    totalEvents: number;
    eventTypes: Record<string, number>;
    recentAlerts: number;
  } {
    const stats: Record<string, number> = {};
    const oneHourAgo = new Date(Date.now() - 3600000);
    let recentAlerts = 0;

    for (const event of this.events) {
      stats[event.type] = (stats[event.type] || 0) + 1;
      
      if (event.timestamp > oneHourAgo) {
        recentAlerts++;
      }
    }

    return {
      totalEvents: this.events.length,
      eventTypes: stats,
      recentAlerts,
    };
  }
}