/**
 * Health Check API 엔드포인트
 * 애플리케이션의 상태를 모니터링하고 진단 정보를 제공합니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEnvironmentConfig } from '@/config/environments'

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
  }
  checks: {
    database: boolean
    authentication: boolean
    payment: boolean
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
  const serviceStatuses = Object.values(services).map(service => service.status)
  const checkResults = Object.values(checks)

  // 중요한 서비스가 완전히 실패한 경우
  if (services.convex.status === 'error' || !checks.database) {
    return 'unhealthy'
  }

  // 일부 서비스가 문제가 있는 경우
  if (serviceStatuses.some(status => status === 'error' || status === 'unavailable') ||
      checkResults.some(check => !check)) {
    return 'degraded'
  }

  return 'healthy'
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    const config = getEnvironmentConfig()
    
    // 서비스 상태 확인 (병렬 실행)
    const [convexHealth, clerkHealth, lemonSqueezyHealth] = await Promise.all([
      checkConvexHealth(),
      checkClerkHealth(),
      checkLemonSqueezyHealth()
    ])

    const services = {
      convex: convexHealth,
      clerk: clerkHealth,
      lemonsqueezy: lemonSqueezyHealth
    }

    // 체크 결과
    const checks = {
      database: convexHealth.status === 'connected',
      authentication: clerkHealth.status === 'available',
      payment: lemonSqueezyHealth.status === 'available'
    }

    // 시스템 정보
    const system = {
      uptime: Math.floor(process.uptime()),
      memory: getMemoryUsage(),
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    }

    const overallStatus = determineOverallStatus(services, checks)
    const processingTime = Date.now() - startTime

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: config.name,
      services,
      system,
      checks
    }

    // 상태에 따른 HTTP 상태 코드 결정
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503

    const response = NextResponse.json(healthStatus, { status: httpStatus })
    
    // 응답 헤더 설정
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('X-Health-Check', 'true')
    response.headers.set('X-Response-Time', `${processingTime}ms`)

    return response

  } catch (error) {
    console.error('Health check failed:', error)
    
    const errorResponse: Partial<HealthStatus> = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
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