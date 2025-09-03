/**
 * 성능 메트릭 수집 및 분석 도구
 */

// Core Web Vitals 메트릭
export interface WebVitalsMetrics {
  LCP: number | null; // Largest Contentful Paint
  FID: number | null; // First Input Delay
  CLS: number | null; // Cumulative Layout Shift
  FCP: number | null; // First Contentful Paint
  TTFB: number | null; // Time to First Byte
  INP: number | null; // Interaction to Next Paint
}

// 메모리 사용량 메트릭
export interface MemoryMetrics {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

// API 응답 시간 메트릭
export interface APIMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
}

// 번들 크기 메트릭
export interface BundleMetrics {
  mainBundle: number;
  vendorBundle: number;
  totalSize: number;
  chunkSizes: Record<string, number>;
}

// 실시간 업데이트 메트릭
export interface RealtimeMetrics {
  connectionLatency: number;
  messageLatency: number;
  reconnectCount: number;
  activeConnections: number;
}

// 캐시 효율성 메트릭
export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  staleWhileRevalidate: number;
  totalRequests: number;
}

class PerformanceMonitor {
  private metrics: {
    webVitals: WebVitalsMetrics;
    memory: MemoryMetrics;
    api: APIMetrics[];
    realtime: RealtimeMetrics;
    cache: CacheMetrics;
  };

  constructor() {
    this.metrics = {
      webVitals: {
        LCP: null,
        FID: null,
        CLS: null,
        FCP: null,
        TTFB: null,
        INP: null,
      },
      memory: {},
      api: [],
      realtime: {
        connectionLatency: 0,
        messageLatency: 0,
        reconnectCount: 0,
        activeConnections: 0,
      },
      cache: {
        hitRate: 0,
        missRate: 0,
        staleWhileRevalidate: 0,
        totalRequests: 0,
      },
    };

    // 브라우저 환경에서만 초기화
    if (typeof window !== 'undefined') {
      this.initializeWebVitals();
      this.initializeMemoryMonitoring();
      this.initializeResourceTiming();
    }
  }

  // Web Vitals 초기화
  private async initializeWebVitals() {
    try {
      const { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } = await import('web-vitals');
      
      onCLS((metric) => {
        this.metrics.webVitals.CLS = metric.value;
        this.reportMetric('CLS', metric.value);
      });
      
      onFID((metric) => {
        this.metrics.webVitals.FID = metric.value;
        this.reportMetric('FID', metric.value);
      });
      
      onLCP((metric) => {
        this.metrics.webVitals.LCP = metric.value;
        this.reportMetric('LCP', metric.value);
      });
      
      onFCP((metric) => {
        this.metrics.webVitals.FCP = metric.value;
        this.reportMetric('FCP', metric.value);
      });
      
      onTTFB((metric) => {
        this.metrics.webVitals.TTFB = metric.value;
        this.reportMetric('TTFB', metric.value);
      });
      
      onINP((metric) => {
        this.metrics.webVitals.INP = metric.value;
        this.reportMetric('INP', metric.value);
      });
    } catch (error) {
      console.error('Failed to initialize Web Vitals:', error);
    }
  }

  // 메모리 모니터링 초기화
  private initializeMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memory = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        };
        
        // 메모리 사용률이 90% 이상일 경우 경고
        const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        if (usage > 0.9) {
          console.warn('High memory usage detected:', `${(usage * 100).toFixed(2)}%`);
        }
      }, 10000); // 10초마다 체크
    }
  }

  // 리소스 타이밍 모니터링
  private initializeResourceTiming() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            // API 요청 추적
            if (resourceEntry.name.includes('/api/')) {
              this.trackAPICall({
                endpoint: resourceEntry.name,
                method: 'GET', // 실제로는 fetch interceptor로 추적해야 함
                responseTime: resourceEntry.responseEnd - resourceEntry.startTime,
                statusCode: 200, // 실제로는 fetch interceptor로 추적해야 함
                timestamp: new Date(),
              });
            }
          }
        }
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  }

  // API 호출 추적
  public trackAPICall(metrics: APIMetrics) {
    this.metrics.api.push(metrics);
    
    // 최근 100개만 유지
    if (this.metrics.api.length > 100) {
      this.metrics.api = this.metrics.api.slice(-100);
    }
    
    // 느린 API 경고 (1초 이상)
    if (metrics.responseTime > 1000) {
      console.warn(`Slow API response: ${metrics.endpoint} took ${metrics.responseTime}ms`);
    }
  }

  // 실시간 연결 메트릭 업데이트
  public updateRealtimeMetrics(metrics: Partial<RealtimeMetrics>) {
    this.metrics.realtime = {
      ...this.metrics.realtime,
      ...metrics,
    };
  }

  // 캐시 메트릭 업데이트
  public updateCacheMetrics(hit: boolean) {
    this.metrics.cache.totalRequests++;
    
    if (hit) {
      this.metrics.cache.hitRate = 
        ((this.metrics.cache.hitRate * (this.metrics.cache.totalRequests - 1)) + 1) / 
        this.metrics.cache.totalRequests;
    } else {
      this.metrics.cache.missRate = 
        ((this.metrics.cache.missRate * (this.metrics.cache.totalRequests - 1)) + 1) / 
        this.metrics.cache.totalRequests;
    }
  }

  // 메트릭 리포팅
  private reportMetric(name: string, value: number) {
    // 개발 환경에서는 콘솔에 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}`);
    }
    
    // 프로덕션에서는 분석 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      // Google Analytics, Mixpanel 등으로 전송
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'web_vitals', {
          metric_name: name,
          metric_value: value,
        });
      }
    }
  }

  // 현재 메트릭 가져오기
  public getMetrics() {
    return this.metrics;
  }

  // 성능 점수 계산
  public calculatePerformanceScore(): number {
    const { webVitals } = this.metrics;
    let score = 100;
    
    // LCP 점수 (2.5초 이하 좋음, 4초 이상 나쁨)
    if (webVitals.LCP !== null) {
      if (webVitals.LCP > 4000) score -= 30;
      else if (webVitals.LCP > 2500) score -= 15;
    }
    
    // FID 점수 (100ms 이하 좋음, 300ms 이상 나쁨)
    if (webVitals.FID !== null) {
      if (webVitals.FID > 300) score -= 20;
      else if (webVitals.FID > 100) score -= 10;
    }
    
    // CLS 점수 (0.1 이하 좋음, 0.25 이상 나쁨)
    if (webVitals.CLS !== null) {
      if (webVitals.CLS > 0.25) score -= 20;
      else if (webVitals.CLS > 0.1) score -= 10;
    }
    
    // INP 점수 (200ms 이하 좋음, 500ms 이상 나쁨)
    if (webVitals.INP !== null) {
      if (webVitals.INP > 500) score -= 15;
      else if (webVitals.INP > 200) score -= 7;
    }
    
    // 캐시 효율성 (70% 이상 좋음)
    if (this.metrics.cache.hitRate < 0.7 && this.metrics.cache.totalRequests > 10) {
      score -= 10;
    }
    
    return Math.max(0, score);
  }

  // 성능 보고서 생성
  public generateReport() {
    const score = this.calculatePerformanceScore();
    const { webVitals, memory, api, realtime, cache } = this.metrics;
    
    // API 평균 응답 시간 계산
    const avgAPIResponseTime = api.length > 0
      ? api.reduce((sum, m) => sum + m.responseTime, 0) / api.length
      : 0;
    
    return {
      score,
      webVitals,
      memory: {
        ...memory,
        usagePercentage: memory.usedJSHeapSize && memory.jsHeapSizeLimit
          ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
          : 0,
      },
      api: {
        averageResponseTime: avgAPIResponseTime,
        slowestEndpoints: api
          .sort((a, b) => b.responseTime - a.responseTime)
          .slice(0, 5)
          .map(m => ({
            endpoint: m.endpoint,
            responseTime: m.responseTime,
          })),
      },
      realtime,
      cache: {
        ...cache,
        effectiveness: cache.hitRate * 100,
      },
      recommendations: this.generateRecommendations(),
    };
  }

  // 개선 권장사항 생성
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const { webVitals, cache, api } = this.metrics;
    
    // LCP 개선
    if (webVitals.LCP && webVitals.LCP > 2500) {
      recommendations.push(
        '⚡ LCP 개선: 이미지 최적화, 중요 리소스 사전 로드, 서버 응답 시간 단축'
      );
    }
    
    // FID 개선
    if (webVitals.FID && webVitals.FID > 100) {
      recommendations.push(
        '🎯 FID 개선: JavaScript 실행 시간 단축, 코드 분할, 메인 스레드 작업 최소화'
      );
    }
    
    // CLS 개선
    if (webVitals.CLS && webVitals.CLS > 0.1) {
      recommendations.push(
        '📐 CLS 개선: 이미지/광고에 크기 명시, 동적 콘텐츠 삽입 시 레이아웃 예약'
      );
    }
    
    // 캐시 개선
    if (cache.hitRate < 0.7 && cache.totalRequests > 10) {
      recommendations.push(
        '💾 캐싱 개선: 적절한 캐시 헤더 설정, CDN 활용, 브라우저 캐싱 최적화'
      );
    }
    
    // API 개선
    const avgResponseTime = api.length > 0
      ? api.reduce((sum, m) => sum + m.responseTime, 0) / api.length
      : 0;
    
    if (avgResponseTime > 500) {
      recommendations.push(
        '🚀 API 최적화: 데이터베이스 쿼리 최적화, 페이지네이션 구현, 응답 압축'
      );
    }
    
    // 메모리 개선
    if (this.metrics.memory.usedJSHeapSize && this.metrics.memory.jsHeapSizeLimit) {
      const usage = this.metrics.memory.usedJSHeapSize / this.metrics.memory.jsHeapSizeLimit;
      if (usage > 0.7) {
        recommendations.push(
          '🧹 메모리 최적화: 메모리 누수 점검, 불필요한 객체 참조 제거, 이벤트 리스너 정리'
        );
      }
    }
    
    return recommendations;
  }
}

// 싱글톤 인스턴스
export const performanceMonitor = new PerformanceMonitor();

// Fetch Interceptor for API tracking
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const startTime = performance.now();
    const [resource, config] = args;
    const method = config?.method || 'GET';
    
    try {
      const response = await originalFetch.apply(this, args);
      const endTime = performance.now();
      
      // API 요청인 경우 추적
      if (typeof resource === 'string' && resource.includes('/api/')) {
        performanceMonitor.trackAPICall({
          endpoint: resource,
          method,
          responseTime: endTime - startTime,
          statusCode: response.status,
          timestamp: new Date(),
        });
      }
      
      return response;
    } catch (error) {
      const endTime = performance.now();
      
      // 실패한 요청도 추적
      if (typeof resource === 'string' && resource.includes('/api/')) {
        performanceMonitor.trackAPICall({
          endpoint: resource,
          method,
          responseTime: endTime - startTime,
          statusCode: 0, // 네트워크 에러
          timestamp: new Date(),
        });
      }
      
      throw error;
    }
  };
}