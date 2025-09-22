/**
 * 캐싱 서비스 - 성능 최적화를 위한 메모리 캐시
 */

import { DatabaseReader } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { CreditBalance } from "../types/credit";

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CacheService {
  private static cache = new Map<string, CacheItem<any>>();

  // 캐시 TTL 설정 (밀리초)
  private static readonly CACHE_TTL = {
    CREDIT_BALANCE: 5 * 60 * 1000,    // 5분
    USER_PROFILE: 10 * 60 * 1000,     // 10분
    SOCIAL_ACCOUNTS: 2 * 60 * 1000,   // 2분
    SYSTEM_CONFIG: 30 * 60 * 1000,    // 30분
  };

  /**
   * 캐시에서 데이터 조회
   */
  static get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // TTL 만료 확인
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 캐시에 데이터 저장
   */
  static set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.CACHE_TTL.SYSTEM_CONFIG,
    };

    this.cache.set(key, item);
  }

  /**
   * 캐시에서 데이터 삭제
   */
  static delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 패턴 매칭으로 캐시 무효화
   */
  static invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 만료된 캐시 항목 정리
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 캐시 상태 정보
   */
  static getStats(): {
    size: number;
    expired: number;
    memoryUsage: string;
  } {
    const now = Date.now();
    let expired = 0;

    for (const item of this.cache.values()) {
      if (now - item.timestamp > item.ttl) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      expired,
      memoryUsage: `${Math.round(JSON.stringify([...this.cache.entries()]).length / 1024)} KB`
    };
  }

  // === 도메인 특화 캐시 메서드들 ===

  /**
   * 크레딧 잔액 캐싱
   */
  static getCreditBalance(userId: Id<"users">): CreditBalance | null {
    const key = `credit_balance:${userId}`;
    return this.get<CreditBalance>(key);
  }

  static setCreditBalance(userId: Id<"users">, balance: CreditBalance): void {
    const key = `credit_balance:${userId}`;
    this.set(key, balance, this.CACHE_TTL.CREDIT_BALANCE);
  }

  static invalidateCreditBalance(userId: Id<"users">): void {
    const key = `credit_balance:${userId}`;
    this.delete(key);
  }

  /**
   * 소셜 계정 목록 캐싱
   */
  static getSocialAccounts(userId: Id<"users">, filterKey: string): any[] | null {
    const key = `social_accounts:${userId}:${filterKey}`;
    return this.get<any[]>(key);
  }

  static setSocialAccounts(userId: Id<"users">, filterKey: string, accounts: any[]): void {
    const key = `social_accounts:${userId}:${filterKey}`;
    this.set(key, accounts, this.CACHE_TTL.SOCIAL_ACCOUNTS);
  }

  static invalidateUserSocialAccounts(userId: Id<"users">): void {
    this.invalidatePattern(`social_accounts:${userId}:.*`);
  }

  /**
   * 사용자 프로필 캐싱
   */
  static getUserProfile(userId: Id<"users">): any | null {
    const key = `user_profile:${userId}`;
    return this.get<any>(key);
  }

  static setUserProfile(userId: Id<"users">, profile: any): void {
    const key = `user_profile:${userId}`;
    this.set(key, profile, this.CACHE_TTL.USER_PROFILE);
  }

  static invalidateUserProfile(userId: Id<"users">): void {
    const key = `user_profile:${userId}`;
    this.delete(key);
  }
}

// 주기적 캐시 정리 (5분마다)
setInterval(() => {
  CacheService.cleanup();
}, 5 * 60 * 1000);