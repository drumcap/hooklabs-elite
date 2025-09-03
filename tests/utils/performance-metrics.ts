/**
 * 성능 메트릭 수집 및 분석 유틸리티
 */

export interface NetworkEvent {
  url: string;
  status: number;
  mimeType: string;
  encodedDataLength: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  cls?: number;
  fid?: number;
  tti?: number;
  tbt?: number;
  loadTime: number;
  networkEvents: NetworkEvent[];
  resourceSummary: ResourceSummary;
}

export interface ResourceSummary {
  totalRequests: number;
  totalBytes: number;
  resourceTypes: { [key: string]: number };
  slowestResources: Array<{ url: string; time: number; type: string }>;
}

export class MetricsCollector {
  private networkEvents: NetworkEvent[] = [];
  private startTime: number = Date.now();
  private performanceData: Partial<PerformanceMetrics> = {};

  constructor() {
    this.reset();
  }

  reset() {
    this.networkEvents = [];
    this.startTime = Date.now();
    this.performanceData = {};
  }

  addNetworkEvent(event: NetworkEvent) {
    this.networkEvents.push(event);
  }

  setPerformanceData(key: keyof PerformanceMetrics, value: any) {
    this.performanceData[key] = value;
  }

  getResourceSummary(): ResourceSummary {
    const resourceTypes: { [key: string]: number } = {};
    let totalBytes = 0;
    const resourceTimes: Array<{ url: string; time: number; type: string }> = [];

    this.networkEvents.forEach(event => {
      const type = this.getResourceType(event.mimeType, event.url);
      resourceTypes[type] = (resourceTypes[type] || 0) + 1;
      totalBytes += event.encodedDataLength || 0;
      
      // 리소스 로딩 시간 계산 (간단한 추정)
      const loadTime = event.timestamp ? (event.timestamp - this.startTime) : 0;
      resourceTimes.push({
        url: event.url,
        time: loadTime,
        type
      });
    });

    // 가장 느린 리소스 상위 5개
    const slowestResources = resourceTimes
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);

    return {
      totalRequests: this.networkEvents.length,
      totalBytes,
      resourceTypes,
      slowestResources
    };
  }

  getMetrics(): PerformanceMetrics {
    return {
      ...this.performanceData,
      loadTime: Date.now() - this.startTime,
      networkEvents: this.networkEvents,
      resourceSummary: this.getResourceSummary()
    } as PerformanceMetrics;
  }

  private getResourceType(mimeType: string, url: string): string {
    if (mimeType.includes('text/css') || url.includes('.css')) return 'CSS';
    if (mimeType.includes('javascript') || url.includes('.js')) return 'JavaScript';
    if (mimeType.includes('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) return 'Image';
    if (mimeType.includes('font/') || /\.(woff|woff2|ttf|otf)$/i.test(url)) return 'Font';
    if (mimeType.includes('text/html') || url.endsWith('/')) return 'Document';
    return 'Other';
  }

  // 성능 점수 계산
  calculatePerformanceScore(): number {
    const metrics = this.getMetrics();
    let score = 100;

    // FCP 기준 점수 계산
    if (metrics.fcp) {
      if (metrics.fcp > 3000) score -= 30;
      else if (metrics.fcp > 1800) score -= 15;
    }

    // LCP 기준 점수 계산
    if (metrics.lcp) {
      if (metrics.lcp > 4000) score -= 30;
      else if (metrics.lcp > 2500) score -= 15;
    }

    // CLS 기준 점수 계산
    if (metrics.cls !== undefined) {
      if (metrics.cls > 0.25) score -= 20;
      else if (metrics.cls > 0.1) score -= 10;
    }

    // 리소스 로딩 점수
    const resourceSummary = metrics.resourceSummary;
    if (resourceSummary.totalBytes > 2000000) score -= 10; // 2MB 초과시
    if (resourceSummary.totalRequests > 100) score -= 10; // 100개 초과시

    return Math.max(0, score);
  }

  // 성능 이슈 탐지
  detectPerformanceIssues(): string[] {
    const issues: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.fcp && metrics.fcp > 3000) {
      issues.push(`FCP가 너무 느림: ${Math.round(metrics.fcp)}ms (권장: <1800ms)`);
    }

    if (metrics.lcp && metrics.lcp > 4000) {
      issues.push(`LCP가 너무 느림: ${Math.round(metrics.lcp)}ms (권장: <2500ms)`);
    }

    if (metrics.cls !== undefined && metrics.cls > 0.25) {
      issues.push(`CLS가 너무 높음: ${metrics.cls.toFixed(3)} (권장: <0.1)`);
    }

    const resourceSummary = metrics.resourceSummary;
    if (resourceSummary.totalBytes > 5000000) { // 5MB
      issues.push(`전체 리소스 크기가 큼: ${Math.round(resourceSummary.totalBytes / 1024 / 1024)}MB`);
    }

    if (resourceSummary.totalRequests > 150) {
      issues.push(`HTTP 요청이 많음: ${resourceSummary.totalRequests}개`);
    }

    // 느린 리소스 감지
    resourceSummary.slowestResources.forEach(resource => {
      if (resource.time > 3000) {
        issues.push(`느린 리소스: ${resource.url.split('/').pop()} (${Math.round(resource.time)}ms)`);
      }
    });

    return issues;
  }

  // 성능 개선 권장사항 생성
  generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const resourceSummary = this.getResourceSummary();

    // 리소스 타입별 권장사항
    if (resourceSummary.resourceTypes.Image > 20) {
      recommendations.push('이미지 최적화 및 지연 로딩 구현을 고려하세요');
    }

    if (resourceSummary.resourceTypes.JavaScript > 15) {
      recommendations.push('JavaScript 번들 분할 및 코드 스플리팅을 고려하세요');
    }

    if (resourceSummary.resourceTypes.CSS > 10) {
      recommendations.push('CSS 파일 압축 및 불필요한 스타일 제거를 고려하세요');
    }

    if (resourceSummary.totalBytes > 3000000) { // 3MB
      recommendations.push('리소스 압축(gzip/brotli) 및 CDN 사용을 고려하세요');
    }

    if (resourceSummary.totalRequests > 100) {
      recommendations.push('리소스 번들링 및 HTTP/2 Server Push 활용을 고려하세요');
    }

    return recommendations;
  }

  // 레포트 생성
  generateReport(): PerformanceReport {
    const metrics = this.getMetrics();
    const score = this.calculatePerformanceScore();
    const issues = this.detectPerformanceIssues();
    const recommendations = this.generateRecommendations();

    return {
      timestamp: new Date().toISOString(),
      score,
      metrics,
      issues,
      recommendations,
      summary: this.generateSummary(score, issues.length)
    };
  }

  private generateSummary(score: number, issueCount: number): string {
    if (score >= 90 && issueCount === 0) {
      return '🟢 성능이 우수합니다!';
    } else if (score >= 70) {
      return '🟡 성능이 양호하지만 개선 여지가 있습니다.';
    } else {
      return '🔴 성능 최적화가 필요합니다.';
    }
  }
}

export interface PerformanceReport {
  timestamp: string;
  score: number;
  metrics: PerformanceMetrics;
  issues: string[];
  recommendations: string[];
  summary: string;
}

// Factory 함수
export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector();
}

// Web Vitals 측정을 위한 브라우저 스크립트
export const webVitalsScript = `
  (function() {
    window.__performanceMetrics = {
      fcp: null,
      lcp: null,
      fid: null,
      cls: 0,
      customEvents: []
    };

    // FCP 측정
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        window.__performanceMetrics.fcp = fcpEntry.startTime;
      }
    }).observe({ entryTypes: ['paint'] });

    // LCP 측정
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        window.__performanceMetrics.lcp = lastEntry.startTime;
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID 측정
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        window.__performanceMetrics.fid = entry.processingStart - entry.startTime;
      });
    }).observe({ entryTypes: ['first-input'] });

    // CLS 측정
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          window.__performanceMetrics.cls += entry.value;
        }
      });
    }).observe({ entryTypes: ['layout-shift'] });

    // 커스텀 성능 이벤트 기록
    window.recordPerformanceEvent = function(name, data) {
      window.__performanceMetrics.customEvents.push({
        name,
        timestamp: performance.now(),
        data
      });
    };
  })();
`;

// 성능 분석 헬퍼 함수들
export class PerformanceAnalyzer {
  static compareReports(baseline: PerformanceReport, current: PerformanceReport) {
    const comparison = {
      scoreChange: current.score - baseline.score,
      metricChanges: {} as { [key: string]: { baseline: number; current: number; change: number } },
      regression: false,
      improvements: [] as string[],
      regressions: [] as string[]
    };

    // 메트릭 변화 계산
    const metricKeys = ['fcp', 'lcp', 'cls', 'loadTime'] as const;
    metricKeys.forEach(key => {
      const baselineValue = baseline.metrics[key] as number;
      const currentValue = current.metrics[key] as number;
      
      if (baselineValue && currentValue) {
        const change = currentValue - baselineValue;
        comparison.metricChanges[key] = {
          baseline: baselineValue,
          current: currentValue,
          change
        };

        // 회귀 감지 (10% 이상 악화)
        const percentChange = (change / baselineValue) * 100;
        if (key !== 'cls' && percentChange > 10) {
          comparison.regressions.push(`${key.toUpperCase()}: ${percentChange.toFixed(1)}% 악화`);
          comparison.regression = true;
        } else if (key === 'cls' && change > 0.05) {
          comparison.regressions.push(`CLS: ${change.toFixed(3)} 악화`);
          comparison.regression = true;
        } else if (percentChange < -10) {
          comparison.improvements.push(`${key.toUpperCase()}: ${Math.abs(percentChange).toFixed(1)}% 개선`);
        }
      }
    });

    return comparison;
  }

  static generateTrendAnalysis(reports: PerformanceReport[], windowSize: number = 10) {
    const recentReports = reports.slice(-windowSize);
    if (recentReports.length < 2) return null;

    const trends = {
      scoretrend: this.calculateTrend(recentReports.map(r => r.score)),
      fcpTrend: this.calculateTrend(recentReports.map(r => r.metrics.fcp || 0)),
      lcpTrend: this.calculateTrend(recentReports.map(r => r.metrics.lcp || 0)),
      clsTrend: this.calculateTrend(recentReports.map(r => r.metrics.cls || 0))
    };

    return trends;
  }

  private static calculateTrend(values: number[]): 'improving' | 'degrading' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 5) return 'degrading';
    if (change < -5) return 'improving';
    return 'stable';
  }
}