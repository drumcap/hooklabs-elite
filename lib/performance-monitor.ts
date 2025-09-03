/**
 * HookLabs Elite 성능 모니터링 유틸리티
 * 
 * 이 모듈은 런타임 성능 메트릭을 수집하고 분석합니다:
 * - CPU 사용률 추적
 * - 메모리 누수 감지
 * - API 응답 시간 측정
 * - Convex 쿼리 성능 모니터링
 * - 사용자 상호작용 지연시간 측정
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface CPUMetric {
  usage: number;
  timestamp: number;
}

export interface MemoryMetric {
  heapUsed: number;
  heapTotal: number;
  external: number;
  timestamp: number;
}

export interface APIMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
  error?: string;
}

export interface ConvexQueryMetric {
  queryName: string;
  executionTime: number;
  resultSize: number;
  timestamp: number;
  userId?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private cpuHistory: CPUMetric[] = [];
  private memoryHistory: MemoryMetric[] = [];
  private apiHistory: APIMetric[] = [];
  private convexHistory: ConvexQueryMetric[] = [];
  private observers: Map<string, (metric: any) => void> = new Map();
  private isMonitoring = false;

  constructor() {
    this.setupPerformanceObserver();
  }

  /**
   * 모니터링 시작
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // CPU 모니터링 (Node.js 환경에서만)
    if (typeof process !== 'undefined') {
      this.startCPUMonitoring();
    }
    
    // 메모리 모니터링
    this.startMemoryMonitoring();
    
    console.log('🔍 성능 모니터링 시작됨');
  }

  /**
   * 모니터링 중단
   */
  stop() {
    this.isMonitoring = false;
    console.log('⏹️ 성능 모니터링 중단됨');
  }

  /**
   * Performance Observer 설정 (브라우저 환경)
   */
  private setupPerformanceObserver() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      // 네트워크 요청 모니터링
      const networkObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
            this.recordAPIMetric({
              endpoint: entry.name,
              method: 'GET',
              responseTime: entry.duration,
              statusCode: 200,
              timestamp: Date.now()
            });
          }
        }
      });

      networkObserver.observe({ entryTypes: ['navigation', 'resource'] });

      // Long Task 모니터링 (50ms 이상)
      if ('TaskAttributionTiming' in window) {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: 'long-task',
              value: entry.duration,
              timestamp: Date.now(),
              metadata: {
                startTime: entry.startTime,
                attribution: (entry as any).attribution
              }
            });
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
      }

      // Layout Shift 모니터링 (CLS)
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: 'cumulative-layout-shift',
            value: (entry as any).value,
            timestamp: Date.now(),
            metadata: {
              hadRecentInput: (entry as any).hadRecentInput,
              sources: (entry as any).sources
            }
          });
        }
      });

      clsObserver.observe({ entryTypes: ['layout-shift'] });

    } catch (error) {
      console.warn('Performance Observer 설정 실패:', error);
    }
  }

  /**
   * CPU 모니터링 시작 (Node.js 전용)
   */
  private startCPUMonitoring() {
    if (typeof process === 'undefined') return;

    let lastCpuUsage = process.cpuUsage();
    let lastTime = process.hrtime.bigint();

    const interval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        return;
      }

      const currentCpuUsage = process.cpuUsage(lastCpuUsage);
      const currentTime = process.hrtime.bigint();
      const timeDiff = Number(currentTime - lastTime) / 1e9; // 초 단위 변환

      const cpuPercent = ((currentCpuUsage.user + currentCpuUsage.system) / 1000) / timeDiff / 10;

      this.cpuHistory.push({
        usage: cpuPercent,
        timestamp: Date.now()
      });

      // 최근 100개만 유지
      if (this.cpuHistory.length > 100) {
        this.cpuHistory.shift();
      }

      lastCpuUsage = process.cpuUsage();
      lastTime = currentTime;

      // 높은 CPU 사용률 알림
      if (cpuPercent > 80) {
        this.notifyObservers('high-cpu', { usage: cpuPercent });
      }

    }, 5000); // 5초마다
  }

  /**
   * 메모리 모니터링 시작
   */
  private startMemoryMonitoring() {
    const interval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        return;
      }

      let memoryInfo;
      
      if (typeof process !== 'undefined') {
        // Node.js 환경
        const memUsage = process.memoryUsage();
        memoryInfo = {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          timestamp: Date.now()
        };
      } else if (typeof performance !== 'undefined' && (performance as any).memory) {
        // Chrome 브라우저 환경
        const mem = (performance as any).memory;
        memoryInfo = {
          heapUsed: mem.usedJSHeapSize,
          heapTotal: mem.totalJSHeapSize,
          external: mem.jsHeapSizeLimit - mem.totalJSHeapSize,
          timestamp: Date.now()
        };
      } else {
        return; // 메모리 정보를 얻을 수 없음
      }

      this.memoryHistory.push(memoryInfo);

      // 최근 100개만 유지
      if (this.memoryHistory.length > 100) {
        this.memoryHistory.shift();
      }

      // 메모리 누수 감지 (힙 사용률이 90% 이상)
      const heapRatio = memoryInfo.heapUsed / memoryInfo.heapTotal;
      if (heapRatio > 0.9) {
        this.notifyObservers('memory-leak', { ratio: heapRatio, ...memoryInfo });
      }

    }, 10000); // 10초마다
  }

  /**
   * 일반 메트릭 기록
   */
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // 최근 1000개만 유지
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    this.notifyObservers('metric-recorded', metric);
  }

  /**
   * API 메트릭 기록
   */
  recordAPIMetric(metric: APIMetric) {
    this.apiHistory.push(metric);
    
    // 최근 500개만 유지
    if (this.apiHistory.length > 500) {
      this.apiHistory.shift();
    }

    // 느린 API 알림 (3초 이상)
    if (metric.responseTime > 3000) {
      this.notifyObservers('slow-api', metric);
    }

    this.notifyObservers('api-metric', metric);
  }

  /**
   * Convex 쿼리 메트릭 기록
   */
  recordConvexQuery(metric: ConvexQueryMetric) {
    this.convexHistory.push(metric);
    
    // 최근 500개만 유지
    if (this.convexHistory.length > 500) {
      this.convexHistory.shift();
    }

    // 느린 쿼리 알림 (2초 이상)
    if (metric.executionTime > 2000) {
      this.notifyObservers('slow-query', metric);
    }

    this.notifyObservers('convex-metric', metric);
  }

  /**
   * Core Web Vitals 측정
   */
  measureCoreWebVitals(): Promise<{ lcp: number; fid: number; cls: number }> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve({ lcp: 0, fid: 0, cls: 0 });
        return;
      }

      let lcp = 0;
      let fid = 0;
      let cls = 0;

      // LCP (Largest Contentful Paint)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcp = lastEntry.startTime;
          lcpObserver.disconnect();
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP 측정 실패:', e);
      }

      // FID는 실제 사용자 상호작용이 필요하므로 시뮬레이션
      fid = 0; // 실제 구현에서는 first-input 이벤트 리스너 필요

      // CLS (Cumulative Layout Shift)
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS 측정 실패:', e);
      }

      // 3초 후 결과 반환
      setTimeout(() => {
        resolve({ lcp, fid, cls });
      }, 3000);
    });
  }

  /**
   * 성능 리포트 생성
   */
  generateReport() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;

    // 최근 1분간 메트릭 필터링
    const recentMetrics = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
    const recentAPI = this.apiHistory.filter(m => m.timestamp > fiveMinutesAgo);
    const recentConvex = this.convexHistory.filter(m => m.timestamp > fiveMinutesAgo);
    const recentMemory = this.memoryHistory.filter(m => m.timestamp > oneMinuteAgo);
    const recentCPU = this.cpuHistory.filter(m => m.timestamp > oneMinuteAgo);

    // 통계 계산
    const avgAPIResponseTime = recentAPI.length > 0 
      ? recentAPI.reduce((sum, api) => sum + api.responseTime, 0) / recentAPI.length 
      : 0;

    const avgConvexExecutionTime = recentConvex.length > 0
      ? recentConvex.reduce((sum, query) => sum + query.executionTime, 0) / recentConvex.length
      : 0;

    const avgCPUUsage = recentCPU.length > 0
      ? recentCPU.reduce((sum, cpu) => sum + cpu.usage, 0) / recentCPU.length
      : 0;

    const currentMemory = recentMemory[recentMemory.length - 1];

    return {
      timestamp: now,
      summary: {
        totalMetrics: this.metrics.length,
        activeMonitoring: this.isMonitoring,
        avgAPIResponseTime: Math.round(avgAPIResponseTime),
        avgConvexExecutionTime: Math.round(avgConvexExecutionTime),
        avgCPUUsage: Math.round(avgCPUUsage * 100) / 100,
        currentMemoryUsage: currentMemory ? {
          heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024 * 100) / 100, // MB
          heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024 * 100) / 100, // MB
          heapRatio: Math.round(currentMemory.heapUsed / currentMemory.heapTotal * 10000) / 100 // %
        } : null
      },
      details: {
        recentMetrics: recentMetrics.length,
        recentAPI: recentAPI.length,
        recentConvex: recentConvex.length,
        slowAPIs: recentAPI.filter(api => api.responseTime > 1000).length,
        slowQueries: recentConvex.filter(query => query.executionTime > 1000).length,
        errorAPIs: recentAPI.filter(api => api.statusCode >= 400).length
      },
      trends: {
        memoryTrend: this.calculateTrend(recentMemory.map(m => m.heapUsed)),
        cpuTrend: this.calculateTrend(recentCPU.map(c => c.usage)),
        apiTrend: this.calculateTrend(recentAPI.map(a => a.responseTime))
      }
    };
  }

  /**
   * 트렌드 계산 (증가/감소/안정)
   */
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const first = values.slice(0, Math.ceil(values.length / 2));
    const second = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = first.reduce((sum, v) => sum + v, 0) / first.length;
    const secondAvg = second.reduce((sum, v) => sum + v, 0) / second.length;
    
    const diff = (secondAvg - firstAvg) / firstAvg;
    
    if (diff > 0.1) return 'increasing';
    if (diff < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * 관찰자 등록
   */
  subscribe(event: string, callback: (data: any) => void) {
    this.observers.set(event, callback);
  }

  /**
   * 관찰자 제거
   */
  unsubscribe(event: string) {
    this.observers.delete(event);
  }

  /**
   * 관찰자에게 알림
   */
  private notifyObservers(event: string, data: any) {
    const callback = this.observers.get(event);
    if (callback) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Observer callback error for ${event}:`, error);
      }
    }
  }

  /**
   * 메트릭 히스토리 조회
   */
  getMetrics(type?: string, timeRange?: { start: number; end: number }) {
    let metrics = this.metrics;
    
    if (type) {
      metrics = metrics.filter(m => m.name === type);
    }
    
    if (timeRange) {
      metrics = metrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }
    
    return metrics;
  }

  /**
   * API 히스토리 조회
   */
  getAPIMetrics(timeRange?: { start: number; end: number }) {
    if (!timeRange) return this.apiHistory;
    
    return this.apiHistory.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  /**
   * Convex 쿼리 히스토리 조회
   */
  getConvexMetrics(timeRange?: { start: number; end: number }) {
    if (!timeRange) return this.convexHistory;
    
    return this.convexHistory.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  /**
   * 정리
   */
  cleanup() {
    this.stop();
    this.metrics = [];
    this.apiHistory = [];
    this.convexHistory = [];
    this.memoryHistory = [];
    this.cpuHistory = [];
    this.observers.clear();
  }
}

// 싱글톤 인스턴스
export const performanceMonitor = new PerformanceMonitor();

// 자동 시작 (브라우저 환경에서만)
if (typeof window !== 'undefined') {
  performanceMonitor.start();
}

export default PerformanceMonitor;