/**
 * 보안 패치 - 즉시 적용 가능한 보안 개선 사항
 * 작성일: 2025-09-03
 * 
 * 이 파일은 보안 감사에서 발견된 취약점을 수정하는 패치를 포함합니다.
 */

import crypto from 'crypto';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';

// ============================================================================
// 1. 토큰 암호화 개선 (CVE 수정: Cryptographic Failures)
// ============================================================================

/**
 * 안전한 토큰 암호화 클래스
 * - AES-256-GCM 사용
 * - IV 랜덤 생성
 * - 인증 태그 포함
 */
export class SecureTokenCrypto {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly ivLength = 16;
  private static readonly saltLength = 32;
  private static readonly tagLength = 16;
  private static readonly iterations = 100000;

  /**
   * 키 파생 함수 - 패스워드에서 암호화 키 생성
   */
  private static deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, this.iterations, 32, 'sha256');
  }

  /**
   * 토큰 암호화
   */
  static encrypt(text: string, password?: string): string {
    try {
      const pass = password || process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
      if (!pass || pass.length < 32) {
        throw new Error('암호화 키가 충분히 강력하지 않습니다 (최소 32자)');
      }

      // Salt와 IV 생성
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // 키 파생
      const key = this.deriveKey(pass, salt);
      
      // 암호화
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Salt:IV:AuthTag:EncryptedData 형식으로 반환
      return [
        salt.toString('hex'),
        iv.toString('hex'),
        authTag.toString('hex'),
        encrypted
      ].join(':');
    } catch (error) {
      console.error('토큰 암호화 실패:', error);
      throw new Error('토큰 암호화에 실패했습니다');
    }
  }

  /**
   * 토큰 복호화
   */
  static decrypt(encryptedText: string, password?: string): string {
    try {
      const pass = password || process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
      if (!pass || pass.length < 32) {
        throw new Error('복호화 키가 유효하지 않습니다');
      }

      const parts = encryptedText.split(':');
      if (parts.length !== 4) {
        throw new Error('암호화된 데이터 형식이 올바르지 않습니다');
      }

      const [saltHex, ivHex, authTagHex, encrypted] = parts;
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      // 키 파생
      const key = this.deriveKey(pass, salt);
      
      // 복호화
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('토큰 복호화 실패:', error);
      throw new Error('토큰 복호화에 실패했습니다');
    }
  }

  /**
   * 토큰 회전 - 기존 토큰을 새로운 키로 재암호화
   */
  static rotate(encryptedText: string, oldPassword: string, newPassword: string): string {
    const decrypted = this.decrypt(encryptedText, oldPassword);
    return this.encrypt(decrypted, newPassword);
  }
}

// ============================================================================
// 2. 웹훅 서명 검증 개선 (타이밍 공격 방지)
// ============================================================================

/**
 * 안전한 웹훅 검증 클래스
 */
export class SecureWebhookValidator {
  /**
   * 타이밍 안전 문자열 비교
   */
  private static timingSafeCompare(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    
    if (bufferA.length !== bufferB.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  /**
   * HMAC 서명 생성
   */
  private static generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Clerk 웹훅 검증
   */
  static verifyClerkWebhook(
    payload: string,
    headers: Record<string, string>,
    secret: string
  ): boolean {
    try {
      const svixId = headers['svix-id'];
      const svixTimestamp = headers['svix-timestamp'];
      const svixSignature = headers['svix-signature'];

      if (!svixId || !svixTimestamp || !svixSignature) {
        return false;
      }

      // 타임스탬프 검증 (5분 이내)
      const timestamp = parseInt(svixTimestamp);
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - timestamp) > 300) {
        console.error('웹훅 타임스탬프가 너무 오래되었습니다');
        return false;
      }

      // Svix 형식에 맞게 서명 검증
      const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
      const expectedSignature = this.generateSignature(signedContent, secret);
      
      // 실제 서명은 "v1,signature" 형식
      const signatures = svixSignature.split(' ');
      for (const sig of signatures) {
        const [version, signature] = sig.split(',');
        if (version === 'v1' && this.timingSafeCompare(signature, expectedSignature)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Clerk 웹훅 검증 실패:', error);
      return false;
    }
  }

  /**
   * Lemon Squeezy 웹훅 검증
   */
  static verifyLemonSqueezyWebhook(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      if (!signature || !secret) {
        return false;
      }

      // 서명 형식 파싱 (sha256=...)
      const providedSignature = signature.replace(/^sha256=/, '');
      
      // 예상 서명 생성
      const expectedSignature = this.generateSignature(payload, secret);
      
      // 타이밍 안전 비교
      return this.timingSafeCompare(providedSignature, expectedSignature);
    } catch (error) {
      console.error('Lemon Squeezy 웹훅 검증 실패:', error);
      return false;
    }
  }

  /**
   * 일반적인 웹훅 검증 (GitHub, Stripe 등)
   */
  static verifyGenericWebhook(
    payload: string,
    signature: string,
    secret: string,
    algorithm: 'sha1' | 'sha256' = 'sha256'
  ): boolean {
    try {
      const expectedSignature = crypto
        .createHmac(algorithm, secret)
        .update(payload)
        .digest('hex');
      
      return this.timingSafeCompare(signature, expectedSignature);
    } catch (error) {
      console.error('웹훅 검증 실패:', error);
      return false;
    }
  }
}

// ============================================================================
// 3. 환경 변수 검증 및 관리
// ============================================================================

/**
 * 환경 변수 스키마 정의
 */
const envSchema = z.object({
  // Node 환경
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  
  // Convex 설정
  CONVEX_DEPLOYMENT: z.string().min(1),
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  
  // Clerk 인증
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  CLERK_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  
  // Lemon Squeezy 결제
  LEMONSQUEEZY_API_KEY: z.string().min(1),
  LEMONSQUEEZY_STORE_ID: z.string().min(1),
  LEMONSQUEEZY_WEBHOOK_SECRET: z.string().min(32),
  
  // 보안 키
  SOCIAL_TOKEN_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i, '32바이트 hex 문자열이어야 합니다'),
  
  // Rate Limiting (선택적)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // AI API 키들 (선택적)
  GOOGLE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  
  // 소셜 미디어 API (선택적)
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
});

/**
 * 환경 변수 검증 클래스
 */
export class EnvValidator {
  private static validated = false;
  private static env: z.infer<typeof envSchema> | null = null;

  /**
   * 환경 변수 검증 및 초기화
   */
  static validate(): z.infer<typeof envSchema> {
    if (this.validated && this.env) {
      return this.env;
    }

    try {
      this.env = envSchema.parse(process.env);
      this.validated = true;
      
      // 프로덕션 환경 추가 검증
      if (this.env.NODE_ENV === 'production') {
        this.validateProductionRequirements();
      }
      
      console.log('✅ 환경 변수 검증 완료');
      return this.env;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ 환경 변수 검증 실패:');
        error.errors.forEach(err => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`);
        });
      }
      throw new Error('필수 환경 변수가 설정되지 않았습니다');
    }
  }

  /**
   * 프로덕션 환경 추가 요구사항 검증
   */
  private static validateProductionRequirements(): void {
    if (!this.env) return;

    const requirements = [
      {
        condition: this.env.SOCIAL_TOKEN_ENCRYPTION_KEY.length === 64,
        message: 'SOCIAL_TOKEN_ENCRYPTION_KEY는 정확히 64자여야 합니다'
      },
      {
        condition: !this.env.CLERK_SECRET_KEY.includes('test'),
        message: 'CLERK_SECRET_KEY는 프로덕션 키여야 합니다'
      },
      {
        condition: this.env.NEXT_PUBLIC_CONVEX_URL.includes('https'),
        message: 'NEXT_PUBLIC_CONVEX_URL은 HTTPS를 사용해야 합니다'
      },
    ];

    requirements.forEach(req => {
      if (!req.condition) {
        throw new Error(`프로덕션 환경 요구사항 실패: ${req.message}`);
      }
    });
  }

  /**
   * 환경 변수 가져오기 (검증 후)
   */
  static get(): z.infer<typeof envSchema> {
    if (!this.validated || !this.env) {
      return this.validate();
    }
    return this.env;
  }
}

// ============================================================================
// 4. 향상된 보안 로거
// ============================================================================

export interface SecurityEvent {
  type: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
  timestamp?: string;
}

/**
 * 향상된 보안 로깅 클래스
 */
export class EnhancedSecurityLogger {
  private static readonly MAX_LOG_SIZE = 1000; // 메모리 로그 최대 크기
  private static memoryLogs: SecurityEvent[] = [];

  /**
   * 보안 이벤트 로깅
   */
  static async log(
    event: SecurityEvent,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      severity,
      environment: process.env.NODE_ENV,
    };

    // 메모리에 저장 (디버깅용)
    this.addToMemoryLog(enrichedEvent);

    // 심각도에 따른 처리
    if (severity === 'critical' || severity === 'high') {
      await this.handleCriticalEvent(enrichedEvent);
    }

    // 프로덕션 환경에서는 외부 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      await this.sendToExternalService(enrichedEvent);
    } else {
      console.log('[SECURITY]', enrichedEvent);
    }
  }

  /**
   * 메모리 로그 추가 (순환 버퍼)
   */
  private static addToMemoryLog(event: SecurityEvent): void {
    this.memoryLogs.push(event);
    if (this.memoryLogs.length > this.MAX_LOG_SIZE) {
      this.memoryLogs.shift();
    }
  }

  /**
   * 심각한 이벤트 처리
   */
  private static async handleCriticalEvent(event: any): Promise<void> {
    // Sentry로 즉시 전송
    if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
      Sentry.captureMessage(`Security Alert: ${event.type}`, {
        level: event.severity === 'critical' ? 'error' : 'warning',
        extra: event,
        tags: {
          security: true,
          severity: event.severity,
        },
      });
    }

    // 이메일/Slack 알림 (구현 필요)
    // await this.sendAlert(event);
  }

  /**
   * 외부 로깅 서비스로 전송
   */
  private static async sendToExternalService(event: any): Promise<void> {
    try {
      // CloudWatch, DataDog, Splunk 등으로 전송
      // 실제 구현은 사용하는 서비스에 따라 달라짐
      
      // 예시: CloudWatch
      // await cloudWatch.putLogEvents({
      //   logGroupName: '/aws/lambda/security',
      //   logStreamName: 'security-events',
      //   logEvents: [{
      //     message: JSON.stringify(event),
      //     timestamp: Date.now()
      //   }]
      // }).promise();
    } catch (error) {
      console.error('외부 로깅 서비스 전송 실패:', error);
    }
  }

  /**
   * 최근 보안 이벤트 조회
   */
  static getRecentEvents(count: number = 100): SecurityEvent[] {
    return this.memoryLogs.slice(-count);
  }

  /**
   * 특정 유형의 이벤트 조회
   */
  static getEventsByType(type: string): SecurityEvent[] {
    return this.memoryLogs.filter(event => event.type === type);
  }
}

// ============================================================================
// 5. Rate Limiting 폴백 전략
// ============================================================================

/**
 * 메모리 기반 Rate Limit 캐시
 */
class MemoryRateLimitCache {
  private cache: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 5분마다 만료된 엔트리 정리
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  get(key: string): { count: number; resetTime: number } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.resetTime) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  set(key: string, count: number, windowMs: number): void {
    this.cache.set(key, {
      count,
      resetTime: Date.now() + windowMs,
    });
  }

  increment(key: string, windowMs: number): number {
    const entry = this.get(key);
    if (entry) {
      entry.count++;
      this.cache.set(key, entry);
      return entry.count;
    } else {
      this.set(key, 1, windowMs);
      return 1;
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.resetTime) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

/**
 * 향상된 Rate Limiter with 폴백
 */
export class RobustRateLimiter {
  private static memoryCache = new MemoryRateLimitCache();

  /**
   * Rate limit 체크 with 폴백
   */
  static async check(
    key: string,
    config: { window: number; max: number },
    redisClient?: any
  ): Promise<{
    success: boolean;
    remaining: number;
    resetTime: number;
  }> {
    try {
      // Redis가 있으면 사용
      if (redisClient) {
        return await this.checkWithRedis(key, config, redisClient);
      }
    } catch (error) {
      console.error('Redis rate limit 실패, 폴백 사용:', error);
    }

    // 폴백: 메모리 캐시 사용
    return this.checkWithMemory(key, config);
  }

  /**
   * Redis를 사용한 rate limit
   */
  private static async checkWithRedis(
    key: string,
    config: { window: number; max: number },
    redisClient: any
  ): Promise<any> {
    const now = Date.now();
    const windowStart = now - config.window * 1000;

    const count = await redisClient.zcount(key, windowStart, now);
    
    if (count >= config.max) {
      return {
        success: false,
        remaining: 0,
        resetTime: Math.ceil((windowStart + config.window * 1000) / 1000),
      };
    }

    await redisClient.zadd(key, now, `${now}-${Math.random()}`);
    await redisClient.zremrangebyscore(key, 0, windowStart);
    await redisClient.expire(key, config.window);

    return {
      success: true,
      remaining: config.max - count - 1,
      resetTime: Math.ceil((now + config.window * 1000) / 1000),
    };
  }

  /**
   * 메모리를 사용한 rate limit (폴백)
   */
  private static checkWithMemory(
    key: string,
    config: { window: number; max: number }
  ): {
    success: boolean;
    remaining: number;
    resetTime: number;
  } {
    // 폴백 모드에서는 더 엄격한 제한 적용
    const fallbackMax = Math.floor(config.max * 0.5); // 50%만 허용
    const windowMs = config.window * 1000;
    
    const count = this.memoryCache.increment(key, windowMs);
    
    if (count > fallbackMax) {
      const entry = this.memoryCache.get(key);
      return {
        success: false,
        remaining: 0,
        resetTime: entry ? Math.ceil(entry.resetTime / 1000) : Math.ceil((Date.now() + windowMs) / 1000),
      };
    }

    return {
      success: true,
      remaining: fallbackMax - count,
      resetTime: Math.ceil((Date.now() + windowMs) / 1000),
    };
  }
}

// ============================================================================
// 6. 입력 검증 향상
// ============================================================================

/**
 * 향상된 입력 검증 클래스
 */
export class EnhancedInputValidator {
  /**
   * 종합 입력 검증
   */
  static validate(input: any, schema: z.ZodSchema): {
    success: boolean;
    data?: any;
    errors?: string[];
  } {
    try {
      const validated = schema.parse(input);
      
      // 추가 보안 검사
      const stringData = JSON.stringify(validated);
      if (this.containsSuspiciousPatterns(stringData)) {
        return {
          success: false,
          errors: ['의심스러운 패턴이 감지되었습니다'],
        };
      }

      return {
        success: true,
        data: validated,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        };
      }
      return {
        success: false,
        errors: ['입력 검증 실패'],
      };
    }
  }

  /**
   * 의심스러운 패턴 검사
   */
  private static containsSuspiciousPatterns(input: string): boolean {
    const patterns = [
      // SQL Injection
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(--)|(\/\*|\*\/)/g,
      
      // XSS
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      
      // Path Traversal
      /\.\.[\/\\]/g,
      /%2e%2e/gi,
      
      // Command Injection
      /[;&|`$]/g,
      
      // XXE
      /<!DOCTYPE[^>]*>/gi,
      /<!ENTITY[^>]*>/gi,
    ];

    return patterns.some(pattern => pattern.test(input));
  }

  /**
   * 파일명 검증
   */
  static validateFileName(fileName: string): boolean {
    // 허용된 확장자
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];
    
    // 위험한 확장자
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js'];
    
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    if (dangerousExtensions.includes(ext)) {
      return false;
    }
    
    // 파일명에 위험한 문자 포함 여부
    if (/[<>:"|?*\/\\]/.test(fileName)) {
      return false;
    }
    
    return allowedExtensions.includes(ext);
  }
}

// 모든 보안 패치 내보내기
export default {
  SecureTokenCrypto,
  SecureWebhookValidator,
  EnvValidator,
  EnhancedSecurityLogger,
  RobustRateLimiter,
  EnhancedInputValidator,
};