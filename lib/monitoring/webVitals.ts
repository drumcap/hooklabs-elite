import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP, CLSMetric, FCPMetric, FIDMetric, LCPMetric, TTFBMetric, INPMetric } from 'web-vitals';
import { api } from '@/convex/_generated/api';
import { ConvexClient } from 'convex/browser';

// Convex 클라이언트 초기화
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convexClient = new ConvexClient(convexUrl);

// 세션 ID 생성
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 브라우저 정보 추출
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let browserVersion = 'Unknown';
  let os = 'Unknown';

  // 브라우저 감지
  if (ua.indexOf('Chrome') > -1) {
    browser = 'Chrome';
    browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Safari') > -1) {
    browser = 'Safari';
    browserVersion = ua.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Firefox') > -1) {
    browser = 'Firefox';
    browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (ua.indexOf('Edge') > -1) {
    browser = 'Edge';
    browserVersion = ua.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
  }

  // OS 감지
  if (ua.indexOf('Windows') > -1) os = 'Windows';
  else if (ua.indexOf('Mac') > -1) os = 'macOS';
  else if (ua.indexOf('Linux') > -1) os = 'Linux';
  else if (ua.indexOf('Android') > -1) os = 'Android';
  else if (ua.indexOf('iOS') > -1) os = 'iOS';

  return { browser, browserVersion, os };
};

// 디바이스 타입 감지
const getDeviceType = () => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// 연결 타입 감지
const getConnectionType = () => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  return connection?.effectiveType || undefined;
};

// Navigation Timing 수집
const getNavigationTiming = () => {
  const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!timing) return undefined;

  return {
    domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
    loadComplete: timing.loadEventEnd - timing.loadEventStart,
    domInteractive: timing.domInteractive - timing.fetchStart,
    redirectTime: timing.redirectEnd - timing.redirectStart,
    dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
    connectionTime: timing.connectEnd - timing.connectStart,
    requestTime: timing.responseStart - timing.requestStart,
    responseTime: timing.responseEnd - timing.responseStart,
  };
};

// Web Vitals 데이터 저장
class WebVitalsCollector {
  private sessionId: string;
  private metricsBuffer: Map<string, any> = new Map();
  private flushTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = generateSessionId();
    this.initializeCollectors();
  }

  private initializeCollectors() {
    // Core Web Vitals
    onLCP((metric) => this.handleMetric('lcp', metric));
    onFID((metric) => this.handleMetric('fid', metric));
    onCLS((metric) => this.handleMetric('cls', metric));
    
    // 추가 메트릭
    onFCP((metric) => this.handleMetric('fcp', metric));
    onTTFB((metric) => this.handleMetric('ttfb', metric));
    onINP((metric) => this.handleMetric('inp', metric));
  }

  private handleMetric(name: string, metric: CLSMetric | FCPMetric | FIDMetric | LCPMetric | TTFBMetric | INPMetric) {
    this.metricsBuffer.set(name, metric.value);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(() => {
      this.flush();
    }, 5000); // 5초 후 전송
  }

  async flush() {
    if (this.metricsBuffer.size === 0) return;

    const { browser, browserVersion, os } = getBrowserInfo();
    const deviceType = getDeviceType();
    const connectionType = getConnectionType();
    const navigationTiming = getNavigationTiming();

    const data = {
      sessionId: this.sessionId,
      pathname: window.location.pathname,
      lcp: this.metricsBuffer.get('lcp'),
      fid: this.metricsBuffer.get('fid'),
      cls: this.metricsBuffer.get('cls'),
      fcp: this.metricsBuffer.get('fcp'),
      ttfb: this.metricsBuffer.get('ttfb'),
      inp: this.metricsBuffer.get('inp'),
      navigationTiming,
      deviceType,
      browser,
      browserVersion,
      os,
      connectionType,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      url: window.location.href,
      referrer: document.referrer || undefined,
      userAgent: navigator.userAgent,
    };

    try {
      await convexClient.mutation(api.performanceMetrics.recordWebVitals, data);
      console.log('Web Vitals recorded successfully');
      this.metricsBuffer.clear();
    } catch (error) {
      console.error('Failed to record Web Vitals:', error);
    }
  }

  // 페이지 언로드 시 즉시 전송
  sendBeacon() {
    if (this.metricsBuffer.size === 0) return;

    const { browser, browserVersion, os } = getBrowserInfo();
    const data = {
      sessionId: this.sessionId,
      pathname: window.location.pathname,
      metrics: Object.fromEntries(this.metricsBuffer),
      deviceType: getDeviceType(),
      browser,
      browserVersion,
      os,
      connectionType: getConnectionType(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // Beacon API 사용하여 비동기 전송
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    navigator.sendBeacon('/api/monitoring/web-vitals', blob);
  }
}

// 전역 인스턴스
let collector: WebVitalsCollector | null = null;

// Web Vitals 수집 초기화
export function initializeWebVitals() {
  if (typeof window === 'undefined') return;
  
  if (!collector) {
    collector = new WebVitalsCollector();

    // 페이지 언로드 시 메트릭 전송
    window.addEventListener('beforeunload', () => {
      collector?.sendBeacon();
    });

    // 페이지 숨김 시 메트릭 전송 (모바일 대응)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        collector?.flush();
      }
    });
  }

  return collector;
}

// 수동 메트릭 전송
export function flushWebVitals() {
  collector?.flush();
}

// 커스텀 성능 마크
export function markPerformance(name: string) {
  if (typeof window === 'undefined') return;
  performance.mark(name);
}

// 커스텀 성능 측정
export function measurePerformance(name: string, startMark: string, endMark?: string) {
  if (typeof window === 'undefined') return;
  
  if (endMark) {
    performance.measure(name, startMark, endMark);
  } else {
    performance.measure(name, startMark);
  }

  const measures = performance.getEntriesByName(name, 'measure');
  const measure = measures[measures.length - 1];
  
  if (measure) {
    return measure.duration;
  }
  
  return null;
}

// 리소스 타이밍 분석
export function analyzeResourceTiming() {
  if (typeof window === 'undefined') return null;

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  const analysis = {
    totalResources: resources.length,
    totalSize: 0,
    totalDuration: 0,
    byType: new Map<string, { count: number; size: number; duration: number }>(),
    slowest: [] as { name: string; duration: number; size: number }[],
    largest: [] as { name: string; duration: number; size: number }[],
  };

  resources.forEach(resource => {
    const size = resource.transferSize || 0;
    const duration = resource.duration;
    const type = resource.initiatorType;

    analysis.totalSize += size;
    analysis.totalDuration += duration;

    if (!analysis.byType.has(type)) {
      analysis.byType.set(type, { count: 0, size: 0, duration: 0 });
    }
    
    const typeStats = analysis.byType.get(type)!;
    typeStats.count++;
    typeStats.size += size;
    typeStats.duration += duration;

    // 가장 느린 리소스 추적
    analysis.slowest.push({ name: resource.name, duration, size });
    analysis.largest.push({ name: resource.name, duration, size });
  });

  // 상위 10개만 유지
  analysis.slowest.sort((a, b) => b.duration - a.duration).splice(10);
  analysis.largest.sort((a, b) => b.size - a.size).splice(10);

  return analysis;
}