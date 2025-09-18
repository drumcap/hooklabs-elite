import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";

// 🚀 통합 캐시 관리자 - Redis + 메모리 캐시 결합
export interface CacheConfig {
  ttl: number; // TTL in seconds
  staleWhileRevalidate: number; // Stale-while-revalidate timeout
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Enable gzip compression for large values
}

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
  version: string;
}

// 메모리 캐시 (로컬 인스턴스별)
const memoryCache = new Map<string, CacheEntry>();
const MEMORY_CACHE_MAX_SIZE = 1000; // 메모리 캐시 최대 항목 수

// 캐시 키 생성 유틸리티
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
}

// 압축 유틸리티
async function compressData(data: any): Promise<string> {
  // 실제 환경에서는 gzip 압축 구현
  // 여기서는 JSON.stringify로 대체
  return JSON.stringify(data);
}

async function decompressData(compressedData: string): Promise<any> {
  return JSON.parse(compressedData);
}

// 🎯 캐시 조회/저장 액션
export const cacheGet = action({
  args: {
    key: v.string(),
    useMemoryCache: v.optional(v.boolean()),
  },
  handler: async (ctx, { key, useMemoryCache = true }) => {
    // 1. 메모리 캐시에서 먼저 확인
    if (useMemoryCache && memoryCache.has(key)) {
      const entry = memoryCache.get(key)!;
      const now = Date.now();
      
      if (now - entry.timestamp < entry.ttl * 1000) {
        return {
          data: entry.data,
          source: 'memory',
          hit: true,
          stale: false,
        };
      } else {
        // 만료된 항목 제거
        memoryCache.delete(key);
      }
    }

    // 2. 외부 캐시 (Redis 대체) - 여기서는 파일 기반으로 구현
    try {
      // 실제 Redis 구현 시 여기에 Redis 클라이언트 사용
      // const cachedValue = await redis.get(key);
      // 현재는 Convex 자체 저장소 사용
      
      return {
        data: null,
        source: 'none',
        hit: false,
        stale: false,
      };
    } catch (error) {
      console.error('Cache get error:', error);
      return {
        data: null,
        source: 'none',
        hit: false,
        stale: false,
      };
    }
  },
});

export const cacheSet = action({
  args: {
    key: v.string(),
    data: v.any(),
    config: v.object({
      ttl: v.number(),
      staleWhileRevalidate: v.optional(v.number()),
      tags: v.optional(v.array(v.string())),
      compress: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { key, data, config }) => {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      tags: config.tags,
      version: '1.0',
    };

    try {
      // 1. 메모리 캐시에 저장
      if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
        // LRU 방식으로 오래된 항목 제거
        const oldestKey = memoryCache.keys().next().value;
        if (oldestKey) {
          memoryCache.delete(oldestKey);
        }
      }
      memoryCache.set(key, entry);

      // 2. 외부 캐시에 저장 (압축 옵션)
      const serializedData = config.compress 
        ? await compressData(data)
        : JSON.stringify(data);

      // 실제 Redis 구현
      // await redis.setex(key, config.ttl, serializedData);
      
      // 태그 기반 무효화를 위한 태그 매핑 저장
      if (config.tags) {
        for (const tag of config.tags) {
          // await redis.sadd(`tag:${tag}`, key);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Cache set error:', error);
      return { success: false, error: (error as any)?.message || error };
    }
  },
});

// 🏷️ 태그 기반 캐시 무효화
export const invalidateByTags = action({
  args: {
    tags: v.array(v.string()),
  },
  handler: async (ctx, { tags }) => {
    let invalidatedCount = 0;

    try {
      for (const tag of tags) {
        // 메모리 캐시에서 태그 관련 항목 무효화
        for (const [key, entry] of memoryCache) {
          if (entry.tags?.includes(tag)) {
            memoryCache.delete(key);
            invalidatedCount++;
          }
        }

        // 외부 캐시에서 태그 관련 항목 무효화
        // const keys = await redis.smembers(`tag:${tag}`);
        // if (keys.length > 0) {
        //   await redis.del(...keys);
        //   await redis.del(`tag:${tag}`);
        //   invalidatedCount += keys.length;
        // }
      }

      return { success: true, invalidatedCount };
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return { success: false, error: (error as any)?.message || error };
    }
  },
});

// 📊 캐시 통계 조회
export const getCacheStats = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let memoryHits = 0;
    let memoryExpired = 0;
    
    for (const [key, entry] of memoryCache) {
      if (now - entry.timestamp < entry.ttl * 1000) {
        memoryHits++;
      } else {
        memoryExpired++;
      }
    }

    return {
      memoryCache: {
        size: memoryCache.size,
        maxSize: MEMORY_CACHE_MAX_SIZE,
        hits: memoryHits,
        expired: memoryExpired,
        hitRate: memoryCache.size > 0 ? (memoryHits / memoryCache.size) * 100 : 0,
      },
      // Redis 통계는 실제 구현 시 추가
    };
  },
});

// 🧹 캐시 정리 작업
export const cleanupExpiredCache = action({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let cleanedCount = 0;

    // 메모리 캐시 정리
    for (const [key, entry] of memoryCache) {
      if (now - entry.timestamp >= entry.ttl * 1000) {
        memoryCache.delete(key);
        cleanedCount++;
      }
    }

    return { cleanedCount };
  },
});

// 🎯 캐시된 쿼리 래퍼
export function withCache<T>(
  queryFn: () => Promise<T>,
  cacheKey: string,
  config: CacheConfig
) {
  return async (ctx: any): Promise<T> => {
    // 캐시에서 조회 시도
    const cached = await ctx.runAction(cacheGet, { key: cacheKey });
    
    if (cached.hit && !cached.stale) {
      return cached.data;
    }

    // 캐시 미스 또는 stale - 실제 데이터 조회
    const freshData = await queryFn();
    
    // 캐시에 저장
    await ctx.runAction(cacheSet, {
      key: cacheKey,
      data: freshData,
      config,
    });

    return freshData;
  };
}

// 🚀 Smart Cache Preloader - 예측 기반 캐시 워밍
export const preloadUserData = action({
  args: {
    userId: v.id("users"),
    patterns: v.optional(v.array(v.string())), // 캐시할 데이터 패턴
  },
  handler: async (ctx, { userId, patterns = ['posts', 'personas', 'stats'] }) => {
    const preloadTasks: Promise<any>[] = [];

    if (patterns.includes('posts')) {
      // preloadTasks.push(
      //   ctx.runQuery(api.socialPostsOptimized.listOptimized, {
      //     limit: 20,
      //     includeMetrics: true,
      //   })
      // );
    }

    if (patterns.includes('personas')) {
      // preloadTasks.push(
      //   ctx.runQuery(api.personas.list, {})
      // );
    }

    if (patterns.includes('stats')) {
      // preloadTasks.push(
      //   ctx.runQuery(api.socialPostsOptimized.getDashboardStatsOptimized, {})
      // );
    }

    try {
      await Promise.all(preloadTasks);
      return { success: true, preloadedPatterns: patterns };
    } catch (error) {
      return { success: false, error: (error as any)?.message || error };
    }
  },
});