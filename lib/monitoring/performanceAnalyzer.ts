import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convexClient = new ConvexHttpClient(convexUrl);

// 성능 최적화 제안 타입
export interface OptimizationSuggestion {
  id: string;
  category: 'webvitals' | 'api' | 'database' | 'frontend' | 'infrastructure';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedImprovement: {
    metric: string;
    current: number;
    expected: number;
    unit: string;
  };
  implementation: string[];
  resources?: string[];
}

// 성능 분석 엔진
export class PerformanceAnalyzer {
  private static instance: PerformanceAnalyzer;

  static getInstance(): PerformanceAnalyzer {
    if (!PerformanceAnalyzer.instance) {
      PerformanceAnalyzer.instance = new PerformanceAnalyzer();
    }
    return PerformanceAnalyzer.instance;
  }

  // 종합 성능 분석
  async analyzePerformance(timeRange: string = '24h'): Promise<{
    score: number;
    grade: string;
    summary: string;
    bottlenecks: any[];
    suggestions: OptimizationSuggestion[];
    trends: any;
  }> {
    // 메트릭 데이터 수집
    const [webVitals, apiPerformance, businessMetrics, errors] = await Promise.all([
      convexClient.query(api.performanceMetrics.getWebVitalsSummary, { timeRange }),
      convexClient.query(api.performanceMetrics.getApiPerformanceSummary, { timeRange }),
      convexClient.query(api.performanceMetrics.getBusinessMetricsDashboard, { timeRange }),
      convexClient.query(api.performanceMetrics.getRecentErrors, { limit: 100 }),
    ]);

    // 성능 점수 계산
    const score = this.calculatePerformanceScore(webVitals, apiPerformance, errors);
    const grade = this.getPerformanceGrade(score);

    // 병목 지점 분석
    const bottlenecks = this.identifyBottlenecks(webVitals, apiPerformance);

    // 최적화 제안 생성
    const suggestions = this.generateOptimizationSuggestions(
      webVitals,
      apiPerformance,
      bottlenecks
    );

    // 트렌드 분석
    const trends = await this.analyzeTrends(timeRange);

    return {
      score,
      grade,
      summary: this.generateSummary(score, grade, bottlenecks),
      bottlenecks,
      suggestions,
      trends,
    };
  }

  // 성능 점수 계산
  private calculatePerformanceScore(
    webVitals: any,
    apiPerformance: any,
    errors: any[]
  ): number {
    let score = 100;

    // Web Vitals 점수 (40%)
    if (webVitals) {
      const vitalsScore = this.calculateWebVitalsScore(webVitals);
      score -= (100 - vitalsScore) * 0.4;
    }

    // API 성능 점수 (30%)
    if (apiPerformance) {
      const apiScore = this.calculateApiScore(apiPerformance);
      score -= (100 - apiScore) * 0.3;
    }

    // 에러율 점수 (20%)
    const errorScore = this.calculateErrorScore(errors);
    score -= (100 - errorScore) * 0.2;

    // 가용성 점수 (10%)
    const availabilityScore = 99.9; // 실제로는 계산 필요
    score -= (100 - availabilityScore) * 0.1;

    return Math.max(0, Math.min(100, score));
  }

  // Web Vitals 점수 계산
  private calculateWebVitalsScore(webVitals: any): number {
    if (!webVitals || !webVitals.metrics) return 100;

    const scores = {
      lcp: this.getMetricScore(webVitals.metrics.lcp?.p75, 'lcp'),
      fid: this.getMetricScore(webVitals.metrics.fid?.p75, 'fid'),
      cls: this.getMetricScore(webVitals.metrics.cls?.p75, 'cls'),
      fcp: this.getMetricScore(webVitals.metrics.fcp?.p75, 'fcp'),
      ttfb: this.getMetricScore(webVitals.metrics.ttfb?.p75, 'ttfb'),
    };

    const validScores = Object.values(scores).filter(s => s !== null) as number[];
    return validScores.length > 0
      ? validScores.reduce((a, b) => a + b, 0) / validScores.length
      : 100;
  }

  // 개별 메트릭 점수 계산
  private getMetricScore(value: number | undefined, metric: string): number | null {
    if (value === undefined) return null;

    const thresholds: Record<string, { good: number; poor: number }> = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 50;

    if (value <= threshold.good) return 100;
    if (value >= threshold.poor) return 0;

    // 선형 보간
    const ratio = (value - threshold.good) / (threshold.poor - threshold.good);
    return 100 - (ratio * 100);
  }

  // API 성능 점수 계산
  private calculateApiScore(apiPerformance: any): number {
    if (!apiPerformance) return 100;

    let score = 100;

    // 응답 시간 (P95 < 200ms = 100점, > 2000ms = 0점)
    const p95 = apiPerformance.summary.p95ResponseTime;
    if (p95 > 200) {
      score -= Math.min(50, (p95 - 200) / 36); // 최대 50점 감점
    }

    // 성공률 (< 99.9% 감점)
    const successRate = apiPerformance.summary.successRate;
    if (successRate < 99.9) {
      score -= (99.9 - successRate) * 10; // 1% 당 10점 감점
    }

    return Math.max(0, score);
  }

  // 에러 점수 계산
  private calculateErrorScore(errors: any[]): number {
    if (!errors || errors.length === 0) return 100;

    // 최근 100개 에러 중 critical 에러 비율
    const criticalErrors = errors.filter(e => e.level === 'error').length;
    const errorRate = (criticalErrors / errors.length) * 100;

    return Math.max(0, 100 - errorRate * 2);
  }

  // 성능 등급
  private getPerformanceGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // 병목 지점 식별
  private identifyBottlenecks(webVitals: any, apiPerformance: any): any[] {
    const bottlenecks: any[] = [];

    // Web Vitals 병목
    if (webVitals?.metrics) {
      if (webVitals.metrics.lcp?.p75 > 4000) {
        bottlenecks.push({
          type: 'webvitals',
          metric: 'LCP',
          severity: 'high',
          value: webVitals.metrics.lcp.p75,
          threshold: 2500,
          impact: '사용자 경험 저하',
        });
      }

      if (webVitals.metrics.fid?.p75 > 300) {
        bottlenecks.push({
          type: 'webvitals',
          metric: 'FID',
          severity: 'medium',
          value: webVitals.metrics.fid.p75,
          threshold: 100,
          impact: '상호작용 지연',
        });
      }
    }

    // API 병목
    if (apiPerformance?.endpoints) {
      const slowEndpoints = apiPerformance.endpoints.filter(
        (e: any) => e.avgResponseTime > 1000
      );

      slowEndpoints.forEach((endpoint: any) => {
        bottlenecks.push({
          type: 'api',
          endpoint: endpoint.endpoint,
          method: endpoint.method,
          severity: endpoint.avgResponseTime > 3000 ? 'high' : 'medium',
          value: endpoint.avgResponseTime,
          threshold: 200,
          impact: `${endpoint.count}개 요청 영향`,
        });
      });
    }

    return bottlenecks.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity as keyof typeof severityOrder] -
             severityOrder[b.severity as keyof typeof severityOrder];
    });
  }

  // 최적화 제안 생성
  private generateOptimizationSuggestions(
    webVitals: any,
    apiPerformance: any,
    bottlenecks: any[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // LCP 최적화
    if (webVitals?.metrics?.lcp?.p75 > 2500) {
      suggestions.push({
        id: 'optimize-lcp',
        category: 'webvitals',
        priority: 'high',
        title: '이미지 최적화 및 지연 로딩 구현',
        description: 'LCP가 목표치를 초과했습니다. 이미지 최적화와 지연 로딩을 통해 개선할 수 있습니다.',
        impact: '페이지 로드 속도 40% 개선',
        effort: 'medium',
        estimatedImprovement: {
          metric: 'LCP',
          current: webVitals.metrics.lcp.p75,
          expected: 2000,
          unit: 'ms',
        },
        implementation: [
          'Next.js Image 컴포넌트 사용',
          'WebP 포맷으로 이미지 변환',
          'Critical CSS 인라인화',
          'Lazy loading 구현',
        ],
        resources: [
          'https://web.dev/optimize-lcp/',
          'https://nextjs.org/docs/api-reference/next/image',
        ],
      });
    }

    // API 응답 시간 최적화
    const slowEndpoints = apiPerformance?.endpoints?.filter(
      (e: any) => e.avgResponseTime > 500
    ) || [];

    if (slowEndpoints.length > 0) {
      suggestions.push({
        id: 'optimize-api-response',
        category: 'api',
        priority: 'high',
        title: 'API 응답 캐싱 구현',
        description: `${slowEndpoints.length}개의 느린 엔드포인트가 발견되었습니다.`,
        impact: 'API 응답 시간 60% 단축',
        effort: 'low',
        estimatedImprovement: {
          metric: '평균 응답 시간',
          current: apiPerformance.summary.avgResponseTime,
          expected: apiPerformance.summary.avgResponseTime * 0.4,
          unit: 'ms',
        },
        implementation: [
          'Redis 캐싱 레이어 추가',
          'CDN 엣지 캐싱 활성화',
          'Database 쿼리 최적화',
          'API 응답 압축 (gzip/brotli)',
        ],
      });
    }

    // 데이터베이스 최적화
    if (bottlenecks.some(b => b.type === 'database')) {
      suggestions.push({
        id: 'optimize-database',
        category: 'database',
        priority: 'medium',
        title: '데이터베이스 인덱스 최적화',
        description: '자주 사용되는 쿼리에 대한 인덱스 최적화가 필요합니다.',
        impact: '쿼리 성능 70% 개선',
        effort: 'medium',
        estimatedImprovement: {
          metric: '쿼리 실행 시간',
          current: 150,
          expected: 45,
          unit: 'ms',
        },
        implementation: [
          'Convex 인덱스 추가',
          '복합 인덱스 생성',
          'N+1 쿼리 문제 해결',
          '불필요한 필드 제거',
        ],
      });
    }

    // 프론트엔드 번들 최적화
    suggestions.push({
      id: 'optimize-bundle',
      category: 'frontend',
      priority: 'medium',
      title: '번들 크기 최적화',
      description: 'JavaScript 번들 크기를 줄여 초기 로딩 속도를 개선할 수 있습니다.',
      impact: '초기 로딩 시간 30% 단축',
      effort: 'low',
      estimatedImprovement: {
        metric: '번들 크기',
        current: 500,
        expected: 350,
        unit: 'KB',
      },
      implementation: [
        '동적 임포트로 코드 스플리팅',
        '사용하지 않는 종속성 제거',
        'Tree shaking 최적화',
        'Terser 압축 설정 강화',
      ],
    });

    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // 트렌드 분석
  private async analyzeTrends(timeRange: string): Promise<any> {
    // 여러 시간대의 데이터를 비교하여 트렌드 분석
    const periods = ['1h', '24h', '7d'];
    const trendData: any = {};

    for (const period of periods) {
      const [webVitals, apiPerformance] = await Promise.all([
        convexClient.query(api.performanceMetrics.getWebVitalsSummary, { timeRange: period }),
        convexClient.query(api.performanceMetrics.getApiPerformanceSummary, { timeRange: period }),
      ]);

      trendData[period] = {
        webVitals: webVitals?.metrics,
        apiPerformance: apiPerformance?.summary,
      };
    }

    return {
      improving: this.identifyImprovingMetrics(trendData),
      degrading: this.identifyDegradingMetrics(trendData),
      stable: this.identifyStableMetrics(trendData),
    };
  }

  // 개선 중인 메트릭 식별
  private identifyImprovingMetrics(trendData: any): string[] {
    const improving: string[] = [];

    // 시간대별 비교를 통해 개선 중인 메트릭 찾기
    if (trendData['1h']?.webVitals?.lcp?.avg < trendData['24h']?.webVitals?.lcp?.avg) {
      improving.push('LCP');
    }

    if (trendData['1h']?.apiPerformance?.avgResponseTime < trendData['24h']?.apiPerformance?.avgResponseTime) {
      improving.push('API Response Time');
    }

    return improving;
  }

  // 악화 중인 메트릭 식별
  private identifyDegradingMetrics(trendData: any): string[] {
    const degrading: string[] = [];

    // 시간대별 비교를 통해 악화 중인 메트릭 찾기
    if (trendData['1h']?.webVitals?.lcp?.avg > trendData['24h']?.webVitals?.lcp?.avg * 1.1) {
      degrading.push('LCP');
    }

    if (trendData['1h']?.apiPerformance?.successRate < trendData['24h']?.apiPerformance?.successRate) {
      degrading.push('API Success Rate');
    }

    return degrading;
  }

  // 안정적인 메트릭 식별
  private identifyStableMetrics(trendData: any): string[] {
    const stable: string[] = [];

    // 변동이 5% 이내인 메트릭
    const lcpVariation = Math.abs(
      (trendData['1h']?.webVitals?.lcp?.avg || 0) -
      (trendData['24h']?.webVitals?.lcp?.avg || 0)
    ) / (trendData['24h']?.webVitals?.lcp?.avg || 1);

    if (lcpVariation < 0.05) {
      stable.push('LCP');
    }

    return stable;
  }

  // 요약 생성
  private generateSummary(score: number, grade: string, bottlenecks: any[]): string {
    let summary = `현재 성능 점수는 ${score.toFixed(1)}점 (${grade} 등급)입니다. `;

    if (score >= 90) {
      summary += '전반적으로 우수한 성능을 보이고 있습니다.';
    } else if (score >= 70) {
      summary += '양호한 성능이지만 개선의 여지가 있습니다.';
    } else {
      summary += '성능 개선이 시급합니다.';
    }

    if (bottlenecks.length > 0) {
      summary += ` ${bottlenecks.length}개의 주요 병목 지점이 발견되었습니다.`;
    }

    return summary;
  }

  // 용량 계획 예측
  async predictCapacity(growthRate: number = 0.1): Promise<{
    currentCapacity: any;
    projectedDemand: any;
    recommendations: string[];
  }> {
    const metrics = await convexClient.query(
      api.performanceMetrics.getBusinessMetricsDashboard,
      { timeRange: '30d' }
    );

    const currentUsers = metrics?.activeUsers || 0;
    const projectedUsers = currentUsers * (1 + growthRate);

    const recommendations: string[] = [];

    if (projectedUsers > currentUsers * 1.5) {
      recommendations.push('데이터베이스 스케일링 계획 수립 필요');
      recommendations.push('CDN 용량 증설 검토');
      recommendations.push('API 레이트 리미트 조정 필요');
    }

    return {
      currentCapacity: {
        users: currentUsers,
        requestsPerSecond: 100, // 예시
        storageUsed: '50GB', // 예시
      },
      projectedDemand: {
        users: projectedUsers,
        requestsPerSecond: 100 * (1 + growthRate),
        storageNeeded: `${50 * (1 + growthRate)}GB`,
      },
      recommendations,
    };
  }
}

// 전역 인스턴스
export const performanceAnalyzer = PerformanceAnalyzer.getInstance();