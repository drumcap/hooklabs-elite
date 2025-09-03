/**
 * 보안 유틸리티 및 미들웨어
 * - CORS 설정
 * - CSP 헤더
 * - 보안 헤더
 * - 입력 검증
 * - SQL 인젝션 방지
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * CORS 설정
 */
export interface CORSConfig {
  origin: string | string[] | boolean | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  optionsSuccessStatus?: number;
}

/**
 * 환경별 CORS 설정
 */
export function getCORSConfig(): CORSConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    const allowedOrigins = [
      'https://hooklabs-elite.vercel.app',
      'https://www.hooklabs.io',
      'https://app.hooklabs.io',
    ];

    // 환경변수에서 추가 도메인 허용
    const additionalOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') || [];
    
    return {
      origin: [...allowedOrigins, ...additionalOrigins],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-CSRF-Token',
        'X-API-Key',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
      credentials: true,
      maxAge: 86400, // 24시간
      optionsSuccessStatus: 200,
    };
  } else {
    // 개발 환경은 더 관대한 설정
    return {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['*'],
      exposedHeaders: ['*'],
      credentials: true,
      maxAge: 3600, // 1시간
      optionsSuccessStatus: 200,
    };
  }
}

/**
 * CORS 미들웨어
 */
export function applyCORS(
  req: NextRequest,
  res: NextResponse,
  config: CORSConfig = getCORSConfig()
): NextResponse {
  const origin = req.headers.get('origin');
  
  // Origin 검증
  if (config.origin) {
    if (typeof config.origin === 'boolean') {
      if (config.origin && origin) {
        res.headers.set('Access-Control-Allow-Origin', origin);
      }
    } else if (typeof config.origin === 'string') {
      res.headers.set('Access-Control-Allow-Origin', config.origin);
    } else if (Array.isArray(config.origin)) {
      if (origin && config.origin.includes(origin)) {
        res.headers.set('Access-Control-Allow-Origin', origin);
      }
    } else if (typeof config.origin === 'function') {
      if (origin && config.origin(origin)) {
        res.headers.set('Access-Control-Allow-Origin', origin);
      }
    }
  }

  // 기타 CORS 헤더
  if (config.methods) {
    res.headers.set('Access-Control-Allow-Methods', config.methods.join(', '));
  }

  if (config.allowedHeaders) {
    res.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
  }

  if (config.exposedHeaders) {
    res.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
  }

  if (config.credentials) {
    res.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  if (config.maxAge) {
    res.headers.set('Access-Control-Max-Age', config.maxAge.toString());
  }

  return res;
}

/**
 * Content Security Policy 생성
 */
export function generateCSP(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const nonce = crypto.randomBytes(16).toString('base64');

  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      ...(isProduction ? [] : ["'unsafe-eval'", "'unsafe-inline'"]),
      'https://js.clerk.dev',
      'https://www.googletagmanager.com',
      'https://cdn.mixpanel.com',
      'https://browser.sentry-cdn.com',
      `'nonce-${nonce}'`,
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'https://images.clerk.dev',
      'https://*.gravatar.com',
      'https://*.googleusercontent.com',
    ],
    'connect-src': [
      "'self'",
      'https://*.convex.cloud',
      'wss://*.convex.cloud',
      'https://api.lemonsqueezy.com',
      'https://clerk.dev',
      'https://*.clerk.accounts.dev',
      'https://api.mixpanel.com',
      'https://o4507902800437248.ingest.sentry.io',
      'https://api.openai.com',
      'https://generativelanguage.googleapis.com',
      'https://api.twitter.com',
      'https://graph.threads.net',
      ...(isProduction ? [] : ['ws://localhost:*', 'http://localhost:*']),
    ],
    'frame-src': [
      "'self'",
      'https://js.clerk.dev',
      'https://*.clerk.accounts.dev',
      'https://checkout.lemonsqueezy.com',
    ],
    'worker-src': [
      "'self'",
      'blob:',
    ],
    'object-src': ["'none'"],
    'media-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
    ],
    'form-action': [
      "'self'",
      'https://clerk.dev',
      'https://*.clerk.accounts.dev',
    ],
    'base-uri': ["'self'"],
    'frame-ancestors': ["'none'"],
    ...(isProduction ? { 'upgrade-insecure-requests': [] } : {}),
  };

  return Object.entries(directives)
    .map(([directive, sources]) => 
      sources.length > 0 ? `${directive} ${sources.join(' ')}` : directive
    )
    .join('; ');
}

/**
 * 보안 헤더 적용
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';

  // Content Security Policy
  response.headers.set('Content-Security-Policy', generateCSP());

  // XSS 보호
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // 콘텐츠 타입 스니핑 방지
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // 클릭재킹 방지
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // DNS 프리페칭 제어
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  // Referrer 정책
  response.headers.set(
    'Referrer-Policy', 
    'strict-origin-when-cross-origin'
  );

  // 권한 정책
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=(self)',
      'usb=()',
      'bluetooth=()',
      'accelerometer=()',
      'gyroscope=()',
      'magnetometer=()',
    ].join(', ')
  );

  // HSTS (HTTPS 강제) - 프로덕션에서만
  if (isProduction) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // 브라우저 호환성
  response.headers.set('X-UA-Compatible', 'IE=edge');

  // 캐시 제어 (민감한 데이터)
  if (response.url?.includes('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
  }

  return response;
}

/**
 * 입력 검증 유틸리티
 */
export class InputValidator {
  /**
   * SQL 인젝션 패턴 검사
   */
  static checkSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\b.*?[=<>].*?(\b(OR|AND)\b|$))/gi,
      /(--|\/\*|\*\/|;|\||'|")/gi,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * XSS 패턴 검사
   */
  static checkXSS(input: string): boolean {
    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[\s\S]*?onerror[\s\S]*?>/gi,
      /<svg[\s\S]*?>[\s\S]*?<\/svg>/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 경로 순회 공격 검사
   */
  static checkPathTraversal(input: string): boolean {
    const pathPatterns = [
      /\.\./g,
      /~\//g,
      /\0/g,
      /%00/gi,
      /%2e%2e/gi,
      /%2f/gi,
      /%5c/gi,
    ];

    return pathPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 종합 입력 검증
   */
  static validate(input: string, options: {
    allowHTML?: boolean;
    allowSQL?: boolean;
    maxLength?: number;
    minLength?: number;
  } = {}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 길이 검증
    if (options.maxLength && input.length > options.maxLength) {
      errors.push(`입력이 최대 길이(${options.maxLength})를 초과했습니다.`);
    }

    if (options.minLength && input.length < options.minLength) {
      errors.push(`입력이 최소 길이(${options.minLength})보다 짧습니다.`);
    }

    // SQL 인젝션 검사
    if (!options.allowSQL && this.checkSQLInjection(input)) {
      errors.push('잠재적인 SQL 인젝션 패턴이 감지되었습니다.');
    }

    // XSS 검사
    if (!options.allowHTML && this.checkXSS(input)) {
      errors.push('잠재적인 XSS 패턴이 감지되었습니다.');
    }

    // 경로 순회 검사
    if (this.checkPathTraversal(input)) {
      errors.push('잠재적인 경로 순회 공격이 감지되었습니다.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * HTML 이스케이프
   */
  static escapeHTML(input: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return input.replace(/[&<>"'\/]/g, (match) => htmlEntities[match]);
  }

  /**
   * SQL 이스케이프
   */
  static escapeSQL(input: string): string {
    return input.replace(/'/g, "''");
  }
}

/**
 * 보안 감사 로거
 */
export class SecurityAuditLogger {
  private static logSecurityEvent(
    event: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      userAgent: details.userAgent || 'unknown',
      ip: details.ip || 'unknown',
    };

    // 프로덕션에서는 보안 로그 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      // TODO: 보안 로그 서비스 연동 (예: Sentry, DataDog 등)
      console.log('[SECURITY AUDIT]', JSON.stringify(logData));
    } else {
      console.warn('[SECURITY AUDIT]', logData);
    }
  }

  static logSQLInjectionAttempt(input: string, req: NextRequest): void {
    this.logSecurityEvent('sql_injection_attempt', {
      input,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers.get('user-agent'),
    }, 'high');
  }

  static logXSSAttempt(input: string, req: NextRequest): void {
    this.logSecurityEvent('xss_attempt', {
      input,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers.get('user-agent'),
    }, 'high');
  }

  static logRateLimitExceeded(key: string, req: NextRequest): void {
    this.logSecurityEvent('rate_limit_exceeded', {
      key,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers.get('user-agent'),
    }, 'medium');
  }

  static logUnauthorizedAccess(resource: string, req: NextRequest): void {
    this.logSecurityEvent('unauthorized_access', {
      resource,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers.get('user-agent'),
    }, 'high');
  }

  static logSuspiciousActivity(activity: string, req: NextRequest): void {
    this.logSecurityEvent('suspicious_activity', {
      activity,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers.get('user-agent'),
    }, 'medium');
  }
}

/**
 * API 키 검증
 */
export function validateAPIKey(req: NextRequest): boolean {
  const apiKey = req.headers.get('X-API-Key');
  const authHeader = req.headers.get('Authorization');

  // Bearer 토큰에서 API 키 추출
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // API 키 검증 로직
    return validateKey(token);
  }

  // 헤더에서 직접 API 키 확인
  if (apiKey) {
    return validateKey(apiKey);
  }

  return false;
}

/**
 * API 키 검증 (실제 구현)
 */
function validateKey(key: string): boolean {
  // 환경변수에서 유효한 API 키 목록 확인
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validKeys.includes(key);
}

/**
 * 웹훅 서명 검증
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
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

/**
 * 토큰 암호화/복호화
 */
export class TokenCrypto {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyLength = 32;

  /**
   * 토큰 암호화
   */
  static encrypt(text: string, key?: string): string {
    const encryptionKey = Buffer.from(
      key || process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || '',
      'hex'
    );
    
    if (encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 토큰 복호화
   */
  static decrypt(encryptedText: string, key?: string): string {
    const encryptionKey = Buffer.from(
      key || process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || '',
      'hex'
    );
    
    if (encryptionKey.length !== 32) {
      throw new Error('Encryption key must be 32 bytes (64 hex characters)');
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}