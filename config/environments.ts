/**
 * 환경별 설정 관리
 * 개발, 스테이징, 프로덕션 환경에 맞는 설정을 제공합니다.
 */

export type Environment = 'development' | 'staging' | 'production'

interface EnvironmentConfig {
  name: string
  apiUrl: string
  appUrl: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  enableAnalytics: boolean
  enableSentry: boolean
  rateLimit: {
    windowMs: number
    maxRequests: number
  }
  cache: {
    ttl: number
  }
  features: {
    enableDebugMode: boolean
    enablePerformanceMonitoring: boolean
    enableA11yChecks: boolean
  }
}

const environments: Record<Environment, EnvironmentConfig> = {
  development: {
    name: 'Development',
    apiUrl: process.env.NEXT_PUBLIC_CONVEX_URL || 'http://localhost:3001',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    logLevel: 'debug',
    enableAnalytics: false,
    enableSentry: false,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15분
      maxRequests: 1000, // 개발 환경에서는 제한을 느슨하게
    },
    cache: {
      ttl: 60, // 1분
    },
    features: {
      enableDebugMode: true,
      enablePerformanceMonitoring: false,
      enableA11yChecks: true,
    },
  },
  
  staging: {
    name: 'Staging',
    apiUrl: process.env.NEXT_PUBLIC_CONVEX_URL || '',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://staging-hooklabs-elite.vercel.app',
    logLevel: 'info',
    enableAnalytics: true,
    enableSentry: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15분
      maxRequests: 500,
    },
    cache: {
      ttl: 300, // 5분
    },
    features: {
      enableDebugMode: true,
      enablePerformanceMonitoring: true,
      enableA11yChecks: true,
    },
  },
  
  production: {
    name: 'Production',
    apiUrl: process.env.NEXT_PUBLIC_CONVEX_URL || '',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://hooklabs-elite.vercel.app',
    logLevel: 'warn',
    enableAnalytics: true,
    enableSentry: true,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15분
      maxRequests: 100,
    },
    cache: {
      ttl: 900, // 15분
    },
    features: {
      enableDebugMode: false,
      enablePerformanceMonitoring: true,
      enableA11yChecks: false,
    },
  },
}

// 현재 환경 감지
export function getCurrentEnvironment(): Environment {
  const nodeEnv = process.env.NODE_ENV
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV
  
  if (appEnv && ['development', 'staging', 'production'].includes(appEnv)) {
    return appEnv as Environment
  }
  
  if (nodeEnv === 'production') {
    return 'production'
  }
  
  if (nodeEnv === 'test') {
    return 'development'
  }
  
  return 'development'
}

// 현재 환경 설정 가져오기
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = getCurrentEnvironment()
  return environments[env]
}

// 특정 환경인지 확인하는 헬퍼 함수들
export const isDevelopment = () => getCurrentEnvironment() === 'development'
export const isStaging = () => getCurrentEnvironment() === 'staging'
export const isProduction = () => getCurrentEnvironment() === 'production'

// 브라우저 환경에서도 사용할 수 있는 클라이언트 설정
export const clientConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'HookLabs Elite',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  environment: getCurrentEnvironment(),
  ...getEnvironmentConfig(),
}

// 환경 변수 검증
export function validateEnvironmentVariables() {
  const requiredVars = [
    'NEXT_PUBLIC_CONVEX_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'LEMONSQUEEZY_API_KEY',
    'LEMONSQUEEZY_STORE_ID',
  ]
  
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env.local file and make sure all required variables are set.'
    )
  }
  
  // Convex URL 형식 검증
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (convexUrl && !convexUrl.startsWith('https://')) {
    console.warn('⚠️  CONVEX_URL should start with https://')
  }
  
  // Clerk key 형식 검증
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (clerkKey && !clerkKey.startsWith('pk_')) {
    throw new Error('Invalid Clerk publishable key format. Should start with pk_')
  }
  
  console.log(`✅ Environment validated: ${getCurrentEnvironment()}`)
}

// 개발 도구를 위한 환경 정보 출력
export function logEnvironmentInfo() {
  if (!isDevelopment()) return
  
  const config = getEnvironmentConfig()
  console.group('🏢 Environment Configuration')
  console.log('Environment:', getCurrentEnvironment())
  console.log('App URL:', config.appUrl)
  console.log('API URL:', config.apiUrl)
  console.log('Log Level:', config.logLevel)
  console.log('Analytics Enabled:', config.enableAnalytics)
  console.log('Sentry Enabled:', config.enableSentry)
  console.log('Features:', config.features)
  console.groupEnd()
}