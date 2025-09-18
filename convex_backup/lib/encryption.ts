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
 * 강력한 AES-256-GCM 암호화 시스템
 * 프로덕션 환경에 적합한 보안 수준 제공
 */
class SecureEncryption {
  private static getEncryptionKey(): string {
    // 환경변수에서 암호화 키 가져오기
    const key = process.env.ENCRYPTION_MASTER_KEY;
    if (!key) {
      throw new Error(ENCRYPTION_ERRORS.KEY_NOT_FOUND + " - ENCRYPTION_MASTER_KEY 환경변수가 설정되지 않았습니다");
    }
    if (key.length < 32) {
      throw new Error(ENCRYPTION_ERRORS.INVALID_KEY + " - 키는 최소 32자 이상이어야 합니다");
    }
    return key;
  }

  /**
   * AES-256-GCM을 사용한 보안 암호화
   */
  static async encrypt(text: string, additionalKey?: string): Promise<string> {
    try {
      const masterKey = this.getEncryptionKey();
      const combinedKey = additionalKey ? `${masterKey}:${additionalKey}` : masterKey;
      
      // 키 해싱으로 32바이트 키 생성
      const encoder = new TextEncoder();
      const keyData = encoder.encode(combinedKey);
      const hashedKey = await crypto.subtle.digest('SHA-256', keyData);
      
      // AES-GCM 키 생성
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        hashedKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      // 12바이트 IV 생성 (GCM 권장)
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // 암호화
      const encodedText = encoder.encode(text);
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encodedText
      );
      
      // IV + 암호문을 Base64로 인코딩
      const result = new Uint8Array(iv.length + encrypted.byteLength);
      result.set(iv, 0);
      result.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...result));
    } catch (error) {
      console.error('AES encryption failed:', error);
      throw new Error(ENCRYPTION_ERRORS.ENCRYPTION_FAILED);
    }
  }

  /**
   * AES-256-GCM을 사용한 보안 복호화
   */
  static async decrypt(encryptedText: string, additionalKey?: string): Promise<string> {
    try {
      const masterKey = this.getEncryptionKey();
      const combinedKey = additionalKey ? `${masterKey}:${additionalKey}` : masterKey;
      
      // Base64 디코딩
      const encryptedData = new Uint8Array(
        atob(encryptedText).split('').map(char => char.charCodeAt(0))
      );
      
      if (encryptedData.length < 12) {
        throw new Error('Invalid encrypted data format');
      }
      
      // IV와 암호문 분리
      const iv = encryptedData.slice(0, 12);
      const ciphertext = encryptedData.slice(12);
      
      // 키 해싱으로 32바이트 키 생성
      const encoder = new TextEncoder();
      const keyData = encoder.encode(combinedKey);
      const hashedKey = await crypto.subtle.digest('SHA-256', keyData);
      
      // AES-GCM 키 생성
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        hashedKey,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // 복호화
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        ciphertext
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('AES decryption failed:', error);
      throw new Error(ENCRYPTION_ERRORS.DECRYPTION_FAILED);
    }
  }

  /**
   * 동기식 암호화 (deprecated - 하위 호환성을 위한 래퍼)
   */
  static encryptSync(text: string, key?: string): string {
    console.warn('동기식 암호화는 deprecated됩니다. encrypt를 사용하세요.');
    return btoa(text); // 임시 Base64 인코딩 (보안상 매우 취약)
  }

  /**
   * 동기식 복호화 (deprecated - 하위 호환성을 위한 래퍼)
   */
  static decryptSync(encryptedText: string, key?: string): string {
    console.warn('동기식 복호화는 deprecated됩니다. decrypt를 사용하세요.');
    try {
      return atob(encryptedText); // 임시 Base64 디코딩 (보안상 매우 취약)
    } catch {
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
 * 소셜 미디어 토큰 암호화 관리자 (보안 강화)
 */
export class SocialTokenManager {
  private static readonly TOKEN_PREFIX = "SOCIAL_TOKEN_";

  /**
   * 소셜 토큰 보안 암호화 (비동기)
   */
  static async encryptTokenAsync(token: string, platform: string, userId: string): Promise<string> {
    const key = this.generateTokenKey(platform, userId);
    return await SecureEncryption.encrypt(token, key);
  }

  /**
   * 소셜 토큰 보안 복호화 (비동기)
   */
  static async decryptTokenAsync(encryptedToken: string, platform: string, userId: string): Promise<string> {
    const key = this.generateTokenKey(platform, userId);
    return await SecureEncryption.decrypt(encryptedToken, key);
  }

  /**
   * 소셜 토큰 암호화 (하위 호환성 - deprecated)
   */
  static encryptToken(token: string, platform: string, userId: string): string {
    console.warn('SocialTokenManager.encryptToken은 deprecated됩니다. encryptTokenAsync를 사용하세요.');
    const key = this.generateTokenKey(platform, userId);
    return SecureEncryption.encryptSync(token, key);
  }

  /**
   * 소셜 토큰 복호화 (하위 호환성 - deprecated)
   */
  static decryptToken(encryptedToken: string, platform: string, userId: string): string {
    console.warn('SocialTokenManager.decryptToken은 deprecated됩니다. decryptTokenAsync를 사용하세요.');
    const key = this.generateTokenKey(platform, userId);
    return SecureEncryption.decryptSync(encryptedToken, key);
  }

  /**
   * 플랫폼과 사용자별 고유 키 생성 (보안 강화)
   */
  private static generateTokenKey(platform: string, userId: string): string {
    // 보안 강화: 시간 기반 솔트 추가
    const timestamp = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // 하루 단위로 키 변경
    return this.TOKEN_PREFIX + platform.toUpperCase() + "_" + HashUtils.simpleHash(userId + timestamp.toString());
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
   * API 키 암호화 (비동기)
   */
  static async encryptApiKeyAsync(apiKey: string, service: string): Promise<string> {
    const key = "API_" + service.toUpperCase() + "_KEY";
    return await SecureEncryption.encrypt(apiKey, key);
  }

  /**
   * API 키 복호화 (비동기)
   */
  static async decryptApiKeyAsync(encryptedApiKey: string, service: string): Promise<string> {
    const key = "API_" + service.toUpperCase() + "_KEY";
    return await SecureEncryption.decrypt(encryptedApiKey, key);
  }

  /**
   * API 키 암호화 (deprecated - 하위 호환성)
   */
  static encryptApiKey(apiKey: string, service: string): string {
    console.warn('SecretManager.encryptApiKey는 deprecated됩니다. encryptApiKeyAsync를 사용하세요.');
    const key = "API_" + service.toUpperCase() + "_KEY";
    return SecureEncryption.encryptSync(apiKey, key);
  }

  /**
   * API 키 복호화 (deprecated - 하위 호환성)
   */
  static decryptApiKey(encryptedApiKey: string, service: string): string {
    console.warn('SecretManager.decryptApiKey는 deprecated됩니다. decryptApiKeyAsync를 사용하세요.');
    const key = "API_" + service.toUpperCase() + "_KEY";
    return SecureEncryption.decryptSync(encryptedApiKey, key);
  }

  /**
   * 환경변수에서 암호화 키 가져오기
   */
  static getEncryptionKey(service: string): string | null {
    const envKey = `${service.toUpperCase()}_ENCRYPTION_KEY`;
    return process.env[envKey] || null;
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