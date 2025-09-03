import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// 메트릭 수집 클래스
class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, any> = new Map();
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // 카운터 증가
  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1) {
    const key = this.createMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  // 히스토그램 값 추가
  addHistogramValue(name: string, value: number, labels: Record<string, string> = {}) {
    const key = this.createMetricKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key)!.push(value);
  }

  // 게이지 값 설정
  setGauge(name: string, value: number, labels: Record<string, string> = {}) {
    const key = this.createMetricKey(name, labels);
    this.metrics.set(key, { type: 'gauge', value, labels, timestamp: Date.now() });
  }

  private createMetricKey(name: string, labels: Record<string, string>): string {
    const labelPairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    return labelPairs ? `${name}{${labelPairs}}` : name;
  }

  // Prometheus 형식으로 메트릭 출력
  toPrometheusFormat(): string {
    const lines: string[] = [];
    const now = Date.now();

    // 카운터 메트릭
    const counterGroups = new Map<string, Array<{key: string, value: number}>>();
    
    for (const [key, value] of this.counters) {
      const metricName = key.split('{')[0];
      if (!counterGroups.has(metricName)) {
        counterGroups.set(metricName, []);
      }
      counterGroups.get(metricName)!.push({ key, value });
    }

    for (const [metricName, entries] of counterGroups) {
      lines.push(`# HELP ${metricName} Total number of ${metricName}`);
      lines.push(`# TYPE ${metricName} counter`);
      
      for (const { key, value } of entries) {
        lines.push(`${key} ${value} ${now}`);
      }
    }

    // 히스토그램 메트릭
    for (const [key, values] of this.histograms) {
      const metricName = key.split('{')[0];
      const labels = key.includes('{') ? key.split('{')[1].split('}')[0] : '';
      
      // 히스토그램 통계 계산
      const sortedValues = values.sort((a, b) => a - b);
      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      
      // Quantiles
      const p50 = this.calculateQuantile(sortedValues, 0.5);
      const p95 = this.calculateQuantile(sortedValues, 0.95);
      const p99 = this.calculateQuantile(sortedValues, 0.99);

      const labelStr = labels ? `{${labels}}` : '';
      
      lines.push(`# HELP ${metricName} ${metricName} histogram`);
      lines.push(`# TYPE ${metricName} histogram`);
      lines.push(`${metricName}_bucket${labelStr.replace('}', ',le="+Inf"}')} ${count} ${now}`);
      lines.push(`${metricName}_sum${labelStr} ${sum} ${now}`);
      lines.push(`${metricName}_count${labelStr} ${count} ${now}`);
      
      // Quantiles as separate metrics
      lines.push(`${metricName}_quantile${labelStr.replace('}', ',quantile="0.5"}')} ${p50} ${now}`);
      lines.push(`${metricName}_quantile${labelStr.replace('}', ',quantile="0.95"}')} ${p95} ${now}`);
      lines.push(`${metricName}_quantile${labelStr.replace('}', ',quantile="0.99"}')} ${p99} ${now}`);
    }

    // 게이지 메트릭
    const gaugeGroups = new Map<string, Array<{key: string, value: any}>>();
    
    for (const [key, metric] of this.metrics) {
      if (metric.type === 'gauge') {
        const metricName = key.split('{')[0];
        if (!gaugeGroups.has(metricName)) {
          gaugeGroups.set(metricName, []);
        }
        gaugeGroups.get(metricName)!.push({ key, value: metric.value });
      }
    }

    for (const [metricName, entries] of gaugeGroups) {
      lines.push(`# HELP ${metricName} Current ${metricName} value`);
      lines.push(`# TYPE ${metricName} gauge`);
      
      for (const { key, value } of entries) {
        lines.push(`${key} ${value} ${now}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  private calculateQuantile(sortedValues: number[], quantile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = quantile * (sortedValues.length - 1);
    if (Math.floor(index) === index) {
      return sortedValues[index];
    } else {
      const lower = sortedValues[Math.floor(index)];
      const upper = sortedValues[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  }

  // 애플리케이션 특화 메트릭 수집
  async collectApplicationMetrics() {
    // 메모리 사용량
    if (typeof process !== 'undefined') {
      const memUsage = process.memoryUsage();
      this.setGauge('nodejs_heap_size_used_bytes', memUsage.heapUsed);
      this.setGauge('nodejs_heap_size_total_bytes', memUsage.heapTotal);
      this.setGauge('nodejs_external_memory_bytes', memUsage.external);
    }

    // 활성 연결 수 (예시)
    this.setGauge('active_connections', Math.floor(Math.random() * 100) + 50);
    
    // 버전 정보
    this.setGauge('app_info', 1, {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      platform: process.platform
    });

    // 시작 시간
    if (typeof process !== 'undefined') {
      this.setGauge('process_start_time_seconds', Math.floor(Date.now() / 1000));
    }
  }
}

// HTTP 요청 메트릭 미들웨어에서 사용할 전역 인스턴스
export const metricsCollector = MetricsCollector.getInstance();

// API Route Handler
export async function GET(request: NextRequest) {
  try {
    // 인증 확인 (내부 API 또는 모니터링 시스템만 접근 허용)
    const authHeader = request.headers.get('authorization');
    const isInternal = authHeader === `Bearer ${process.env.INTERNAL_API_TOKEN}`;
    
    if (!isInternal) {
      // Clerk 인증으로 관리자 권한 확인
      const { userId } = await auth();
      if (!userId) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
      
      // 관리자 권한 확인 (실제 구현에서는 사용자 역할 확인)
      const isAdmin = process.env.NODE_ENV === 'development' || 
                     request.headers.get('x-admin-key') === process.env.ADMIN_API_KEY;
      
      if (!isAdmin) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    // 메트릭 수집
    await metricsCollector.collectApplicationMetrics();

    // Prometheus 형식으로 응답
    const metricsOutput = metricsCollector.toPrometheusFormat();

    return new NextResponse(metricsOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('메트릭 수집 오류:', error);
    
    return new NextResponse('Internal Server Error', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}

// POST 요청으로 커스텀 메트릭 추가 (선택사항)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { metricName, metricType, value, labels = {} } = body;

    if (!metricName || !metricType || value === undefined) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    switch (metricType) {
      case 'counter':
        metricsCollector.incrementCounter(metricName, labels, value);
        break;
      case 'gauge':
        metricsCollector.setGauge(metricName, value, labels);
        break;
      case 'histogram':
        metricsCollector.addHistogramValue(metricName, value, labels);
        break;
      default:
        return new NextResponse('Invalid metric type', { status: 400 });
    }

    return new NextResponse('Metric recorded', { status: 200 });

  } catch (error) {
    console.error('커스텀 메트릭 저장 오류:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}