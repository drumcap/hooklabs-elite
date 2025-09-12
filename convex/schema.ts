/**
 * 통합 스키마 정의 - 도메인별 분할된 스키마 통합
 */

import { defineSchema } from "convex/server";
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
});

// DataModel 타입 추출 및 export
export type DataModel = typeof schema;

export default schema;