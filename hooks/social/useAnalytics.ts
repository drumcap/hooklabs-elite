"use client";

import { useQuery } from "convex/react";
import { useMemo, useState, useCallback, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { 
  UseAnalyticsOptions,
  DashboardMetrics,
  AnalyticsOverview,
  TrendData,
  AnalyticsInsight,
  AnalyticsRecommendation,
  TimeRange
} from "../../types/social-analytics";

/**
 * 종합 소셜 미디어 분석을 위한 커스텀 훅
 * 
 * @param options - 훅 옵션
 * @returns 분석 데이터와 기능들
 */
export function useAnalytics(options: UseAnalyticsOptions) {
  const {
    timeRange,
    platforms = [],
    includeInsights = true,
    includeRecommendations = true
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // 소셜 계정 목록 조회
  const socialAccounts = useQuery(api.socialAccounts.list, {
    platform: platforms.length > 0 ? platforms[0] : undefined,
    isActive: true,
  });

  // 변형 통계 조회 (분석 데이터 대용)
  const variantStats = useQuery(api.postVariants.getUserVariantStats, {});

  // 대시보드 메트릭 계산
  const dashboardMetrics = useMemo((): DashboardMetrics => {
    const baseMetrics = {
      totalPosts: 0,
      totalEngagement: 0,
      totalReach: 0,
      totalImpressions: 0,
      averageEngagementRate: 0,
      averageReachRate: 0,
      postsToday: 0,
      postsThisWeek: 0,
      postsThisMonth: 0,
      platformBreakdown: {} as Record<string, any>,
      timeSeriesData: [] as Array<any>,
    };

    if (!socialAccounts || !variantStats) {
      return baseMetrics;
    }

    // 실제 데이터 기반 계산 + 모의 데이터
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // 시계열 데이터 생성
    const timeSeriesData = [];
    const startDate = new Date(timeRange.start);
    const endDate = new Date(timeRange.end);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs);

    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate.getTime() + i * dayMs);
      timeSeriesData.push({
        date: date.toISOString().split('T')[0],
        posts: Math.floor(Math.random() * 5) + 1,
        engagement: Math.floor(Math.random() * 200) + 50,
        reach: Math.floor(Math.random() * 2000) + 500,
        impressions: Math.floor(Math.random() * 3000) + 800,
      });
    }

    // 플랫폼별 분석
    const platformBreakdown: Record<string, any> = {};
    
    socialAccounts.forEach(account => {
      if (!platformBreakdown[account.platform]) {
        platformBreakdown[account.platform] = {
          posts: 0,
          engagement: 0,
          reach: 0,
          impressions: 0,
          engagementRate: 0,
        };
      }
      
      const platform = platformBreakdown[account.platform];
      platform.posts += Math.floor(Math.random() * 20) + 5;
      platform.engagement += Math.floor(Math.random() * 1000) + 200;
      platform.reach += Math.floor(Math.random() * 5000) + 1000;
      platform.impressions += Math.floor(Math.random() * 8000) + 2000;
      platform.engagementRate = (platform.engagement / platform.reach) * 100;
    });

    // 전체 합계 계산
    const totals = Object.values(platformBreakdown).reduce(
      (acc: any, platform: any) => ({
        posts: acc.posts + platform.posts,
        engagement: acc.engagement + platform.engagement,
        reach: acc.reach + platform.reach,
        impressions: acc.impressions + platform.impressions,
      }),
      { posts: 0, engagement: 0, reach: 0, impressions: 0 }
    );

    // 최고 성과 게시물 (모의 데이터)
    const topPerformingPost = {
      id: "post_123" as any,
      content: "AI 기술의 미래와 우리 삶에 미치는 영향에 대해 논의해보겠습니다...",
      engagement: 1247,
      reach: 8934,
      platform: "linkedin",
      publishedAt: new Date(Date.now() - 2 * dayMs).toISOString(),
    };

    return {
      ...totals,
      totalImpressions: totals.impressions,
      averageEngagementRate: totals.reach > 0 ? (totals.engagement / totals.reach) * 100 : 0,
      averageReachRate: totals.impressions > 0 ? (totals.reach / totals.impressions) * 100 : 0,
      postsToday: Math.floor(Math.random() * 5) + 1,
      postsThisWeek: Math.floor(Math.random() * 25) + 10,
      postsThisMonth: totals.posts,
      topPerformingPost,
      platformBreakdown,
      timeSeriesData,
    };
  }, [socialAccounts, variantStats, timeRange]);

  // 트렌드 분석
  const trends = useMemo(() => {
    const { timeSeriesData } = dashboardMetrics;
    
    if (timeSeriesData.length < 14) {
      return {
        engagement: createTrendData(0, 0),
        reach: createTrendData(0, 0),
        posts: createTrendData(0, 0),
      };
    }

    // 최근 7일 vs 이전 7일 비교
    const recentWeek = timeSeriesData.slice(-7);
    const previousWeek = timeSeriesData.slice(-14, -7);

    const recentEngagement = recentWeek.reduce((sum, day) => sum + day.engagement, 0);
    const previousEngagement = previousWeek.reduce((sum, day) => sum + day.engagement, 0);

    const recentReach = recentWeek.reduce((sum, day) => sum + day.reach, 0);
    const previousReach = previousWeek.reduce((sum, day) => sum + day.reach, 0);

    const recentPosts = recentWeek.reduce((sum, day) => sum + day.posts, 0);
    const previousPosts = previousWeek.reduce((sum, day) => sum + day.posts, 0);

    return {
      engagement: createTrendData(recentEngagement, previousEngagement),
      reach: createTrendData(recentReach, previousReach),
      posts: createTrendData(recentPosts, previousPosts),
    };
  }, [dashboardMetrics]);

  // 인사이트 생성
  const insights = useMemo((): AnalyticsInsight[] => {
    if (!includeInsights) return [];

    const insights: AnalyticsInsight[] = [];
    const { platformBreakdown, averageEngagementRate, timeSeriesData } = dashboardMetrics;

    // 플랫폼 성과 인사이트
    const bestPlatform = Object.entries(platformBreakdown)
      .sort(([,a], [,b]) => (b as any).engagementRate - (a as any).engagementRate)[0];

    if (bestPlatform) {
      insights.push({
        id: "best_platform",
        type: "performance",
        title: "최고 성과 플랫폼",
        description: `${bestPlatform[0]}에서 ${(bestPlatform[1] as any).engagementRate.toFixed(1)}%의 참여율을 보여 가장 좋은 성과를 거두고 있습니다.`,
        impact: "high",
        actionable: true,
        metadata: { platform: bestPlatform[0], rate: (bestPlatform[1] as any).engagementRate },
      });
    }

    // 참여율 인사이트
    if (averageEngagementRate > 5) {
      insights.push({
        id: "high_engagement",
        type: "performance",
        title: "높은 참여율",
        description: `평균 참여율이 ${averageEngagementRate.toFixed(1)}%로 업계 평균을 상회합니다.`,
        impact: "medium",
        actionable: false,
      });
    } else if (averageEngagementRate < 2) {
      insights.push({
        id: "low_engagement",
        type: "performance",
        title: "참여율 개선 필요",
        description: `평균 참여율이 ${averageEngagementRate.toFixed(1)}%로 개선이 필요합니다.`,
        impact: "high",
        actionable: true,
      });
    }

    // 시간별 패턴 분석
    const weeklyPattern = analyzeWeeklyPattern(timeSeriesData);
    if (weeklyPattern.bestDay) {
      insights.push({
        id: "best_posting_day",
        type: "timing",
        title: "최적 게시 요일",
        description: `${weeklyPattern.bestDay}에 게시된 콘텐츠가 평균적으로 가장 높은 참여율을 보입니다.`,
        impact: "medium",
        actionable: true,
        metadata: weeklyPattern,
      });
    }

    return insights.slice(0, 5); // 최대 5개 인사이트
  }, [dashboardMetrics, includeInsights]);

  // 추천사항 생성
  const recommendations = useMemo((): AnalyticsRecommendation[] => {
    if (!includeRecommendations) return [];

    const recommendations: AnalyticsRecommendation[] = [];
    const { platformBreakdown, averageEngagementRate } = dashboardMetrics;

    // 플랫폼 다양화 추천
    const activePlatforms = Object.keys(platformBreakdown).length;
    if (activePlatforms < 3) {
      recommendations.push({
        id: "platform_diversification",
        category: "platform",
        title: "플랫폼 다양화",
        description: "더 많은 플랫폼에서 활동하여 도달률을 확장하세요.",
        priority: "medium",
        estimatedImpact: "+25% 도달률 증가",
        actionItems: [
          "새로운 소셜 미디어 플랫폼 계정 생성",
          "각 플랫폼별 콘텐츠 전략 수립",
          "플랫폼별 최적 게시 시간 테스트"
        ],
      });
    }

    // 콘텐츠 최적화 추천
    if (averageEngagementRate < 3) {
      recommendations.push({
        id: "content_optimization",
        category: "content",
        title: "콘텐츠 품질 개선",
        description: "참여율을 높이기 위해 콘텐츠 전략을 개선하세요.",
        priority: "high",
        estimatedImpact: "+40% 참여율 증가",
        actionItems: [
          "시각적 콘텐츠(이미지, 비디오) 비율 증가",
          "질문형 콘텐츠로 상호작용 유도",
          "트렌딩 해시태그 활용",
          "A/B 테스트를 통한 최적 콘텐츠 형식 발견"
        ],
      });
    }

    // 게시 시간 최적화 추천
    recommendations.push({
      id: "timing_optimization",
      category: "timing",
      title: "게시 시간 최적화",
      description: "타겟 오디언스가 가장 활발한 시간대에 게시하세요.",
      priority: "medium",
      estimatedImpact: "+15% 노출 증가",
      actionItems: [
        "각 플랫폼별 최적 게시 시간 분석",
        "예약 게시 기능 활용",
        "시간대별 성과 모니터링"
      ],
    });

    // 참여 유도 전략 추천
    if (trends.engagement.direction !== "up") {
      recommendations.push({
        id: "engagement_strategy",
        category: "engagement",
        title: "참여도 향상 전략",
        description: "팔로워와의 상호작용을 늘려 참여도를 높이세요.",
        priority: "high",
        estimatedImpact: "+30% 참여도 증가",
        actionItems: [
          "댓글에 적극적으로 응답",
          "사용자 생성 콘텐츠(UGC) 활용",
          "라이브 스트리밍이나 Q&A 세션 진행",
          "커뮤니티 챌린지나 컨테스트 개최"
        ],
      });
    }

    return recommendations.slice(0, 4); // 최대 4개 추천사항
  }, [dashboardMetrics, trends, includeRecommendations]);

  // 종합 개요 데이터
  const overview = useMemo((): AnalyticsOverview => ({
    summary: dashboardMetrics,
    trends,
    insights,
    recommendations,
  }), [dashboardMetrics, trends, insights, recommendations]);

  // 데이터 새로고침
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 실제로는 여기서 데이터를 다시 가져옴
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // 시간 범위 변경 시 자동 새로고침
  useEffect(() => {
    setLastRefresh(new Date());
  }, [timeRange]);

  // 메트릭 비교 함수
  const compareMetrics = useCallback((metric: keyof DashboardMetrics, period: "day" | "week" | "month" = "week"): TrendData => {
    // 실제 구현에서는 이전 기간 데이터와 비교
    const current = dashboardMetrics[metric] as number;
    const previous = current * (0.8 + Math.random() * 0.4); // 모의 이전 데이터
    
    return createTrendData(current, previous);
  }, [dashboardMetrics]);

  // 플랫폼별 성과 분석
  const getPlatformAnalysis = useCallback((platform: string) => {
    const platformData = dashboardMetrics.platformBreakdown[platform];
    if (!platformData) return null;

    const totalEngagement = Object.values(dashboardMetrics.platformBreakdown)
      .reduce((sum: number, p: any) => sum + p.engagement, 0);

    const share = (platformData.engagement / totalEngagement) * 100;

    return {
      ...platformData,
      shareOfTotal: share,
      performanceRating: getPerformanceRating(platformData.engagementRate),
      recommendations: generatePlatformRecommendations(platform, platformData),
    };
  }, [dashboardMetrics]);

  return {
    // 메인 데이터
    overview,
    metrics: dashboardMetrics,
    trends,
    insights,
    recommendations,
    
    // 상태
    isLoading: socialAccounts === undefined || variantStats === undefined,
    isRefreshing,
    lastRefresh,
    
    // 액션
    refresh,
    compareMetrics,
    getPlatformAnalysis,
  };
}

// 유틸리티 함수들

function createTrendData(current: number, previous: number): TrendData {
  const change = current - previous;
  const changePercentage = previous === 0 ? 0 : (change / previous) * 100;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "stable";

  return {
    current,
    previous,
    change,
    changePercentage,
    direction,
  };
}

function analyzeWeeklyPattern(timeSeriesData: any[]) {
  if (timeSeriesData.length === 0) return { bestDay: null };

  // 요일별 평균 계산 (모의 로직)
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const bestDayIndex = Math.floor(Math.random() * 7);
  
  return {
    bestDay: dayNames[bestDayIndex],
    pattern: "weekday_high", // 모의 패턴
  };
}

function getPerformanceRating(engagementRate: number): "excellent" | "good" | "average" | "poor" {
  if (engagementRate >= 10) return "excellent";
  if (engagementRate >= 5) return "good";
  if (engagementRate >= 2) return "average";
  return "poor";
}

function generatePlatformRecommendations(platform: string, data: any): string[] {
  const recommendations = [];
  
  if (data.engagementRate < 3) {
    recommendations.push(`${platform}에서 더 상호작용적인 콘텐츠 제작`);
  }
  
  if (data.posts < 10) {
    recommendations.push(`${platform}에서 게시 빈도 증가`);
  }
  
  return recommendations;
}

export default useAnalytics;