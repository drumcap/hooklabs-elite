/**
 * 중앙화된 환경 변수 관리
 * 타입 안전성과 유효성 검증 제공
 */

import { z } from 'zod';

// 환경 변수 스키마 정의
const envSchema = z.object({
  // Node 환경
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Convex
  CONVEX_DEPLOYMENT: z.string().optional(),
  NEXT_PUBLIC_CONVEX_URL: z.string().optional(),
  
  // Clerk Auth
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  
  // Lemon Squeezy
  LEMONSQUEEZY_API_KEY: z.string().optional(),
  LEMONSQUEEZY_STORE_ID: z.string().optional(),
  LEMONSQUEEZY_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL: z.string().optional(),
  
  // AI APIs
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_API_URL: z.string().default('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent'),
  
  // Social Media APIs
  TWITTER_API_KEY: z.string().optional(),
  TWITTER_API_SECRET: z.string().optional(),
  THREADS_API_KEY: z.string().optional(),
  LINKEDIN_API_KEY: z.string().optional(),
  
  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  
  // Feature Flags
  ENABLE_ANALYTICS: z.string().default('false').transform(val => val === 'true'),
  ENABLE_SOCIAL_PUBLISHING: z.string().default('false').transform(val => val === 'true'),
  ENABLE_AI_GENERATION: z.string().default('true').transform(val => val === 'true'),
});

// 환경 변수 타입
export type EnvConfig = z.infer<typeof envSchema>;

// 환경 변수 파싱 및 검증
function parseEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(e => e.path.join('.')).join(', ');
      console.error('❌ 환경 변수 검증 실패:', missingVars);
      console.error('상세 오류:', error.format());
      
      // 개발 환경에서는 경고만, 프로덕션에서는 오류
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`필수 환경 변수가 설정되지 않았습니다: ${missingVars}`);
      }
    }
    throw error;
  }
}

// 싱글톤 인스턴스
let configInstance: EnvConfig | null = null;

/**
 * 환경 변수 설정 객체 가져오기
 * @returns 검증된 환경 변수 설정
 */
export function getConfig(): EnvConfig {
  if (!configInstance) {
    configInstance = parseEnv();
  }
  return configInstance;
}

// 편의를 위한 개별 export
export const config = getConfig();

// 환경별 헬퍼 함수
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isProduction = () => config.NODE_ENV === 'production';
export const isTest = () => config.NODE_ENV === 'test';

// Feature flag 헬퍼
export const features = {
  analytics: config.ENABLE_ANALYTICS,
  socialPublishing: config.ENABLE_SOCIAL_PUBLISHING,
  aiGeneration: config.ENABLE_AI_GENERATION,
};

// API 설정 헬퍼
export const apiConfig = {
  gemini: {
    apiKey: config.GEMINI_API_KEY,
    apiUrl: config.GEMINI_API_URL,
    enabled: !!config.GEMINI_API_KEY,
  },
  twitter: {
    apiKey: config.TWITTER_API_KEY,
    apiSecret: config.TWITTER_API_SECRET,
    enabled: !!config.TWITTER_API_KEY && !!config.TWITTER_API_SECRET,
  },
  threads: {
    apiKey: config.THREADS_API_KEY,
    enabled: !!config.THREADS_API_KEY,
  },
  linkedin: {
    apiKey: config.LINKEDIN_API_KEY,
    enabled: !!config.LINKEDIN_API_KEY,
  },
};

// Convex 설정
export const convexConfig = {
  deployment: config.CONVEX_DEPLOYMENT,
  url: config.NEXT_PUBLIC_CONVEX_URL,
};

// Clerk 설정
export const clerkConfig = {
  publishableKey: config.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey: config.CLERK_SECRET_KEY,
  webhookSecret: config.CLERK_WEBHOOK_SECRET,
};

// Lemon Squeezy 설정
export const lemonSqueezyConfig = {
  apiKey: config.LEMONSQUEEZY_API_KEY,
  storeId: config.LEMONSQUEEZY_STORE_ID,
  webhookSecret: config.LEMONSQUEEZY_WEBHOOK_SECRET,
  checkoutUrl: config.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL,
  enabled: !!config.LEMONSQUEEZY_API_KEY && !!config.LEMONSQUEEZY_STORE_ID,
};

/**
 * 환경 변수 검증 상태 확인
 * @returns 검증 상태 객체
 */
export function validateConfig() {
  const result = envSchema.safeParse(process.env);
  
  return {
    isValid: result.success,
    errors: result.success ? [] : result.error.issues,
    warnings: [],
    summary: {
      totalVars: Object.keys(envSchema.shape).length,
      setVars: Object.keys(process.env).filter(key => key in envSchema.shape).length,
      missingVars: result.success ? 0 : result.error.issues.length,
    }
  };
}

// 타입은 이미 위에서 export되었음