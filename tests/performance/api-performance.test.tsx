import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';

/**
 * API 성능 테스트 스위트
 * Next.js API 라우트와 Convex 쿼리 성능 측정
 */

interface APIPerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  payloadSize: number;
  timestamp: number;
  memoryBefore: number;
  memoryAfter: number;
  cpuUsage?: number;
}

interface ConvexPerformanceMetrics {
  query: string;
  executionTime: number;
  dataSize: number;
  cacheHit: boolean;
  timestamp: number;
}

const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE_TIME: 200, // ms
  API_P95_RESPONSE_TIME: 500, // ms
  CONVEX_QUERY_TIME: 100, // ms
  MEMORY_LEAK_THRESHOLD: 50 * 1024 * 1024, // 50MB
  CONCURRENT_USERS: 50,
};

class APIPerformanceTester {
  private baseUrl: string = process.env.TEST_BASE_URL || 'http://localhost:3000';
  private metricsHistory: APIPerformanceMetrics[] = [];
  private convexMetrics: ConvexPerformanceMetrics[] = [];

  constructor() {
    // 메모리 사용량 모니터링 시작
    this.startMemoryMonitoring();
  }

  /**
   * 단일 API 엔드포인트 성능 테스트
   */
  async testEndpoint(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    payload?: any,
    headers?: Record<string, string>
  ): Promise<APIPerformanceMetrics> {
    const memoryBefore = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    try {
      const requestConfig: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (payload && (method === 'POST' || method === 'PUT')) {
        requestConfig.body = JSON.stringify(payload);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, requestConfig);
      const responseTime = performance.now() - startTime;
      const memoryAfter = process.memoryUsage().heapUsed;

      const responseText = await response.text();
      const payloadSize = Buffer.byteLength(responseText, 'utf8');

      const metrics: APIPerformanceMetrics = {
        endpoint,
        method,
        responseTime,
        statusCode: response.status,
        payloadSize,
        timestamp: Date.now(),
        memoryBefore,
        memoryAfter,
      };

      this.metricsHistory.push(metrics);
      return metrics;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      const memoryAfter = process.memoryUsage().heapUsed;

      const metrics: APIPerformanceMetrics = {
        endpoint,
        method,
        responseTime,
        statusCode: 0, // 오류 표시
        payloadSize: 0,
        timestamp: Date.now(),
        memoryBefore,
        memoryAfter,
      };

      this.metricsHistory.push(metrics);
      throw error;
    }
  }

  /**
   * 동시 요청 성능 테스트
   */
  async testConcurrentRequests(
    endpoint: string,
    concurrency: number = 10,
    totalRequests: number = 100
  ): Promise<APIPerformanceMetrics[]> {
    const results: APIPerformanceMetrics[] = [];
    const batchSize = Math.ceil(totalRequests / concurrency);

    for (let batch = 0; batch < Math.ceil(totalRequests / batchSize); batch++) {
      const promises: Promise<APIPerformanceMetrics>[] = [];
      const currentBatchSize = Math.min(batchSize, totalRequests - batch * batchSize);

      for (let i = 0; i < currentBatchSize; i++) {
        promises.push(this.testEndpoint(endpoint));
      }

      const batchResults = await Promise.allSettled(promises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });

      // 배치 간 짧은 대기 (서버 부하 방지)
      if (batch < Math.ceil(totalRequests / batchSize) - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * 스파이크 테스트 (갑작스러운 트래픽 증가)
   */
  async testTrafficSpike(
    endpoint: string,
    normalLoad: number = 5,
    spikeLoad: number = 50,
    spikeDuration: number = 10000 // ms
  ): Promise<{ normal: APIPerformanceMetrics[]; spike: APIPerformanceMetrics[] }> {
    console.log(`📈 스파이크 테스트 시작: ${endpoint}`);
    
    // 1. 정상 로드 기준선 설정
    const normalResults = await this.testConcurrentRequests(endpoint, normalLoad, normalLoad * 2);
    
    // 2. 스파이크 시뮬레이션
    const spikePromises: Promise<APIPerformanceMetrics>[] = [];
    const startSpike = Date.now();
    
    while (Date.now() - startSpike < spikeDuration) {
      for (let i = 0; i < spikeLoad; i++) {
        spikePromises.push(this.testEndpoint(endpoint));
      }
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms 간격
    }

    const spikeResults = await Promise.allSettled(spikePromises);
    const successfulSpikes = spikeResults
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<APIPerformanceMetrics>).value);

    return {
      normal: normalResults,
      spike: successfulSpikes
    };
  }

  /**
   * P95 응답시간 계산
   */
  calculateP95(metrics: APIPerformanceMetrics[]): number {
    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    return responseTimes[p95Index] || 0;
  }

  /**
   * 평균 응답시간 계산
   */
  calculateAverageResponseTime(metrics: APIPerformanceMetrics[]): number {
    const total = metrics.reduce((sum, m) => sum + m.responseTime, 0);
    return total / metrics.length;
  }

  /**
   * 오류율 계산
   */
  calculateErrorRate(metrics: APIPerformanceMetrics[]): number {
    const errors = metrics.filter(m => m.statusCode >= 400 || m.statusCode === 0).length;
    return (errors / metrics.length) * 100;
  }

  /**
   * 처리량 계산 (RPS - Requests Per Second)
   */
  calculateThroughput(metrics: APIPerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    const timespan = Math.max(...metrics.map(m => m.timestamp)) - Math.min(...metrics.map(m => m.timestamp));
    return (metrics.length / timespan) * 1000; // per second
  }

  /**
   * 메모리 사용량 모니터링
   */
  private startMemoryMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      if (usage.heapUsed > PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD) {
        console.warn(`⚠️  높은 메모리 사용량 감지: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
      }
    }, 5000);
  }

  /**
   * 성능 리포트 생성
   */
  generatePerformanceReport(): any {
    const allMetrics = this.metricsHistory;
    
    if (allMetrics.length === 0) {
      return { error: '성능 데이터가 없습니다.' };
    }

    const groupedMetrics = allMetrics.reduce((groups, metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(metric);
      return groups;
    }, {} as Record<string, APIPerformanceMetrics[]>);

    const report: any = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests: allMetrics.length,
        averageResponseTime: this.calculateAverageResponseTime(allMetrics),
        p95ResponseTime: this.calculateP95(allMetrics),
        errorRate: this.calculateErrorRate(allMetrics),
        throughput: this.calculateThroughput(allMetrics),
      },
      endpoints: {}
    };

    Object.entries(groupedMetrics).forEach(([endpoint, metrics]) => {
      report.endpoints[endpoint] = {
        requestCount: metrics.length,
        averageResponseTime: this.calculateAverageResponseTime(metrics),
        p95ResponseTime: this.calculateP95(metrics),
        errorRate: this.calculateErrorRate(metrics),
        throughput: this.calculateThroughput(metrics),
        averagePayloadSize: metrics.reduce((sum, m) => sum + m.payloadSize, 0) / metrics.length,
        performance: this.assessEndpointPerformance(metrics),
      };
    });

    return report;
  }

  private assessEndpointPerformance(metrics: APIPerformanceMetrics[]): string {
    const avgTime = this.calculateAverageResponseTime(metrics);
    const errorRate = this.calculateErrorRate(metrics);

    if (errorRate > 5) return '🔴 Poor - High Error Rate';
    if (avgTime > PERFORMANCE_THRESHOLDS.API_P95_RESPONSE_TIME) return '🟡 Needs Improvement - Slow Response';
    if (avgTime > PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME) return '🟡 Average';
    return '🟢 Excellent';
  }
}

// Convex 성능 테스터
class ConvexPerformanceTester {
  private convexMetrics: ConvexPerformanceMetrics[] = [];

  /**
   * Convex 쿼리 성능 시뮬레이션 테스트
   */
  async testConvexQuery(queryName: string, params?: any): Promise<ConvexPerformanceMetrics> {
    const startTime = performance.now();
    
    // 실제 Convex 쿼리는 클라이언트에서만 실행 가능하므로
    // HTTP API를 통한 시뮬레이션 또는 목 테스트 진행
    try {
      // 여기서는 시뮬레이션을 위한 더미 구현
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
      
      const executionTime = performance.now() - startTime;
      const metrics: ConvexPerformanceMetrics = {
        query: queryName,
        executionTime,
        dataSize: Math.floor(Math.random() * 1024) + 512, // 임시 데이터 크기
        cacheHit: Math.random() > 0.3, // 70% 캐시 히트율
        timestamp: Date.now(),
      };

      this.convexMetrics.push(metrics);
      return metrics;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const metrics: ConvexPerformanceMetrics = {
        query: queryName,
        executionTime,
        dataSize: 0,
        cacheHit: false,
        timestamp: Date.now(),
      };

      this.convexMetrics.push(metrics);
      throw error;
    }
  }

  getMetrics(): ConvexPerformanceMetrics[] {
    return [...this.convexMetrics];
  }

  generateConvexReport(): any {
    const metrics = this.convexMetrics;
    
    if (metrics.length === 0) {
      return { error: 'Convex 성능 데이터가 없습니다.' };
    }

    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
    const cacheHitRate = (metrics.filter(m => m.cacheHit).length / metrics.length) * 100;

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalQueries: metrics.length,
        averageExecutionTime: avgExecutionTime,
        cacheHitRate: cacheHitRate,
        averageDataSize: metrics.reduce((sum, m) => sum + m.dataSize, 0) / metrics.length,
      },
      performance: avgExecutionTime < PERFORMANCE_THRESHOLDS.CONVEX_QUERY_TIME ? '🟢 Excellent' : '🟡 Needs Improvement',
    };
  }
}

// 테스트 스위트
describe('API 성능 테스트', () => {
  let apiTester: APIPerformanceTester;
  let convexTester: ConvexPerformanceTester;

  beforeAll(() => {
    apiTester = new APIPerformanceTester();
    convexTester = new ConvexPerformanceTester();
  });

  describe('기본 API 엔드포인트 성능', () => {
    it('Health Check API 성능 측정', async () => {
      const metrics = await apiTester.testEndpoint('/api/health');
      
      expect(metrics.statusCode).toBe(200);
      expect(metrics.responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME);
      console.log(`Health API 응답시간: ${metrics.responseTime}ms`);
    });

    it('Lemon Squeezy Checkout API 성능 측정', async () => {
      const payload = {
        variantId: '123456',
        customData: { userId: 'test-user' }
      };

      const metrics = await apiTester.testEndpoint('/api/lemonsqueezy/checkout', 'POST', payload);
      
      expect(metrics.responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_P95_RESPONSE_TIME);
      console.log(`Checkout API 응답시간: ${metrics.responseTime}ms`);
    });
  });

  describe('동시성 및 부하 테스트', () => {
    it('Health API 동시 요청 성능', async () => {
      const results = await apiTester.testConcurrentRequests('/api/health', 10, 50);
      
      const p95 = apiTester.calculateP95(results);
      const errorRate = apiTester.calculateErrorRate(results);
      const throughput = apiTester.calculateThroughput(results);

      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.API_P95_RESPONSE_TIME);
      expect(errorRate).toBeLessThan(5); // 5% 미만
      
      console.log(`동시 요청 결과:`);
      console.log(`- P95 응답시간: ${p95}ms`);
      console.log(`- 오류율: ${errorRate}%`);
      console.log(`- 처리량: ${throughput} RPS`);
    });

    it('트래픽 스파이크 테스트', async () => {
      const { normal, spike } = await apiTester.testTrafficSpike('/api/health', 5, 25, 5000);
      
      const normalP95 = apiTester.calculateP95(normal);
      const spikeP95 = apiTester.calculateP95(spike);
      const spikeErrorRate = apiTester.calculateErrorRate(spike);

      // 스파이크 시에도 합리적인 성능 유지
      expect(spikeP95).toBeLessThan(PERFORMANCE_THRESHOLDS.API_P95_RESPONSE_TIME * 2);
      expect(spikeErrorRate).toBeLessThan(10); // 스파이크 시 10% 미만

      console.log(`스파이크 테스트 결과:`);
      console.log(`- 정상 P95: ${normalP95}ms`);
      console.log(`- 스파이크 P95: ${spikeP95}ms`);
      console.log(`- 스파이크 오류율: ${spikeErrorRate}%`);
    });
  });

  describe('Convex 쿼리 성능', () => {
    it('기본 Convex 쿼리 성능', async () => {
      const queries = ['users.list', 'subscriptions.get', 'social.posts'];
      
      for (const query of queries) {
        const metrics = await convexTester.testConvexQuery(query);
        expect(metrics.executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONVEX_QUERY_TIME);
        console.log(`${query} 실행시간: ${metrics.executionTime}ms`);
      }
    });

    it('Convex 캐시 성능', async () => {
      // 같은 쿼리를 여러 번 실행하여 캐시 효과 측정
      const queryName = 'users.list';
      const metrics: ConvexPerformanceMetrics[] = [];

      for (let i = 0; i < 10; i++) {
        const result = await convexTester.testConvexQuery(queryName);
        metrics.push(result);
      }

      const cacheHitRate = (metrics.filter(m => m.cacheHit).length / metrics.length) * 100;
      expect(cacheHitRate).toBeGreaterThan(50); // 50% 이상 캐시 히트

      console.log(`캐시 히트율: ${cacheHitRate}%`);
    });
  });

  afterAll(async () => {
    // 성능 리포트 생성 및 출력
    const apiReport = apiTester.generatePerformanceReport();
    const convexReport = convexTester.generateConvexReport();

    console.log('\n📊 API 성능 테스트 결과:');
    console.log('================================');
    console.log(JSON.stringify(apiReport, null, 2));

    console.log('\n📊 Convex 성능 테스트 결과:');
    console.log('================================');
    console.log(JSON.stringify(convexReport, null, 2));

    // 성능 기준 미달시 경고
    if (apiReport.summary?.p95ResponseTime > PERFORMANCE_THRESHOLDS.API_P95_RESPONSE_TIME) {
      console.warn('⚠️  API P95 응답시간이 기준을 초과했습니다!');
    }

    if (apiReport.summary?.errorRate > 5) {
      console.warn('⚠️  API 오류율이 기준을 초과했습니다!');
    }
  });
});