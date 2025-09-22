// ======================
// 피처 플래그 시스템
// HookLabs Elite - 소셜 미디어 자동화 플랫폼
// 실시간 기능 토글 및 점진적 배포 지원
// ======================

import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// 피처 플래그 타입 정의
export interface FeatureFlag {
  _id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  environment: 'development' | 'staging' | 'production' | 'all';
  rollout: {
    percentage: number; // 0-100
    userGroups?: string[]; // 특정 사용자 그룹
    userIds?: string[]; // 특정 사용자 ID
    rules?: {
      attribute: string;
      operator: 'eq' | 'ne' | 'in' | 'nin' | 'contains';
      value: any;
    }[];
  };
  tags: string[];
  category: 'feature' | 'experiment' | 'operational' | 'performance';
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  lastModifiedBy?: string;
}

// 피처 플래그 스키마
export const featureFlagSchema = {
  name: v.string(),
  key: v.string(),
  description: v.string(),
  enabled: v.boolean(),
  environment: v.union(
    v.literal('development'),
    v.literal('staging'), 
    v.literal('production'),
    v.literal('all')
  ),
  rollout: v.object({
    percentage: v.number(),
    userGroups: v.optional(v.array(v.string())),
    userIds: v.optional(v.array(v.string())),
    rules: v.optional(v.array(v.object({
      attribute: v.string(),
      operator: v.union(v.literal('eq'), v.literal('ne'), v.literal('in'), v.literal('nin'), v.literal('contains')),
      value: v.any()
    })))
  }),
  tags: v.array(v.string()),
  category: v.union(
    v.literal('feature'),
    v.literal('experiment'),
    v.literal('operational'),
    v.literal('performance')
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  createdBy: v.string(),
  lastModifiedBy: v.optional(v.string())
};

// 모든 피처 플래그 조회
export const getFeatureFlags = query({
  args: {
    environment: v.optional(v.string()),
    category: v.optional(v.string()),
    enabled: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('featureFlags');

    // 환경별 필터링
    if (args.environment) {
      query = query.filter(q => 
        q.or(
          q.eq(q.field('environment'), args.environment),
          q.eq(q.field('environment'), 'all')
        )
      );
    }

    // 카테고리별 필터링
    if (args.category) {
      query = query.filter(q => q.eq(q.field('category'), args.category));
    }

    // 활성화 상태별 필터링
    if (args.enabled !== undefined) {
      query = query.filter(q => q.eq(q.field('enabled'), args.enabled));
    }

    return await query.collect();
  },
});

// 특정 피처 플래그 조회
export const getFeatureFlag = query({
  args: { 
    key: v.string(),
    environment: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const currentEnv = args.environment || process.env.NODE_ENV || 'development';
    
    return await ctx.db
      .query('featureFlags')
      .filter(q => 
        q.and(
          q.eq(q.field('key'), args.key),
          q.or(
            q.eq(q.field('environment'), currentEnv),
            q.eq(q.field('environment'), 'all')
          )
        )
      )
      .first();
  },
});

// 사용자별 피처 플래그 평가
export const evaluateFeatureFlag = query({
  args: {
    key: v.string(),
    userId: v.string(),
    userAttributes: v.optional(v.any()),
    environment: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // 직접 데이터베이스 조회
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .filter((q) =>
        q.or(
          q.eq(q.field("environment"), args.environment || "production"),
          q.eq(q.field("environment"), "all")
        )
      )
      .first();

    if (!flag) {
      return { enabled: false, reason: 'flag_not_found' };
    }

    if (!flag.enabled) {
      return { enabled: false, reason: 'flag_disabled' };
    }

    // 사용자 ID 기반 체크
    if (flag.rollout.userIds?.includes(args.userId)) {
      return { enabled: true, reason: 'user_id_match' };
    }

    // 사용자 그룹 기반 체크
    if (flag.rollout.userGroups && args.userAttributes) {
      const userGroups = (args.userAttributes as any)?.groups as string[] || [];
      const hasMatchingGroup = flag.rollout.userGroups.some((group: string) =>
        userGroups.includes(group)
      );
      if (hasMatchingGroup) {
        return { enabled: true, reason: 'user_group_match' };
      }
    }

    // 규칙 기반 평가
    if (flag.rollout.rules && args.userAttributes) {
      const ruleMatch = flag.rollout.rules.every((rule: any) => {
        const userValue = (args.userAttributes as any)![rule.attribute];
        
        switch (rule.operator) {
          case 'eq':
            return userValue === rule.value;
          case 'ne':
            return userValue !== rule.value;
          case 'in':
            return Array.isArray(rule.value) && rule.value.includes(userValue);
          case 'nin':
            return Array.isArray(rule.value) && !rule.value.includes(userValue);
          case 'contains':
            return String(userValue).includes(String(rule.value));
          default:
            return false;
        }
      });

      if (ruleMatch) {
        return { enabled: true, reason: 'rule_match' };
      }
    }

    // 퍼센티지 기반 롤아웃
    if (flag.rollout.percentage > 0) {
      const hash = await hashUserId(args.userId + flag.key);
      const userPercentage = hash % 100;
      
      if (userPercentage < flag.rollout.percentage) {
        return { enabled: true, reason: 'percentage_rollout' };
      }
    }

    return { enabled: false, reason: 'no_match' };
  },
});

// 여러 피처 플래그를 한번에 평가 (최적화됨 - N+1 쿼리 방지)
export const evaluateMultipleFlags = query({
  args: {
    flagKeys: v.array(v.string()),
    userId: v.string(),
    userAttributes: v.optional(v.any()),
    environment: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const currentEnv = args.environment || process.env.NODE_ENV || 'development';
    
    // 모든 플래그를 한 번에 조회 (N+1 쿼리 방지)
    const flags = await ctx.db
      .query('featureFlags')
      .filter(q => 
        q.and(
          q.or(...args.flagKeys.map(key => q.eq(q.field('key'), key))),
          q.or(
            q.eq(q.field('environment'), currentEnv),
            q.eq(q.field('environment'), 'all')
          )
        )
      )
      .collect();

    const results: Record<string, any> = {};
    
    // 각 플래그에 대해 평가 수행
    for (const key of args.flagKeys) {
      const flag = flags.find(f => f.key === key);
      
      if (!flag) {
        results[key] = { enabled: false, reason: 'flag_not_found' };
        continue;
      }

      if (!flag.enabled) {
        results[key] = { enabled: false, reason: 'flag_disabled' };
        continue;
      }

      // 사용자 ID 기반 체크
      if (flag.rollout.userIds?.includes(args.userId)) {
        results[key] = { enabled: true, reason: 'user_id_match' };
        continue;
      }

      // 사용자 그룹 기반 체크
      if (flag.rollout.userGroups && args.userAttributes) {
        const userGroups = (args.userAttributes as any)?.groups as string[] || [];
        const hasMatchingGroup = flag.rollout.userGroups.some((group: string) =>
          userGroups.includes(group)
        );
        if (hasMatchingGroup) {
          results[key] = { enabled: true, reason: 'user_group_match' };
          continue;
        }
      }

      // 규칙 기반 평가
      if (flag.rollout.rules && args.userAttributes) {
        const ruleMatch = flag.rollout.rules.every((rule: any) => {
          const userValue = (args.userAttributes as any)![rule.attribute];
          
          switch (rule.operator) {
            case 'eq':
              return userValue === rule.value;
            case 'ne':
              return userValue !== rule.value;
            case 'in':
              return Array.isArray(rule.value) && rule.value.includes(userValue);
            case 'nin':
              return Array.isArray(rule.value) && !rule.value.includes(userValue);
            case 'contains':
              return String(userValue).includes(String(rule.value));
            default:
              return false;
          }
        });

        if (ruleMatch) {
          results[key] = { enabled: true, reason: 'rule_match' };
          continue;
        }
      }

      // 퍼센티지 기반 롤아웃
      if (flag.rollout.percentage > 0) {
        const hash = await hashUserId(args.userId + flag.key);
        const userPercentage = hash % 100;
        
        if (userPercentage < flag.rollout.percentage) {
          results[key] = { enabled: true, reason: 'percentage_rollout' };
          continue;
        }
      }

      results[key] = { enabled: false, reason: 'no_match' };
    }
    
    return results;
  },
});

// 피처 플래그 생성
export const createFeatureFlag = mutation({
  args: featureFlagSchema,
  handler: async (ctx, args) => {
    // 중복 키 체크
    const existing = await ctx.db
      .query('featureFlags')
      .filter(q => q.eq(q.field('key'), args.key))
      .first();
    
    if (existing) {
      throw new Error(`Feature flag with key '${args.key}' already exists`);
    }

    const now = Date.now();
    return await ctx.db.insert('featureFlags', {
      ...args,
      createdAt: now,
      updatedAt: now
    });
  },
});

// 피처 플래그 업데이트
export const updateFeatureFlag = mutation({
  args: {
    id: v.id('featureFlags'),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      enabled: v.optional(v.boolean()),
      rollout: v.optional(v.object({
        percentage: v.number(),
        userGroups: v.optional(v.array(v.string())),
        userIds: v.optional(v.array(v.string())),
        rules: v.optional(v.array(v.object({
          attribute: v.string(),
          operator: v.union(v.literal('eq'), v.literal('ne'), v.literal('in'), v.literal('nin'), v.literal('contains')),
          value: v.any()
        })))
      })),
      tags: v.optional(v.array(v.string())),
      lastModifiedBy: v.string()
    })
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Feature flag not found');
    }

    return await ctx.db.patch(args.id, {
      ...args.updates,
      updatedAt: Date.now()
    });
  },
});

// 피처 플래그 삭제
export const deleteFeatureFlag = mutation({
  args: { id: v.id('featureFlags') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// 피처 플래그 토글 (빠른 활성화/비활성화)
export const toggleFeatureFlag = mutation({
  args: {
    key: v.string(),
    enabled: v.boolean(),
    modifiedBy: v.string()
  },
  handler: async (ctx, args) => {
    const flag = await ctx.db
      .query('featureFlags')
      .filter(q => q.eq(q.field('key'), args.key))
      .first();
    
    if (!flag) {
      throw new Error('Feature flag not found');
    }

    return await ctx.db.patch(flag._id, {
      enabled: args.enabled,
      lastModifiedBy: args.modifiedBy,
      updatedAt: Date.now()
    });
  },
});

// 피처 플래그 사용 통계 조회
export const getFeatureFlagUsage = query({
  args: {
    key: v.string(),
    timeRange: v.optional(v.object({
      start: v.number(),
      end: v.number()
    }))
  },
  handler: async (ctx, args) => {
    // 실제 구현에서는 사용 통계를 별도 테이블에 저장하고 조회
    // 여기서는 기본적인 구조만 제시
    const flag = await ctx.db
      .query('featureFlags')
      .filter(q => q.eq(q.field('key'), args.key))
      .first();
    
    if (!flag) {
      throw new Error('Feature flag not found');
    }

    // 실제로는 featureFlagUsage 테이블에서 통계를 가져와야 함
    return {
      flagKey: args.key,
      totalEvaluations: 0, // 실제 통계로 교체
      enabledEvaluations: 0,
      disabledEvaluations: 0,
      uniqueUsers: 0,
      rolloutPercentage: flag.rollout.percentage
    };
  },
});

// 소셜 미디어 기능별 피처 플래그 초기화
export const initializeSocialMediaFeatureFlags = action({
  args: { createdBy: v.string() },
  handler: async (ctx, args): Promise<any[]> => {
    const flags = [
      {
        name: '실시간 동기화',
        key: 'realtime_sync',
        description: '소셜 미디어 플랫폼과의 실시간 데이터 동기화',
        enabled: true,
        environment: 'all' as const,
        rollout: { percentage: 100 },
        tags: ['social-media', 'realtime', 'core'],
        category: 'feature' as const
      },
      {
        name: 'AI 콘텐츠 생성',
        key: 'ai_content_generation',
        description: 'AI를 활용한 소셜 미디어 콘텐츠 자동 생성',
        enabled: true,
        environment: 'all' as const,
        rollout: { percentage: 90 },
        tags: ['ai', 'content', 'automation'],
        category: 'feature' as const
      },
      {
        name: 'A/B 테스트 변형',
        key: 'ab_testing_variants',
        description: '포스트 변형을 통한 A/B 테스트 시스템',
        enabled: true,
        environment: 'all' as const,
        rollout: { percentage: 75 },
        tags: ['testing', 'optimization', 'analytics'],
        category: 'experiment' as const
      },
      {
        name: '고급 분석 대시보드',
        key: 'advanced_analytics',
        description: 'AI 기반 고급 분석 및 인사이트',
        enabled: true,
        environment: 'all' as const,
        rollout: { percentage: 100 },
        tags: ['analytics', 'dashboard', 'insights'],
        category: 'feature' as const
      },
      {
        name: '토큰 만료 알림',
        key: 'token_expiry_alerts',
        description: '소셜 미디어 토큰 만료 알림 시스템',
        enabled: true,
        environment: 'all' as const,
        rollout: { percentage: 100 },
        tags: ['tokens', 'alerts', 'maintenance'],
        category: 'operational' as const
      },
      {
        name: '자동 스케줄링',
        key: 'auto_scheduling',
        description: '콘텐츠 자동 스케줄링 및 최적화',
        enabled: true,
        environment: 'all' as const,
        rollout: { percentage: 80 },
        tags: ['scheduling', 'automation', 'optimization'],
        category: 'feature' as const
      }
    ];

    const results = [];
    for (const flag of flags) {
      try {
        // 내부 mutation 사용
        const result = await ctx.runMutation(internal.featureFlags.createFeatureFlag, {
          ...flag,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: args.createdBy
        });
        results.push(result);
      } catch (error) {
        // 이미 존재하는 플래그는 건너뛰기
        console.log(`Skipping existing feature flag: ${flag.key}`);
      }
    }

    return results;
  },
});

// 사용자 ID 해싱 함수 (일관성 있는 퍼센티지 롤아웃용)
async function hashUserId(input: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  
  // 처음 4바이트를 숫자로 변환
  let hash = 0;
  for (let i = 0; i < 4; i++) {
    hash = (hash << 8) | hashArray[i];
  }
  
  return Math.abs(hash);
}