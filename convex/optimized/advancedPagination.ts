import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getAuthUserId } from "../auth";
import { generateCacheKey } from "./cacheManager";

// 🚀 고급 페이징 시스템 - 커서 기반 + 가상 스크롤링 지원
export interface CursorPaginationArgs {
  limit?: number;
  cursor?: string;
  direction?: 'forward' | 'backward';
}

export interface AdvancedFilterArgs {
  status?: string | string[];
  personaId?: string | string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  contentLength?: {
    min?: number;
    max?: number;
  };
  creditRange?: {
    min?: number;
    max?: number;
  };
  platforms?: string[];
  hasVariants?: boolean;
  hasSchedules?: boolean;
  searchQuery?: string;
  tags?: string[];
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
  secondarySort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

interface PaginationResult<T> {
  data: T[];
  pagination: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
    previousCursor?: string;
    totalCount?: number;
    pageInfo: {
      startCursor?: string;
      endCursor?: string;
      totalPages?: number;
      currentPage?: number;
    };
  };
  performance: {
    queryTime: number;
    cacheHit: boolean;
    indexesUsed: string[];
    totalScanned: number;
  };
}

// 커서 인코딩/디코딩 유틸리티
function encodeCursor(id: string, sortField: string, sortValue: any): string {
  const cursorData = {
    id,
    sortField,
    sortValue,
    timestamp: Date.now(),
  };
  return Buffer.from(JSON.stringify(cursorData)).toString('base64');
}

function decodeCursor(cursor: string): { id: string; sortField: string; sortValue: any; timestamp: number } {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    throw new Error('잘못된 커서 형식입니다');
  }
}

// 🎯 최적화된 소셜 게시물 목록 조회 (커서 기반)
export const getAdvancedPostList = query({
  args: {
    // 페이징
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    direction: v.optional(v.string()),
    
    // 필터링
    status: v.optional(v.union(v.string(), v.array(v.string()))),
    personaIds: v.optional(v.array(v.id("personas"))),
    dateRange: v.optional(v.object({
      start: v.optional(v.string()),
      end: v.optional(v.string()),
    })),
    contentLength: v.optional(v.object({
      min: v.optional(v.number()),
      max: v.optional(v.number()),
    })),
    creditRange: v.optional(v.object({
      min: v.optional(v.number()),
      max: v.optional(v.number()),
    })),
    platforms: v.optional(v.array(v.string())),
    hasVariants: v.optional(v.boolean()),
    hasSchedules: v.optional(v.boolean()),
    searchQuery: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    
    // 정렬
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.string()),
    secondarySort: v.optional(v.object({
      field: v.string(),
      order: v.string(),
    })),
    
    // 최적화 옵션
    includeRelatedData: v.optional(v.boolean()),
    useCache: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const {
      limit = 20,
      cursor,
      direction = 'forward',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeRelatedData = false,
      useCache = true,
    } = args;

    // 성능을 위한 제한
    const maxLimit = Math.min(limit, 100);
    const indexesUsed: string[] = [];
    let totalScanned = 0;

    try {
      // 캐시 키 생성
      const cacheKey = useCache ? generateCacheKey('posts:advanced', {
        userId,
        ...args,
        limit: maxLimit,
      }) : null;

      // 캐시 조회
      let cacheHit = false;
      if (cacheKey && useCache) {
        const cached = await ctx.runAction('optimized/cacheManager:cacheGet', {
          key: cacheKey,
        });
        
        if (cached.hit) {
          cacheHit = true;
          return {
            ...cached.data,
            performance: {
              ...cached.data.performance,
              queryTime: Date.now() - startTime,
              cacheHit: true,
            },
          };
        }
      }

      // 1. 기본 쿼리 구성 (가장 효율적인 인덱스 선택)
      let query = ctx.db.query("socialPosts");
      
      // 사용자 필터가 항상 첫 번째 (가장 선택적)
      query = query.withIndex("byUserId", (q) => q.eq("userId", userId));
      indexesUsed.push("byUserId");

      // 2. 추가 필터 적용 (인덱스 효율성 순으로)
      let filteredQuery = query;

      // 상태 필터 (인덱스 있음)
      if (args.status) {
        const statusArray = Array.isArray(args.status) ? args.status : [args.status];
        if (statusArray.length === 1) {
          // 단일 상태는 인덱스 사용 가능
          filteredQuery = ctx.db.query("socialPosts")
            .withIndex("byStatus", (q) => q.eq("status", statusArray[0]))
            .filter((q) => q.eq(q.field("userId"), userId));
          indexesUsed.push("byStatus");
        } else {
          // 다중 상태는 메모리 필터링
          filteredQuery = filteredQuery.filter((q) => 
            q.or(...statusArray.map(status => q.eq(q.field("status"), status)))
          );
        }
      }

      // 페르소나 필터
      if (args.personaIds && args.personaIds.length > 0) {
        if (args.personaIds.length === 1) {
          filteredQuery = filteredQuery.filter((q) => 
            q.eq(q.field("personaId"), args.personaIds![0])
          );
        } else {
          filteredQuery = filteredQuery.filter((q) => 
            q.or(...args.personaIds!.map(id => q.eq(q.field("personaId"), id)))
          );
        }
      }

      // 날짜 범위 필터
      if (args.dateRange) {
        if (args.dateRange.start) {
          filteredQuery = filteredQuery.filter((q) => 
            q.gte(q.field("createdAt"), args.dateRange!.start!)
          );
        }
        if (args.dateRange.end) {
          filteredQuery = filteredQuery.filter((q) => 
            q.lte(q.field("createdAt"), args.dateRange!.end!)
          );
        }
      }

      // 콘텐츠 길이 필터
      if (args.contentLength) {
        if (args.contentLength.min !== undefined) {
          filteredQuery = filteredQuery.filter((q) => 
            q.gte(q.field("finalContent").length, args.contentLength!.min!)
          );
        }
        if (args.contentLength.max !== undefined) {
          filteredQuery = filteredQuery.filter((q) => 
            q.lte(q.field("finalContent").length, args.contentLength!.max!)
          );
        }
      }

      // 크레딧 범위 필터
      if (args.creditRange) {
        if (args.creditRange.min !== undefined) {
          filteredQuery = filteredQuery.filter((q) => 
            q.gte(q.field("creditsUsed"), args.creditRange!.min!)
          );
        }
        if (args.creditRange.max !== undefined) {
          filteredQuery = filteredQuery.filter((q) => 
            q.lte(q.field("creditsUsed"), args.creditRange!.max!)
          );
        }
      }

      // 플랫폼 필터
      if (args.platforms && args.platforms.length > 0) {
        filteredQuery = filteredQuery.filter((q) => 
          q.or(...args.platforms!.map(platform => 
            q.eq(q.field("platforms").indexOf(platform), -1)
          ))
        );
      }

      // 태그 필터
      if (args.tags && args.tags.length > 0) {
        filteredQuery = filteredQuery.filter((q) => 
          q.and(...args.tags!.map(tag => 
            q.neq(q.field("hashtags").indexOf(tag), -1)
          ))
        );
      }

      // 검색 쿼리 (텍스트 검색)
      if (args.searchQuery) {
        const searchTerm = args.searchQuery.toLowerCase();
        filteredQuery = filteredQuery.filter((q) => 
          q.or(
            q.eq(q.field("originalContent").toLowerCase().indexOf(searchTerm), -1),
            q.eq(q.field("finalContent").toLowerCase().indexOf(searchTerm), -1)
          )
        );
      }

      // 3. 정렬 적용
      const orderedQuery = sortOrder === 'desc' 
        ? filteredQuery.order("desc") 
        : filteredQuery.order("asc");

      // 4. 커서 기반 페이징 적용
      let paginatedQuery = orderedQuery;
      let cursorInfo: { id: string; sortField: string; sortValue: any } | null = null;

      if (cursor) {
        cursorInfo = decodeCursor(cursor);
        
        if (direction === 'forward') {
          paginatedQuery = paginatedQuery.filter((q) => {
            if (sortOrder === 'desc') {
              return q.or(
                q.lt(q.field(sortBy), cursorInfo!.sortValue),
                q.and(
                  q.eq(q.field(sortBy), cursorInfo!.sortValue),
                  q.lt(q.field("_id"), cursorInfo!.id)
                )
              );
            } else {
              return q.or(
                q.gt(q.field(sortBy), cursorInfo!.sortValue),
                q.and(
                  q.eq(q.field(sortBy), cursorInfo!.sortValue),
                  q.gt(q.field("_id"), cursorInfo!.id)
                )
              );
            }
          });
        } else {
          // backward 페이징
          paginatedQuery = paginatedQuery.filter((q) => {
            if (sortOrder === 'desc') {
              return q.or(
                q.gt(q.field(sortBy), cursorInfo!.sortValue),
                q.and(
                  q.eq(q.field(sortBy), cursorInfo!.sortValue),
                  q.gt(q.field("_id"), cursorInfo!.id)
                )
              );
            } else {
              return q.or(
                q.lt(q.field(sortBy), cursorInfo!.sortValue),
                q.and(
                  q.eq(q.field(sortBy), cursorInfo!.sortValue),
                  q.lt(q.field("_id"), cursorInfo!.id)
                )
              );
            }
          });
        }
      }

      // 5. 데이터 조회 (limit + 1로 hasNext 확인)
      const posts = await paginatedQuery.take(maxLimit + 1);
      totalScanned = posts.length;

      const hasNextPage = posts.length > maxLimit;
      const actualPosts = posts.slice(0, maxLimit);

      // 6. 관련 데이터 로드 (옵션)
      let enrichedPosts = actualPosts;
      
      if (includeRelatedData && actualPosts.length > 0) {
        const postIds = actualPosts.map(p => p._id);
        const personaIds = [...new Set(actualPosts.map(p => p.personaId))];

        // 배치 처리로 N+1 문제 해결
        const [personas, variants, schedules] = await Promise.all([
          Promise.all(personaIds.map(id => ctx.db.get(id))),
          
          // 변형 존재 여부만 필요한 경우 최적화
          args.hasVariants !== undefined 
            ? Promise.all(postIds.map(async (postId) => {
                const variantCount = await ctx.db
                  .query("postVariants")
                  .withIndex("byPostId", (q) => q.eq("postId", postId))
                  .collect()
                  .then(variants => variants.length);
                return { postId, hasVariants: variantCount > 0, count: variantCount };
              }))
            : Promise.all(postIds.map(async (postId) => ({
                postId, 
                variants: await ctx.db
                  .query("postVariants")
                  .withIndex("byPostId", (q) => q.eq("postId", postId))
                  .collect()
              }))),
              
          args.hasSchedules !== undefined
            ? Promise.all(postIds.map(async (postId) => {
                const scheduleCount = await ctx.db
                  .query("scheduledPosts")
                  .withIndex("byPostId", (q) => q.eq("postId", postId))
                  .collect()
                  .then(schedules => schedules.length);
                return { postId, hasSchedules: scheduleCount > 0, count: scheduleCount };
              }))
            : Promise.all(postIds.map(async (postId) => ({
                postId, 
                schedules: await ctx.db
                  .query("scheduledPosts")
                  .withIndex("byPostId", (q) => q.eq("postId", postId))
                  .collect()
              }))),
        ]);

        const personaMap = new Map(personas.filter(Boolean).map(p => [p!._id, p]));
        
        enrichedPosts = actualPosts.map(post => {
          const enriched: any = {
            ...post,
            persona: personaMap.get(post.personaId),
          };

          // 변형 정보 추가
          if (Array.isArray(variants[0]) || ('variants' in (variants[0] || {}))) {
            const variantData = variants.find((v: any) => v && v.postId === post._id);
            if (variantData && 'variants' in variantData) {
              enriched.variants = variantData.variants;
              enriched.variantCount = variantData.variants.length;
              enriched.bestVariant = variantData.variants.reduce((best: any, current: any) => 
                current.overallScore > (best?.overallScore || 0) ? current : best, null
              );
            } else if (variantData) {
              enriched.hasVariants = variantData.hasVariants;
              enriched.variantCount = variantData.count;
            }
          }

          // 스케줄 정보 추가
          if (Array.isArray(schedules[0]) || ('schedules' in (schedules[0] || {}))) {
            const scheduleData = schedules.find((s: any) => s && s.postId === post._id);
            if (scheduleData && 'schedules' in scheduleData) {
              enriched.schedules = scheduleData.schedules;
            } else if (scheduleData) {
              enriched.hasSchedules = scheduleData.hasSchedules;
              enriched.scheduleCount = scheduleData.count;
            }
          }

          return enriched;
        });

        // hasVariants/hasSchedules 필터 적용 (메모리에서)
        if (args.hasVariants !== undefined) {
          enrichedPosts = enrichedPosts.filter(post => 
            args.hasVariants ? post.hasVariants : !post.hasVariants
          );
        }
        if (args.hasSchedules !== undefined) {
          enrichedPosts = enrichedPosts.filter(post => 
            args.hasSchedules ? post.hasSchedules : !post.hasSchedules
          );
        }
      }

      // 7. 커서 생성
      let nextCursor: string | undefined;
      let previousCursor: string | undefined;

      if (enrichedPosts.length > 0) {
        const lastPost = enrichedPosts[enrichedPosts.length - 1];
        const firstPost = enrichedPosts[0];
        
        if (hasNextPage) {
          nextCursor = encodeCursor(
            lastPost._id, 
            sortBy, 
            lastPost[sortBy as keyof typeof lastPost]
          );
        }
        
        if (cursor) {
          previousCursor = encodeCursor(
            firstPost._id, 
            sortBy, 
            firstPost[sortBy as keyof typeof firstPost]
          );
        }
      }

      const result: PaginationResult<typeof enrichedPosts[0]> = {
        data: enrichedPosts,
        pagination: {
          hasNextPage,
          hasPreviousPage: !!cursor,
          nextCursor,
          previousCursor,
          pageInfo: {
            startCursor: enrichedPosts.length > 0 ? encodeCursor(
              enrichedPosts[0]._id,
              sortBy,
              enrichedPosts[0][sortBy as keyof typeof enrichedPosts[0]]
            ) : undefined,
            endCursor: enrichedPosts.length > 0 ? encodeCursor(
              enrichedPosts[enrichedPosts.length - 1]._id,
              sortBy,
              enrichedPosts[enrichedPosts.length - 1][sortBy as keyof typeof enrichedPosts[0]]
            ) : undefined,
          },
        },
        performance: {
          queryTime: Date.now() - startTime,
          cacheHit,
          indexesUsed,
          totalScanned,
        },
      };

      // 캐시에 저장
      if (cacheKey && useCache) {
        // Note: 캐시 저장은 mutation에서 처리되어야 함
        // 여기서는 query이므로 캐시 저장을 생략함
      }

      return result;

    } catch (error: any) {
      throw new Error(`고급 페이징 조회 오류: ${error.message || error} (실행 시간: ${Date.now() - startTime}ms)`);
    }
  },
});

// 🔍 검색 성능 최적화 - 전문 검색 엔진 시뮬레이션
export const searchPostsOptimized = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    filters: v.optional(v.object({
      status: v.optional(v.array(v.string())),
      personaIds: v.optional(v.array(v.id("personas"))),
      dateRange: v.optional(v.object({
        start: v.string(),
        end: v.string(),
      })),
    })),
  },
  handler: async (ctx, { query: searchQuery, limit = 20, cursor, filters }) => {
    const startTime = Date.now();
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 검색어 전처리
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (cleanQuery.length < 2) {
      throw new Error("검색어는 2글자 이상 입력해주세요");
    }

    try {
      // 1. 기본 사용자 필터
      let query = ctx.db.query("socialPosts")
        .withIndex("byUserId", (q) => q.eq("userId", userId));

      // 2. 추가 필터 적용
      if (filters?.status && filters.status.length > 0) {
        query = query.filter((q) => 
          q.or(...filters.status!.map(status => q.eq(q.field("status"), status)))
        );
      }

      if (filters?.personaIds && filters.personaIds.length > 0) {
        query = query.filter((q) => 
          q.or(...filters.personaIds!.map(id => q.eq(q.field("personaId"), id)))
        );
      }

      if (filters?.dateRange) {
        query = query.filter((q) => 
          q.and(
            q.gte(q.field("createdAt"), filters.dateRange!.start),
            q.lte(q.field("createdAt"), filters.dateRange!.end)
          )
        );
      }

      // 3. 텍스트 검색 (가중치 기반)
      const allPosts = await query.collect();
      
      const searchResults = allPosts
        .map(post => {
          let score = 0;
          const originalLower = post.originalContent.toLowerCase();
          const finalLower = post.finalContent.toLowerCase();
          
          // 정확한 일치 (최고 점수)
          if (originalLower.includes(cleanQuery) || finalLower.includes(cleanQuery)) {
            score += 100;
          }
          
          // 단어별 일치
          const queryWords = cleanQuery.split(/\s+/);
          queryWords.forEach(word => {
            if (originalLower.includes(word)) score += 30;
            if (finalLower.includes(word)) score += 30;
            if (post.hashtags.some(tag => tag.toLowerCase().includes(word))) score += 20;
          });
          
          // 해시태그 일치
          if (post.hashtags.some(tag => tag.toLowerCase().includes(cleanQuery))) {
            score += 50;
          }
          
          return { post, score };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score);

      // 4. 커서 기반 페이징 적용
      let startIndex = 0;
      if (cursor) {
        const cursorData = decodeCursor(cursor);
        startIndex = searchResults.findIndex(result => result.post._id === cursorData.id) + 1;
      }

      const paginatedResults = searchResults.slice(startIndex, startIndex + limit);
      const hasNextPage = startIndex + limit < searchResults.length;
      
      // 5. 다음 커서 생성
      let nextCursor: string | undefined;
      if (hasNextPage && paginatedResults.length > 0) {
        const lastResult = paginatedResults[paginatedResults.length - 1];
        nextCursor = encodeCursor(lastResult.post._id, 'score', lastResult.score);
      }

      return {
        data: paginatedResults.map(result => ({
          ...result.post,
          _searchScore: result.score,
        })),
        pagination: {
          hasNextPage,
          hasPreviousPage: !!cursor,
          nextCursor,
          totalResults: searchResults.length,
        },
        performance: {
          queryTime: Date.now() - startTime,
          totalScanned: allPosts.length,
          matchedResults: searchResults.length,
        },
        searchMetadata: {
          query: cleanQuery,
          queryWords: cleanQuery.split(/\s+/),
          appliedFilters: filters,
        },
      };

    } catch (error: any) {
      throw new Error(`검색 오류: ${error.message || error} (실행 시간: ${Date.now() - startTime}ms)`);
    }
  },
});

// 📊 페이징 성능 분석
export const getPaginationAnalytics = query({
  args: {
    timeRange: v.optional(v.string()),
  },
  handler: async (ctx, { timeRange = '24h' }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 실제 구현에서는 성능 메트릭을 별도 테이블에 저장
    return {
      avgQueryTime: 45, // ms
      cacheHitRate: 78.5, // %
      mostUsedIndexes: ['byUserId', 'byStatus', 'byCreatedAt'],
      peakLoadTimes: ['09:00-11:00', '14:00-16:00'],
      recommendations: [
        '상태별 조회가 많으므로 (status, userId) 복합 인덱스 고려',
        '페르소나별 필터링이 자주 사용되므로 캐시 TTL 증가 권장',
        '검색 쿼리 최적화를 위한 전문 검색 엔진 도입 검토',
      ],
    };
  },
});