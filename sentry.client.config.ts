import * as Sentry from '@sentry/nextjs';

/**
 * Sentry 클라이언트 사이드 설정
 * 브라우저에서 발생하는 에러 및 성능 이슈 추적
 */

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // 환경 설정
    environment: process.env.NEXT_PUBLIC_APP_ENV || 'production',
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    
    // 디버깅
    debug: process.env.NODE_ENV === 'development',
    
    // 샘플링 비율
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // 통합 기능
    integrations: [
      // 브라우저 추적
      new Sentry.BrowserTracing({
        routingInstrumentation: Sentry.nextRouterInstrumentation,
        
        // 네트워크 요청 추적
        traceFetch: true,
        traceXHR: true,
        
        // 자동 계측
        enableLongTask: true,
        enableInp: true,
        
        // URL 필터링 (추적하지 않을 URL)
        shouldCreateSpanForRequest: (url) => {
          // 정적 자산 제외
          if (url.includes('/_next/static/')) return false;
          if (url.includes('/favicon.ico')) return false;
          if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return false;
          
          // 외부 서비스 제외 (선택적)
          if (url.includes('google-analytics.com')) return false;
          if (url.includes('mixpanel.com')) return false;
          
          return true;
        },
      }),
      
      // 세션 리플레이 (에러 재현)
      new Sentry.Replay({
        // 텍스트 마스킹 (개인정보 보호)
        maskAllText: false,
        maskAllInputs: true,
        
        // 미디어 차단
        blockAllMedia: false,
        
        // CSS 선택자로 특정 요소 마스킹
        mask: [
          '.sensitive-data',
          '[data-sensitive]',
          'input[type="password"]',
          'input[type="email"]',
          '.payment-info',
        ],
        
        // 특정 요소 차단
        block: [
          '.admin-panel',
          '[data-admin]',
        ],
        
        // 네트워크 요청 기록
        networkDetailAllowUrls: [
          // API 요청만 기록
          process.env.NEXT_PUBLIC_APP_URL + '/api/',
          process.env.NEXT_PUBLIC_CONVEX_URL || '',
        ],
        
        // 네트워크 요청에서 제외할 URL
        networkCaptureBodies: false,
      }),
      
      // 피드백 통합
      new Sentry.Feedback({
        colorScheme: 'system',
        showBranding: false,
        isNameRequired: true,
        isEmailRequired: true,
        useSentryUser: {
          name: 'name',
          email: 'email',
        },
        formTitle: '문제 신고',
        submitButtonLabel: '전송',
        cancelButtonLabel: '취소',
        addScreenshotButtonLabel: '스크린샷 추가',
        removeScreenshotButtonLabel: '스크린샷 제거',
        nameLabel: '이름',
        namePlaceholder: '이름을 입력하세요',
        emailLabel: '이메일',
        emailPlaceholder: '이메일을 입력하세요',
        messageLabel: '문제 설명',
        messagePlaceholder: '어떤 문제가 발생했는지 자세히 설명해주세요',
      }),
    ],
    
    // 에러 필터링
    beforeSend: (event, hint) => {
      // 개발 환경에서는 모든 에러 허용
      if (process.env.NODE_ENV === 'development') {
        return event;
      }
      
      // 브라우저 확장 프로그램 에러 제외
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error?.stacktrace?.frames) {
          const isExtensionError = error.stacktrace.frames.some(frame =>
            frame.filename?.includes('extension://') ||
            frame.filename?.includes('moz-extension://') ||
            frame.filename?.includes('safari-extension://')
          );
          if (isExtensionError) return null;
        }
      }
      
      // 네트워크 에러 중 일시적인 것들 제외
      if (event.message) {
        const temporaryErrors = [
          'Failed to fetch',
          'NetworkError',
          'Load failed',
          'ERR_NETWORK',
          'ERR_INTERNET_DISCONNECTED',
        ];
        
        if (temporaryErrors.some(error => event.message?.includes(error))) {
          return null;
        }
      }
      
      // 사용자 개인정보 제거
      if (event.user) {
        // 이메일은 해시로 변환
        if (event.user.email) {
          event.user.email = btoa(event.user.email);
        }
        
        // IP 주소 제거
        delete event.user.ip_address;
      }
      
      // 요청 데이터에서 민감한 정보 제거
      if (event.request?.data) {
        event.request.data = filterSensitiveData(event.request.data);
      }
      
      return event;
    },
    
    // 브레드크럼 필터링
    beforeBreadcrumb: (breadcrumb) => {
      // 사용자 입력 브레드크럼에서 민감한 데이터 제거
      if (breadcrumb.category === 'ui.input' && breadcrumb.message) {
        breadcrumb.message = '[INPUT]';
      }
      
      // 클릭 이벤트에서 민감한 텍스트 제거
      if (breadcrumb.category === 'ui.click' && breadcrumb.message) {
        const sensitivePatterns = [
          /password/i,
          /secret/i,
          /token/i,
          /key/i,
          /@\w+\.\w+/, // 이메일 패턴
        ];
        
        if (sensitivePatterns.some(pattern => pattern.test(breadcrumb.message!))) {
          breadcrumb.message = '[SENSITIVE DATA]';
        }
      }
      
      return breadcrumb;
    },
    
    // 무시할 에러들
    ignoreErrors: [
      // 스크립트 로딩 에러
      'Script error.',
      'ScriptError',
      
      // 네트워크 관련 에러
      'Network request failed',
      'Failed to fetch',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
      'NetworkError',
      
      // 브라우저 확장 프로그램
      'Non-Error promise rejection captured',
      'cancelled',
      
      // 사용자 액션으로 인한 에러
      'AbortError',
      'The user aborted a request',
      'Request aborted',
      
      // 개발 도구 관련
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      
      // 타사 서비스 에러
      'ChunkLoadError',
      'Loading chunk',
      'Loading CSS chunk',
      
      // 브라우저별 에러
      'InvalidStateError',
      'SecurityError',
      'NotAllowedError',
    ],
    
    // URL 필터링 (추적하지 않을 URL)
    denyUrls: [
      // 브라우저 확장
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
      
      // 개발 도구
      /webpack-internal/i,
    ],
    
    // 최대 값 설정
    maxBreadcrumbs: 50,
    maxValueLength: 250,
    
    // 전송 옵션
    transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),
    transportOptions: {
      textEncoder: new TextEncoder(),
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
    'email', 'phone', 'address', 'ssn', 'credit',
  ];
  
  const filtered = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key of Object.keys(filtered)) {
    if (sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive.toLowerCase())
    )) {
      filtered[key] = '[FILTERED]';
    } else if (typeof filtered[key] === 'object' && filtered[key] !== null) {
      filtered[key] = filterSensitiveData(filtered[key]);
    }
  }
  
  return filtered;
}