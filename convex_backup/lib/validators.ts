/**
 * 공통 검증 유틸리티 함수들
 * 데이터 검증, 형식 확인, 비즈니스 로직 검증 등
 */

import { v, Validator } from "convex/values";

// 이메일 검증 정규식
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL 검증 정규식  
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

// 강력한 비밀번호 정규식 (최소 8자, 대소문자, 숫자, 특수문자 포함)
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// 한국 전화번호 정규식
const KOREAN_PHONE_REGEX = /^(010|011|016|017|018|019)-?\d{3,4}-?\d{4}$/;

/**
 * 이메일 형식 검증
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * URL 형식 검증
 */
export function isValidUrl(url: string): boolean {
  return URL_REGEX.test(url);
}

/**
 * 강력한 비밀번호 검증
 */
export function isStrongPassword(password: string): boolean {
  return STRONG_PASSWORD_REGEX.test(password);
}

/**
 * 한국 전화번호 형식 검증
 */
export function isValidKoreanPhone(phone: string): boolean {
  return KOREAN_PHONE_REGEX.test(phone);
}

/**
 * 문자열 길이 범위 검증
 */
export function isValidLength(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}

/**
 * 숫자 범위 검증
 */
export function isInRange(num: number, min: number, max: number): boolean {
  return num >= min && num <= max;
}

/**
 * 날짜 형식 검증 (ISO 8601)
 */
export function isValidISODate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr === date.toISOString();
}

/**
 * 미래 날짜 검증
 */
export function isFutureDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return date > now;
}

/**
 * 과거 날짜 검증
 */
export function isPastDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return date < now;
}

/**
 * 배열의 모든 요소가 유니크한지 검증
 */
export function hasUniqueValues<T>(array: T[]): boolean {
  return new Set(array).size === array.length;
}

/**
 * 객체가 비어있는지 검증
 */
export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * 필수 필드 검증
 */
export function hasRequiredFields<T extends Record<string, any>>(
  obj: T, 
  requiredFields: (keyof T)[]
): boolean {
  return requiredFields.every(field => obj[field] !== undefined && obj[field] !== null);
}

/**
 * 소셜 미디어 플랫폼 검증
 */
export function isValidSocialPlatform(platform: string): boolean {
  const validPlatforms = ["twitter", "threads", "linkedin", "facebook", "instagram"];
  return validPlatforms.includes(platform.toLowerCase());
}

/**
 * 결제 상태 검증
 */
export function isValidPaymentStatus(status: string): boolean {
  const validStatuses = ["pending", "paid", "refunded", "partial_refund", "failed"];
  return validStatuses.includes(status.toLowerCase());
}

/**
 * 구독 상태 검증
 */
export function isValidSubscriptionStatus(status: string): boolean {
  const validStatuses = ["active", "cancelled", "expired", "on_trial", "paused", "past_due", "unpaid"];
  return validStatuses.includes(status.toLowerCase());
}

/**
 * 크레딧 양수 검증
 */
export function isValidCreditAmount(amount: number): boolean {
  return amount > 0 && Number.isInteger(amount);
}

/**
 * 쿠폰 코드 형식 검증 (영숫자 조합, 3-20자)
 */
export function isValidCouponCode(code: string): boolean {
  const couponRegex = /^[A-Z0-9]{3,20}$/;
  return couponRegex.test(code.toUpperCase());
}

/**
 * 할인율 검증 (0-100%)
 */
export function isValidDiscountPercentage(percentage: number): boolean {
  return percentage >= 0 && percentage <= 100;
}

/**
 * 가격 검증 (센트 단위, 양수)
 */
export function isValidPrice(price: number): boolean {
  return price > 0 && Number.isInteger(price);
}

/**
 * 토큰 수 검증
 */
export function isValidTokenCount(count: number): boolean {
  return count > 0 && Number.isInteger(count);
}

/**
 * 해시태그 형식 검증
 */
export function isValidHashtag(hashtag: string): boolean {
  const hashtagRegex = /^#[a-zA-Z0-9가-힣_]+$/;
  return hashtagRegex.test(hashtag) && hashtag.length <= 100;
}

/**
 * 사용자명 형식 검증
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
}

// Convex validator 컴포저
export const CommonValidators = {
  email: v.string(),
  url: v.string(),
  password: v.string(),
  phone: v.optional(v.string()),
  
  // 날짜 관련
  isoDate: v.string(),
  timestamp: v.string(),
  
  // 소셜 미디어
  socialPlatform: v.string(),
  hashtags: v.array(v.string()),
  
  // 결제 관련
  paymentStatus: v.string(),
  subscriptionStatus: v.string(),
  price: v.number(), // 센트 단위
  creditAmount: v.number(),
  
  // 쿠폰 관련
  couponCode: v.string(),
  discountPercentage: v.number(),
  
  // 메타데이터
  metadata: v.optional(v.any()),
  
  // 페이징
  cursor: v.optional(v.string()),
  limit: v.optional(v.number()),
} as const;

/**
 * 사용자 입력 데이터 정규화
 */
export class DataSanitizer {
  /**
   * 이메일 정규화 (소문자, 공백 제거)
   */
  static email(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * 전화번호 정규화 (하이픈 제거)
   */
  static phone(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  /**
   * URL 정규화 (프로토콜 추가)
   */
  static url(url: string): string {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }

  /**
   * 쿠폰 코드 정규화 (대문자, 공백 제거)
   */
  static couponCode(code: string): string {
    return code.toUpperCase().replace(/\s/g, '');
  }

  /**
   * 해시태그 정규화
   */
  static hashtag(hashtag: string): string {
    const cleaned = hashtag.trim();
    return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
  }

  /**
   * 텍스트 내용 정규화 (앞뒤 공백 제거, 연속 공백 제거)
   */
  static text(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * 사용자명 정규화 (소문자)
   */
  static username(username: string): string {
    return username.toLowerCase().trim();
  }
}

/**
 * 복합 검증 함수들
 */
export class ValidatorComposer {
  /**
   * 사용자 등록 데이터 검증
   */
  static validateUserRegistration(data: {
    email: string;
    name: string;
    password?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!isValidEmail(data.email)) {
      errors.push("유효한 이메일 주소를 입력해주세요");
    }

    if (!isValidLength(data.name, 1, 100)) {
      errors.push("이름은 1-100자 사이여야 합니다");
    }

    if (data.password && !isStrongPassword(data.password)) {
      errors.push("비밀번호는 8자 이상이며, 대소문자, 숫자, 특수문자를 포함해야 합니다");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 쿠폰 생성 데이터 검증
   */
  static validateCouponCreation(data: {
    code: string;
    type: string;
    value: number;
    validFrom: string;
    validUntil?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!isValidCouponCode(data.code)) {
      errors.push("쿠폰 코드는 3-20자의 영숫자 조합이어야 합니다");
    }

    if (!["percentage", "fixed_amount", "credits"].includes(data.type)) {
      errors.push("올바른 쿠폰 타입을 선택해주세요");
    }

    if (data.type === "percentage" && !isValidDiscountPercentage(data.value)) {
      errors.push("할인율은 0-100% 사이여야 합니다");
    }

    if (data.type === "fixed_amount" && !isValidPrice(data.value)) {
      errors.push("할인 금액은 양수여야 합니다");
    }

    if (!isValidISODate(data.validFrom)) {
      errors.push("올바른 시작 날짜를 입력해주세요");
    }

    if (data.validUntil && !isValidISODate(data.validUntil)) {
      errors.push("올바른 종료 날짜를 입력해주세요");
    }

    if (data.validUntil && data.validFrom >= data.validUntil) {
      errors.push("종료 날짜는 시작 날짜보다 나중이어야 합니다");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 소셜 게시물 검증
   */
  static validateSocialPost(data: {
    content: string;
    platforms: string[];
    hashtags?: string[];
    scheduledFor?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!isValidLength(data.content, 1, 4000)) {
      errors.push("게시물 내용은 1-4000자 사이여야 합니다");
    }

    if (data.platforms.length === 0) {
      errors.push("최소 하나의 플랫폼을 선택해주세요");
    }

    if (!data.platforms.every(isValidSocialPlatform)) {
      errors.push("올바른 소셜 미디어 플랫폼을 선택해주세요");
    }

    if (data.hashtags && !data.hashtags.every(isValidHashtag)) {
      errors.push("올바른 해시태그 형식을 사용해주세요");
    }

    if (data.scheduledFor && !isValidISODate(data.scheduledFor)) {
      errors.push("올바른 예약 시간을 입력해주세요");
    }

    if (data.scheduledFor && !isFutureDate(data.scheduledFor)) {
      errors.push("예약 시간은 미래 시점이어야 합니다");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}