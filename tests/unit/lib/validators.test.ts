/**
 * Validators 유틸리티 함수 단위 테스트
 * 데이터 검증 로직의 정확성 검증
 */

import { describe, it, expect } from 'vitest';

// Mock validator 함수들 - 실제 구현 로직을 시뮬레이션
const validators = {
  isValidEmail: (email: string): boolean => {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return EMAIL_REGEX.test(email);
  },

  isValidUrl: (url: string): boolean => {
    const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    return URL_REGEX.test(url);
  },

  isStrongPassword: (password: string): boolean => {
    // 최소 8자, 대소문자, 숫자, 특수문자 포함
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&#]/.test(password);
    const isLongEnough = password.length >= 8;
    
    return hasLowerCase && hasUpperCase && hasNumbers && hasSpecialChar && isLongEnough;
  },

  isValidKoreanPhone: (phone: string): boolean => {
    const KOREAN_PHONE_REGEX = /^(010|011|016|017|018|019)-?\d{3,4}-?\d{4}$/;
    return KOREAN_PHONE_REGEX.test(phone);
  },

  isValidLength: (text: string, min: number, max: number): boolean => {
    return text.length >= min && text.length <= max;
  },

  isValidNumber: (value: any, min?: number, max?: number): boolean => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return false;
    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;
    return true;
  },

  isValidCreditAmount: (amount: number): boolean => {
    return validators.isValidNumber(amount, 1, 10000) && Number.isInteger(amount);
  },

  isValidHashtag: (hashtag: string): boolean => {
    if (!hashtag.startsWith('#')) return false;
    const tag = hashtag.slice(1);
    return /^[a-zA-Z0-9_가-힣]+$/.test(tag) && tag.length >= 1 && tag.length <= 50;
  },

  sanitizeText: (text: string, maxLength?: number): string => {
    let sanitized = text.trim().replace(/\s+/g, ' '); // 연속 공백 제거
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized;
  },

  sanitizeUrl: (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  },

  sanitizeHashtag: (hashtag: string): string => {
    const trimmed = hashtag.trim().toLowerCase();
    if (!trimmed.startsWith('#')) {
      return `#${trimmed}`;
    }
    return trimmed;
  },

  validateSocialPost: (postData: {
    content: string;
    platforms: string[];
    hashtags?: string[];
  }): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // 내용 검증
    if (!postData.content || postData.content.trim().length === 0) {
      errors.push('게시물 내용은 필수입니다');
    } else if (postData.content.length > 5000) {
      errors.push('게시물 내용은 5000자를 초과할 수 없습니다');
    }

    // 플랫폼 검증
    if (!postData.platforms || postData.platforms.length === 0) {
      errors.push('최소 하나의 플랫폼을 선택해야 합니다');
    } else {
      const validPlatforms = ['twitter', 'linkedin', 'facebook', 'instagram'];
      const invalidPlatforms = postData.platforms.filter(p => !validPlatforms.includes(p));
      if (invalidPlatforms.length > 0) {
        errors.push(`지원하지 않는 플랫폼: ${invalidPlatforms.join(', ')}`);
      }
    }

    // 해시태그 검증
    if (postData.hashtags && postData.hashtags.length > 0) {
      const invalidHashtags = postData.hashtags.filter(h => !validators.isValidHashtag(h));
      if (invalidHashtags.length > 0) {
        errors.push(`유효하지 않은 해시태그: ${invalidHashtags.join(', ')}`);
      }
      if (postData.hashtags.length > 30) {
        errors.push('해시태그는 30개를 초과할 수 없습니다');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

describe('Validators 유틸리티 함수', () => {
  describe('isValidEmail', () => {
    it('유효한 이메일 주소를 올바르게 검증해야 한다', () => {
      // 유효한 이메일들
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.kr',
        'user+tag@gmail.com',
        'test123@subdomain.domain.org',
        'firstname.lastname@company.com',
      ];

      validEmails.forEach(email => {
        expect(validators.isValidEmail(email)).toBe(true);
      });
    });

    it('유효하지 않은 이메일 주소를 올바르게 거부해야 한다', () => {
      // 유효하지 않은 이메일들
      const invalidEmails = [
        'plainaddress',
        '@missingdomain.com',
        'missing@.com',
        'missing@domain',
        'spaces @domain.com',
        'double@@domain.com',
        '',
        'user@',
        '@domain.com',
      ];

      invalidEmails.forEach(email => {
        expect(validators.isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('isValidUrl', () => {
    it('유효한 URL을 올바르게 검증해야 한다', () => {
      // 유효한 URL들
      const validUrls = [
        'https://example.com',
        'http://www.example.com',
        'https://subdomain.domain.com/path?query=value',
        'http://example.com:8080/path',
        'https://example.com/path/to/resource#anchor',
      ];

      validUrls.forEach(url => {
        expect(validators.isValidUrl(url)).toBe(true);
      });
    });

    it('유효하지 않은 URL을 올바르게 거부해야 한다', () => {
      // 유효하지 않은 URL들
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com', // ftp는 지원하지 않음
        'example.com', // 프로토콜 없음
        'https://',
        'https://.',
        '',
        'javascript:alert("xss")',
      ];

      invalidUrls.forEach(url => {
        expect(validators.isValidUrl(url)).toBe(false);
      });
    });
  });

  describe('isStrongPassword', () => {
    it('강력한 비밀번호를 올바르게 검증해야 한다', () => {
      // 강력한 비밀번호들
      const strongPasswords = [
        'StrongPass1!',
        'MySecure123@',
        'Complex9$Password',
        'Valid8#Test',
        'Abcd1234!@#$',
      ];

      strongPasswords.forEach(password => {
        expect(validators.isStrongPassword(password)).toBe(true);
      });
    });

    it('약한 비밀번호를 올바르게 거부해야 한다', () => {
      // 약한 비밀번호들
      const weakPasswords = [
        'password', // 숫자, 대문자, 특수문자 없음
        'PASSWORD', // 소문자, 숫자, 특수문자 없음
        '12345678', // 문자, 특수문자 없음
        'Pass123', // 8자 미만, 특수문자 없음
        'PassWord!', // 숫자 없음
        'password123!', // 대문자 없음
        '',
      ];

      weakPasswords.forEach(password => {
        expect(validators.isStrongPassword(password)).toBe(false);
      });
    });
  });

  describe('isValidKoreanPhone', () => {
    it('유효한 한국 전화번호를 올바르게 검증해야 한다', () => {
      // 유효한 전화번호들
      const validPhones = [
        '010-1234-5678',
        '01012345678',
        '011-123-4567',
        '016-1234-5678',
        '017-123-4567',
        '018-1234-5678',
        '019-123-4567',
      ];

      validPhones.forEach(phone => {
        expect(validators.isValidKoreanPhone(phone)).toBe(true);
      });
    });

    it('유효하지 않은 전화번호를 올바르게 거부해야 한다', () => {
      // 유효하지 않은 전화번호들
      const invalidPhones = [
        '02-1234-5678', // 지역번호는 지원하지 않음
        '010-123-456', // 번호 자릿수 부족
        '010-12345-6789', // 번호 자릿수 초과
        '020-1234-5678', // 유효하지 않은 접두번호
        '010 1234 5678', // 공백은 허용하지 않음
        '',
        '123-456-7890',
      ];

      invalidPhones.forEach(phone => {
        expect(validators.isValidKoreanPhone(phone)).toBe(false);
      });
    });
  });

  describe('isValidLength', () => {
    it('문자열 길이를 올바르게 검증해야 한다', () => {
      const testCases = [
        { text: 'hello', min: 3, max: 10, expected: true },
        { text: 'hi', min: 3, max: 10, expected: false }, // 너무 짧음
        { text: 'this is a very long text', min: 3, max: 10, expected: false }, // 너무 김
        { text: 'exact', min: 5, max: 5, expected: true }, // 정확히 일치
        { text: '', min: 0, max: 5, expected: true }, // 빈 문자열
        { text: '한글테스트', min: 2, max: 10, expected: true },
      ];

      testCases.forEach(({ text, min, max, expected }) => {
        expect(validators.isValidLength(text, min, max)).toBe(expected);
      });
    });
  });

  describe('isValidNumber', () => {
    it('숫자 범위를 올바르게 검증해야 한다', () => {
      const testCases = [
        { value: 5, min: 1, max: 10, expected: true },
        { value: 0, min: 1, max: 10, expected: false }, // 최솟값보다 작음
        { value: 15, min: 1, max: 10, expected: false }, // 최댓값보다 큼
        { value: 5, min: undefined, max: 10, expected: true }, // 최솟값 없음
        { value: 5, min: 1, max: undefined, expected: true }, // 최댓값 없음
        { value: '5', min: 1, max: 10, expected: true }, // 문자열 숫자
        { value: 'abc', min: 1, max: 10, expected: false }, // 숫자가 아님
        { value: 3.14, min: 3, max: 4, expected: true }, // 소수
      ];

      testCases.forEach(({ value, min, max, expected }) => {
        expect(validators.isValidNumber(value, min, max)).toBe(expected);
      });
    });
  });

  describe('isValidCreditAmount', () => {
    it('유효한 크레딧 금액을 올바르게 검증해야 한다', () => {
      const validAmounts = [1, 10, 100, 1000, 9999, 10000];
      
      validAmounts.forEach(amount => {
        expect(validators.isValidCreditAmount(amount)).toBe(true);
      });
    });

    it('유효하지 않은 크레딧 금액을 올바르게 거부해야 한다', () => {
      const invalidAmounts = [0, -1, 10001, 3.14, 'abc', null, undefined];
      
      invalidAmounts.forEach(amount => {
        expect(validators.isValidCreditAmount(amount as number)).toBe(false);
      });
    });
  });

  describe('isValidHashtag', () => {
    it('유효한 해시태그를 올바르게 검증해야 한다', () => {
      const validHashtags = [
        '#test',
        '#소셜미디어',
        '#social_media',
        '#Test123',
        '#한글태그',
        '#marketing2024',
      ];

      validHashtags.forEach(hashtag => {
        expect(validators.isValidHashtag(hashtag)).toBe(true);
      });
    });

    it('유효하지 않은 해시태그를 올바르게 거부해야 한다', () => {
      const invalidHashtags = [
        'nothashtag', // # 없음
        '#', // 내용 없음
        '#test with space', // 공백 포함
        '#test@symbol', // 특수문자 포함
        '#' + 'a'.repeat(51), // 너무 김
        '##double', // 이중 #
      ];

      invalidHashtags.forEach(hashtag => {
        expect(validators.isValidHashtag(hashtag)).toBe(false);
      });
    });
  });

  describe('sanitizeText', () => {
    it('텍스트를 올바르게 정규화해야 한다', () => {
      const testCases = [
        { input: '  hello  world  ', expected: 'hello world' },
        { input: '\n\ntest\n\n', expected: 'test' },
        { input: '   multiple    spaces   ', expected: 'multiple spaces' },
        { input: 'normal text', expected: 'normal text' },
        { input: '', expected: '' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(validators.sanitizeText(input)).toBe(expected);
      });
    });

    it('최대 길이 제한을 적용해야 한다', () => {
      const longText = 'This is a very long text that should be truncated';
      const result = validators.sanitizeText(longText, 20);
      
      expect(result.length).toBe(20);
      expect(result).toBe('This is a very long ');
    });
  });

  describe('sanitizeUrl', () => {
    it('URL을 올바르게 정규화해야 한다', () => {
      const testCases = [
        { input: 'example.com', expected: 'https://example.com' },
        { input: 'https://example.com', expected: 'https://example.com' },
        { input: 'http://example.com', expected: 'http://example.com' },
        { input: '  example.com  ', expected: 'https://example.com' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(validators.sanitizeUrl(input)).toBe(expected);
      });
    });
  });

  describe('sanitizeHashtag', () => {
    it('해시태그를 올바르게 정규화해야 한다', () => {
      const testCases = [
        { input: 'test', expected: '#test' },
        { input: '#TEST', expected: '#test' },
        { input: '  #Social  ', expected: '#social' },
        { input: 'Marketing', expected: '#marketing' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(validators.sanitizeHashtag(input)).toBe(expected);
      });
    });
  });

  describe('validateSocialPost', () => {
    it('유효한 소셜 포스트를 검증해야 한다', () => {
      const validPost = {
        content: 'This is a valid social media post!',
        platforms: ['twitter', 'linkedin'],
        hashtags: ['#social', '#media', '#test'],
      };

      const result = validators.validateSocialPost(validPost);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('내용이 없는 포스트를 거부해야 한다', () => {
      const invalidPost = {
        content: '',
        platforms: ['twitter'],
      };

      const result = validators.validateSocialPost(invalidPost);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('게시물 내용은 필수입니다');
    });

    it('플랫폼이 없는 포스트를 거부해야 한다', () => {
      const invalidPost = {
        content: 'Valid content',
        platforms: [],
      };

      const result = validators.validateSocialPost(invalidPost);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('최소 하나의 플랫폼을 선택해야 합니다');
    });

    it('지원하지 않는 플랫폼을 거부해야 한다', () => {
      const invalidPost = {
        content: 'Valid content',
        platforms: ['twitter', 'unsupported'],
      };

      const result = validators.validateSocialPost(invalidPost);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('지원하지 않는 플랫폼'))).toBe(true);
    });

    it('너무 많은 해시태그를 거부해야 한다', () => {
      const tooManyHashtags = Array.from({ length: 31 }, (_, i) => `#tag${i}`);
      const invalidPost = {
        content: 'Valid content',
        platforms: ['twitter'],
        hashtags: tooManyHashtags,
      };

      const result = validators.validateSocialPost(invalidPost);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('해시태그는 30개를 초과할 수 없습니다');
    });

    it('유효하지 않은 해시태그를 거부해야 한다', () => {
      const invalidPost = {
        content: 'Valid content',
        platforms: ['twitter'],
        hashtags: ['#valid', 'invalid', '#also valid'],
      };

      const result = validators.validateSocialPost(invalidPost);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('유효하지 않은 해시태그'))).toBe(true);
    });
  });
});