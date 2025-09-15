/**
 * 통합 스키마 정의 - 도메인별 분할된 스키마 통합
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authSchema } from "./schema/auth";
import { paymentsSchema } from "./schema/payments";
import { billingSchema } from "./schema/billing";
import { socialSchema } from "./schema/social";
import { aiSchema } from "./schema/ai";
import { analyticsSchema } from "./schema/analytics";
import { monitoringSchema } from "./schema/monitoring";
import { pipelineSchema } from "./schema/pipeline";

const schema = defineSchema({
  // 인증 및 사용자 관리
  ...authSchema,
  
  // 결제 및 구독
  ...paymentsSchema,
  
  // 빌링 및 크레딧
  ...billingSchema,
  
  // 소셜 미디어
  ...socialSchema,
  
  // AI 및 콘텐츠
  ...aiSchema,
  
  // 분석 및 리포팅
  ...analyticsSchema,
  
  // 모니터링 및 메트릭
  ...monitoringSchema,
  
  // 데이터 파이프라인
  ...pipelineSchema,
  
  // 피처 플래그 (점진적 배포용)
  featureFlags: defineTable({
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
        operator: v.union(
          v.literal('eq'),
          v.literal('ne'),
          v.literal('in'),
          v.literal('nin'),
          v.literal('contains')
        ),
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
  })
  .index("by_key", ["key"])
  .index("by_environment", ["environment"])
  .index("by_category", ["category"])
  .index("by_enabled", ["enabled"]),
});

// DataModel 타입 추출 및 export
export type DataModel = typeof schema;

export default schema;