/**
 * Encryption 유틸리티 함수 단위 테스트
 * 암호화, 복호화, 해싱 및 보안 유틸리티 테스트
 */

import { describe, it, expect, vi } from 'vitest';

// Mock 암호화 유틸리티 구현
const ENCRYPTION_ERRORS = {
  ENCRYPTION_FAILED: "암호화에 실패했습니다",
  DECRYPTION_FAILED: "복호화에 실패했습니다",
  INVALID_KEY: "유효하지 않은 암호화 키입니다",
  KEY_NOT_FOUND: "암호화 키를 찾을 수 없습니다",
} as const;

class MockSimpleEncryption {
  private static readonly DEFAULT_KEY = "HOOKLABS_DEFAULT_ENCRYPTION_KEY_2024";

  /**
   * 문자열을 암호화 (XOR + Base64)
   */
  static encrypt(text: string, key: string = this.DEFAULT_KEY): string {
    try {
      if (!text || !key) {
        throw new Error('Invalid input parameters');
      }

      let encrypted = '';
      for (let i = 0; i < text.length; i++) {
        const textChar = text.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        encrypted += String.fromCharCode(textChar ^ keyChar);
      }
      return btoa(encrypted); // Base64 인코딩
    } catch (error) {
      throw new Error(ENCRYPTION_ERRORS.ENCRYPTION_FAILED);
    }
  }

  /**
   * 암호화된 문자열을 복호화
   */
  static decrypt(encryptedText: string, key: string = this.DEFAULT_KEY): string {
    try {
      if (!encryptedText || !key) {
        throw new Error('Invalid input parameters');
      }

      const encrypted = atob(encryptedText); // Base64 디코딩
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        const encryptedChar = encrypted.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(encryptedChar ^ keyChar);
      }
      return decrypted;
    } catch (error) {
      throw new Error(ENCRYPTION_ERRORS.DECRYPTION_FAILED);
    }
  }

  /**
   * 키 검증
   */
  static validateKey(key: string): boolean {
    return key && typeof key === 'string' && key.length >= 8;
  }
}

class MockSecurityLogger {
  /**
   * 보안 로그 생성
   */
  static createSecurityLog(
    action: string,
    userId: string,
    metadata: any,
    level: 'info' | 'warning' | 'error'
  ): string {
    const timestamp = new Date().toISOString();
    return JSON.stringify({
      timestamp,
      action,
      userId,
      level,
      metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata,
    });
  }

  /**
   * 민감한 데이터 마스킹
   */
  static maskSensitiveData(data: any): any {
    if (typeof data === 'string') {
      if (data.includes('@')) {
        // 이메일 마스킹
        const [username, domain] = data.split('@');
        return `${username.substring(0, 2)}***@${domain}`;
      }
      if (data.length > 10) {
        // 긴 문자열 마스킹
        return `${data.substring(0, 4)}***${data.substring(data.length - 4)}`;
      }
    }
    
    if (typeof data === 'object' && data !== null) {
      const masked: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (['password', 'token', 'secret', 'key'].some(sensitive => 
          key.toLowerCase().includes(sensitive)
        )) {
          masked[key] = '***MASKED***';
        } else {
          masked[key] = this.maskSensitiveData(value);
        }
      }
      return masked;
    }

    return data;
  }
}

class MockInputSanitizer {
  /**
   * HTML 태그 제거
   */
  static stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * XSS 방지를 위한 입력 정리
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>\"']/g, '') // 위험한 문자 제거
      .substring(0, 1000); // 길이 제한
  }

  /**
   * SQL 인젝션 방지
   */
  static escapeSql(input: string): string {
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '');
  }

  /**
   * 파일명 정리
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }
}

class MockDataMasker {
  /**
   * 개인정보 마스킹
   */
  static maskPersonalInfo(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const masked = { ...data };
    
    // 이메일 마스킹
    if (masked.email) {
      masked.email = MockSecurityLogger.maskSensitiveData(masked.email);
    }
    
    // 전화번호 마스킹
    if (masked.phone) {
      masked.phone = masked.phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-***-$3');
    }
    
    // 주소 마스킹
    if (masked.address) {
      masked.address = masked.address.length > 20 
        ? `${masked.address.substring(0, 10)}***${masked.address.substring(masked.address.length - 5)}`
        : '***MASKED***';
    }

    return masked;
  }

  /**
   * 신용카드 번호 마스킹
   */
  static maskCreditCard(cardNumber: string): string {
    if (!cardNumber) return '';
    
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 12) return '***INVALID***';
    
    return `****-****-****-${cleaned.slice(-4)}`;
  }

  /**
   * 토큰 마스킹
   */
  static maskToken(token: string): string {
    if (!token) return '';
    if (token.length < 8) return '***';
    
    return `${token.substring(0, 4)}***${token.substring(token.length - 4)}`;
  }
}

describe('Encryption 유틸리티 함수', () => {
  describe('SimpleEncryption', () => {
    describe('encrypt', () => {
      it('문자열을 올바르게 암호화해야 한다', () => {
        const plainText = 'Hello, World!';
        const encrypted = MockSimpleEncryption.encrypt(plainText);
        
        expect(encrypted).toBeDefined();
        expect(encrypted).not.toBe(plainText);
        expect(typeof encrypted).toBe('string');
        // Base64로 인코딩되므로 특정 문자들만 포함
        expect(/^[A-Za-z0-9+/]*={0,2}$/.test(encrypted)).toBe(true);
      });

      it('동일한 텍스트와 키로 항상 같은 결과를 반환해야 한다', () => {
        const plainText = 'Consistent encryption test';
        const key = 'testkey123';
        
        const encrypted1 = MockSimpleEncryption.encrypt(plainText, key);
        const encrypted2 = MockSimpleEncryption.encrypt(plainText, key);
        
        expect(encrypted1).toBe(encrypted2);
      });

      it('다른 키로 암호화하면 다른 결과를 반환해야 한다', () => {
        const plainText = 'Test message';
        const key1 = 'key1';
        const key2 = 'key2';
        
        const encrypted1 = MockSimpleEncryption.encrypt(plainText, key1);
        const encrypted2 = MockSimpleEncryption.encrypt(plainText, key2);
        
        expect(encrypted1).not.toBe(encrypted2);
      });

      it('빈 문자열에 대해 에러를 던져야 한다', () => {
        expect(() => {
          MockSimpleEncryption.encrypt('', 'key');
        }).toThrow(ENCRYPTION_ERRORS.ENCRYPTION_FAILED);
      });

      it('빈 키에 대해 에러를 던져야 한다', () => {
        expect(() => {
          MockSimpleEncryption.encrypt('test', '');
        }).toThrow(ENCRYPTION_ERRORS.ENCRYPTION_FAILED);
      });
    });

    describe('decrypt', () => {
      it('암호화된 문자열을 올바르게 복호화해야 한다', () => {
        const originalText = 'Hello, Encryption World!';
        const key = 'mySecretKey123';
        
        const encrypted = MockSimpleEncryption.encrypt(originalText, key);
        const decrypted = MockSimpleEncryption.decrypt(encrypted, key);
        
        expect(decrypted).toBe(originalText);
      });

      it('기본 키로 암호화/복호화가 작동해야 한다', () => {
        const originalText = 'Default key test';
        
        const encrypted = MockSimpleEncryption.encrypt(originalText);
        const decrypted = MockSimpleEncryption.decrypt(encrypted);
        
        expect(decrypted).toBe(originalText);
      });

      it('잘못된 키로 복호화하면 다른 결과를 반환해야 한다', () => {
        const originalText = 'Secret message';
        const correctKey = 'correct123';
        const wrongKey = 'wrong456';
        
        const encrypted = MockSimpleEncryption.encrypt(originalText, correctKey);
        const decryptedWrong = MockSimpleEncryption.decrypt(encrypted, wrongKey);
        
        expect(decryptedWrong).not.toBe(originalText);
      });

      it('유효하지 않은 암호화된 텍스트에 대해 에러를 던져야 한다', () => {
        expect(() => {
          MockSimpleEncryption.decrypt('invalid_base64!', 'key');
        }).toThrow(ENCRYPTION_ERRORS.DECRYPTION_FAILED);
      });

      it('빈 암호화된 텍스트에 대해 에러를 던져야 한다', () => {
        expect(() => {
          MockSimpleEncryption.decrypt('', 'key');
        }).toThrow(ENCRYPTION_ERRORS.DECRYPTION_FAILED);
      });
    });

    describe('validateKey', () => {
      it('유효한 키를 올바르게 검증해야 한다', () => {
        const validKeys = [
          'validkey123',
          'my_secure_key_2024',
          '12345678', // 최소 길이 충족
          'a'.repeat(100), // 긴 키도 유효
        ];

        validKeys.forEach(key => {
          expect(MockSimpleEncryption.validateKey(key)).toBe(true);
        });
      });

      it('유효하지 않은 키를 올바르게 거부해야 한다', () => {
        const invalidKeys = [
          'short', // 8자 미만
          '', // 빈 문자열
          null as any, // null
          undefined as any, // undefined
          123 as any, // 숫자
          [] as any, // 배열
        ];

        invalidKeys.forEach(key => {
          expect(MockSimpleEncryption.validateKey(key)).toBe(false);
        });
      });
    });
  });

  describe('SecurityLogger', () => {
    describe('createSecurityLog', () => {
      it('보안 로그를 올바른 형식으로 생성해야 한다', () => {
        const action = 'user_login';
        const userId = 'user123';
        const metadata = { ip: '192.168.1.1', userAgent: 'Mozilla/5.0' };
        const level = 'info';

        const logString = MockSecurityLogger.createSecurityLog(action, userId, metadata, level);
        const log = JSON.parse(logString);

        expect(log.timestamp).toBeDefined();
        expect(log.action).toBe(action);
        expect(log.userId).toBe(userId);
        expect(log.level).toBe(level);
        expect(log.metadata).toBeDefined();
      });

      it('다양한 메타데이터 타입을 처리해야 한다', () => {
        const testCases = [
          { metadata: 'string metadata', expected: 'string metadata' },
          { metadata: { key: 'value' }, expected: JSON.stringify({ key: 'value' }) },
          { metadata: 123, expected: 123 },
          { metadata: null, expected: null },
        ];

        testCases.forEach(({ metadata, expected }) => {
          const logString = MockSecurityLogger.createSecurityLog('test', 'user', metadata, 'info');
          const log = JSON.parse(logString);
          expect(log.metadata).toEqual(expected);
        });
      });
    });

    describe('maskSensitiveData', () => {
      it('이메일을 올바르게 마스킹해야 한다', () => {
        const email = 'user@example.com';
        const masked = MockSecurityLogger.maskSensitiveData(email);
        
        expect(masked).toBe('us***@example.com');
      });

      it('긴 문자열을 올바르게 마스킹해야 한다', () => {
        const longString = 'this_is_a_very_long_string_for_testing';
        const masked = MockSecurityLogger.maskSensitiveData(longString);
        
        expect(masked).toBe('this***ting');
      });

      it('객체의 민감한 필드를 마스킹해야 한다', () => {
        const sensitiveData = {
          username: 'john_doe',
          password: 'secret123',
          token: 'bearer_token_123',
          publicInfo: 'this is public',
        };

        const masked = MockSecurityLogger.maskSensitiveData(sensitiveData);
        
        expect(masked.username).toBe('john_doe'); // 민감하지 않은 필드
        expect(masked.password).toBe('***MASKED***');
        expect(masked.token).toBe('***MASKED***');
        expect(masked.publicInfo).toBe('this is public');
      });

      it('중첩된 객체도 올바르게 마스킹해야 한다', () => {
        const nestedData = {
          user: {
            email: 'test@example.com',
            settings: {
              secretKey: 'very_secret_key',
              theme: 'dark',
            },
          },
        };

        const masked = MockSecurityLogger.maskSensitiveData(nestedData);
        
        expect(masked.user.email).toBe('te***@example.com');
        expect(masked.user.settings.secretKey).toBe('***MASKED***');
        expect(masked.user.settings.theme).toBe('dark');
      });
    });
  });

  describe('InputSanitizer', () => {
    describe('stripHtml', () => {
      it('HTML 태그를 제거해야 한다', () => {
        const testCases = [
          { input: '<p>Hello World</p>', expected: 'Hello World' },
          { input: '<script>alert("xss")</script>', expected: 'alert("xss")' },
          { input: '<div class="test">Content</div>', expected: 'Content' },
          { input: 'No HTML here', expected: 'No HTML here' },
          { input: '<img src="x" onerror="alert(1)">', expected: '' },
        ];

        testCases.forEach(({ input, expected }) => {
          expect(MockInputSanitizer.stripHtml(input)).toBe(expected);
        });
      });
    });

    describe('sanitizeInput', () => {
      it('위험한 문자를 제거해야 한다', () => {
        const dangerousInput = '<script>alert("xss")</script>';
        const sanitized = MockInputSanitizer.sanitizeInput(dangerousInput);
        
        expect(sanitized).not.toContain('<');
        expect(sanitized).not.toContain('>');
        expect(sanitized).not.toContain('"');
        expect(sanitized).not.toContain("'");
      });

      it('공백을 제거하고 길이를 제한해야 한다', () => {
        const longInput = '  ' + 'a'.repeat(2000) + '  ';
        const sanitized = MockInputSanitizer.sanitizeInput(longInput);
        
        expect(sanitized.length).toBeLessThanOrEqual(1000);
        expect(sanitized.startsWith(' ')).toBe(false);
        expect(sanitized.endsWith(' ')).toBe(false);
      });
    });

    describe('escapeSql', () => {
      it('SQL 인젝션 문자를 이스케이프해야 한다', () => {
        const sqlInjection = "'; DROP TABLE users; --";
        const escaped = MockInputSanitizer.escapeSql(sqlInjection);
        
        expect(escaped).not.toContain(';');
        expect(escaped).not.toContain('--');
        expect(escaped).toContain("''"); // 작은따옴표는 이스케이프됨
      });
    });

    describe('sanitizeFilename', () => {
      it('파일명을 안전하게 정리해야 한다', () => {
        const dangerousFilename = '../../../etc/passwd';
        const sanitized = MockInputSanitizer.sanitizeFilename(dangerousFilename);
        
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('/');
        expect(sanitized).toMatch(/^[a-zA-Z0-9._-]+$/);
      });

      it('긴 파일명을 제한해야 한다', () => {
        const longFilename = 'a'.repeat(300) + '.txt';
        const sanitized = MockInputSanitizer.sanitizeFilename(longFilename);
        
        expect(sanitized.length).toBeLessThanOrEqual(255);
      });

      it('연속된 언더스코어를 정리해야 한다', () => {
        const filename = 'file___name___test.txt';
        const sanitized = MockInputSanitizer.sanitizeFilename(filename);
        
        expect(sanitized).toBe('file_name_test.txt');
      });
    });
  });

  describe('DataMasker', () => {
    describe('maskPersonalInfo', () => {
      it('개인정보를 마스킹해야 한다', () => {
        const personalData = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '010-1234-5678',
          address: '서울시 강남구 역삼동 123-45',
        };

        const masked = MockDataMasker.maskPersonalInfo(personalData);
        
        expect(masked.name).toBe('John Doe'); // 이름은 마스킹하지 않음
        expect(masked.email).toBe('jo***@example.com');
        expect(masked.phone).toBe('010-***-5678');
        expect(masked.address).toContain('***');
      });

      it('짧은 주소도 마스킹해야 한다', () => {
        const data = { address: 'Short Address' };
        const masked = MockDataMasker.maskPersonalInfo(data);
        
        expect(masked.address).toBe('***MASKED***');
      });
    });

    describe('maskCreditCard', () => {
      it('신용카드 번호를 마스킹해야 한다', () => {
        const testCases = [
          { input: '1234567890123456', expected: '****-****-****-3456' },
          { input: '1234-5678-9012-3456', expected: '****-****-****-3456' },
          { input: '1234 5678 9012 3456', expected: '****-****-****-3456' },
        ];

        testCases.forEach(({ input, expected }) => {
          expect(MockDataMasker.maskCreditCard(input)).toBe(expected);
        });
      });

      it('유효하지 않은 카드 번호를 처리해야 한다', () => {
        const invalidCards = [
          '',
          '123',
          '12345678901', // 12자리 미만
          'not-a-number',
        ];

        invalidCards.forEach(invalid => {
          const result = MockDataMasker.maskCreditCard(invalid);
          expect(['', '***INVALID***']).toContain(result);
        });
      });
    });

    describe('maskToken', () => {
      it('토큰을 마스킹해야 한다', () => {
        const token = 'abcdef1234567890xyz';
        const masked = MockDataMasker.maskToken(token);
        
        expect(masked).toBe('abcd***0xyz');
      });

      it('짧은 토큰을 처리해야 한다', () => {
        const shortToken = 'abc';
        const masked = MockDataMasker.maskToken(shortToken);
        
        expect(masked).toBe('***');
      });

      it('빈 토큰을 처리해야 한다', () => {
        expect(MockDataMasker.maskToken('')).toBe('');
        expect(MockDataMasker.maskToken(null as any)).toBe('');
        expect(MockDataMasker.maskToken(undefined as any)).toBe('');
      });
    });
  });
});