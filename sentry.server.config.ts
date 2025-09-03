import * as Sentry from '@sentry/nextjs';

/**
 * Sentry 서버 사이드 설정
 * 서버에서 발생하는 에러 및 성능 이슈 추적
 */

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // 환경 설정
    environment: process.env.NEXT_PUBLIC_APP_ENV || 'production',
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    
    // 디버깅
    debug: process.env.NODE_ENV === 'development',
    
    // 샘플링 비율 (서버는 클라이언트보다 낮게)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
    profilesSampleRate: 0.05,
    
    // 통합 기능
    integrations: [
      // Node.js 통합
      new Sentry.NodeSDK.Integrations.Http({ tracing: true }),
      new Sentry.NodeSDK.Integrations.Express({ app: undefined }),
      new Sentry.NodeSDK.Integrations.Undici(),
      
      // 추가적인 컨텍스트 정보
      new Sentry.NodeSDK.Integrations.Context({
        app: true,
        device: false,
        os: true,
        runtime: true,
      }),
      
      // 모듈 로딩 정보
      new Sentry.NodeSDK.Integrations.Modules(),
      
      // OnUnhandledRejection
      new Sentry.NodeSDK.Integrations.OnUnhandledRejection({
        mode: 'warn', // 'none' | 'warn' | 'strict'
      }),
      
      // OnUncaughtException
      new Sentry.NodeSDK.Integrations.OnUncaughtException({
        exitEvenIfOtherHandlersAreRegistered: false,
      }),
    ],
    
    // 서버별 설정
    includeLocalVariables: process.env.NODE_ENV === 'development',
    
    // 에러 필터링 및 전처리
    beforeSend: (event, hint) => {
      // 개발 환경에서는 모든 에러 허용
      if (process.env.NODE_ENV === 'development') {
        console.error('Sentry Error:', event);
        return event;
      }
      
      // 서버 에러 중 민감한 정보 제거
      if (event.exception) {
        const error = event.exception.values?.[0];
        
        // 데이터베이스 연결 에러에서 민감한 정보 제거
        if (error?.value?.includes('connection') || error?.value?.includes('database')) {
          event.tags = { ...event.tags, errorType: 'database' };
          
          // 연결 문자열에서 비밀번호 제거
          if (error.value) {
            error.value = error.value.replace(
              /password=([^&\s]+)/gi, 
              'password=[FILTERED]'
            );
          }
        }
        
        // API 키 누출 방지
        if (error?.value) {
          error.value = error.value.replace(
            /(api[_-]?key|token|secret)[=:]\s*["']?([^"'\s&]+)/gi,
            '$1=[FILTERED]'
          );
        }
      }
      
      // 요청 데이터 필터링
      if (event.request) {
        // Headers에서 민감한 정보 제거
        if (event.request.headers) {
          const sensitiveHeaders = [
            'authorization', 'cookie', 'x-api-key', 
            'x-auth-token', 'x-csrf-token'
          ];
          
          for (const header of sensitiveHeaders) {
            if (event.request.headers[header]) {
              event.request.headers[header] = '[FILTERED]';
            }
          }
        }
        
        // Query parameters 필터링
        if (event.request.query_string) {
          event.request.query_string = event.request.query_string.replace(
            /(password|token|key|secret)=([^&]*)/gi,
            '$1=[FILTERED]'
          );
        }
        
        // Body 데이터 필터링
        if (event.request.data) {
          event.request.data = filterSensitiveData(event.request.data);
        }
      }
      
      // 사용자 정보 필터링
      if (event.user) {
        // 이메일은 해시로 변환
        if (event.user.email) {
          const crypto = require('crypto');
          event.user.email = crypto
            .createHash('sha256')
            .update(event.user.email)
            .digest('hex')
            .substring(0, 16);
        }
        
        // IP 주소 제거
        delete event.user.ip_address;
      }
      
      // 컨텍스트에서 민감한 정보 제거
      if (event.contexts) {
        // Runtime 컨텍스트에서 환경변수 제거
        if (event.contexts.runtime) {
          delete event.contexts.runtime.environment;
        }
        
        // Device 정보에서 민감한 정보 제거
        if (event.contexts.device) {
          delete event.contexts.device.name;
          delete event.contexts.device.unique_id;
        }
      }
      
      return event;
    },
    
    // 브레드크럼 필터링
    beforeBreadcrumb: (breadcrumb) => {
      // HTTP 요청 브레드크럼에서 민감한 데이터 제거
      if (breadcrumb.category === 'http') {
        if (breadcrumb.data) {
          // URL에서 민감한 파라미터 제거
          if (breadcrumb.data.url) {
            breadcrumb.data.url = breadcrumb.data.url.replace(
              /(password|token|key|secret)=([^&]*)/gi,
              '$1=[FILTERED]'
            );
          }
          
          // 요청 본문에서 민감한 데이터 제거
          if (breadcrumb.data.data) {
            breadcrumb.data.data = filterSensitiveData(breadcrumb.data.data);
          }
        }
      }
      
      // 데이터베이스 쿼리에서 민감한 정보 제거
      if (breadcrumb.category === 'query' && breadcrumb.message) {
        breadcrumb.message = breadcrumb.message.replace(
          /(password|secret|token)\s*=\s*'[^']*'/gi,
          "$1='[FILTERED]'"
        );
      }
      
      return breadcrumb;
    },
    
    // 무시할 에러들
    ignoreErrors: [
      // Next.js 내부 에러
      'ENOENT',
      'ECONNRESET',
      'EPIPE',
      'ETIMEDOUT',
      
      // 사용자 중단 액션
      'AbortError',
      'The user aborted a request',
      
      // 일시적인 네트워크 에러
      'socket hang up',
      'connect ECONNREFUSED',
      'getaddrinfo ENOTFOUND',
      'timeout',
      
      // 봇/크롤러 관련
      'Request failed with status code 403',
      'Request failed with status code 404',
      
      // 개발 환경 관련
      'Module not found',
      'Cannot resolve module',
    ],
    
    // 트랜잭션 이름 정규화
    beforeSendTransaction: (transaction) => {
      // URL 파라미터 정규화
      if (transaction.transaction) {
        transaction.transaction = transaction.transaction
          .replace(/\/\d+/g, '/[id]')
          .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, '/[uuid]')
          .replace(/\?.*/g, ''); // 쿼리 파라미터 제거
      }
      
      // 느린 트랜잭션만 추적 (성능상 이유)
      if (transaction.spans) {
        transaction.spans = transaction.spans.filter(span => 
          (span.timestamp || 0) - (span.start_timestamp || 0) > 0.1 // 100ms 이상
        );
      }
      
      return transaction;
    },
    
    // 성능 모니터링 설정
    tracesSampler: (samplingContext) => {
      // API 라우트별 샘플링 조정
      if (samplingContext.request?.url) {
        const url = samplingContext.request.url;
        
        // Health check는 추적하지 않음
        if (url.includes('/api/health')) {
          return 0;
        }
        
        // 웹훅은 낮은 샘플링
        if (url.includes('/api/webhook')) {
          return 0.01;
        }
        
        // 중요한 API는 높은 샘플링
        if (url.includes('/api/payment') || url.includes('/api/auth')) {
          return 0.2;
        }
        
        // 일반 API
        if (url.includes('/api/')) {
          return 0.05;
        }
      }
      
      // 기본 샘플링 비율
      return 0.01;
    },
    
    // 최대 값 설정
    maxBreadcrumbs: 30,
    maxValueLength: 1000,
    
    // 추가 태그
    initialScope: {
      tags: {
        component: 'server',
        nodejs_version: process.version,
        platform: process.platform,
      },
    },
  });
}

/**
 * 민감한 데이터 필터링 함수
 */
function filterSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth',
    'authorization', 'cookie', 'session', 'csrf',
    'apiKey', 'accessToken', 'refreshToken', 'clientSecret',
    'connectionString', 'databaseUrl', 'redisUrl',
    'webhookSecret', 'privateKey', 'publicKey',
    'email', 'phone', 'address', 'ssn', 'credit',
  ];
  
  const filtered = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key of Object.keys(filtered)) {
    const keyLower = key.toLowerCase();
    
    if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive.toLowerCase()))) {
      filtered[key] = '[FILTERED]';
    } else if (typeof filtered[key] === 'string') {
      // 문자열에서 잠재적인 민감한 패턴 필터링
      filtered[key] = filtered[key]
        .replace(/password=[\w\-_.]+/gi, 'password=[FILTERED]')
        .replace(/token=[\w\-_.]+/gi, 'token=[FILTERED]')
        .replace(/key=[\w\-_.]+/gi, 'key=[FILTERED]')
        .replace(/Bearer [\w\-_.]+/gi, 'Bearer [FILTERED]')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    } else if (typeof filtered[key] === 'object' && filtered[key] !== null) {
      filtered[key] = filterSensitiveData(filtered[key]);
    }
  }
  
  return filtered;
}

/**
 * 서버 에러 핸들러
 */
export function handleServerError(error: Error, context?: Record<string, any>): void {
  console.error('Server Error:', error);
  
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}