import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convexClient = new ConvexHttpClient(convexUrl);

// Trace ID 생성
export function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Span ID 생성
export function generateSpanId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// API 성능 모니터링 미들웨어
export async function withApiMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    endpoint?: string;
    skipAuth?: boolean;
  }
) {
  return async (req: NextRequest) => {
    const startTime = performance.now();
    const traceId = req.headers.get('x-trace-id') || generateTraceId();
    const spanId = generateSpanId();
    const parentSpanId = req.headers.get('x-span-id') || undefined;

    // 요청 크기 계산
    const requestSize = req.headers.get('content-length') 
      ? parseInt(req.headers.get('content-length')!)
      : undefined;

    let response: NextResponse;
    let statusCode = 200;
    let success = true;
    let errorMessage: string | undefined;
    let errorStack: string | undefined;

    try {
      // 핸들러 실행
      response = await handler(req);
      statusCode = response.status;
      success = statusCode >= 200 && statusCode < 400;

      // 에러 응답 처리
      if (!success) {
        try {
          const body = await response.clone().json();
          errorMessage = body.error || body.message || `HTTP ${statusCode}`;
        } catch {
          errorMessage = `HTTP ${statusCode}`;
        }
      }
    } catch (error: any) {
      // 예외 처리
      statusCode = 500;
      success = false;
      errorMessage = error.message || 'Internal Server Error';
      errorStack = error.stack;

      response = NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }

    const endTime = performance.now();
    const responseTime = endTime - startTime;

    // 응답 크기 계산
    const responseSize = response.headers.get('content-length')
      ? parseInt(response.headers.get('content-length')!)
      : undefined;

    // 메트릭 저장
    try {
      await convexClient.mutation(api.performanceMetrics.recordApiMetric, {
        endpoint: options?.endpoint || req.nextUrl.pathname,
        method: req.method,
        responseTime,
        statusCode,
        success,
        timing: {
          total: responseTime,
        },
        requestSize,
        responseSize,
        errorMessage,
        errorStack,
        traceId,
        spanId,
        parentSpanId,
        userAgent: req.headers.get('user-agent') || undefined,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        country: req.headers.get('cf-ipcountry') || undefined,
      });
    } catch (error) {
      console.error('Failed to record API metric:', error);
    }

    // 트레이스 정보를 응답 헤더에 추가
    response.headers.set('x-trace-id', traceId);
    response.headers.set('x-span-id', spanId);
    response.headers.set('x-response-time', responseTime.toString());

    return response;
  };
}

// 간편한 API 라우트 래퍼
export function createMonitoredApiRoute(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    endpoint?: string;
    skipAuth?: boolean;
  }
) {
  return withApiMonitoring(handler, options);
}

// 성능 임계값 체크
export interface PerformanceThresholds {
  responseTime?: {
    warning: number;  // ms
    critical: number; // ms
  };
  errorRate?: {
    warning: number;  // percentage
    critical: number; // percentage
  };
}

export async function checkPerformanceThresholds(
  endpoint: string,
  thresholds: PerformanceThresholds,
  timeRange: string = '1h'
): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  metrics: any;
}> {
  try {
    const summary = await convexClient.query(
      api.performanceMetrics.getApiPerformanceSummary,
      { endpoint, timeRange }
    );

    if (!summary) {
      return {
        status: 'healthy',
        issues: [],
        metrics: null,
      };
    }

    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 응답 시간 체크
    if (thresholds.responseTime) {
      const p95 = summary.summary.p95ResponseTime;
      
      if (p95 > thresholds.responseTime.critical) {
        status = 'critical';
        issues.push(`P95 response time (${p95.toFixed(2)}ms) exceeds critical threshold (${thresholds.responseTime.critical}ms)`);
      } else if (p95 > thresholds.responseTime.warning) {
        if (status !== 'critical') status = 'warning';
        issues.push(`P95 response time (${p95.toFixed(2)}ms) exceeds warning threshold (${thresholds.responseTime.warning}ms)`);
      }
    }

    // 에러율 체크
    if (thresholds.errorRate) {
      const errorRate = 100 - summary.summary.successRate;
      
      if (errorRate > thresholds.errorRate.critical) {
        status = 'critical';
        issues.push(`Error rate (${errorRate.toFixed(2)}%) exceeds critical threshold (${thresholds.errorRate.critical}%)`);
      } else if (errorRate > thresholds.errorRate.warning) {
        if (status !== 'critical') status = 'warning';
        issues.push(`Error rate (${errorRate.toFixed(2)}%) exceeds warning threshold (${thresholds.errorRate.warning}%)`);
      }
    }

    return {
      status,
      issues,
      metrics: summary,
    };
  } catch (error) {
    console.error('Failed to check performance thresholds:', error);
    return {
      status: 'warning',
      issues: ['Failed to retrieve performance metrics'],
      metrics: null,
    };
  }
}

// API 헬스 체크
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, {
    status: 'up' | 'down' | 'degraded';
    responseTime?: number;
    error?: string;
  }>;
  timestamp: string;
}> {
  const services: Record<string, any> = {};
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Convex 헬스 체크
  try {
    const start = performance.now();
    await convexClient.query(api.performanceMetrics.getRecentErrors, { limit: 1 });
    const responseTime = performance.now() - start;
    
    services.convex = {
      status: 'up',
      responseTime,
    };
  } catch (error: any) {
    services.convex = {
      status: 'down',
      error: error.message,
    };
    overallStatus = 'unhealthy';
  }

  // 기타 서비스 헬스 체크 (예: 외부 API)
  // ...

  return {
    status: overallStatus,
    services,
    timestamp: new Date().toISOString(),
  };
}

// Request/Response 인터셉터
export class ApiInterceptor {
  private static instance: ApiInterceptor;
  private requestInterceptors: ((req: Request) => void)[] = [];
  private responseInterceptors: ((res: Response, duration: number) => void)[] = [];

  static getInstance(): ApiInterceptor {
    if (!ApiInterceptor.instance) {
      ApiInterceptor.instance = new ApiInterceptor();
    }
    return ApiInterceptor.instance;
  }

  addRequestInterceptor(interceptor: (req: Request) => void) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (res: Response, duration: number) => void) {
    this.responseInterceptors.push(interceptor);
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const startTime = performance.now();
    const request = new Request(input, init);

    // Request 인터셉터 실행
    this.requestInterceptors.forEach(interceptor => interceptor(request));

    try {
      const response = await fetch(request);
      const duration = performance.now() - startTime;

      // Response 인터셉터 실행
      this.responseInterceptors.forEach(interceptor => interceptor(response.clone(), duration));

      // 성능 메트릭 기록
      if (typeof window === 'undefined') {
        // 서버 사이드에서만 실행
        await convexClient.mutation(api.performanceMetrics.recordApiMetric, {
          endpoint: request.url,
          method: request.method,
          responseTime: duration,
          statusCode: response.status,
          success: response.ok,
          timing: {
            total: duration,
          },
        });
      }

      return response;
    } catch (error: any) {
      const duration = performance.now() - startTime;

      // 에러 기록
      if (typeof window === 'undefined') {
        await convexClient.mutation(api.performanceMetrics.recordApiMetric, {
          endpoint: request.url,
          method: request.method,
          responseTime: duration,
          statusCode: 0,
          success: false,
          errorMessage: error.message,
          timing: {
            total: duration,
          },
        });
      }

      throw error;
    }
  }
}