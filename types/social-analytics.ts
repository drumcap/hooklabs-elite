/**
 * 소셜 미디어 고급 기능 관련 TypeScript 타입 정의
 */

import { Id } from "../convex/_generated/dataModel";

// ============================================================================
// 토큰 관리 관련 타입
// ============================================================================

export interface TokenExpiryAlert {
  _id: Id<"socialAccounts">;
  platform: string;
  username: string;
  displayName: string;
  tokenExpiresAt?: string;
  hoursUntilExpiry: number;
  urgencyLevel: "normal" | "warning" | "critical";
}

export interface TokenRefreshRequest {
  accountId: Id<"socialAccounts">;
  platform: string;
  redirectUrl?: string;
}

export interface TokenRefreshResponse {
  success: boolean;
  redirectUrl?: string;
  error?: string;
  expiresAt?: string;
}

export interface AccountStats {
  totalScheduled: number;
  published: number;
  failed: number;
  pending: number;
  successRate: number;
  averageEngagementRate?: number;
  topPerformingPost?: {
    id: string;
    content: string;
    engagement: number;
    platform: string;
  };
}

// ============================================================================
// 변형 테스팅 관련 타입
// ============================================================================

export interface ScoreBreakdown {
  engagement: number;
  virality: number;
  personaMatch: number;
  readability: number;
  trending: number;
}

export interface VariantPerformance {
  _id: Id<"postVariants">;
  content: string;
  overallScore: number;
  scoreBreakdown: ScoreBreakdown;
  isSelected: boolean;
  aiModel: string;
  promptUsed: string;
  generationMetadata?: any;
  creditsUsed: number;
  generatedAt: string;
}

export interface VariantComparison {
  variants: VariantPerformance[];
  bestVariant?: VariantPerformance;
  selectedVariant?: VariantPerformance;
  averageScores: {
    overallScore: number;
    scoreBreakdown: ScoreBreakdown;
    variantCount: number;
  };
  performanceRange: {
    min: number;
    max: number;
    spread: number;
  };
}

export interface VariantTestingFilters {
  minScore?: number;
  maxScore?: number;
  aiModel?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  includeSelected?: boolean;
}

// ============================================================================
// AI 생성 히스토리 관련 타입
// ============================================================================

export interface AIGenerationHistory {
  _id: Id<"aiGenerations">;
  userId: Id<"users">;
  postId?: Id<"socialPosts">;
  personaId?: Id<"personas">;
  type: "content_generation" | "variant_creation" | "optimization" | "analysis";
  prompt: string;
  response: string;
  model: string;
  creditsUsed: number;
  generationTime: number;
  inputTokens?: number;
  outputTokens?: number;
  temperature?: number;
  metadata?: any;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

export interface AIGenerationStats {
  totalGenerations: number;
  totalCreditsUsed: number;
  averageGenerationTime: number;
  averageScore: number;
  successRate: number;
  modelUsageBreakdown: Record<string, {
    count: number;
    percentage: number;
    averageCredits: number;
    averageScore: number;
  }>;
  typeBreakdown: Record<string, {
    count: number;
    percentage: number;
  }>;
  dailyStats: Array<{
    date: string;
    generations: number;
    credits: number;
    averageScore: number;
  }>;
}

export interface GenerationFilters {
  type?: string;
  model?: string;
  success?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
  limit?: number;
  offset?: number;
}

export interface GenerationTrends {
  period: "7d" | "30d" | "90d";
  generationsChange: number;
  creditsChange: number;
  scoreChange: number;
  efficiencyChange: number;
}

// ============================================================================
// 분석 대시보드 관련 타입
// ============================================================================

export interface DashboardMetrics {
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  totalImpressions: number;
  averageEngagementRate: number;
  averageReachRate: number;
  postsToday: number;
  postsThisWeek: number;
  postsThisMonth: number;
  topPerformingPost?: {
    id: Id<"socialPosts">;
    content: string;
    engagement: number;
    reach: number;
    platform: string;
    publishedAt: string;
  };
  platformBreakdown: Record<string, {
    posts: number;
    engagement: number;
    reach: number;
    impressions: number;
    engagementRate: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    posts: number;
    engagement: number;
    reach: number;
    impressions: number;
  }>;
}

export interface AnalyticsOverview {
  summary: DashboardMetrics;
  trends: {
    engagement: TrendData;
    reach: TrendData;
    posts: TrendData;
  };
  insights: AnalyticsInsight[];
  recommendations: AnalyticsRecommendation[];
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  direction: "up" | "down" | "stable";
}

export interface AnalyticsInsight {
  id: string;
  type: "performance" | "audience" | "content" | "timing";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionable: boolean;
  metadata?: any;
}

export interface AnalyticsRecommendation {
  id: string;
  category: "content" | "timing" | "platform" | "engagement";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
  actionItems: string[];
}

// ============================================================================
// 실시간 모니터링 관련 타입
// ============================================================================

export interface RealTimeUpdate {
  id: string;
  type: "new_post" | "engagement" | "mention" | "error" | "milestone" | "alert";
  title: string;
  description: string;
  value?: number;
  change?: number;
  platform?: string;
  priority: "low" | "medium" | "high" | "critical";
  timestamp: string;
  metadata?: any;
  acknowledged?: boolean;
}

export interface LiveMetrics {
  activeUsers: number;
  currentEngagementRate: number;
  postsToday: number;
  impressionsToday: number;
  reachToday: number;
  errorRate: number;
  systemLoad: number;
  apiLatency: number;
  queuedPosts: number;
  lastUpdateTime: string;
}

export interface MonitoringConfig {
  updateInterval: number; // seconds
  enableNotifications: boolean;
  notificationThresholds: {
    highEngagement: number;
    errorRate: number;
    systemLoad: number;
  };
  alertChannels: Array<"toast" | "email" | "webhook">;
  retentionPeriod: number; // hours
}

export interface SystemHealth {
  status: "healthy" | "warning" | "critical" | "maintenance";
  uptime: number;
  lastIncident?: {
    timestamp: string;
    type: string;
    description: string;
    resolved: boolean;
  };
  services: Array<{
    name: string;
    status: "operational" | "degraded" | "down";
    responseTime?: number;
  }>;
}

// ============================================================================
// 공통 유틸리티 타입
// ============================================================================

export interface TimeRange {
  start: string;
  end: string;
  preset?: "1h" | "6h" | "24h" | "7d" | "30d" | "90d" | "custom";
}

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SortParams {
  field: string;
  direction: "asc" | "desc";
}

export interface FilterState {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface ExportOptions {
  format: "csv" | "json" | "pdf" | "xlsx";
  dateRange: TimeRange;
  includeCharts: boolean;
  includeRawData: boolean;
}

// ============================================================================
// 컴포넌트 Props 인터페이스
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  loading?: boolean;
  error?: string;
}

export interface DashboardComponentProps extends BaseComponentProps {
  timeRange?: TimeRange;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface FilterableComponentProps extends BaseComponentProps {
  filters?: FilterState;
  onFilterChange?: (filters: FilterState) => void;
  enableSearch?: boolean;
}

export interface PaginatedComponentProps extends BaseComponentProps {
  pagination?: PaginationParams;
  onPageChange?: (page: number) => void;
  pageSize?: number;
}

// ============================================================================
// 훅 관련 타입
// ============================================================================

export interface UseTokenExpiryOptions {
  hoursThreshold?: number;
  autoRefresh?: boolean;
  onExpiry?: (tokens: TokenExpiryAlert[]) => void;
}

export interface UseVariantTestingOptions {
  postId: Id<"socialPosts">;
  autoRefresh?: boolean;
  includeMetrics?: boolean;
}

export interface UseAIGenerationsOptions {
  filters?: GenerationFilters;
  pagination?: PaginationParams;
  realtime?: boolean;
}

export interface UseAnalyticsOptions {
  timeRange: TimeRange;
  platforms?: string[];
  includeInsights?: boolean;
  includeRecommendations?: boolean;
}

// ============================================================================
// API 응답 타입
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    pagination?: PaginationParams;
    filters?: FilterState;
    timestamp: string;
  };
}

export interface PaginatedResponse<T = any> {
  items: T[];
  pagination: PaginationParams;
  filters?: FilterState;
}

// 타입 가드 함수들
export function isTokenExpiryAlert(obj: any): obj is TokenExpiryAlert {
  return obj && typeof obj._id === "string" && typeof obj.platform === "string";
}

export function isVariantPerformance(obj: any): obj is VariantPerformance {
  return obj && typeof obj._id === "string" && typeof obj.overallScore === "number";
}

export function isAIGenerationHistory(obj: any): obj is AIGenerationHistory {
  return obj && typeof obj._id === "string" && typeof obj.type === "string";
}

export function isRealTimeUpdate(obj: any): obj is RealTimeUpdate {
  return obj && typeof obj.id === "string" && typeof obj.type === "string";
}