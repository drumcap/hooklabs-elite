import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Web Vitals 데이터 저장을 위한 인터페이스
interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id: string;
  navigationType: string;
  url: string;
}

interface CustomMetric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface MetricBatch {
  type: string;
  data: WebVitalMetric | CustomMetric;
}

// 메트릭 저장소 (실제 환경에서는 데이터베이스 사용)
class MetricsStore {
  private static instance: MetricsStore;
  private webVitals: WebVitalMetric[] = [];
  private customMetrics: CustomMetric[] = [];
  private readonly MAX_METRICS = 10000;

  static getInstance(): MetricsStore {
    if (!MetricsStore.instance) {
      MetricsStore.instance = new MetricsStore();
    }
    return MetricsStore.instance;
  }

  addWebVital(metric: WebVitalMetric) {
    this.webVitals.push(metric);
    
    // 메모리 관리 - 최신 메트릭만 유지
    if (this.webVitals.length > this.MAX_METRICS) {
      this.webVitals = this.webVitals.slice(-Math.floor(this.MAX_METRICS * 0.8));
    }
  }

  addCustomMetric(metric: CustomMetric) {
    this.customMetrics.push(metric);
    
    if (this.customMetrics.length > this.MAX_METRICS) {
      this.customMetrics = this.customMetrics.slice(-Math.floor(this.MAX_METRICS * 0.8));
    }
  }

  getWebVitals(timeRange?: { start: number; end: number }): WebVitalMetric[] {
    if (!timeRange) return this.webVitals;
    
    return this.webVitals.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  getCustomMetrics(timeRange?: { start: number; end: number }): CustomMetric[] {
    if (!timeRange) return this.customMetrics;
    
    return this.customMetrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  // Web Vitals 통계 계산
  getWebVitalsStats(timeRange?: { start: number; end: number }) {
    const metrics = this.getWebVitals(timeRange);
    const stats: Record<string, any> = {};

    // 메트릭별 통계 계산
    const metricNames = [...new Set(metrics.map(m => m.name))];
    
    metricNames.forEach(name => {
      const metricData = metrics.filter(m => m.name === name);
      const values = metricData.map(m => m.value);
      const ratings = metricData.map(m => m.rating);

      if (values.length > 0) {
        stats[name] = {
          count: values.length,
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          p75: this.calculatePercentile(values, 75),
          p95: this.calculatePercentile(values, 95),
          p99: this.calculatePercentile(values, 99),
          ratings: {
            good: ratings.filter(r => r === 'good').length,
            'needs-improvement': ratings.filter(r => r === 'needs-improvement').length,
            poor: ratings.filter(r => r === 'poor').length
          }
        };
      }
    });

    return stats;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  // 성능 점수 계산
  calculatePerformanceScore(timeRange?: { start: number; end: number }): number {
    const stats = this.getWebVitalsStats(timeRange);
    const coreMetrics = ['LCP', 'FID', 'CLS'];
    
    let totalScore = 0;
    let metricCount = 0;

    coreMetrics.forEach(metric => {
      if (stats[metric]) {
        const ratings = stats[metric].ratings;
        const total = ratings.good + ratings['needs-improvement'] + ratings.poor;
        
        if (total > 0) {
          // 가중 점수 계산 (good: 100, needs-improvement: 50, poor: 0)
          const score = (ratings.good * 100 + ratings['needs-improvement'] * 50) / total;
          totalScore += score;
          metricCount++;
        }
      }
    });

    return metricCount > 0 ? Math.round(totalScore / metricCount) : 0;
  }
}

const metricsStore = MetricsStore.getInstance();

// POST - Web Vitals 메트릭 수신
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metrics, timestamp, session_id } = body;

    if (!metrics || !Array.isArray(metrics)) {
      return new NextResponse('Invalid metrics data', { status: 400 });
    }

    // 메트릭 처리
    let processedCount = 0;
    
    for (const metricBatch of metrics) {
      const { type, data } = metricBatch as MetricBatch;
      
      if (type === 'web-vitals') {
        const webVital = data as WebVitalMetric;
        
        // 데이터 유효성 검증
        if (webVital.name && typeof webVital.value === 'number') {
          metricsStore.addWebVital({
            ...webVital,
            timestamp: webVital.timestamp || Date.now()
          });
          processedCount++;
        }
        
      } else if (type === 'custom') {
        const customMetric = data as CustomMetric;
        
        if (customMetric.name && typeof customMetric.value === 'number') {
          metricsStore.addCustomMetric({
            ...customMetric,
            timestamp: customMetric.timestamp || Date.now()
          });
          processedCount++;
        }
      }
    }

    // 응답
    return NextResponse.json({
      success: true,
      processed: processedCount,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Web Vitals 처리 오류:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// GET - Web Vitals 데이터 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const { userId } = await auth();
    const searchParams = request.nextUrl.searchParams;
    
    // 관리자 또는 내부 API 접근 확인
    const authHeader = request.headers.get('authorization');
    const isInternal = authHeader === `Bearer ${process.env.INTERNAL_API_TOKEN}`;
    const isAdmin = searchParams.get('admin_key') === process.env.ADMIN_API_KEY;
    
    if (!userId && !isInternal && !isAdmin) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 시간 범위 파라미터
    const startTime = searchParams.get('start');
    const endTime = searchParams.get('end');
    const format = searchParams.get('format') || 'json';
    const metricType = searchParams.get('type') || 'all';

    let timeRange: { start: number; end: number } | undefined;
    
    if (startTime && endTime) {
      timeRange = {
        start: parseInt(startTime),
        end: parseInt(endTime)
      };
    } else {
      // 기본값: 최근 24시간
      const now = Date.now();
      timeRange = {
        start: now - (24 * 60 * 60 * 1000),
        end: now
      };
    }

    // 데이터 조회
    const webVitals = metricsStore.getWebVitals(timeRange);
    const customMetrics = metricsStore.getCustomMetrics(timeRange);
    const stats = metricsStore.getWebVitalsStats(timeRange);
    const performanceScore = metricsStore.calculatePerformanceScore(timeRange);

    // Prometheus 형식 응답
    if (format === 'prometheus') {
      const prometheusMetrics = generatePrometheusMetrics(webVitals, customMetrics, stats);
      
      return new NextResponse(prometheusMetrics, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // JSON 형식 응답
    const response = {
      timeRange,
      performanceScore,
      summary: {
        totalWebVitals: webVitals.length,
        totalCustomMetrics: customMetrics.length,
        coreWebVitalsScore: calculateCoreWebVitalsScore(stats)
      },
      stats,
      ...(metricType === 'all' || metricType === 'web-vitals') && { 
        webVitals: webVitals.slice(-100) // 최근 100개만 반환
      },
      ...(metricType === 'all' || metricType === 'custom') && { 
        customMetrics: customMetrics.slice(-100)
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=60' // 1분 캐시
      }
    });

  } catch (error) {
    console.error('Web Vitals 조회 오류:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Prometheus 형식 메트릭 생성
function generatePrometheusMetrics(
  webVitals: WebVitalMetric[], 
  customMetrics: CustomMetric[], 
  stats: Record<string, any>
): string {
  const lines: string[] = [];
  const timestamp = Date.now();

  // Web Vitals 메트릭
  Object.entries(stats).forEach(([metricName, data]) => {
    const metricKey = `web_vitals_${metricName.toLowerCase()}`;
    
    lines.push(`# HELP ${metricKey} Web Vitals ${metricName} metric`);
    lines.push(`# TYPE ${metricKey} histogram`);
    
    // 히스토그램 데이터
    lines.push(`${metricKey}_sum ${data.avg * data.count} ${timestamp}`);
    lines.push(`${metricKey}_count ${data.count} ${timestamp}`);
    lines.push(`${metricKey}_bucket{le="+Inf"} ${data.count} ${timestamp}`);
    
    // Percentiles
    lines.push(`${metricKey}{quantile="0.75"} ${data.p75} ${timestamp}`);
    lines.push(`${metricKey}{quantile="0.95"} ${data.p95} ${timestamp}`);
    lines.push(`${metricKey}{quantile="0.99"} ${data.p99} ${timestamp}`);
    
    // 등급별 카운트
    Object.entries(data.ratings).forEach(([rating, count]) => {
      lines.push(`${metricKey}_rating{rating="${rating}"} ${count} ${timestamp}`);
    });
  });

  // 커스텀 메트릭 집계
  const customMetricGroups: Record<string, number[]> = {};
  customMetrics.forEach(metric => {
    if (!customMetricGroups[metric.name]) {
      customMetricGroups[metric.name] = [];
    }
    customMetricGroups[metric.name].push(metric.value);
  });

  Object.entries(customMetricGroups).forEach(([name, values]) => {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const metricKey = `custom_${name.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    
    lines.push(`# HELP ${metricKey} Custom performance metric ${name}`);
    lines.push(`# TYPE ${metricKey} gauge`);
    lines.push(`${metricKey} ${avg} ${timestamp}`);
  });

  return lines.join('\n') + '\n';
}

// Core Web Vitals 점수 계산
function calculateCoreWebVitalsScore(stats: Record<string, any>): {
  lcp: number;
  fid: number;
  cls: number;
  overall: number;
} {
  const coreMetrics = ['LCP', 'FID', 'CLS'];
  const scores: Record<string, number> = {};
  
  coreMetrics.forEach(metric => {
    if (stats[metric]) {
      const ratings = stats[metric].ratings;
      const total = ratings.good + ratings['needs-improvement'] + ratings.poor;
      
      if (total > 0) {
        scores[metric.toLowerCase()] = Math.round(
          (ratings.good * 100 + ratings['needs-improvement'] * 50) / total
        );
      } else {
        scores[metric.toLowerCase()] = 0;
      }
    } else {
      scores[metric.toLowerCase()] = 0;
    }
  });

  const overall = Math.round(
    (scores.lcp + scores.fid + scores.cls) / 3
  );

  return {
    lcp: scores.lcp,
    fid: scores.fid,
    cls: scores.cls,
    overall
  };
}