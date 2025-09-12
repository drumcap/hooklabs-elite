/**
 * 중앙화된 에러 핸들링 시스템
 * 일관된 에러 처리 및 로깅 제공
 */

import { ConvexError } from "@/convex/lib/errors";

// 에러 타입 정의
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_API = 'EXTERNAL_API',
  DATABASE = 'DATABASE',
  INTERNAL = 'INTERNAL',
  NETWORK = 'NETWORK',
  PAYMENT = 'PAYMENT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}

// 에러 심각도 레벨
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 에러 메타데이터 인터페이스
interface ErrorMetadata {
  context?: string;
  userId?: string;
  requestId?: string;
  timestamp?: string;
  stack?: string;
  details?: any;
}

// 애플리케이션 에러 클래스
export class ApplicationError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly metadata: ErrorMetadata;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true,
    metadata: ErrorMetadata = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.severity = severity;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.metadata = {
      ...metadata,
      timestamp: metadata.timestamp || new Date().toISOString(),
    };

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      statusCode: this.statusCode,
      metadata: this.metadata,
      stack: this.stack,
    };
  }
}

// 에러 팩토리 함수들
export const ErrorFactory = {
  validation: (message: string, details?: any) =>
    new ApplicationError(
      message,
      ErrorType.VALIDATION,
      400,
      ErrorSeverity.LOW,
      true,
      { details }
    ),

  authentication: (message: string = '인증이 필요합니다') =>
    new ApplicationError(
      message,
      ErrorType.AUTHENTICATION,
      401,
      ErrorSeverity.MEDIUM
    ),

  authorization: (message: string = '권한이 없습니다') =>
    new ApplicationError(
      message,
      ErrorType.AUTHORIZATION,
      403,
      ErrorSeverity.MEDIUM
    ),

  notFound: (resource: string) =>
    new ApplicationError(
      `${resource}을(를) 찾을 수 없습니다`,
      ErrorType.NOT_FOUND,
      404,
      ErrorSeverity.LOW
    ),

  conflict: (message: string) =>
    new ApplicationError(
      message,
      ErrorType.CONFLICT,
      409,
      ErrorSeverity.LOW
    ),

  rateLimit: (limit: number, window: string) =>
    new ApplicationError(
      `요청 한도 초과: ${window}당 ${limit}회`,
      ErrorType.RATE_LIMIT,
      429,
      ErrorSeverity.LOW
    ),

  externalApi: (service: string, error: any) =>
    new ApplicationError(
      `외부 API 오류 (${service}): ${error.message || error}`,
      ErrorType.EXTERNAL_API,
      502,
      ErrorSeverity.HIGH,
      true,
      { details: { service, originalError: error } }
    ),

  database: (operation: string, error: any) =>
    new ApplicationError(
      `데이터베이스 오류 (${operation}): ${error.message || error}`,
      ErrorType.DATABASE,
      500,
      ErrorSeverity.HIGH,
      false,
      { details: { operation, originalError: error } }
    ),

  payment: (message: string, details?: any) =>
    new ApplicationError(
      message,
      ErrorType.PAYMENT,
      402,
      ErrorSeverity.HIGH,
      true,
      { details }
    ),

  quotaExceeded: (resource: string, limit: number) =>
    new ApplicationError(
      `${resource} 한도 초과: 최대 ${limit}`,
      ErrorType.QUOTA_EXCEEDED,
      429,
      ErrorSeverity.MEDIUM,
      true,
      { details: { resource, limit } }
    ),
};

// 에러 로거 인터페이스
interface ErrorLogger {
  log(error: Error | ApplicationError, context?: string): void;
  logWarning(message: string, metadata?: any): void;
  logInfo(message: string, metadata?: any): void;
}

// 기본 에러 로거 구현
class ConsoleErrorLogger implements ErrorLogger {
  log(error: Error | ApplicationError, context?: string): void {
    const timestamp = new Date().toISOString();
    const isAppError = error instanceof ApplicationError;
    
    if (isAppError && error.severity === ErrorSeverity.CRITICAL) {
      console.error(`🚨 [CRITICAL ERROR] ${timestamp}`, {
        context,
        error: error.toJSON(),
      });
    } else if (isAppError && error.severity === ErrorSeverity.HIGH) {
      console.error(`❌ [HIGH ERROR] ${timestamp}`, {
        context,
        error: error.toJSON(),
      });
    } else if (isAppError && error.severity === ErrorSeverity.MEDIUM) {
      console.warn(`⚠️ [MEDIUM ERROR] ${timestamp}`, {
        context,
        message: error.message,
        type: error.type,
      });
    } else {
      console.log(`ℹ️ [LOW ERROR] ${timestamp}`, {
        context,
        message: error.message,
      });
    }
  }

  logWarning(message: string, metadata?: any): void {
    console.warn(`⚠️ [WARNING] ${new Date().toISOString()}`, message, metadata);
  }

  logInfo(message: string, metadata?: any): void {
    console.info(`ℹ️ [INFO] ${new Date().toISOString()}`, message, metadata);
  }
}

// 에러 핸들러 클래스
export class ErrorHandler {
  private static logger: ErrorLogger = new ConsoleErrorLogger();
  private static metrics: Map<string, number> = new Map();

  /**
   * 에러 래핑 함수 - try-catch를 자동으로 처리
   */
  static async wrap<T>(
    operation: () => Promise<T>,
    context: string,
    options: {
      retry?: number;
      retryDelay?: number;
      fallback?: T;
    } = {}
  ): Promise<T> {
    const { retry = 0, retryDelay = 1000, fallback } = options;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.logInfo(`Retry attempt ${attempt} for ${context}`);
          await this.delay(retryDelay * attempt);
        }

        const result = await operation();
        
        // 성공 메트릭 기록
        this.recordMetric(`${context}.success`);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // 에러 메트릭 기록
        this.recordMetric(`${context}.error`);
        
        // 재시도 불가능한 에러는 즉시 throw
        if (error instanceof ApplicationError && !error.isOperational) {
          this.logger.log(error, context);
          throw error;
        }

        // 마지막 시도가 아니면 계속
        if (attempt < retry) {
          this.logger.logWarning(`Operation failed, retrying...`, {
            context,
            attempt: attempt + 1,
            maxRetries: retry,
          });
          continue;
        }

        // 로깅
        this.logger.log(lastError, context);

        // Fallback 사용 가능한 경우
        if (fallback !== undefined) {
          this.logger.logInfo(`Using fallback for ${context}`);
          return fallback;
        }

        // 에러를 ApplicationError로 변환
        if (!(lastError instanceof ApplicationError)) {
          throw new ApplicationError(
            lastError.message || 'Unknown error',
            ErrorType.INTERNAL,
            500,
            ErrorSeverity.HIGH,
            false,
            { context, details: { originalError: lastError } }
          );
        }

        throw lastError;
      }
    }

    // 이론적으로 도달할 수 없는 코드
    throw lastError || new Error('Unknown error in ErrorHandler.wrap');
  }

  /**
   * 동기 함수용 에러 래핑
   */
  static wrapSync<T>(
    operation: () => T,
    context: string,
    fallback?: T
  ): T {
    try {
      const result = operation();
      this.recordMetric(`${context}.success`);
      return result;
    } catch (error) {
      this.recordMetric(`${context}.error`);
      this.logger.log(error as Error, context);

      if (fallback !== undefined) {
        this.logger.logInfo(`Using fallback for ${context}`);
        return fallback;
      }

      throw error;
    }
  }

  /**
   * 에러 처리 및 응답 생성
   */
  static handle(error: Error | ApplicationError): {
    statusCode: number;
    body: {
      error: string;
      message: string;
      details?: any;
    };
  } {
    // ApplicationError인 경우
    if (error instanceof ApplicationError) {
      return {
        statusCode: error.statusCode,
        body: {
          error: error.type,
          message: error.message,
          details: error.isOperational ? error.metadata.details : undefined,
        },
      };
    }

    // ConvexError인 경우
    if (error instanceof ConvexError) {
      return {
        statusCode: error.statusCode,
        body: {
          error: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }

    // 일반 에러
    this.logger.log(error, 'UnhandledError');
    
    return {
      statusCode: 500,
      body: {
        error: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? '내부 서버 오류가 발생했습니다' 
          : error.message,
      },
    };
  }

  /**
   * 메트릭 기록
   */
  private static recordMetric(key: string): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
  }

  /**
   * 메트릭 조회
   */
  static getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * 메트릭 초기화
   */
  static resetMetrics(): void {
    this.metrics.clear();
  }

  /**
   * 지연 유틸리티
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 커스텀 로거 설정
   */
  static setLogger(logger: ErrorLogger): void {
    this.logger = logger;
  }
}

// 비동기 파이프라인 에러 핸들링
export function pipeline<T>(...operations: Array<(input: T) => Promise<T>>) {
  return async (initialValue: T): Promise<T> => {
    let result = initialValue;
    
    for (const [index, operation] of operations.entries()) {
      result = await ErrorHandler.wrap(
        () => operation(result),
        `Pipeline step ${index + 1}`,
        { retry: 2, retryDelay: 500 }
      );
    }
    
    return result;
  };
}

// Express/Next.js 미들웨어용 에러 핸들러
export function errorMiddleware(
  error: Error,
  req: any,
  res: any,
  next: any
): void {
  const response = ErrorHandler.handle(error);
  
  res.status(response.statusCode).json(response.body);
}

// 타입 가드 함수들
export const isApplicationError = (error: any): error is ApplicationError => {
  return error instanceof ApplicationError;
};

export const isOperationalError = (error: any): boolean => {
  return isApplicationError(error) && error.isOperational;
};

export const isCriticalError = (error: any): boolean => {
  return isApplicationError(error) && error.severity === ErrorSeverity.CRITICAL;
};

// Export all
export default ErrorHandler;