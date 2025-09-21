/**
 * HookLabs Elite SLO 모니터링 시스템
 * Real-time SLO tracking and error budget management
 */

import { getCLS, getFID, getLCP, getTTFB, getINP } from 'web-vitals';

// Core Web Vitals SLI 수집
export class WebVitalsSLI {
  private metrics: Map<string, number[]> = new Map();

  constructor() {
    this.initializeWebVitals();
  }

  private initializeWebVitals() {
    // Largest Contentful Paint (LCP)
    getLCP((metric) => {
      this.recordMetric('lcp', metric.value);
      this.sendToAnalytics('web_vitals', {
        metric: 'lcp',
        value: metric.value,
        rating: metric.rating,
        page: window.location.pathname,
        navigation_type: metric.navigationType,
        device_memory: (navigator as any).deviceMemory
      });
    });

    // First Input Delay (FID)
    getFID((metric) => {
      this.recordMetric('fid', metric.value);
      this.sendToAnalytics('web_vitals', {
        metric: 'fid',
        value: metric.value,
        rating: metric.rating,
        page: window.location.pathname,
        navigation_type: metric.navigationType
      });
    });

    // Interaction to Next Paint (INP) - 새로운 메트릭
    getINP((metric) => {
      this.recordMetric('inp', metric.value);
      this.sendToAnalytics('web_vitals', {
        metric: 'inp',
        value: metric.value,
        rating: metric.rating,
        page: window.location.pathname,
        navigation_type: metric.navigationType
      });
    });

    // Cumulative Layout Shift (CLS)
    getCLS((metric) => {
      this.recordMetric('cls', metric.value);
      this.sendToAnalytics('web_vitals', {
        metric: 'cls',
        value: metric.value,
        rating: metric.rating,
        page: window.location.pathname,
        navigation_type: metric.navigationType
      });
    });

    // Time to First Byte (TTFB)
    getTTFB((metric) => {
      this.recordMetric('ttfb', metric.value);
      this.sendToAnalytics('web_vitals', {
        metric: 'ttfb',
        value: metric.value,
        rating: metric.rating,
        page: window.location.pathname,
        navigation_type: metric.navigationType
      });
    });
  }

  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  private sendToAnalytics(event: string, data: any) {
    // Convex analytics 엔드포인트로 전송
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: Date.now(),
        event,
        data,
        session_id: this.getSessionId(),
        user_agent: navigator.userAgent
      })
    }).catch(console.error);
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('slo_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('slo_session_id', sessionId);
    }
    return sessionId;
  }

  // SLI 계산
  calculatePageLoadSLI(thresholdMs: number): number {
    const lcpValues = this.metrics.get('lcp') || [];
    if (lcpValues.length === 0) return 100;

    const goodRequests = lcpValues.filter(value => value <= thresholdMs).length;
    return (goodRequests / lcpValues.length) * 100;
  }

  calculateInteractionSLI(thresholdMs: number): number {
    const fidValues = this.metrics.get('fid') || [];
    if (fidValues.length === 0) return 100;

    const goodInteractions = fidValues.filter(value => value <= thresholdMs).length;
    return (goodInteractions / fidValues.length) * 100;
  }
}

// API 요청 성능 모니터링
export class APISLIMonitor {
  private requests: Array<{
    endpoint: string;
    method: string;
    status: number;
    duration: number;
    timestamp: number;
  }> = [];

  constructor() {
    this.interceptFetch();
  }

  private interceptFetch() {
    const originalFetch = window.fetch;

    window.fetch = async (...args): Promise<Response> => {
      const startTime = performance.now();
      const url = args[0].toString();
      const options = args[1] || {};

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;

        this.recordRequest({
          endpoint: this.extractEndpoint(url),
          method: options.method || 'GET',
          status: response.status,
          duration,
          timestamp: Date.now()
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;

        this.recordRequest({
          endpoint: this.extractEndpoint(url),
          method: options.method || 'GET',
          status: 0, // Network error
          duration,
          timestamp: Date.now()
        });

        throw error;
      }
    };
  }

  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  private recordRequest(request: any) {
    this.requests.push(request);

    // Keep only recent requests (last 1000)
    if (this.requests.length > 1000) {
      this.requests = this.requests.slice(-1000);
    }

    // Send to analytics
    this.sendRequestMetric(request);
  }

  private sendRequestMetric(request: any) {
    fetch('/api/analytics/api-performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        session_id: this.getSessionId(),
        page: window.location.pathname
      })
    }).catch(console.error);
  }

  private getSessionId(): string {
    return sessionStorage.getItem('slo_session_id') || 'unknown';
  }

  // API SLI 계산
  calculateAvailabilitySLI(timeWindowMs: number = 5 * 60 * 1000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentRequests = this.requests.filter(req => req.timestamp >= cutoff);

    if (recentRequests.length === 0) return 100;

    const successfulRequests = recentRequests.filter(req =>
      req.status >= 200 && req.status < 500 && req.status !== 0
    );

    return (successfulRequests.length / recentRequests.length) * 100;
  }

  calculateLatencySLI(thresholdMs: number, timeWindowMs: number = 5 * 60 * 1000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentRequests = this.requests.filter(req =>
      req.timestamp >= cutoff && req.status >= 200 && req.status < 500
    );

    if (recentRequests.length === 0) return 100;

    const fastRequests = recentRequests.filter(req => req.duration <= thresholdMs);
    return (fastRequests.length / recentRequests.length) * 100;
  }

  calculateErrorRate(timeWindowMs: number = 5 * 60 * 1000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentRequests = this.requests.filter(req => req.timestamp >= cutoff);

    if (recentRequests.length === 0) return 0;

    const errorRequests = recentRequests.filter(req =>
      req.status >= 500 || req.status === 0
    );

    return (errorRequests.length / recentRequests.length) * 100;
  }
}

// Content Generation SLI 모니터링
export class ContentGenerationSLI {
  private generations: Array<{
    id: string;
    startTime: number;
    endTime?: number;
    success: boolean;
    duration?: number;
    qualityScore?: number;
    type: 'post' | 'variation' | 'persona';
  }> = [];

  startGeneration(id: string, type: 'post' | 'variation' | 'persona'): void {
    this.generations.push({
      id,
      startTime: Date.now(),
      success: false,
      type
    });
  }

  completeGeneration(id: string, success: boolean, qualityScore?: number): void {
    const generation = this.generations.find(g => g.id === id);
    if (generation) {
      generation.endTime = Date.now();
      generation.success = success;
      generation.duration = generation.endTime - generation.startTime;
      generation.qualityScore = qualityScore;

      this.sendGenerationMetric(generation);
    }
  }

  private sendGenerationMetric(generation: any) {
    fetch('/api/analytics/content-generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...generation,
        session_id: this.getSessionId()
      })
    }).catch(console.error);
  }

  private getSessionId(): string {
    return sessionStorage.getItem('slo_session_id') || 'unknown';
  }

  // Content Generation SLI 계산
  calculateSuccessRate(timeWindowMs: number = 60 * 60 * 1000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentGenerations = this.generations.filter(g =>
      g.startTime >= cutoff && g.endTime
    );

    if (recentGenerations.length === 0) return 100;

    const successfulGenerations = recentGenerations.filter(g => g.success);
    return (successfulGenerations.length / recentGenerations.length) * 100;
  }

  calculateLatencySLI(thresholdMs: number, timeWindowMs: number = 60 * 60 * 1000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentGenerations = this.generations.filter(g =>
      g.startTime >= cutoff && g.endTime && g.success && g.duration
    );

    if (recentGenerations.length === 0) return 100;

    const fastGenerations = recentGenerations.filter(g => g.duration! <= thresholdMs);
    return (fastGenerations.length / recentGenerations.length) * 100;
  }

  calculateQualitySLI(thresholdScore: number = 3.0, timeWindowMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentGenerations = this.generations.filter(g =>
      g.startTime >= cutoff && g.success && g.qualityScore !== undefined
    );

    if (recentGenerations.length === 0) return 100;

    const qualityGenerations = recentGenerations.filter(g => g.qualityScore! >= thresholdScore);
    return (qualityGenerations.length / recentGenerations.length) * 100;
  }
}

// Error Budget 추적
export class ErrorBudgetTracker {
  constructor(
    private sloTarget: number, // 99.9
    private windowDays: number = 30
  ) {}

  calculateErrorBudget(actualSLI: number): {
    totalBudget: number;
    consumed: number;
    remaining: number;
    burnRate: number;
    status: 'healthy' | 'attention' | 'warning' | 'critical' | 'exhausted';
  } {
    const totalBudgetPercent = 100 - this.sloTarget; // 0.1% for 99.9% SLO
    const consumedPercent = 100 - actualSLI;
    const remainingPercent = totalBudgetPercent - consumedPercent;
    const burnRate = consumedPercent / totalBudgetPercent;

    let status: 'healthy' | 'attention' | 'warning' | 'critical' | 'exhausted';
    if (remainingPercent <= 0) {
      status = 'exhausted';
    } else if (burnRate >= 0.9) {
      status = 'critical';
    } else if (burnRate >= 0.7) {
      status = 'warning';
    } else if (burnRate >= 0.5) {
      status = 'attention';
    } else {
      status = 'healthy';
    }

    return {
      totalBudget: totalBudgetPercent,
      consumed: consumedPercent,
      remaining: remainingPercent,
      burnRate,
      status
    };
  }

  calculateBurnRateAlert(
    currentBurnRate: number,
    window: '1h' | '6h' | '24h'
  ): boolean {
    const thresholds = {
      '1h': 14.4,  // 2% of monthly budget in 1 hour
      '6h': 3.0,   // 10% of monthly budget in 6 hours
      '24h': 1.5   // 25% of monthly budget in 24 hours
    };

    return currentBurnRate >= thresholds[window];
  }
}

// SLO Dashboard Data Provider
export class SLODashboard {
  private webVitals: WebVitalsSLI;
  private apiMonitor: APISLIMonitor;
  private contentGeneration: ContentGenerationSLI;
  private errorBudget: ErrorBudgetTracker;

  constructor() {
    this.webVitals = new WebVitalsSLI();
    this.apiMonitor = new APISLIMonitor();
    this.contentGeneration = new ContentGenerationSLI();
    this.errorBudget = new ErrorBudgetTracker(99.9, 30);
  }

  getSLOStatus(): {
    webPerformance: any;
    apiPerformance: any;
    contentGeneration: any;
    errorBudgets: any;
  } {
    const now = Date.now();

    return {
      webPerformance: {
        lcp: this.webVitals.calculatePageLoadSLI(2000), // 2s threshold
        fid: this.webVitals.calculateInteractionSLI(100), // 100ms threshold
        overall: (this.webVitals.calculatePageLoadSLI(2000) + this.webVitals.calculateInteractionSLI(100)) / 2
      },
      apiPerformance: {
        availability: this.apiMonitor.calculateAvailabilitySLI(),
        latency: this.apiMonitor.calculateLatencySLI(500), // 500ms threshold
        errorRate: this.apiMonitor.calculateErrorRate()
      },
      contentGeneration: {
        successRate: this.contentGeneration.calculateSuccessRate(),
        latency: this.contentGeneration.calculateLatencySLI(30000), // 30s threshold
        quality: this.contentGeneration.calculateQualitySLI(3.0)
      },
      errorBudgets: {
        web: this.errorBudget.calculateErrorBudget(
          (this.webVitals.calculatePageLoadSLI(2000) + this.webVitals.calculateInteractionSLI(100)) / 2
        ),
        api: this.errorBudget.calculateErrorBudget(this.apiMonitor.calculateAvailabilitySLI()),
        content: this.errorBudget.calculateErrorBudget(this.contentGeneration.calculateSuccessRate())
      }
    };
  }

  // 실시간 SLO 데이터를 Convex로 전송
  async syncToConvex() {
    const sloData = this.getSLOStatus();

    try {
      await fetch('/api/analytics/slo-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: Date.now(),
          sloData,
          session_id: this.getSessionId()
        })
      });
    } catch (error) {
      console.error('Failed to sync SLO data:', error);
    }
  }

  private getSessionId(): string {
    return sessionStorage.getItem('slo_session_id') || 'unknown';
  }

  // 주기적 동기화 시작
  startPeriodicSync(intervalMs: number = 60000) {
    setInterval(() => {
      this.syncToConvex();
    }, intervalMs);
  }
}

// Global SLO monitoring initialization
export function initializeSLOMonitoring() {
  if (typeof window !== 'undefined') {
    const dashboard = new SLODashboard();

    // 즉시 시작
    dashboard.startPeriodicSync();

    // 글로벌 액세스
    (window as any).sloMonitoring = dashboard;

    // 페이지 언로드 시 최종 데이터 전송
    window.addEventListener('beforeunload', () => {
      dashboard.syncToConvex();
    });

    console.log('🎯 SLO Monitoring initialized');
  }
}

// Usage example:
// import { initializeSLOMonitoring } from '@/monitoring/slo-monitoring';
// initializeSLOMonitoring();