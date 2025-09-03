/**
 * HookLabs Elite - Web Vitals 성능 모니터링 도구
 * Core Web Vitals 및 추가 성능 메트릭 수집과 Prometheus 연동
 */

import { getCLS, getFCP, getFID, getLCP, getTTFB, Metric } from 'web-vitals';

// Web Vitals 메트릭 타입 정의
interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  id: string;
  navigationType: string;
  url: string;
}

interface CustomPerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

// 성능 임계값 정의 (Core Web Vitals)
const WEB_VITALS_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  FID: { good: 100, poor: 300 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 }
} as const;

class WebVitalsMonitor {
  private static instance: WebVitalsMonitor;
  private webVitalsMetrics: WebVitalsMetric[] = [];
  private customMetrics: CustomPerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private isInitialized = false;
  private metricQueue: Array<{type: string, data: any}> = [];
  private batchTimer: NodeJS.Timeout | null = null;

  static getInstance(): WebVitalsMonitor {
    if (!WebVitalsMonitor.instance) {
      WebVitalsMonitor.instance = new WebVitalsMonitor();
    }
    return WebVitalsMonitor.instance;
  }

  /**
   * Web Vitals 모니터링 초기화
   */
  init() {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.initCoreWebVitals();
    this.initResourceTiming();
    this.initNavigationTiming();
    this.initLongTasks();
    this.initLayoutShift();
    this.initFirstInput();
    this.initUserTiming();
    
    this.isInitialized = true;
    console.log('[WebVitalsMonitor] Web Vitals 모니터링 초기화 완료');
  }

  /**
   * Core Web Vitals 수집
   */
  private initCoreWebVitals() {
    const reportWebVital = (metric: Metric) => {
      const rating = this.calculateRating(metric.name, metric.value);
      
      const webVitalMetric: WebVitalsMetric = {
        name: metric.name,
        value: metric.value,
        rating,
        timestamp: Date.now(),
        id: metric.id,
        navigationType: this.getNavigationType(),
        url: window.location.pathname
      };

      this.webVitalsMetrics.push(webVitalMetric);
      this.sendWebVitalToBackend(webVitalMetric);

      // Prometheus 메트릭으로 전송
      this.sendToPrometheus(webVitalMetric);
    };

    // Core Web Vitals 등록
    getCLS(reportWebVital);
    getFCP(reportWebVital);
    getFID(reportWebVital);
    getLCP(reportWebVital);
    getTTFB(reportWebVital);
  }

  /**
   * 리소스 로딩 성능 모니터링
   */
  private initResourceTiming() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // 중요한 리소스만 추적
          if (this.isImportantResource(resourceEntry.name)) {
            this.trackResourceMetric(resourceEntry);
          }
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    } catch (error) {
      console.warn('[WebVitalsMonitor] Resource timing observer 설정 실패:', error);
    }
  }

  /**
   * 네비게이션 타이밍 모니터링
   */
  private initNavigationTiming() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          this.trackNavigationMetrics(navEntry);
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', observer);
    } catch (error) {
      console.warn('[WebVitalsMonitor] Navigation timing observer 설정 실패:', error);
    }
  }

  /**
   * Long Tasks 모니터링 (50ms 이상)
   */
  private initLongTasks() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'longtask') {
            this.addCustomMetric('long_task_duration', entry.duration, {
              attribution: (entry as any).attribution?.[0]?.name || 'unknown',
              start_time: entry.startTime.toString()
            });
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    } catch (error) {
      console.warn('[WebVitalsMonitor] Long task observer 설정 실패:', error);
    }
  }

  /**
   * Layout Shift 세부 추적
   */
  private initLayoutShift() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          this.addCustomMetric('layout_shift_score', (entry as any).value, {
            had_recent_input: 'false',
            sources: JSON.stringify((entry as any).sources || [])
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('layout-shift', observer);
    } catch (error) {
      console.warn('[WebVitalsMonitor] Layout shift observer 설정 실패:', error);
    }
  }

  /**
   * First Input 세부 추적
   */
  private initFirstInput() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'first-input') {
          const fidEntry = entry as PerformanceEventTiming;
          const delay = fidEntry.processingStart - fidEntry.startTime;
          
          this.addCustomMetric('first_input_delay', delay, {
            target: (fidEntry.target as Element)?.tagName?.toLowerCase() || 'unknown',
            event_type: fidEntry.name
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('first-input', observer);
    } catch (error) {
      console.warn('[WebVitalsMonitor] First input observer 설정 실패:', error);
    }
  }

  /**
   * User Timing API 추적
   */
  private initUserTiming() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          this.addCustomMetric('user_timing_measure', entry.duration, {
            name: entry.name,
            start_time: entry.startTime.toString()
          });
        } else if (entry.entryType === 'mark') {
          this.addCustomMetric('user_timing_mark', entry.startTime, {
            name: entry.name
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['measure', 'mark'] });
      this.observers.set('user-timing', observer);
    } catch (error) {
      console.warn('[WebVitalsMonitor] User timing observer 설정 실패:', error);
    }
  }

  /**
   * 중요한 리소스인지 판별
   */
  private isImportantResource(url: string): boolean {
    const importantPatterns = [
      /\.(js|css|woff2?|ttf)$/,
      /\/api\//,
      /_next\/static/,
      /\/images\//,
      /convex/i,
      /clerk/i
    ];

    return importantPatterns.some(pattern => pattern.test(url));
  }

  /**
   * 리소스 메트릭 추적
   */
  private trackResourceMetric(entry: PerformanceResourceTiming) {
    const resourceType = this.getResourceType(entry.name);
    const loadTime = entry.responseEnd - entry.startTime;

    this.addCustomMetric('resource_load_time', loadTime, {
      resource_type: resourceType,
      url: new URL(entry.name).pathname.substring(0, 100), // URL 길이 제한
      initiator_type: entry.initiatorType
    });

    // 네트워크 관련 타이밍
    if (entry.domainLookupEnd > 0) {
      this.addCustomMetric('dns_lookup_time', 
        entry.domainLookupEnd - entry.domainLookupStart, {
          resource_type: resourceType
        }
      );
    }

    if (entry.connectEnd > 0) {
      this.addCustomMetric('tcp_connect_time', 
        entry.connectEnd - entry.connectStart, {
          resource_type: resourceType
        }
      );
    }

    if (entry.secureConnectionStart > 0) {
      this.addCustomMetric('tls_handshake_time', 
        entry.connectEnd - entry.secureConnectionStart, {
          resource_type: resourceType
        }
      );
    }
  }

  /**
   * 네비게이션 메트릭 추적
   */
  private trackNavigationMetrics(entry: PerformanceNavigationTiming) {
    // 전체 페이지 로드 시간
    const pageLoadTime = entry.loadEventEnd - entry.navigationStart;
    this.addCustomMetric('page_load_time', pageLoadTime);

    // DOM 관련 타이밍
    const domContentLoadedTime = entry.domContentLoadedEventEnd - entry.navigationStart;
    this.addCustomMetric('dom_content_loaded_time', domContentLoadedTime);

    const domProcessingTime = entry.domComplete - entry.domLoading;
    this.addCustomMetric('dom_processing_time', domProcessingTime);

    // 네트워크 관련 타이밍
    const serverResponseTime = entry.responseStart - entry.requestStart;
    this.addCustomMetric('server_response_time', serverResponseTime);

    const transferTime = entry.responseEnd - entry.responseStart;
    this.addCustomMetric('transfer_time', transferTime);

    // 리디렉션 시간
    if (entry.redirectEnd > 0) {
      const redirectTime = entry.redirectEnd - entry.redirectStart;
      this.addCustomMetric('redirect_time', redirectTime, {
        redirect_count: entry.redirectCount.toString()
      });
    }
  }

  /**
   * 커스텀 메트릭 추가
   */
  addCustomMetric(name: string, value: number, labels?: Record<string, string>) {
    const metric: CustomPerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      labels: {
        ...labels,
        url: window.location.pathname,
        user_agent: navigator.userAgent.substring(0, 100)
      }
    };

    this.customMetrics.push(metric);
    
    // 메트릭 버퍼 관리
    if (this.customMetrics.length > 1000) {
      this.customMetrics = this.customMetrics.slice(-500);
    }

    this.queueMetricForBatch('custom', metric);
  }

  /**
   * 사용자 정의 타이밍 측정 시작
   */
  markStart(name: string) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  /**
   * 사용자 정의 타이밍 측정 종료
   */
  markEnd(name: string, labels?: Record<string, string>) {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);

        const measure = performance.getEntriesByName(name)[0];
        if (measure) {
          this.addCustomMetric('user_timing', measure.duration, {
            timing_name: name,
            ...labels
          });
        }
      } catch (error) {
        console.warn(`[WebVitalsMonitor] Timing measurement failed for ${name}:`, error);
      }
    }
  }

  /**
   * 페이지 성능 점수 계산
   */
  calculatePerformanceScore(): number {
    const latestMetrics = this.getLatestWebVitals();
    const scores = Object.values(latestMetrics).map(metric => {
      switch (metric.rating) {
        case 'good': return 100;
        case 'needs-improvement': return 60;
        case 'poor': return 20;
        default: return 0;
      }
    });

    return scores.length > 0 ? 
      Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  /**
   * 성능 등급 계산
   */
  private calculateRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = WEB_VITALS_THRESHOLDS[metricName as keyof typeof WEB_VITALS_THRESHOLDS];
    if (!thresholds) return 'good';

    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * 네비게이션 타입 확인
   */
  private getNavigationType(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    
    const connection = (navigator as any).connection;
    if (connection) {
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  /**
   * 리소스 타입 분류
   */
  private getResourceType(url: string): string {
    if (url.includes('/api/')) return 'api';
    if (/\.(js|ts)$/.test(url)) return 'script';
    if (/\.(css)$/.test(url)) return 'stylesheet';
    if (/\.(woff2?|ttf|eot)$/.test(url)) return 'font';
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/.test(url)) return 'image';
    if (url.includes('_next/static')) return 'nextjs-static';
    return 'other';
  }

  /**
   * 최신 Web Vitals 메트릭 가져오기
   */
  private getLatestWebVitals(): Record<string, WebVitalsMetric> {
    const latest: Record<string, WebVitalsMetric> = {};
    
    for (const metric of this.webVitalsMetrics) {
      if (!latest[metric.name] || metric.timestamp > latest[metric.name].timestamp) {
        latest[metric.name] = metric;
      }
    }

    return latest;
  }

  /**
   * Web Vital을 백엔드로 전송
   */
  private async sendWebVitalToBackend(metric: WebVitalsMetric) {
    this.queueMetricForBatch('web-vitals', metric);
  }

  /**
   * Prometheus로 메트릭 전송
   */
  private async sendToPrometheus(metric: WebVitalsMetric) {
    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricName: `web_vitals_${metric.name.toLowerCase()}`,
          metricType: 'histogram',
          value: metric.value,
          labels: {
            rating: metric.rating,
            navigation_type: metric.navigationType,
            url: metric.url
          }
        })
      });
    } catch (error) {
      console.warn('[WebVitalsMonitor] Prometheus 메트릭 전송 실패:', error);
    }
  }

  /**
   * 메트릭 배치 전송 큐 관리
   */
  private queueMetricForBatch(type: string, data: any) {
    this.metricQueue.push({ type, data });

    if (this.metricQueue.length >= 10) {
      this.flushMetricQueue();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushMetricQueue();
      }, 5000);
    }
  }

  /**
   * 메트릭 큐 플러시
   */
  private async flushMetricQueue() {
    if (this.metricQueue.length === 0) return;

    const batch = [...this.metricQueue];
    this.metricQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const response = await fetch('/api/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          metrics: batch,
          timestamp: Date.now(),
          session_id: this.getSessionId()
        })
      });

      if (!response.ok) {
        console.warn('[WebVitalsMonitor] Web Vitals 전송 실패:', response.status);
      }
    } catch (error) {
      console.error('[WebVitalsMonitor] Web Vitals 전송 오류:', error);
      
      // 실패한 메트릭을 다시 큐에 추가 (최대 재시도 제한)
      if (batch.length < 50) {
        this.metricQueue.unshift(...batch);
      }
    }
  }

  /**
   * 세션 ID 생성/가져오기
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('webvitals-session-id');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('webvitals-session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * 성능 리포트 생성
   */
  generateReport() {
    const latestWebVitals = this.getLatestWebVitals();
    const performanceScore = this.calculatePerformanceScore();
    
    const recentCustomMetrics = this.customMetrics.filter(
      m => m.timestamp > Date.now() - 300000 // 최근 5분
    );

    return {
      timestamp: Date.now(),
      performanceScore,
      webVitals: latestWebVitals,
      customMetrics: recentCustomMetrics.length,
      summary: {
        totalWebVitals: this.webVitalsMetrics.length,
        totalCustomMetrics: this.customMetrics.length,
        sessionId: this.getSessionId(),
        url: window.location.href
      }
    };
  }

  /**
   * 정리 작업
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // 남은 메트릭 전송
    if (this.metricQueue.length > 0) {
      this.flushMetricQueue();
    }
  }
}

// 전역 인스턴스
export const webVitalsMonitor = WebVitalsMonitor.getInstance();

// React Hook
export function useWebVitals() {
  return {
    markStart: webVitalsMonitor.markStart.bind(webVitalsMonitor),
    markEnd: webVitalsMonitor.markEnd.bind(webVitalsMonitor),
    addCustomMetric: webVitalsMonitor.addCustomMetric.bind(webVitalsMonitor),
    calculatePerformanceScore: webVitalsMonitor.calculatePerformanceScore.bind(webVitalsMonitor),
    generateReport: webVitalsMonitor.generateReport.bind(webVitalsMonitor)
  };
}

export default WebVitalsMonitor;