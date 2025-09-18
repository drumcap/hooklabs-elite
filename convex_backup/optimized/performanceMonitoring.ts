import { v } from "convex/values";
import { query, mutation, action } from "../_generated/server";
import { getAuthUserId } from "../auth";

// 🚀 통합 성능 모니터링 시스템

interface PerformanceMetric {
  timestamp: number;
  endpoint: string;
  userId?: string;
  responseTime: number;
  success: boolean;
  cacheHit: boolean;
  dataSize: number;
  errorCode?: string;
  userAgent?: string;
  queryComplexity?: number;
}

interface SystemMetrics {
  timestamp: number;
  memoryUsage: {
    total: number;
    used: number;
    free: number;
    cached: number;
  };
  cpuUsage: number;
  activeConnections: number;
  databaseConnections: {
    active: number;
    idle: number;
    total: number;
  };
  cacheStats: {
    hitRate: number;
    size: number;
    evictions: number;
  };
}

interface AlertRule {
  id: string;
  name: string;
  condition: string; // "avg_response_time > 1000" 등
  threshold: number;
  timeWindow: number; // minutes
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  recipients: string[];
}

interface PerformanceAlert {
  id: string;
  ruleId: string;
  message: string;
  severity: string;
  value: number;
  threshold: number;
  timestamp: number;
  acknowledged: boolean;
  resolvedAt?: number;
}

// 메모리 기반 메트릭 저장소 (실제로는 시계열 DB 사용 권장)
const performanceMetrics: PerformanceMetric[] = [];
const systemMetrics: SystemMetrics[] = [];
const alertRules: AlertRule[] = [];
const activeAlerts: PerformanceAlert[] = [];

// 성능 메트릭 수집 버퍼
const metricsBuffer: PerformanceMetric[] = [];
const BUFFER_SIZE = 1000;
const FLUSH_INTERVAL = 30000; // 30초

// 📊 성능 메트릭 기록
export const recordPerformanceMetric = mutation({
  args: {
    endpoint: v.string(),
    responseTime: v.number(),
    success: v.boolean(),
    cacheHit: v.optional(v.boolean()),
    dataSize: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    queryComplexity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx).catch(() => undefined);
    
    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      userId,
      ...args,
      cacheHit: args.cacheHit || false,
      dataSize: args.dataSize || 0,
    };

    // 버퍼에 추가
    metricsBuffer.push(metric);
    
    // 버퍼가 가득 찬 경우 플러시
    if (metricsBuffer.length >= BUFFER_SIZE) {
      performanceMetrics.push(...metricsBuffer.splice(0));
      
      // 메모리 관리: 최대 10만개 메트릭만 유지
      if (performanceMetrics.length > 100000) {
        performanceMetrics.splice(0, performanceMetrics.length - 100000);
      }
    }

    // 실시간 알림 체크 (높은 우선순위 메트릭만)
    if (args.responseTime > 5000 || !args.success) {
      await checkAlertRules(metric);
    }

    return { success: true };
  },
});

// 🎯 실시간 성능 대시보드 데이터
export const getPerformanceDashboard = query({
  args: {
    timeRange: v.optional(v.string()),
    refreshInterval: v.optional(v.number()),
  },
  handler: async (ctx, { timeRange = '1h', refreshInterval = 30000 }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const now = Date.now();
    const timeRangeMs = {
      '5m': 5 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    }[timeRange] || 60 * 60 * 1000;

    // 모든 메트릭 합치기 (버퍼 포함)
    const allMetrics = [...performanceMetrics, ...metricsBuffer];
    const recentMetrics = allMetrics.filter(
      metric => now - metric.timestamp < timeRangeMs
    );

    // 사용자별 필터링 (필요한 경우)
    const userMetrics = recentMetrics; // 모든 메트릭 포함

    // 전체 통계
    const totalRequests = userMetrics.length;
    const successfulRequests = userMetrics.filter(m => m.success).length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;
    
    const responseTimes = userMetrics.map(m => m.responseTime);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
    
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p95ResponseTime = sortedTimes.length > 0 
      ? sortedTimes[Math.floor(sortedTimes.length * 0.95)] 
      : 0;
    const p99ResponseTime = sortedTimes.length > 0 
      ? sortedTimes[Math.floor(sortedTimes.length * 0.99)] 
      : 0;

    // 캐시 통계
    const cacheHits = userMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

    // 엔드포인트별 통계
    const endpointStats = userMetrics.reduce((acc, metric) => {
      if (!acc[metric.endpoint]) {
        acc[metric.endpoint] = {
          requests: 0,
          avgResponseTime: 0,
          successRate: 0,
          cacheHitRate: 0,
          errors: 0,
        };
      }
      
      const stat = acc[metric.endpoint];
      stat.requests++;
      stat.avgResponseTime = ((stat.avgResponseTime * (stat.requests - 1)) + metric.responseTime) / stat.requests;
      if (!metric.success) stat.errors++;
      stat.successRate = ((stat.requests - stat.errors) / stat.requests) * 100;
      if (metric.cacheHit) stat.cacheHitRate = (stat.cacheHitRate + 1) / stat.requests * 100;
      
      return acc;
    }, {} as Record<string, any>);

    // 시간별 트렌드 (최근 24시간)
    const hourlyTrends = generateHourlyTrends(userMetrics, Math.min(timeRangeMs, 24 * 60 * 60 * 1000));

    // 에러 분석
    const errorBreakdown = userMetrics
      .filter(m => !m.success && m.errorCode)
      .reduce((acc, metric) => {
        acc[metric.errorCode!] = (acc[metric.errorCode!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // 활성 알림
    const criticalAlerts = activeAlerts.filter(alert => 
      alert.severity === 'critical' && !alert.acknowledged
    ).length;

    const warningAlerts = activeAlerts.filter(alert => 
      alert.severity === 'warning' && !alert.acknowledged
    ).length;

    // 시스템 리소스 (최신 데이터)
    const latestSystemMetric = systemMetrics[systemMetrics.length - 1];
    
    return {
      overview: {
        totalRequests,
        successRate: Math.round(successRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: Math.round(p95ResponseTime),
        p99ResponseTime: Math.round(p99ResponseTime),
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        criticalAlerts,
        warningAlerts,
      },
      endpointStats: Object.entries(endpointStats)
        .sort(([,a], [,b]) => b.requests - a.requests)
        .slice(0, 10)
        .map(([endpoint, stats]) => ({ endpoint, ...stats })),
      trends: {
        hourly: hourlyTrends,
        responseTime: generateResponseTimeTrend(userMetrics, timeRangeMs),
        errorRate: generateErrorRateTrend(userMetrics, timeRangeMs),
      },
      errors: {
        breakdown: errorBreakdown,
        topErrors: Object.entries(errorBreakdown)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([code, count]) => ({ code, count })),
      },
      system: latestSystemMetric ? {
        memoryUsage: latestSystemMetric.memoryUsage,
        cpuUsage: latestSystemMetric.cpuUsage,
        activeConnections: latestSystemMetric.activeConnections,
        cacheStats: latestSystemMetric.cacheStats,
      } : null,
      metadata: {
        timeRange,
        refreshInterval,
        dataPoints: userMetrics.length,
        lastUpdated: now,
      },
    };
  },
});

// 📈 성능 최적화 권장사항
export const getOptimizationRecommendations = query({
  args: {
    analysisDepth: v.optional(v.string()), // 'basic' | 'detailed' | 'comprehensive'
  },
  handler: async (ctx, { analysisDepth = 'detailed' }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    
    const recentMetrics = [...performanceMetrics, ...metricsBuffer].filter(
      metric => metric.timestamp >= last24h
    );

    const recommendations = [];

    // 1. 느린 엔드포인트 분석
    const endpointPerformance = analyzeEndpointPerformance(recentMetrics);
    const slowEndpoints = endpointPerformance.filter(ep => ep.avgResponseTime > 1000);
    
    if (slowEndpoints.length > 0) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        title: '응답 시간이 느린 엔드포인트 발견',
        description: `${slowEndpoints.length}개의 엔드포인트가 1초 이상의 응답 시간을 보이고 있습니다.`,
        endpoints: slowEndpoints.slice(0, 3),
        actions: [
          '데이터베이스 쿼리 최적화',
          '인덱스 추가 검토',
          '캐싱 전략 적용',
          '페이징 구현',
        ],
        impact: 'high',
        effort: 'medium',
      });
    }

    // 2. 캐시 활용도 분석
    const cacheableEndpoints = endpointPerformance.filter(ep => 
      ep.requests > 100 && ep.cacheHitRate < 30 && ep.avgResponseTime > 200
    );

    if (cacheableEndpoints.length > 0) {
      recommendations.push({
        type: 'caching',
        severity: 'medium',
        title: '캐싱 최적화 기회',
        description: '캐시 활용도가 낮은 빈번한 요청들이 발견되었습니다.',
        endpoints: cacheableEndpoints.slice(0, 3),
        actions: [
          '적절한 TTL 설정',
          '캐시 키 최적화',
          '캐시 워밍 전략',
          '조건부 캐싱 구현',
        ],
        impact: 'high',
        effort: 'low',
      });
    }

    // 3. 에러율 분석
    const highErrorEndpoints = endpointPerformance.filter(ep => ep.errorRate > 5);
    
    if (highErrorEndpoints.length > 0) {
      recommendations.push({
        type: 'reliability',
        severity: 'critical',
        title: '높은 에러율 감지',
        description: '일부 엔드포인트에서 높은 에러율이 감지되었습니다.',
        endpoints: highErrorEndpoints,
        actions: [
          '에러 로그 상세 분석',
          '재시도 로직 구현',
          'Circuit Breaker 패턴 적용',
          '입력 검증 강화',
        ],
        impact: 'critical',
        effort: 'medium',
      });
    }

    // 4. 트래픽 패턴 분석
    const trafficAnalysis = analyzeTrafficPatterns(recentMetrics);
    if (trafficAnalysis.hasSpikes) {
      recommendations.push({
        type: 'scalability',
        severity: 'medium',
        title: '트래픽 스파이크 패턴 감지',
        description: '특정 시간대에 트래픽이 급증하는 패턴이 감지되었습니다.',
        peakHours: trafficAnalysis.peakHours,
        actions: [
          '오토스케일링 구성',
          '로드 밸런싱 최적화',
          'Rate Limiting 조정',
          '리소스 예약 고려',
        ],
        impact: 'medium',
        effort: 'high',
      });
    }

    // 5. 데이터 크기 최적화
    const largPayloads = endpointPerformance.filter(ep => ep.avgDataSize > 100000); // 100KB
    
    if (largPayloads.length > 0) {
      recommendations.push({
        type: 'optimization',
        severity: 'low',
        title: '응답 데이터 크기 최적화',
        description: '일부 엔드포인트가 큰 응답 데이터를 반환하고 있습니다.',
        endpoints: largPayloads,
        actions: [
          'gzip 압축 적용',
          '필드 선택적 반환',
          '페이징 구현',
          '이미지/파일 CDN 활용',
        ],
        impact: 'medium',
        effort: 'low',
      });
    }

    // 종합 점수 계산
    const overallScore = calculatePerformanceScore(recentMetrics);
    
    return {
      score: overallScore,
      recommendations: recommendations.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder];
      }),
      summary: {
        totalIssues: recommendations.length,
        criticalIssues: recommendations.filter(r => r.severity === 'critical').length,
        highImpactSolutions: recommendations.filter(r => r.impact === 'high' && r.effort === 'low').length,
        estimatedImprovementPotential: calculateImprovementPotential(recommendations),
      },
      nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  },
});

// 🚨 알림 규칙 관리
export const createAlertRule = mutation({
  args: {
    name: v.string(),
    condition: v.string(),
    threshold: v.number(),
    timeWindow: v.number(),
    severity: v.string(),
    recipients: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const rule: AlertRule = {
      id: crypto.randomUUID(),
      enabled: true,
      ...args,
      severity: args.severity as any,
    };

    alertRules.push(rule);

    return {
      success: true,
      ruleId: rule.id,
      message: '알림 규칙이 생성되었습니다',
    };
  },
});

// 📊 성능 비교 분석
export const comparePerformancePeriods = query({
  args: {
    currentPeriod: v.string(), // '24h', '7d', '30d'
    comparisonPeriod: v.string(),
  },
  handler: async (ctx, { currentPeriod, comparisonPeriod }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const now = Date.now();
    const periodMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const currentPeriodMs = periodMs[currentPeriod as keyof typeof periodMs];
    const comparisonPeriodMs = periodMs[comparisonPeriod as keyof typeof periodMs];

    const currentMetrics = [...performanceMetrics, ...metricsBuffer].filter(
      m => now - m.timestamp <= currentPeriodMs
    );

    const comparisonMetrics = performanceMetrics.filter(
      m => m.timestamp >= now - currentPeriodMs - comparisonPeriodMs && 
           m.timestamp < now - currentPeriodMs
    );

    const currentStats = calculatePeriodStats(currentMetrics);
    const comparisonStats = calculatePeriodStats(comparisonMetrics);

    return {
      current: currentStats,
      comparison: comparisonStats,
      changes: {
        avgResponseTime: calculatePercentChange(comparisonStats.avgResponseTime, currentStats.avgResponseTime),
        successRate: calculatePercentChange(comparisonStats.successRate, currentStats.successRate),
        cacheHitRate: calculatePercentChange(comparisonStats.cacheHitRate, currentStats.cacheHitRate),
        totalRequests: calculatePercentChange(comparisonStats.totalRequests, currentStats.totalRequests),
      },
      insights: generateInsights(currentStats, comparisonStats),
    };
  },
});

// 도우미 함수들
function generateHourlyTrends(metrics: PerformanceMetric[], timeRangeMs: number) {
  const hours = Math.min(24, Math.ceil(timeRangeMs / (60 * 60 * 1000)));
  const now = Date.now();
  const trends = [];

  for (let i = hours - 1; i >= 0; i--) {
    const hourStart = now - i * 60 * 60 * 1000;
    const hourEnd = hourStart + 60 * 60 * 1000;
    
    const hourMetrics = metrics.filter(m => 
      m.timestamp >= hourStart && m.timestamp < hourEnd
    );

    trends.push({
      hour: new Date(hourStart).getHours(),
      requests: hourMetrics.length,
      avgResponseTime: hourMetrics.length > 0 
        ? hourMetrics.reduce((sum, m) => sum + m.responseTime, 0) / hourMetrics.length
        : 0,
      successRate: hourMetrics.length > 0 
        ? (hourMetrics.filter(m => m.success).length / hourMetrics.length) * 100
        : 100,
    });
  }

  return trends;
}

function generateResponseTimeTrend(metrics: PerformanceMetric[], timeRangeMs: number) {
  const intervals = Math.min(24, Math.ceil(timeRangeMs / (5 * 60 * 1000))); // 5분 간격
  const now = Date.now();
  const trend = [];

  for (let i = intervals - 1; i >= 0; i--) {
    const intervalStart = now - i * 5 * 60 * 1000;
    const intervalEnd = intervalStart + 5 * 60 * 1000;
    
    const intervalMetrics = metrics.filter(m => 
      m.timestamp >= intervalStart && m.timestamp < intervalEnd
    );

    const responseTimes = intervalMetrics.map(m => m.responseTime).sort((a, b) => a - b);
    
    trend.push({
      timestamp: intervalStart,
      avg: responseTimes.length > 0 
        ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length 
        : 0,
      p95: responseTimes.length > 0 
        ? responseTimes[Math.floor(responseTimes.length * 0.95)] 
        : 0,
    });
  }

  return trend;
}

function generateErrorRateTrend(metrics: PerformanceMetric[], timeRangeMs: number) {
  const intervals = Math.min(24, Math.ceil(timeRangeMs / (10 * 60 * 1000))); // 10분 간격
  const now = Date.now();
  const trend = [];

  for (let i = intervals - 1; i >= 0; i--) {
    const intervalStart = now - i * 10 * 60 * 1000;
    const intervalEnd = intervalStart + 10 * 60 * 1000;
    
    const intervalMetrics = metrics.filter(m => 
      m.timestamp >= intervalStart && m.timestamp < intervalEnd
    );

    const errorRate = intervalMetrics.length > 0
      ? (1 - (intervalMetrics.filter(m => m.success).length / intervalMetrics.length)) * 100
      : 0;

    trend.push({
      timestamp: intervalStart,
      errorRate,
      totalRequests: intervalMetrics.length,
    });
  }

  return trend;
}

function analyzeEndpointPerformance(metrics: PerformanceMetric[]) {
  const endpointStats = metrics.reduce((acc, metric) => {
    if (!acc[metric.endpoint]) {
      acc[metric.endpoint] = {
        endpoint: metric.endpoint,
        requests: 0,
        totalResponseTime: 0,
        successCount: 0,
        cacheHits: 0,
        totalDataSize: 0,
      };
    }
    
    const stat = acc[metric.endpoint];
    stat.requests++;
    stat.totalResponseTime += metric.responseTime;
    if (metric.success) stat.successCount++;
    if (metric.cacheHit) stat.cacheHits++;
    stat.totalDataSize += metric.dataSize;
    
    return acc;
  }, {} as Record<string, any>);

  return Object.values(endpointStats).map((stat: any) => ({
    endpoint: stat.endpoint,
    requests: stat.requests,
    avgResponseTime: stat.totalResponseTime / stat.requests,
    successRate: (stat.successCount / stat.requests) * 100,
    errorRate: ((stat.requests - stat.successCount) / stat.requests) * 100,
    cacheHitRate: (stat.cacheHits / stat.requests) * 100,
    avgDataSize: stat.totalDataSize / stat.requests,
  }));
}

function analyzeTrafficPatterns(metrics: PerformanceMetric[]) {
  const hourlyTraffic = new Array(24).fill(0);
  
  metrics.forEach(metric => {
    const hour = new Date(metric.timestamp).getHours();
    hourlyTraffic[hour]++;
  });

  const avgTraffic = hourlyTraffic.reduce((sum, count) => sum + count, 0) / 24;
  const peakHours = hourlyTraffic
    .map((count, hour) => ({ hour, count }))
    .filter(h => h.count > avgTraffic * 1.5)
    .map(h => h.hour);

  return {
    hasSpikes: peakHours.length > 0,
    peakHours,
    avgHourlyTraffic: avgTraffic,
  };
}

function calculatePerformanceScore(metrics: PerformanceMetric[]): number {
  if (metrics.length === 0) return 100;

  const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
  const successRate = metrics.filter(m => m.success).length / metrics.length;
  const cacheHitRate = metrics.filter(m => m.cacheHit).length / metrics.length;

  // 점수 계산 (0-100)
  const responseTimeScore = Math.max(0, 100 - (avgResponseTime - 100) / 10); // 100ms 기준
  const reliabilityScore = successRate * 100;
  const cacheScore = cacheHitRate * 100;

  return Math.round((responseTimeScore * 0.4 + reliabilityScore * 0.4 + cacheScore * 0.2));
}

function calculateImprovementPotential(recommendations: any[]): number {
  const weights = { critical: 40, high: 30, medium: 20, low: 10 };
  const totalPotential = recommendations.reduce((sum, rec) => {
    return sum + weights[rec.severity as keyof typeof weights];
  }, 0);
  
  return Math.min(100, totalPotential);
}

function calculatePeriodStats(metrics: PerformanceMetric[]) {
  if (metrics.length === 0) {
    return {
      totalRequests: 0,
      avgResponseTime: 0,
      successRate: 100,
      cacheHitRate: 0,
    };
  }

  return {
    totalRequests: metrics.length,
    avgResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
    successRate: (metrics.filter(m => m.success).length / metrics.length) * 100,
    cacheHitRate: (metrics.filter(m => m.cacheHit).length / metrics.length) * 100,
  };
}

function calculatePercentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

function generateInsights(currentStats: any, comparisonStats: any): string[] {
  const insights = [];

  if (currentStats.avgResponseTime < comparisonStats.avgResponseTime) {
    insights.push('응답 시간이 개선되었습니다');
  } else if (currentStats.avgResponseTime > comparisonStats.avgResponseTime * 1.2) {
    insights.push('응답 시간이 크게 악화되었습니다');
  }

  if (currentStats.cacheHitRate > comparisonStats.cacheHitRate) {
    insights.push('캐시 활용도가 개선되었습니다');
  }

  if (currentStats.successRate < comparisonStats.successRate) {
    insights.push('안정성이 저하되었습니다');
  }

  return insights;
}

async function checkAlertRules(metric: PerformanceMetric) {
  // 실제 구현에서는 복잡한 알림 규칙 평가 로직
  if (metric.responseTime > 5000) {
    const alert: PerformanceAlert = {
      id: crypto.randomUUID(),
      ruleId: 'high-response-time',
      message: `${metric.endpoint}의 응답 시간이 ${metric.responseTime}ms로 임계값을 초과했습니다`,
      severity: 'critical',
      value: metric.responseTime,
      threshold: 5000,
      timestamp: metric.timestamp,
      acknowledged: false,
    };

    activeAlerts.push(alert);
  }
}