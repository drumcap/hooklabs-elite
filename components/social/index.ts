/**
 * 소셜 미디어 고급 기능 컴포넌트 통합 인덱스
 */

// 토큰 관리 컴포넌트
export { TokenExpiryAlert } from "./tokens/TokenExpiryAlert";

// 분석 컴포넌트
export { AccountStats } from "./analytics/AccountStats";
export { GenerationHistory } from "./analytics/GenerationHistory";
export { AIUsageStats } from "./analytics/AIUsageStats";
export { AnalyticsDashboard } from "./analytics/AnalyticsDashboard";
export { RealtimeMonitor } from "./analytics/RealtimeMonitor";

// 변형 테스팅 컴포넌트
export { VariantComparison } from "./variants/VariantComparison";
export { VariantSelector } from "./variants/VariantSelector";

// 타입 정의
export type {
  TokenExpiryAlert as TokenExpiryAlertType,
  AccountStats as AccountStatsType,
  VariantPerformance,
  VariantComparison as VariantComparisonType,
  AIGenerationHistory,
  AIGenerationStats,
  DashboardMetrics,
  AnalyticsOverview,
  RealTimeUpdate,
  LiveMetrics,
} from "../../types/social-analytics";

// 커스텀 훅
export { useTokenExpiry } from "../../hooks/social/useTokenExpiry";
export { useVariantTesting } from "../../hooks/social/useVariantTesting";
export { useAIGenerations } from "../../hooks/social/useAIGenerations";
export { useAnalytics } from "../../hooks/social/useAnalytics";

// 사용 예시 컴포넌트 템플릿
export const SocialAnalyticsExamples = {
  // 토큰 만료 알림 예시
  TokenExpiryExample: `
import { TokenExpiryAlert } from "@/components/social";

function TokenExpiryExample() {
  return (
    <TokenExpiryAlert 
      hoursThreshold={24}
      className="w-full"
      autoRefresh={true}
    />
  );
}`,

  // 계정 통계 예시
  AccountStatsExample: `
import { AccountStats } from "@/components/social";

function AccountStatsExample({ accountId }: { accountId: string }) {
  return (
    <AccountStats 
      accountId={accountId}
      detailed={true}
      className="w-full"
    />
  );
}`,

  // 변형 비교 예시
  VariantComparisonExample: `
import { VariantComparison } from "@/components/social";

function VariantComparisonExample({ postId }: { postId: string }) {
  return (
    <VariantComparison 
      postId={postId}
      enableCopy={true}
      className="w-full"
    />
  );
}`,

  // 변형 선택 예시
  VariantSelectorExample: `
import { VariantSelector } from "@/components/social";

function VariantSelectorExample({ postId }: { postId: string }) {
  const handleSelectionChange = (variantId: string | null) => {
    console.log("Selected variant:", variantId);
  };

  return (
    <VariantSelector 
      postId={postId}
      onSelectionChange={handleSelectionChange}
      className="w-full"
    />
  );
}`,

  // AI 생성 히스토리 예시
  GenerationHistoryExample: `
import { GenerationHistory } from "@/components/social";

function GenerationHistoryExample() {
  return (
    <GenerationHistory 
      pageSize={10}
      enableFilters={true}
      detailed={true}
      className="w-full"
    />
  );
}`,

  // AI 사용량 통계 예시
  AIUsageStatsExample: `
import { AIUsageStats } from "@/components/social";

function AIUsageStatsExample() {
  return (
    <AIUsageStats 
      timeRange={30}
      detailed={true}
      className="w-full"
    />
  );
}`,

  // 분석 대시보드 예시
  AnalyticsDashboardExample: `
import { AnalyticsDashboard } from "@/components/social";

function AnalyticsDashboardExample() {
  return (
    <AnalyticsDashboard 
      defaultTimeRange={30}
      autoRefreshInterval={5}
      className="w-full"
    />
  );
}`,

  // 실시간 모니터 예시
  RealtimeMonitorExample: `
import { RealtimeMonitor } from "@/components/social";

function RealtimeMonitorExample() {
  return (
    <RealtimeMonitor 
      updateInterval={5}
      enableNotifications={true}
      autoStart={true}
      className="w-full"
    />
  );
}`,

  // 커스텀 훅 사용 예시
  HooksExample: `
import { 
  useTokenExpiry, 
  useVariantTesting, 
  useAIGenerations, 
  useAnalytics 
} from "@/components/social";

function HooksExample({ postId }: { postId: string }) {
  // 토큰 만료 관리
  const {
    expiringTokens,
    summary,
    getRefreshUrl,
    formatTimeUntilExpiry
  } = useTokenExpiry({
    hoursThreshold: 24,
    onExpiry: (tokens) => {
      console.log("Critical tokens:", tokens);
    }
  });

  // 변형 테스팅
  const {
    variants,
    comparison,
    selectVariant,
    selectBestVariant
  } = useVariantTesting({
    postId,
    includeMetrics: true
  });

  // AI 생성 히스토리
  const {
    generations,
    statistics,
    updateFilters,
    exportData
  } = useAIGenerations({
    pagination: { page: 1, limit: 20 }
  });

  // 분석 데이터
  const {
    overview,
    metrics,
    trends,
    refresh
  } = useAnalytics({
    timeRange: { 
      start: "2024-01-01", 
      end: "2024-01-31" 
    },
    includeInsights: true,
    includeRecommendations: true
  });

  return (
    <div>
      {/* 컴포넌트 사용 */}
    </div>
  );
}`,

  // 종합 대시보드 예시
  ComprehensiveDashboardExample: `
import { 
  TokenExpiryAlert,
  AccountStats,
  VariantComparison,
  AnalyticsDashboard,
  RealtimeMonitor,
  useTokenExpiry,
  useAnalytics
} from "@/components/social";

function ComprehensiveDashboard() {
  const { summary: tokenSummary } = useTokenExpiry();
  const { overview } = useAnalytics({
    timeRange: { start: "2024-01-01", end: "2024-01-31" }
  });

  return (
    <div className="space-y-6">
      {/* 알림 섹션 */}
      {tokenSummary.systemStatus !== "healthy" && (
        <TokenExpiryAlert className="mb-4" />
      )}

      {/* 메인 대시보드 */}
      <AnalyticsDashboard />

      {/* 실시간 모니터링 */}
      <RealtimeMonitor />
      
      {/* 추가 분석 섹션들 */}
      {/* ... */}
    </div>
  );
}`
};

// Default export with imported components
import { TokenExpiryAlert } from "./tokens/TokenExpiryAlert";
import { AccountStats } from "./analytics/AccountStats";
import { GenerationHistory } from "./analytics/GenerationHistory";
import { AIUsageStats } from "./analytics/AIUsageStats";
import { AnalyticsDashboard } from "./analytics/AnalyticsDashboard";
import { RealtimeMonitor } from "./analytics/RealtimeMonitor";
import { VariantComparison } from "./variants/VariantComparison";
import { VariantSelector } from "./variants/VariantSelector";
import { useTokenExpiry } from "../../hooks/social/useTokenExpiry";
import { useVariantTesting } from "../../hooks/social/useVariantTesting";
import { useAIGenerations } from "../../hooks/social/useAIGenerations";
import { useAnalytics } from "../../hooks/social/useAnalytics";

export default {
  TokenExpiryAlert,
  AccountStats,
  GenerationHistory,
  AIUsageStats,
  AnalyticsDashboard,
  RealtimeMonitor,
  VariantComparison,
  VariantSelector,
  useTokenExpiry,
  useVariantTesting,
  useAIGenerations,
  useAnalytics,
};