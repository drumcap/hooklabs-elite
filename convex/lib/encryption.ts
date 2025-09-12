/**
 * 암호화 및 보안 유틸리티
 * 민감한 데이터 암호화, 토큰 보안, 해싱 등
 */

import { v } from "convex/values";

// 암호화 관련 에러
export const ENCRYPTION_ERRORS = {
  ENCRYPTION_FAILED: "암호화에 실패했습니다",
  DECRYPTION_FAILED: "복호화에 실패했습니다",
  INVALID_KEY: "유효하지 않은 암호화 키입니다",
  KEY_NOT_FOUND: "암호화 키를 찾을 수 없습니다",
} as const;

/**
 * 간단한 암호화/복호화 (Base64 + XOR)
 * 실제 프로덕션에서는 AES-256 등 강력한 암호화 알고리즘 사용 권장
 */
class SimpleEncryption {
  private static readonly DEFAULT_KEY = "HOOKLABS_DEFAULT_ENCRYPTION_KEY_2024";

  /**
   * 문자열을 암호화
   */
  static encrypt(text: string, key: string = this.DEFAULT_KEY): string {
    try {
      let encrypted = '';
      for (let i = 0; i < text.length; i++) {
        const textChar = text.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        encrypted += String.fromCharCode(textChar ^ keyChar);
      }
      return btoa(encrypted); // Base64 인코딩
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error(ENCRYPTION_ERRORS.ENCRYPTION_FAILED);
    }
  }

  /**
   * 암호화된 문자열을 복호화
   */
  static decrypt(encryptedText: string, key: string = this.DEFAULT_KEY): string {
    try {
      const encrypted = atob(encryptedText); // Base64 디코딩
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        const encryptedChar = encrypted.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error(ENCRYPTION_ERRORS.DECRYPTION_FAILED);
    }
  }
}

/**
 * 해시 생성 유틸리티 (간단한 구현)
 * 실제 프로덕션에서는 crypto 라이브러리 사용 권장
 */
class HashUtils {
  /**
   * 간단한 문자열 해시 생성
   */
  static simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit 정수로 변환
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 타임스탬프가 포함된 해시
   */
  static timestampHash(input: string): string {
    const timestamp = Date.now().toString();
    return this.simpleHash(input + timestamp);
  }

  /**
   * 솔트가 포함된 해시
   */
  static saltedHash(input: string, salt?: string): string {
    const useSalt = salt || Math.random().toString(36).substring(2);
    return this.simpleHash(input + useSalt) + ':' + useSalt;
  }

  /**
   * 솔트 해시 검증
   */
  static verifySaltedHash(input: string, hashedValue: string): boolean {
    const [hash, salt] = hashedValue.split(':');
    const computedHash = this.simpleHash(input + salt);
    return computedHash === hash;
  }
}

/**
 * 소셜 미디어 토큰 암호화 관리자
 */
export class SocialTokenManager {
  private static readonly TOKEN_PREFIX = "SOCIAL_TOKEN_";

  /**
   * 소셜 토큰 암호화
   */
  static encryptToken(token: string, platform: string, userId: string): string {
    const key = this.generateTokenKey(platform, userId);
    return SimpleEncryption.encrypt(token, key);
  }

  /**
   * 소셜 토큰 복호화
   */
  static decryptToken(encryptedToken: string, platform: string, userId: string): string {
    const key = this.generateTokenKey(platform, userId);
    return SimpleEncryption.decrypt(encryptedToken, key);
  }

  /**
   * 플랫폼과 사용자별 고유 키 생성
   */
  private static generateTokenKey(platform: string, userId: string): string {
    return this.TOKEN_PREFIX + platform.toUpperCase() + "_" + HashUtils.simpleHash(userId);
  }

  /**
   * 토큰 만료 시간 확인
   */
  static isTokenExpired(tokenExpiresAt: string | null | undefined): boolean {
    if (!tokenExpiresAt) return false;
    return new Date() > new Date(tokenExpiresAt);
  }

  /**
   * 토큰 마스킹 (로그용)
   */
  static maskToken(token: string): string {
    if (token.length <= 8) return "***";
    return token.substring(0, 4) + "***" + token.substring(token.length - 4);
  }
}

/**
 * API 키 및 시크릿 관리자
 */
export class SecretManager {
  /**
   * API 키 암호화
   */
  static encryptApiKey(apiKey: string, service: string): string {
    const key = "API_" + service.toUpperCase() + "_KEY";
    return SimpleEncryption.encrypt(apiKey, key);
  }

  /**
   * API 키 복호화
   */
  static decryptApiKey(encryptedApiKey: string, service: string): string {
    const key = "API_" + service.toUpperCase() + "_KEY";
    return SimpleEncryption.decrypt(encryptedApiKey, key);
  }

  /**
   * 환경변수에서 암호화 키 가져오기 (실제 구현시 사용)
   */
  static getEncryptionKey(service: string): string | null {
    // 실제 구현에서는 process.env에서 가져와야 함
    // return process.env[`${service.toUpperCase()}_ENCRYPTION_KEY`] || null;
    return `${service.toUpperCase()}_ENCRYPTION_KEY_2024`;
  }

  /**
   * 시크릿 키 검증
   */
  static validateSecret(secret: string, minLength: number = 32): boolean {
    return typeof secret === 'string' && secret.length >= minLength;
  }
}

/**
 * 데이터 마스킹 유틸리티
 */
export class DataMasker {
  /**
   * 이메일 마스킹
   */
  static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 2) return `*@${domain}`;
    return `${username[0]}***${username[username.length - 1]}@${domain}`;
  }

  /**
   * 전화번호 마스킹
   */
  static maskPhone(phone: string): string {
    if (phone.length <= 4) return "***";
    return phone.substring(0, 3) + "***" + phone.substring(phone.length - 4);
  }

  /**
   * 신용카드 번호 마스킹
   */
  static maskCardNumber(cardNumber: string): string {
    if (cardNumber.length <= 4) return "***";
    return "*".repeat(cardNumber.length - 4) + cardNumber.substring(cardNumber.length - 4);
  }

  /**
   * 일반적인 민감 데이터 마스킹
   */
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars) return "*".repeat(data.length);
    const visible = Math.floor(visibleChars / 2);
    return data.substring(0, visible) + "***" + data.substring(data.length - visible);
  }
}

/**
 * 보안 로깅 유틸리티
 */
export class SecurityLogger {
  /**
   * 민감한 데이터가 포함된 객체를 로그용으로 정리
   */
  static sanitizeForLogging(obj: any): any {
    const sensitiveFields = [
      'password', 'token', 'accessToken', 'refreshToken', 
      'apiKey', 'secret', 'key', 'authorization',
      'cardNumber', 'cvv', 'ssn', 'licenseKey'
    ];

    const sanitized = { ...obj };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        if (typeof sanitized[key] === 'string') {
          sanitized[key] = DataMasker.maskSensitiveData(sanitized[key]);
        }
      }
    }

    return sanitized;
  }

  /**
   * 보안 이벤트 로그 생성
   */
  static createSecurityLog(
    event: string,
    userId: string | null,
    details: any = {},
    level: 'info' | 'warning' | 'error' = 'info'
  ): any {
    return {
      timestamp: new Date().toISOString(),
      event,
      userId,
      level,
      details: this.sanitizeForLogging(details),
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
    };
  }
}

/**
 * 입력 검증 및 XSS 방지
 */
export class InputSanitizer {
  /**
   * HTML 태그 제거
   */
  static stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * 스크립트 태그 제거
   */
  static removeScripts(input: string): string {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  /**
   * 기본 XSS 방지
   */
  static escapeHtml(input: string): string {
    const div = { innerHTML: input } as any;
    return div.textContent || div.innerText || '';
  }

  /**
   * SQL 인젝션 방지를 위한 기본 이스케이프
   */
  static escapeSql(input: string): string {
    return input.replace(/'/g, "''").replace(/\\/g, "\\\\");
  }

  /**
   * 허용되지 않은 문자 제거
   */
  static sanitizeInput(input: string, allowedChars: RegExp = /[^a-zA-Z0-9\s\-_@.]/g): string {
    return input.replace(allowedChars, '');
  }
}

/**
 * Rate Limiting 토큰 생성
 */
export class RateLimitTokenManager {
  /**
   * 사용자 기반 rate limit 키 생성
   */
  static getUserRateLimitKey(userId: string, action: string): string {
    return `rate_limit:user:${userId}:${action}`;
  }

  /**
   * IP 기반 rate limit 키 생성
   */
  static getIpRateLimitKey(ip: string, action: string): string {
    return `rate_limit:ip:${HashUtils.simpleHash(ip)}:${action}`;
  }

  /**
   * 글로벌 rate limit 키 생성
   */
  static getGlobalRateLimitKey(action: string): string {
    return `rate_limit:global:${action}`;
  }
}

// 암호화 검증기
export const EncryptionValidators = {
  encryptedToken: v.string(),
  hashedValue: v.string(),
  sensitiveData: v.string(),
} as const;

// 보안 설정 상수
export const SECURITY_CONFIG = {
  TOKEN_EXPIRY_HOURS: 24,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  PASSWORD_MIN_LENGTH: 8,
  API_RATE_LIMIT_PER_MINUTE: 60,
  ENCRYPTION_KEY_LENGTH: 32,
} as const;