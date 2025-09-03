/**
 * 구조화된 로깅 시스템
 * 환경별로 다른 로그 레벨과 출력 형식을 제공합니다.
 */

import { getEnvironmentConfig } from '@/config/environments'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: Error
  userId?: string
  requestId?: string
  performance?: {
    duration: number
    memory: number
  }
}

class Logger {
  private config = getEnvironmentConfig()
  private context: Record<string, any> = {}

  constructor() {
    // 브라우저 환경에서는 간소화된 로깅
    if (typeof window !== 'undefined') {
      this.setupClientLogging()
    } else {
      this.setupServerLogging()
    }
  }

  // 서버사이드 로깅 설정
  private setupServerLogging() {
    // 프로덕션에서는 JSON 형태로 구조화된 로그 출력
    if (this.config.name === 'Production') {
      this.enableStructuredLogging()
    }
  }

  // 클라이언트사이드 로깅 설정
  private setupClientLogging() {
    // 브라우저에서는 더 간단한 로깅
    if (this.config.name === 'Production') {
      // 프로덕션에서는 warn 이상만 콘솔에 출력
      this.overrideConsole()
    }
  }

  // 구조화된 로깅 활성화
  private enableStructuredLogging() {
    // JSON 형태로 로그 출력하도록 설정
  }

  // 프로덕션에서 콘솔 오버라이드
  private overrideConsole() {
    const originalConsole = { ...console }
    
    console.log = () => {} // 프로덕션에서는 log 비활성화
    console.debug = () => {} // debug 비활성화
    
    console.warn = (...args) => {
      this.warn(args.join(' '))
    }
    
    console.error = (...args) => {
      this.error(args.join(' '))
    }
  }

  // 로그 레벨 확인
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    }
    
    const configLevel = this.config.logLevel
    return levels[level] >= levels[configLevel]
  }

  // 로그 엔트리 생성
  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...context },
    }

    if (error) {
      entry.error = error
    }

    // 성능 정보 추가 (Edge Runtime 호환)
    if (typeof process !== 'undefined' && typeof process.memoryUsage === 'function') {
      try {
        const memUsage = process.memoryUsage()
        entry.performance = {
          duration: 0, // Edge Runtime에서는 hrtime 사용 불가
          memory: Math.round(memUsage.heapUsed / 1024 / 1024) // MB
        }
      } catch (error) {
        // Edge Runtime에서는 memoryUsage 사용 불가능할 수 있음
        entry.performance = {
          duration: 0,
          memory: 0
        }
      }
    }

    return entry
  }

  // 로그 출력
  private output(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) {
      return
    }

    const isServer = typeof window === 'undefined'
    const isProduction = this.config.name === 'Production'

    if (isServer && isProduction) {
      // 서버 프로덕션: JSON 구조화 로그
      console.log(JSON.stringify(entry))
    } else if (isServer) {
      // 서버 개발: 포맷된 로그
      this.outputFormatted(entry)
    } else {
      // 클라이언트: 브라우저 콘솔 스타일
      this.outputBrowser(entry)
    }

    // 외부 로깅 서비스로 전송 (Sentry, DataDog 등)
    if (entry.level === 'error' && isProduction) {
      this.sendToExternalLogger(entry)
    }
  }

  // 포맷된 로그 출력 (개발 환경)
  private outputFormatted(entry: LogEntry) {
    const colors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    }
    const reset = '\x1b[0m'
    
    const prefix = `${colors[entry.level]}[${entry.level.toUpperCase()}]${reset}`
    const timestamp = `\x1b[90m${entry.timestamp}${reset}`
    
    console.log(`${prefix} ${timestamp} ${entry.message}`)
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log('  Context:', entry.context)
    }
    
    if (entry.error) {
      console.log('  Error:', entry.error.stack || entry.error.message)
    }
    
    if (entry.performance) {
      console.log(`  Performance: ${entry.performance.duration.toFixed(2)}ms, Memory: ${entry.performance.memory}MB`)
    }
  }

  // 브라우저 콘솔 출력
  private outputBrowser(entry: LogEntry) {
    const styles = {
      debug: 'color: #888',
      info: 'color: #2196F3',
      warn: 'color: #FF9800',
      error: 'color: #F44336; font-weight: bold',
    }

    const method = entry.level === 'debug' ? console.log :
                  entry.level === 'info' ? console.log :
                  entry.level === 'warn' ? console.warn : console.error

    method(`%c[${entry.level.toUpperCase()}] ${entry.message}`, styles[entry.level])
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log('Context:', entry.context)
    }
    
    if (entry.error) {
      console.error('Error:', entry.error)
    }
  }

  // 외부 로깅 서비스로 전송
  private async sendToExternalLogger(entry: LogEntry) {
    try {
      // Sentry
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(entry.error || new Error(entry.message), {
          level: entry.level,
          contexts: {
            app: entry.context
          }
        })
      }

      // DataDog, LogRocket 등 다른 서비스도 여기에 추가 가능
    } catch (error) {
      // 외부 로깅 실패는 조용히 무시
      console.warn('Failed to send log to external service:', error)
    }
  }

  // 컨텍스트 설정
  setContext(context: Record<string, any>) {
    this.context = { ...this.context, ...context }
    return this
  }

  // 컨텍스트 초기화
  clearContext() {
    this.context = {}
    return this
  }

  // 로그 메서드들
  debug(message: string, context?: Record<string, any>) {
    this.output(this.createLogEntry('debug', message, context))
  }

  info(message: string, context?: Record<string, any>) {
    this.output(this.createLogEntry('info', message, context))
  }

  warn(message: string, context?: Record<string, any>) {
    this.output(this.createLogEntry('warn', message, context))
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.output(this.createLogEntry('error', message, context, error))
  }

  // 성능 측정을 위한 타이머
  time(label: string) {
    const startTime = Date.now()
    
    return {
      end: (message?: string) => {
        const duration = Date.now() - startTime
        this.info(message || `Timer ${label} completed`, {
          timer: label,
          duration: `${duration}ms`
        })
        return duration
      }
    }
  }

  // HTTP 요청 로깅
  request(method: string, url: string, status: number, duration: number, context?: Record<string, any>) {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
    
    this.output(this.createLogEntry(level, `${method} ${url} ${status}`, {
      http: {
        method,
        url,
        status,
        duration: `${duration}ms`
      },
      ...context
    }))
  }

  // 사용자 액션 로깅
  userAction(action: string, userId?: string, context?: Record<string, any>) {
    this.info(`User action: ${action}`, {
      user: {
        id: userId,
        action
      },
      ...context
    })
  }

  // 비즈니스 이벤트 로깅
  businessEvent(event: string, data: Record<string, any>) {
    this.info(`Business event: ${event}`, {
      business: {
        event,
        data
      }
    })
  }
}

// 싱글톤 인스턴스
const logger = new Logger()

export { logger }
export default logger

// 타입 선언 (브라우저 환경용)
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void
    }
  }
}