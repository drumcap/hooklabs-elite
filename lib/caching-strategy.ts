/**
 * 캐싱 전략 최적화
 * - Redis 캐싱
 * - 브라우저 캐시 제어
 * - API 응답 캐싱
 * - Static 자산 캐싱
 */

import { Redis } from '@upstash/redis';

/**
 * 캐시 TTL 설정 (초 단위)
 */
export const CACHE_TTL = {
  // 짧은 캐시 (빠르게 변하는 데이터)
  VERY_SHORT: 30,        // 30초
  SHORT: 60,             // 1분
  MEDIUM_SHORT: 300,     // 5분
  
  // 중간 캐시 (자주 변하지 않는 데이터)
  MEDIUM: 900,           // 15분
  MEDIUM_LONG: 1800,     // 30분
  LONG: 3600,            // 1시간
  
  // 긴 캐시 (거의 변하지 않는 데이터)
  VERY_LONG: 86400,      // 24시간
  WEEK: 604800,          // 7일
  MONTH: 2592000,        // 30일
  YEAR: 31536000,        // 1년
} as const;

/**
 * 캐시 키 생성기
 */
export class CacheKeyGenerator {
  private static prefix = 'hooklabs:';

  static user(userId: string): string {
    return `${this.prefix}user:${userId}`;
  }

  static userSubscription(userId: string): string {
    return `${this.prefix}user:${userId}:subscription`;
  }

  static userCredits(userId: string): string {
    return `${this.prefix}user:${userId}:credits`;
  }

  static persona(personaId: string): string {
    return `${this.prefix}persona:${personaId}`;
  }

  static userPersonas(userId: string): string {
    return `${this.prefix}user:${userId}:personas`;
  }

  static socialAccount(userId: string, platform: string): string {
    return `${this.prefix}user:${userId}:social:${platform}`;
  }

  static socialPosts(userId: string, limit?: number): string {
    return `${this.prefix}user:${userId}:posts${limit ? `:limit:${limit}` : ''}`;
  }

  static aiGeneration(userId: string, type: string): string {
    return `${this.prefix}user:${userId}:ai:${type}`;
  }

  static metrics(userId: string, timeframe: string): string {
    return `${this.prefix}user:${userId}:metrics:${timeframe}`;
  }

  static analytics(postId: string): string {
    return `${this.prefix}post:${postId}:analytics`;
  }

  static apiRate(userId: string, endpoint: string): string {
    return `${this.prefix}rate:${userId}:${endpoint}`;
  }

  static session(sessionId: string): string {
    return `${this.prefix}session:${sessionId}`;
  }

  static temp(key: string): string {
    return `${this.prefix}temp:${key}`;
  }
}

/**
 * Redis 캐시 매니저
 */
export class CacheManager {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  /**
   * 캐시 설정
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('캐시 설정 실패:', error);
    }
  }

  /**
   * 캐시 가져오기
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data as string) : null;
    } catch (error) {
      console.error('캐시 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * 캐시 삭제
   */
  async del(key: string | string[]): Promise<void> {
    try {
      if (Array.isArray(key)) {
        await this.redis.del(...key);
      } else {
        await this.redis.del(key);
      }
    } catch (error) {
      console.error('캐시 삭제 실패:', error);
    }
  }

  /**
   * 패턴으로 키 삭제
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('패턴 캐시 삭제 실패:', error);
    }
  }

  /**
   * 캐시 존재 여부 확인
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('캐시 존재 확인 실패:', error);
      return false;
    }
  }

  /**
   * TTL 확인
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error('TTL 확인 실패:', error);
      return -1;
    }
  }

  /**
   * 원자적 증가
   */
  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const result = await this.redis.incr(key);
      if (ttl && result === 1) {
        await this.redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error('캐시 증가 실패:', error);
      return 0;
    }
  }

  /**
   * 캐시 또는 실행
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }

  /**
   * 사용자별 캐시 무효화
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      CacheKeyGenerator.user(userId),
      `${CacheKeyGenerator.userSubscription(userId)}*`,
      `${CacheKeyGenerator.userCredits(userId)}*`,
      `${CacheKeyGenerator.userPersonas(userId)}*`,
      `${CacheKeyGenerator.socialPosts(userId)}*`,
      `${CacheKeyGenerator.metrics(userId)}*`,
    ];

    await Promise.all(patterns.map(pattern => this.delPattern(pattern)));
  }
}

/**
 * 브라우저 캐시 헤더 생성
 */
export function getCacheHeaders(type: 'static' | 'api' | 'page' | 'image') {
  const headers: Record<string, string> = {};

  switch (type) {
    case 'static':
      // 정적 자산 (JS, CSS, 이미지) - 1년 캐시
      headers['Cache-Control'] = `public, max-age=${CACHE_TTL.YEAR}, immutable`;
      headers['Expires'] = new Date(Date.now() + CACHE_TTL.YEAR * 1000).toUTCString();
      break;

    case 'image':
      // 이미지 - 1시간 캐시, 재검증 필요
      headers['Cache-Control'] = `public, max-age=${CACHE_TTL.LONG}, stale-while-revalidate=86400`;
      headers['Expires'] = new Date(Date.now() + CACHE_TTL.LONG * 1000).toUTCString();
      break;

    case 'api':
      // API 응답 - 5분 캐시, 재검증 필요
      headers['Cache-Control'] = `public, max-age=${CACHE_TTL.MEDIUM_SHORT}, stale-while-revalidate=300`;
      headers['Expires'] = new Date(Date.now() + CACHE_TTL.MEDIUM_SHORT * 1000).toUTCString();
      break;

    case 'page':
      // 페이지 - 15분 캐시, 재검증 필요
      headers['Cache-Control'] = `public, max-age=${CACHE_TTL.MEDIUM}, stale-while-revalidate=900`;
      headers['Expires'] = new Date(Date.now() + CACHE_TTL.MEDIUM * 1000).toUTCString();
      break;
  }

  // 공통 헤더
  headers['Vary'] = 'Accept-Encoding, User-Agent';
  headers['X-Cache-Status'] = 'MISS';

  return headers;
}

/**
 * 캐시 무효화 전략
 */
export class CacheInvalidation {
  private cache: CacheManager;

  constructor(cache: CacheManager) {
    this.cache = cache;
  }

  /**
   * 사용자 구독 변경시 캐시 무효화
   */
  async onSubscriptionChange(userId: string): Promise<void> {
    await Promise.all([
      this.cache.del(CacheKeyGenerator.userSubscription(userId)),
      this.cache.del(CacheKeyGenerator.userCredits(userId)),
      this.cache.delPattern(CacheKeyGenerator.metrics(userId, '*')),
    ]);
  }

  /**
   * 게시물 생성/수정시 캐시 무효화
   */
  async onPostChange(userId: string, postId?: string): Promise<void> {
    await Promise.all([
      this.cache.delPattern(CacheKeyGenerator.socialPosts(userId, '*')),
      this.cache.delPattern(CacheKeyGenerator.metrics(userId, '*')),
      ...(postId ? [this.cache.del(CacheKeyGenerator.analytics(postId))] : []),
    ]);
  }

  /**
   * 페르소나 변경시 캐시 무효화
   */
  async onPersonaChange(userId: string, personaId?: string): Promise<void> {
    await Promise.all([
      this.cache.del(CacheKeyGenerator.userPersonas(userId)),
      ...(personaId ? [this.cache.del(CacheKeyGenerator.persona(personaId))] : []),
    ]);
  }

  /**
   * 소셜 계정 연결/해제시 캐시 무효화
   */
  async onSocialAccountChange(userId: string, platform?: string): Promise<void> {
    if (platform) {
      await this.cache.del(CacheKeyGenerator.socialAccount(userId, platform));
    } else {
      await this.cache.delPattern(`${CacheKeyGenerator.user(userId)}:social:*`);
    }
  }
}

/**
 * 캐시 상태 모니터링
 */
export class CacheMonitor {
  private cache: CacheManager;
  private stats: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
  } = { hits: 0, misses: 0, sets: 0, deletes: 0 };

  constructor(cache: CacheManager) {
    this.cache = cache;
  }

  /**
   * 캐시 히트율 계산
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }

  /**
   * 캐시 통계 가져오기
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.getHitRate(),
    };
  }

  /**
   * 통계 초기화
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * 캐시 성능 리포트
   */
  async generateReport(): Promise<{
    stats: typeof this.stats & { hitRate: number };
    recommendations: string[];
  }> {
    const stats = this.getStats();
    const recommendations: string[] = [];

    if (stats.hitRate < 0.7) {
      recommendations.push('캐시 히트율이 낮습니다. TTL 설정을 검토하세요.');
    }

    if (stats.misses > stats.hits * 2) {
      recommendations.push('캐시 미스가 많습니다. 캐싱 전략을 재검토하세요.');
    }

    return { stats, recommendations };
  }
}

// 전역 캐시 매니저 인스턴스
export const cacheManager = new CacheManager();
export const cacheInvalidation = new CacheInvalidation(cacheManager);
export const cacheMonitor = new CacheMonitor(cacheManager);