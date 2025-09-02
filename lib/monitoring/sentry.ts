/**
 * Sentry 에러 추적 시스템 설정
 * 프론트엔드와 백엔드 에러를 모니터링합니다.
 */

import * as Sentry from '@sentry/nextjs'
import { getEnvironmentConfig, getCurrentEnvironment } from '@/config/environments'

const config = getEnvironmentConfig()
const environment = getCurrentEnvironment()

// Sentry 초기화 설정
export const sentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // 환경 설정
  environment: environment,
  
  // 릴리즈 버전
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // 성능 모니터링
  tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
  
  // 세션 리플레이 (프로덕션에서만)
  replaysSessionSampleRate: environment === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  // 통합 설정
  integrations: [
    new Sentry.Integrations.Http({
      tracing: true,
      breadcrumbs: true,
    }),
    new Sentry.Integrations.Postgres(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // 민감한 데이터 필터링
  beforeSend(event, hint) {
    // 개발 환경에서는 로컬 콘솔도 출력
    if (environment === 'development') {
      console.error('Sentry Error:', event, hint)
    }

    // 민감한 정보 제거
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }

    // 로컬/개발 에러는 전송하지 않음
    if (event.request?.url?.includes('localhost')) {
      return null
    }

    return event
  },

  // 브레드크럼 필터링
  beforeBreadcrumb(breadcrumb) {
    // 민감한 데이터가 포함된 브레드크럼 필터링
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null
    }

    if (breadcrumb.type === 'http') {
      // HTTP 요청에서 민감한 헤더 제거
      if (breadcrumb.data?.headers) {
        delete breadcrumb.data.headers['authorization']
        delete breadcrumb.data.headers['cookie']
      }
    }

    return breadcrumb
  },

  // 에러 무시 패턴
  ignoreErrors: [
    // 브라우저 확장 프로그램 에러
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    'ChunkLoadError',
    
    // 네트워크 에러
    'NetworkError',
    'Failed to fetch',
    'Network request failed',
    
    // 광고 차단기 관련
    'AdBlocker',
    'adsbygoogle',
    
    // 일반적인 사용자 중단 액션
    'AbortError',
    'User cancelled',
  ],

  // URL 무시 패턴
  denyUrls: [
    // 브라우저 확장 프로그램
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    
    // CDN 및 외부 스크립트
    /googleadservices\.com/i,
    /googlesyndication\.com/i,
    /doubleclick\.net/i,
  ],
}

// Sentry 초기화
export function initSentry() {
  if (!sentryConfig.dsn) {
    console.warn('Sentry DSN이 설정되지 않았습니다. 에러 추적이 비활성화됩니다.')
    return
  }

  Sentry.init(sentryConfig)
  
  console.log(`✅ Sentry 초기화 완료 - 환경: ${environment}`)
}

// 사용자 정보 설정
export function setSentryUser(user: {
  id?: string
  email?: string
  username?: string
  [key: string]: any
}) {
  Sentry.setUser(user)
}

// 컨텍스트 정보 설정
export function setSentryContext(key: string, context: Record<string, any>) {
  Sentry.setContext(key, context)
}

// 태그 설정
export function setSentryTag(key: string, value: string) {
  Sentry.setTag(key, value)
}

// 에러 수동 보고
export function captureError(error: Error, context?: Record<string, any>) {
  return Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value)
      })
    }
    
    return Sentry.captureException(error)
  })
}

// 메시지 수동 보고
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  return Sentry.captureMessage(message, level)
}

// 성능 추적 시작
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({ name, op })
}

// HTTP 요청 성능 추적
export function traceHttpRequest(method: string, url: string) {
  return Sentry.startTransaction({
    name: `${method} ${url}`,
    op: 'http.client',
    tags: {
      'http.method': method,
      'http.url': url,
    },
  })
}

// 데이터베이스 쿼리 성능 추적
export function traceDatabaseQuery(operation: string, table?: string) {
  return Sentry.startTransaction({
    name: `DB: ${operation}${table ? ` on ${table}` : ''}`,
    op: 'db.query',
    tags: {
      'db.operation': operation,
      ...(table && { 'db.table': table }),
    },
  })
}

// React 에러 바운더리용 에러 핸들러
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: any) => {
    Sentry.withScope((scope) => {
      scope.setContext('errorBoundary', {
        componentName,
        componentStack: errorInfo.componentStack,
      })
      
      scope.setTag('errorBoundary', componentName)
      Sentry.captureException(error)
    })
  }
}

// 비동기 에러 핸들러
export function handleAsyncError<T>(
  promise: Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return promise.catch((error) => {
    captureError(error, context)
    throw error
  })
}

// 성능 메트릭 수집
export function collectPerformanceMetrics() {
  if (typeof window === 'undefined') return

  // Core Web Vitals 수집
  if ('web-vitals' in window) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: 'CLS',
          data: metric,
          level: 'info',
        })
      })

      getFID((metric) => {
        Sentry.addBreadcrumb({
          category: 'performance', 
          message: 'FID',
          data: metric,
          level: 'info',
        })
      })

      getFCP((metric) => {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: 'FCP',
          data: metric,
          level: 'info',
        })
      })

      getLCP((metric) => {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: 'LCP', 
          data: metric,
          level: 'info',
        })
      })

      getTTFB((metric) => {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: 'TTFB',
          data: metric,
          level: 'info',
        })
      })
    })
  }
}

// 프로파일링 시작 (프로덕션에서만)
export function startProfiling() {
  if (environment === 'production') {
    Sentry.getCurrentHub().getClient()?.getOptions().profilesSampleRate = 0.1
  }
}