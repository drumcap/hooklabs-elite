/**
 * 모니터링 및 관측성 시스템
 * - Sentry 에러 추적
 * - 성능 메트릭 수집
 * - 커스텀 이벤트 로깅
 * - 대시보드 메트릭
 */

import * as Sentry from '@sentry/nextjs';
import { Analytics } from '@vercel/analytics/react';

/**
 * Sentry 설정 초기화
 */
export function initializeMonitoring() {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      
      // 환경 설정
      environment: process.env.NEXT_PUBLIC_APP_ENV || 'production',
      release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      
      // 샘플링 비율
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: 0.1,
      
      // 성능 모니터링
      integrations: [
        new Sentry.BrowserTracing({
          // 라우터 추적
          routingInstrumentation: Sentry.nextRouterInstrumentation,
          
          // 네트워크 요청 추적
          traceFetch: true,
          traceXHR: true,
          
          // 사용자 상호작용 추적
          enableLongTask: true,
          enableInp: true,
        }),
        
        // Replay 통합 (에러 재현)
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
          sampleRate: 0.1,
          errorSampleRate: 1.0,
        }),
      ],
      
      // 개인정보 보호
      beforeSend: (event, hint) => {
        // 민감한 데이터 필터링
        if (event.request?.data) {
          // 비밀번호, 토큰 등 마스킹
          event.request.data = filterSensitiveData(event.request.data);
        }
        
        if (event.user) {
          // 사용자 정보 마스킹
          delete event.user.email;
          delete event.user.ip_address;
        }
        
        return event;
      },
      
      // 에러 필터링
      ignoreErrors: [
        // 브라우저 확장 프로그램 에러
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded',
        'Script error.',
        
        // 네트워크 에러 (일시적)
        'NetworkError',
        'Failed to fetch',
        'Load failed',
        
        // 사용자 취소 액션
        'AbortError',
        'The user aborted a request',
      ],
    });
  }
}

/**
 * 민감한 데이터 필터링
 */
function filterSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth',
    'authorization', 'cookie', 'session', 'csrf',
    'apiKey', 'accessToken', 'refreshToken', 'clientSecret'
  ];
  
  const filtered = { ...data };
  
  for (const key of Object.keys(filtered)) {
    if (sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive.toLowerCase())
    )) {
      filtered[key] = '[FILTERED]';
    } else if (typeof filtered[key] === 'object') {
      filtered[key] = filterSensitiveData(filtered[key]);
    }
  }
  
  return filtered;
}

/**
 * 커스텀 메트릭 수집기
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Map<string, { value: number; timestamp: number }> = new Map();
  private timers: Map<string, number> = new Map();

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * 카운터 증가
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const current = this.metrics.get(name)?.value || 0;
    this.metrics.set(name, {
      value: current + value,
      timestamp: Date.now(),
    });

    // Sentry에 메트릭 전송
    Sentry.addBreadcrumb({
      category: 'metric',
      message: `${name}: ${current + value}`,
      data: tags,
      level: 'info',
    });

    // 개발 환경에서는 콘솔에 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(`[METRIC] ${name}: ${current + value}`, tags);
    }
  }

  /**
   * 게이지 설정
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.set(name, {
      value,
      timestamp: Date.now(),
    });

    Sentry.addBreadcrumb({
      category: 'metric',
      message: `${name}: ${value}`,
      data: tags,
      level: 'info',
    });
  }

  /**
   * 타이머 시작
   */
  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  /**
   * 타이머 종료 및 측정
   */
  endTimer(name: string, tags?: Record<string, string>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer ${name} not found`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);

    this.metrics.set(`${name}_duration`, {
      value: duration,
      timestamp: Date.now(),
    });

    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${name} completed in ${duration}ms`,
      data: tags,
      level: 'info',
    });

    return duration;
  }

  /**
   * 히스토그램 (분포 측정)
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const bucketSize = this.getBucketSize(value);
    const bucketName = `${name}_bucket_${bucketSize}`;
    
    this.increment(bucketName, 1, tags);
  }

  /**
   * 버킷 크기 계산
   */
  private getBucketSize(value: number): string {
    if (value < 10) return '0-10';
    if (value < 50) return '10-50';
    if (value < 100) return '50-100';
    if (value < 500) return '100-500';
    if (value < 1000) return '500-1000';
    return '1000+';
  }

  /**
   * 모든 메트릭 조회
   */
  getAllMetrics(): Record<string, { value: number; timestamp: number }> {
    const result: Record<string, { value: number; timestamp: number }> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 메트릭 초기화
   */
  reset(): void {
    this.metrics.clear();
    this.timers.clear();
  }
}

/**
 * 애플리케이션 메트릭
 */
export class AppMetrics {
  private static metrics = MetricsCollector.getInstance();

  // 사용자 액션 메트릭
  static trackUserAction(action: string, userId?: string): void {
    this.metrics.increment('user_actions', 1, {
      action,
      userId: userId || 'anonymous',
    });
  }

  // API 요청 메트릭
  static trackAPIRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ): void {
    this.metrics.increment('api_requests', 1, {
      endpoint,
      method,
      status: statusCode.toString(),
    });

    this.metrics.histogram('api_duration', duration, {
      endpoint,
      method,
    });

    if (statusCode >= 400) {
      this.metrics.increment('api_errors', 1, {
        endpoint,
        method,
        status: statusCode.toString(),
      });
    }
  }

  // 소셜 미디어 게시물 메트릭
  static trackSocialPost(
    platform: string,
    userId: string,
    success: boolean
  ): void {
    this.metrics.increment('social_posts', 1, {
      platform,
      userId,
      status: success ? 'success' : 'failed',
    });

    if (success) {
      this.metrics.increment('social_posts_success', 1, { platform });
    } else {
      this.metrics.increment('social_posts_failed', 1, { platform });
    }
  }

  // AI 생성 메트릭
  static trackAIGeneration(
    type: string,
    model: string,
    tokensUsed: number,
    success: boolean,
    duration: number
  ): void {
    this.metrics.increment('ai_generations', 1, {
      type,
      model,
      status: success ? 'success' : 'failed',
    });

    this.metrics.gauge('ai_tokens_used', tokensUsed, { type, model });
    this.metrics.histogram('ai_generation_duration', duration, { type, model });

    if (!success) {
      this.metrics.increment('ai_generation_errors', 1, { type, model });
    }
  }

  // 결제 메트릭
  static trackPayment(
    amount: number,
    currency: string,
    success: boolean,
    paymentMethod?: string
  ): void {
    this.metrics.increment('payments', 1, {
      currency,
      status: success ? 'success' : 'failed',
      paymentMethod: paymentMethod || 'unknown',
    });

    if (success) {
      this.metrics.gauge('revenue', amount, { currency });
    }
  }

  // 성능 메트릭
  static trackPageLoad(page: string, loadTime: number): void {
    this.metrics.histogram('page_load_time', loadTime, { page });
  }

  // 사용자 세션 메트릭
  static trackUserSession(userId: string, sessionDuration: number): void {
    this.metrics.increment('user_sessions', 1, { userId });
    this.metrics.histogram('session_duration', sessionDuration, { userId });
  }

  // 크레딧 사용 메트릭
  static trackCreditUsage(
    userId: string,
    creditsUsed: number,
    action: string
  ): void {
    this.metrics.gauge('credits_used', creditsUsed, {
      userId,
      action,
    });
  }
}

/**
 * 에러 추적 유틸리티
 */
export class ErrorTracker {
  /**
   * 에러 캡처
   */
  static captureError(
    error: Error,
    context?: Record<string, any>,
    user?: { id: string; email?: string }
  ): void {
    if (user) {
      Sentry.setUser({ id: user.id, email: user.email });
    }

    if (context) {
      Sentry.setContext('additional_info', context);
    }

    Sentry.captureException(error);
  }

  /**
   * 메시지 캡처
   */
  static captureMessage(
    message: string,
    level: 'error' | 'warning' | 'info' | 'debug' = 'info',
    context?: Record<string, any>
  ): void {
    if (context) {
      Sentry.setContext('additional_info', context);
    }

    Sentry.captureMessage(message, level);
  }

  /**
   * 사용자 피드백 수집
   */
  static captureFeedback(
    name: string,
    email: string,
    message: string
  ): void {
    Sentry.captureUserFeedback({
      name,
      email,
      comments: message,
    });
  }

  /**
   * 성능 트랜잭션 시작
   */
  static startTransaction(
    name: string,
    operation: string
  ): ReturnType<typeof Sentry.startTransaction> {
    return Sentry.startTransaction({
      name,
      op: operation,
    });
  }

  /**
   * 브레드크럼 추가
   */
  static addBreadcrumb(
    message: string,
    category: string,
    data?: Record<string, any>,
    level: 'error' | 'warning' | 'info' | 'debug' = 'info'
  ): void {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level,
      timestamp: Date.now() / 1000,
    });
  }
}

/**
 * 성능 모니터링
 */
export class PerformanceMonitor {
  private static observers: Map<string, PerformanceObserver> = new Map();

  /**
   * 웹 바이탈 추적
   */
  static trackWebVitals(): void {
    if (typeof window === 'undefined') return;

    // LCP (Largest Contentful Paint)
    this.observeMetric('largest-contentful-paint', (entry: any) => {
      AppMetrics.trackPageLoad('lcp', entry.value);
    });

    // FID (First Input Delay)
    this.observeMetric('first-input', (entry: any) => {
      AppMetrics.trackPageLoad('fid', entry.processingStart - entry.startTime);
    });

    // CLS (Cumulative Layout Shift)
    this.observeMetric('layout-shift', (entry: any) => {
      if (!entry.hadRecentInput) {
        AppMetrics.trackPageLoad('cls', entry.value);
      }
    });
  }

  /**
   * 메트릭 관찰자 등록
   */
  private static observeMetric(
    type: string,
    callback: (entry: any) => void
  ): void {
    if (typeof window === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });

      observer.observe({ type, buffered: true });
      this.observers.set(type, observer);
    } catch (error) {
      console.warn(`Cannot observe metric ${type}:`, error);
    }
  }

  /**
   * 리소스 타이밍 추적
   */
  static trackResourceTiming(): void {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.entryType === 'resource') {
          AppMetrics.trackPageLoad('resource_load', entry.duration);
        }
      });
    });

    observer.observe({ type: 'resource', buffered: true });
    this.observers.set('resource', observer);
  }

  /**
   * 모든 관찰자 정리
   */
  static cleanup(): void {
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();
  }
}

// 전역 인스턴스
export const metrics = MetricsCollector.getInstance();

// 초기화 함수
export function setupMonitoring(): void {
  initializeMonitoring();
  
  if (typeof window !== 'undefined') {
    PerformanceMonitor.trackWebVitals();
    PerformanceMonitor.trackResourceTiming();
  }
}

// 정리 함수
export function cleanupMonitoring(): void {
  PerformanceMonitor.cleanup();
  metrics.reset();
}