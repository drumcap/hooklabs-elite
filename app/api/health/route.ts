/**
 * Health Check API 엔드포인트
 * 애플리케이션의 상태를 모니터링하고 진단 정보를 제공합니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cacheManager } from '@/lib/caching-strategy'
import { Redis } from '@upstash/redis'

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  environment: string
  services: {
    convex: {
      status: 'connected' | 'disconnected' | 'error'
      responseTime?: number
      error?: string
    }
    clerk: {
      status: 'available' | 'unavailable' | 'error'
      error?: string
    }
    lemonsqueezy: {
      status: 'available' | 'unavailable' | 'error'
      error?: string
    }
    redis: {
      status: 'connected' | 'disconnected' | 'error'
      responseTime?: number
      error?: string
    }
    ai: {
      gemini: {
        status: 'available' | 'unavailable' | 'error'
        error?: string
      }
      openai?: {
        status: 'available' | 'unavailable' | 'error'  
        error?: string
      }
    }
    social: {
      twitter: {
        status: 'configured' | 'not_configured' | 'error'
        error?: string
      }
      threads: {
        status: 'configured' | 'not_configured' | 'error'
        error?: string
      }
    }
  }
  system: {
    uptime: number
    memory: {
      used: number
      total: number
      percentage: number
    }
    node: {
      version: string
      platform: string
      arch: string
    }
    load?: {
      avg1: number
      avg5: number
      avg15: number
    }
    disk?: {
      free: number
      total: number
      percentage: number
    }
  }
  checks: {
    database: boolean
    authentication: boolean
    payment: boolean
    cache: boolean
    ai: boolean
    social: boolean
  }
  performance: {
    responseTime: number
    healthy_endpoints: number
    total_endpoints: number
  }
}

// Convex 연결 상태 확인
async function checkConvexHealth(): Promise<{ status: 'connected' | 'disconnected' | 'error', responseTime?: number, error?: string }> {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) {
      return { status: 'error', error: 'CONVEX_URL not configured' }
    }

    const startTime = Date.now()
    
    // Convex HTTP API를 통한 간단한 ping 테스트
    const response = await fetch(`${convexUrl.replace('wss://', 'https://')}/api/ping`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5초 타임아웃
    })
    
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      return { status: 'connected', responseTime }
    } else {
      return { status: 'error', error: `HTTP ${response.status}` }
    }
  } catch (error) {
    return { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Clerk 서비스 상태 확인
async function checkClerkHealth(): Promise<{ status: 'available' | 'unavailable' | 'error', error?: string }> {
  try {
    const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    if (!clerkKey) {
      return { status: 'error', error: 'Clerk not configured' }
    }

    // Clerk의 공개 키 형식이 올바른지 확인
    if (!clerkKey.startsWith('pk_')) {
      return { status: 'error', error: 'Invalid Clerk key format' }
    }

    return { status: 'available' }
  } catch (error) {
    return { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Lemon Squeezy 서비스 상태 확인
async function checkLemonSqueezyHealth(): Promise<{ status: 'available' | 'unavailable' | 'error', error?: string }> {
  try {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY
    const storeId = process.env.LEMONSQUEEZY_STORE_ID
    
    if (!apiKey || !storeId) {
      return { status: 'error', error: 'Lemon Squeezy not configured' }
    }

    // API 키 형식이 올바른지 확인
    if (!apiKey.startsWith('lsqls_')) {
      return { status: 'error', error: 'Invalid Lemon Squeezy API key format' }
    }

    return { status: 'available' }
  } catch (error) {
    return { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Redis 연결 상태 확인
async function checkRedisHealth(): Promise<{ status: 'connected' | 'disconnected' | 'error', responseTime?: number, error?: string }> {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return { status: 'error', error: 'Redis not configured' }
    }

    const startTime = Date.now()
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    
    // 간단한 ping 테스트
    const result = await redis.ping()
    const responseTime = Date.now() - startTime
    
    if (result === 'PONG') {
      return { status: 'connected', responseTime }
    } else {
      return { status: 'error', error: 'Invalid ping response' }
    }
  } catch (error) {
    return { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// AI 서비스 상태 확인
async function checkAIHealth(): Promise<{
  gemini: { status: 'available' | 'unavailable' | 'error', error?: string }
  openai?: { status: 'available' | 'unavailable' | 'error', error?: string }
}> {
  const result: any = { gemini: { status: 'unavailable' } }
  
  // Gemini 확인
  try {
    const geminiKey = process.env.GOOGLE_AI_API_KEY
    if (!geminiKey) {
      result.gemini = { status: 'error', error: 'Gemini API key not configured' }
    } else if (!geminiKey.startsWith('AI')) {
      result.gemini = { status: 'error', error: 'Invalid Gemini API key format' }
    } else {
      result.gemini = { status: 'available' }
    }
  } catch (error) {
    result.gemini = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
  
  // OpenAI 확인 (선택적)
  if (process.env.OPENAI_API_KEY) {
    try {
      const openaiKey = process.env.OPENAI_API_KEY
      if (!openaiKey.startsWith('sk-')) {
        result.openai = { status: 'error', error: 'Invalid OpenAI API key format' }
      } else {
        result.openai = { status: 'available' }
      }
    } catch (error) {
      result.openai = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
  
  return result
}

// 소셜 미디어 API 설정 확인
async function checkSocialHealth(): Promise<{
  twitter: { status: 'configured' | 'not_configured' | 'error', error?: string }
  threads: { status: 'configured' | 'not_configured' | 'error', error?: string }
}> {
  const result: any = {}
  
  // Twitter 설정 확인
  try {
    const twitterClientId = process.env.TWITTER_CLIENT_ID
    const twitterClientSecret = process.env.TWITTER_CLIENT_SECRET
    
    if (!twitterClientId || !twitterClientSecret) {
      result.twitter = { status: 'not_configured' }
    } else {
      result.twitter = { status: 'configured' }
    }
  } catch (error) {
    result.twitter = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
  
  // Threads 설정 확인
  try {
    const metaAppId = process.env.META_APP_ID
    const metaAppSecret = process.env.META_APP_SECRET
    
    if (!metaAppId || !metaAppSecret) {
      result.threads = { status: 'not_configured' }
    } else {
      result.threads = { status: 'configured' }
    }
  } catch (error) {
    result.threads = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
  
  return result
}

// 시스템 로드 평균 (Linux/macOS)
function getLoadAverage() {
  try {
    const loadAvg = require('os').loadavg()
    return {
      avg1: Math.round(loadAvg[0] * 100) / 100,
      avg5: Math.round(loadAvg[1] * 100) / 100,
      avg15: Math.round(loadAvg[2] * 100) / 100,
    }
  } catch {
    return undefined
  }
}

// 디스크 사용량 (간단 버전)
function getDiskUsage() {
  try {
    const fs = require('fs')
    const stats = fs.statSync('/')
    return {
      free: Math.round(stats.free / 1024 / 1024 / 1024), // GB
      total: Math.round(stats.size / 1024 / 1024 / 1024), // GB
      percentage: Math.round(((stats.size - stats.free) / stats.size) * 100)
    }
  } catch {
    return undefined
  }
}

// 엔드포인트별 헬스체크
async function checkEndpointsHealth(): Promise<{ healthy: number, total: number }> {
  const endpoints = [
    { path: '/api/convex', critical: true },
    { path: '/api/auth', critical: true },
    { path: '/api/payment', critical: false },
    { path: '/api/ai', critical: false },
  ]
  
  let healthyCount = 0
  const total = endpoints.length
  
  // 간단한 가용성 체크 (실제 요청은 하지 않고 설정만 확인)
  for (const endpoint of endpoints) {
    try {
      // 여기서는 단순히 설정 기반으로 판단
      if (endpoint.path === '/api/convex' && process.env.NEXT_PUBLIC_CONVEX_URL) {
        healthyCount++
      } else if (endpoint.path === '/api/auth' && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
        healthyCount++
      } else if (endpoint.path === '/api/payment' && process.env.LEMONSQUEEZY_API_KEY) {
        healthyCount++
      } else if (endpoint.path === '/api/ai' && process.env.GOOGLE_AI_API_KEY) {
        healthyCount++
      }
    } catch {
      // 에러 발생시 건강하지 않은 것으로 간주
    }
  }
  
  return { healthy: healthyCount, total }
}

// 메모리 사용량 계산
function getMemoryUsage() {
  const used = process.memoryUsage()
  return {
    used: Math.round(used.heapUsed / 1024 / 1024), // MB
    total: Math.round(used.heapTotal / 1024 / 1024), // MB
    percentage: Math.round((used.heapUsed / used.heapTotal) * 100)
  }
}

// 전체 상태 결정
function determineOverallStatus(services: HealthStatus['services'], checks: HealthStatus['checks']): 'healthy' | 'unhealthy' | 'degraded' {
  // 중요한 서비스가 완전히 실패한 경우
  if (services.convex.status === 'error' || !checks.database) {
    return 'unhealthy'
  }

  // 인증 서비스 실패
  if (services.clerk.status === 'error' || !checks.authentication) {
    return 'unhealthy'
  }

  // 일부 중요하지 않은 서비스가 문제가 있는 경우
  let hasIssues = false
  
  // Redis 문제
  if (services.redis.status === 'error' || !checks.cache) {
    hasIssues = true
  }
  
  // 결제 서비스 문제
  if (services.lemonsqueezy.status === 'error') {
    hasIssues = true
  }
  
  // AI 서비스 문제
  if (services.ai.gemini.status === 'error') {
    hasIssues = true
  }

  return hasIssues ? 'degraded' : 'healthy'
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // 서비스 상태 확인 (병렬 실행)
    const [
      convexHealth, 
      clerkHealth, 
      lemonSqueezyHealth,
      redisHealth,
      aiHealth,
      socialHealth,
      endpointsHealth
    ] = await Promise.all([
      checkConvexHealth(),
      checkClerkHealth(),
      checkLemonSqueezyHealth(),
      checkRedisHealth(),
      checkAIHealth(),
      checkSocialHealth(),
      checkEndpointsHealth()
    ])

    const services = {
      convex: convexHealth,
      clerk: clerkHealth,
      lemonsqueezy: lemonSqueezyHealth,
      redis: redisHealth,
      ai: aiHealth,
      social: socialHealth
    }

    // 체크 결과
    const checks = {
      database: convexHealth.status === 'connected',
      authentication: clerkHealth.status === 'available',
      payment: lemonSqueezyHealth.status === 'available',
      cache: redisHealth.status === 'connected',
      ai: aiHealth.gemini.status === 'available',
      social: socialHealth.twitter.status === 'configured' || socialHealth.threads.status === 'configured'
    }

    // 시스템 정보
    const system = {
      uptime: Math.floor(process.uptime()),
      memory: getMemoryUsage(),
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      },
      load: getLoadAverage(),
      disk: getDiskUsage()
    }

    const overallStatus = determineOverallStatus(services, checks)
    const processingTime = Date.now() - startTime

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'unknown',
      services,
      system,
      checks,
      performance: {
        responseTime: processingTime,
        healthy_endpoints: endpointsHealth.healthy,
        total_endpoints: endpointsHealth.total
      }
    }

    // 상태에 따른 HTTP 상태 코드 결정
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503

    const response = NextResponse.json(healthStatus, { status: httpStatus })
    
    // 응답 헤더 설정
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('X-Health-Check', 'true')
    response.headers.set('X-Response-Time', `${processingTime}ms`)
    response.headers.set('X-Health-Status', overallStatus)

    return response

  } catch (error) {
    console.error('Health check failed:', error)
    
    const errorResponse: Partial<HealthStatus> = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'unknown',
    }

    return NextResponse.json(errorResponse, { status: 503 })
  }
}

// HEAD 요청 지원 (간단한 상태 확인용)
export async function HEAD(request: NextRequest) {
  try {
    const convexHealth = await checkConvexHealth()
    const status = convexHealth.status === 'connected' ? 200 : 503
    
    return new NextResponse(null, { 
      status,
      headers: {
        'X-Health-Status': convexHealth.status,
        'Cache-Control': 'no-cache'
      }
    })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}