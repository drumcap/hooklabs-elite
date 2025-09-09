/**
 * 커스텀 오류 클래스 시스템
 * 체계적인 오류 처리를 위한 중앙화된 오류 정의
 */

/**
 * 기본 Convex 오류 클래스
 */
export class ConvexError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: string;
  public readonly correlationId?: string;

  constructor(
    message: string,
    code: string = 'CONVEX_ERROR',
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = 'ConvexError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Error 클래스를 상속할 때 필요한 설정
    Object.setPrototypeOf(this, ConvexError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      stack: this.stack,
    };
  }
}

/**
 * 유효성 검사 오류
 */
export class ValidationError extends ConvexError {
  constructor(
    message: string,
    field?: string,
    value?: any
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      { field, value }
    );
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 인증 오류
 */
export class AuthenticationError extends ConvexError {
  constructor(
    message: string = '인증이 필요합니다',
    details?: any
  ) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 권한 오류
 */
export class AuthorizationError extends ConvexError {
  constructor(
    message: string = '권한이 없습니다',
    resource?: string,
    action?: string
  ) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403,
      { resource, action }
    );
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * 리소스를 찾을 수 없는 오류
 */
export class NotFoundError extends ConvexError {
  constructor(
    resource: string,
    id?: string
  ) {
    super(
      `${resource}를 찾을 수 없습니다${id ? `: ${id}` : ''}`,
      'NOT_FOUND',
      404,
      { resource, id }
    );
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 중복 리소스 오류
 */
export class DuplicateError extends ConvexError {
  constructor(
    resource: string,
    field?: string,
    value?: any
  ) {
    super(
      `${resource}가 이미 존재합니다`,
      'DUPLICATE_ERROR',
      409,
      { resource, field, value }
    );
    this.name = 'DuplicateError';
    Object.setPrototypeOf(this, DuplicateError.prototype);
  }
}

/**
 * 비즈니스 로직 오류
 */
export class BusinessLogicError extends ConvexError {
  constructor(
    message: string,
    code: string = 'BUSINESS_LOGIC_ERROR',
    details?: any
  ) {
    super(message, code, 422, details);
    this.name = 'BusinessLogicError';
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }
}

/**
 * 외부 API 오류
 */
export class ExternalAPIError extends ConvexError {
  public readonly service: string;
  public readonly originalError?: any;

  constructor(
    service: string,
    message: string,
    originalError?: any
  ) {
    super(
      `${service} API 오류: ${message}`,
      'EXTERNAL_API_ERROR',
      502,
      { service, originalError }
    );
    this.name = 'ExternalAPIError';
    this.service = service;
    this.originalError = originalError;
    Object.setPrototypeOf(this, ExternalAPIError.prototype);
  }
}

/**
 * 요금 제한 오류
 */
export class RateLimitError extends ConvexError {
  public readonly limit: number;
  public readonly window: string;
  public readonly retryAfter?: number;

  constructor(
    limit: number,
    window: string,
    retryAfter?: number
  ) {
    super(
      `요청 한도 초과: ${window}당 ${limit}회`,
      'RATE_LIMIT_ERROR',
      429,
      { limit, window, retryAfter }
    );
    this.name = 'RateLimitError';
    this.limit = limit;
    this.window = window;
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * 결제 관련 오류
 */
export class PaymentError extends ConvexError {
  constructor(
    message: string,
    paymentMethod?: string,
    amount?: number
  ) {
    super(
      message,
      'PAYMENT_ERROR',
      402,
      { paymentMethod, amount }
    );
    this.name = 'PaymentError';
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

/**
 * 크레딧 부족 오류
 */
export class InsufficientCreditsError extends BusinessLogicError {
  constructor(
    required: number,
    available: number
  ) {
    super(
      `크레딧이 부족합니다. 필요: ${required}, 보유: ${available}`,
      'INSUFFICIENT_CREDITS',
      { required, available }
    );
    this.name = 'InsufficientCreditsError';
    Object.setPrototypeOf(this, InsufficientCreditsError.prototype);
  }
}

/**
 * 구독 오류
 */
export class SubscriptionError extends BusinessLogicError {
  constructor(
    message: string,
    subscriptionStatus?: string
  ) {
    super(
      message,
      'SUBSCRIPTION_ERROR',
      { subscriptionStatus }
    );
    this.name = 'SubscriptionError';
    Object.setPrototypeOf(this, SubscriptionError.prototype);
  }
}

/**
 * 웹훅 검증 오류
 */
export class WebhookValidationError extends ConvexError {
  constructor(
    service: string,
    reason: string
  ) {
    super(
      `${service} 웹훅 검증 실패: ${reason}`,
      'WEBHOOK_VALIDATION_ERROR',
      400,
      { service, reason }
    );
    this.name = 'WebhookValidationError';
    Object.setPrototypeOf(this, WebhookValidationError.prototype);
  }
}

/**
 * 오류 처리 유틸리티
 */
export class ErrorHandler {
  /**
   * 오류를 ConvexError로 변환
   */
  static toConvexError(error: unknown): ConvexError {
    if (error instanceof ConvexError) {
      return error;
    }

    if (error instanceof Error) {
      return new ConvexError(
        error.message,
        'UNKNOWN_ERROR',
        500,
        { originalError: error.name }
      );
    }

    if (typeof error === 'string') {
      return new ConvexError(error);
    }

    return new ConvexError(
      '알 수 없는 오류가 발생했습니다',
      'UNKNOWN_ERROR',
      500,
      { originalError: error }
    );
  }

  /**
   * 오류 로깅
   */
  static logError(
    error: ConvexError,
    context?: Record<string, any>
  ): void {
    const errorLog = {
      ...error.toJSON(),
      context,
      environment: process.env.NODE_ENV,
    };

    // 개발 환경에서는 콘솔에 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', errorLog);
    } else {
      // 프로덕션에서는 모니터링 시스템으로 전송
      // TODO: Sentry 또는 다른 모니터링 시스템과 통합
      console.error('Error:', errorLog);
    }
  }

  /**
   * 클라이언트에 전송할 오류 포맷팅
   */
  static formatForClient(error: ConvexError): {
    error: {
      message: string;
      code: string;
      statusCode: number;
      details?: any;
    };
  } {
    // 개발 환경에서는 모든 정보 전송
    if (process.env.NODE_ENV === 'development') {
      return {
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
        },
      };
    }

    // 프로덕션에서는 민감한 정보 제거
    const safeDetails = error.statusCode < 500 ? error.details : undefined;
    
    return {
      error: {
        message: error.statusCode >= 500 
          ? '서버 오류가 발생했습니다' 
          : error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: safeDetails,
      },
    };
  }

  /**
   * 재시도 가능한 오류인지 확인
   */
  static isRetryable(error: ConvexError): boolean {
    // 5xx 오류나 특정 오류 코드는 재시도 가능
    const retryableCodes = [
      'EXTERNAL_API_ERROR',
      'RATE_LIMIT_ERROR',
    ];

    return error.statusCode >= 500 || 
           retryableCodes.includes(error.code);
  }

  /**
   * 재시도 지연 시간 계산
   */
  static getRetryDelay(
    error: ConvexError,
    attempt: number
  ): number {
    // Rate limit 오류인 경우 retryAfter 사용
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000;
    }

    // 지수 백오프
    const baseDelay = 1000; // 1초
    const maxDelay = 30000; // 30초
    const delay = Math.min(
      baseDelay * Math.pow(2, attempt),
      maxDelay
    );

    // 지터 추가 (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    
    return Math.floor(delay + jitter);
  }
}

/**
 * 오류 래퍼 함수 - 재시도 로직 포함
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onError?: (error: ConvexError, attempt: number) => void;
    context?: Record<string, any>;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    context,
  } = options;

  let lastError: ConvexError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = ErrorHandler.toConvexError(error);
      
      // 컨텍스트 추가
      if (context) {
        lastError.details = {
          ...lastError.details,
          context,
        };
      }

      // 오류 로깅
      ErrorHandler.logError(lastError, {
        attempt,
        maxRetries,
      });

      // 오류 콜백 실행
      if (onError) {
        onError(lastError, attempt);
      }

      // 재시도 불가능한 오류거나 마지막 시도인 경우
      if (!ErrorHandler.isRetryable(lastError) || attempt === maxRetries) {
        throw lastError;
      }

      // 재시도 전 대기
      const delay = ErrorHandler.getRetryDelay(lastError, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 타입 가드 함수들
 */
export function isConvexError(error: unknown): error is ConvexError {
  return error instanceof ConvexError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isExternalAPIError(error: unknown): error is ExternalAPIError {
  return error instanceof ExternalAPIError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isPaymentError(error: unknown): error is PaymentError {
  return error instanceof PaymentError;
}