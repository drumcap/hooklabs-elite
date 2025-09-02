/**
 * Rate Limiting 시스템
 * API 요청 제한 및 DDoS 방어를 위한 미들웨어
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEnvironmentConfig } from '@/config/environments'

const config = getEnvironmentConfig()

// 메모리 기반 Rate Limiter (개발용)
class MemoryRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    
    // 메모리 정리를 위한 주기적 클린업
    setInterval(() => this.cleanup(), windowMs)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key)
      }
    }
  }

  check(identifier: string): { allowed: boolean; limit: number; remaining: number; resetTime: number } {
    const now = Date.now()
    const windowStart = now
    const windowEnd = now + this.windowMs
    
    let requestData = this.requests.get(identifier)
    
    if (!requestData || now > requestData.resetTime) {
      requestData = { count: 0, resetTime: windowEnd }
      this.requests.set(identifier, requestData)
    }
    
    requestData.count++
    
    const allowed = requestData.count <= this.maxRequests
    const remaining = Math.max(0, this.maxRequests - requestData.count)
    
    return {
      allowed,
      limit: this.maxRequests,
      remaining,
      resetTime: requestData.resetTime
    }
  }
}

// Redis 기반 Rate Limiter (프로덕션용)
class RedisRateLimiter {
  private windowMs: number
  private maxRequests: number
  private redis: any

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    this.initRedis()
  }

  private async initRedis() {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        const { Redis } = await import('@upstash/redis')
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
      } catch (error) {
        console.warn('Redis 연결 실패, 메모리 기반 Rate Limiter 사용:', error)
      }
    }
  }

  async check(identifier: string): Promise<{ allowed: boolean; limit: number; remaining: number; resetTime: number }> {
    if (!this.redis) {
      // Redis가 없으면 메모리 기반으로 폴백
      const fallback = new MemoryRateLimiter(this.windowMs, this.maxRequests)
      return fallback.check(identifier)
    }

    const now = Date.now()
    const window = Math.floor(now / this.windowMs)
    const key = `rate_limit:${identifier}:${window}`
    
    try {
      // Sliding window 알고리즘 구현
      const pipeline = this.redis.pipeline()
      pipeline.incr(key)
      pipeline.expire(key, Math.ceil(this.windowMs / 1000))
      
      const results = await pipeline.exec()
      const count = results[0] as number
      
      const allowed = count <= this.maxRequests
      const remaining = Math.max(0, this.maxRequests - count)
      const resetTime = (window + 1) * this.windowMs
      
      return { allowed, limit: this.maxRequests, remaining, resetTime }
    } catch (error) {
      console.error('Redis Rate Limiter 오류:', error)
      // 에러 시 요청 허용 (Fail Open)
      return { allowed: true, limit: this.maxRequests, remaining: this.maxRequests, resetTime: now + this.windowMs }
    }
  }
}

// Rate Limiter 인스턴스 생성
const rateLimiter = config.name === 'Production' 
  ? new RedisRateLimiter(config.rateLimit.windowMs, config.rateLimit.maxRequests)
  : new MemoryRateLimiter(config.rateLimit.windowMs, config.rateLimit.maxRequests)

// 클라이언트 식별자 생성
function getClientIdentifier(request: NextRequest): string {
  // 사용자 인증 정보가 있으면 사용자 ID 우선 사용
  const userId = request.headers.get('x-user-id')
  if (userId) {
    return `user:${userId}`
  }

  // IP 주소 추출 (프록시 환경 고려)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0] || realIp || request.ip || 'unknown'
  
  return `ip:${ip}`
}

// 특별한 제한이 필요한 경로별 설정
const endpointLimits: Record<string, { windowMs: number; maxRequests: number }> = {
  '/api/auth': { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 인증: 15분에 10회
  '/api/payment': { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 결제: 1시간에 5회  
  '/api/convex': { windowMs: 5 * 60 * 1000, maxRequests: 100 }, // DB: 5분에 100회
  '/api/health': { windowMs: 60 * 1000, maxRequests: 60 }, // Health: 1분에 60회
}

// Rate Limiter 미들웨어
export async function rateLimit(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname
  const identifier = getClientIdentifier(request)
  
  // Rate Limit 적용 대상 확인
  if (!pathname.startsWith('/api/')) {
    return null // API 경로가 아니면 제한 없음
  }

  // 헬스체크는 제한 완화
  if (pathname === '/api/health' && request.method === 'HEAD') {
    return null
  }

  // 경로별 커스텀 제한 적용
  let limiter = rateLimiter
  const endpointKey = Object.keys(endpointLimits).find(key => pathname.startsWith(key))
  
  if (endpointKey) {
    const customLimit = endpointLimits[endpointKey]
    limiter = config.name === 'Production'
      ? new RedisRateLimiter(customLimit.windowMs, customLimit.maxRequests) 
      : new MemoryRateLimiter(customLimit.windowMs, customLimit.maxRequests)
  }

  // Rate Limit 확인
  const result = await (limiter as any).check(identifier)
  
  if (!result.allowed) {
    // 제한 초과 시 429 응답
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `API 요청 한도를 초과했습니다. ${new Date(result.resetTime).toLocaleString()}에 다시 시도해주세요.`,
        code: 'RATE_LIMIT_EXCEEDED'
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  // 성공 시 Rate Limit 헤더 추가용 정보 반환
  return NextResponse.next({
    headers: {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(), 
      'X-RateLimit-Reset': result.resetTime.toString(),
    }
  })
}

// IP 화이트리스트 (관리자, 모니터링 서비스 등)
const whitelist = new Set([
  '127.0.0.1',
  '::1',
  // Vercel 서버 IP들은 동적이므로 실제로는 헤더 검증 사용
])

// 화이트리스트 확인
export function isWhitelisted(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
           request.headers.get('x-real-ip') || 
           request.ip || ''
           
  if (whitelist.has(ip)) {
    return true
  }

  // Vercel 내부 요청 확인
  const vercelId = request.headers.get('x-vercel-id')
  if (vercelId && process.env.VERCEL) {
    return true
  }

  return false
}

// DDoS 탐지 및 차단
export class DDoSProtection {
  private suspiciousIPs = new Map<string, { count: number; firstSeen: number }>()
  private blockedIPs = new Set<string>()
  private readonly SUSPICIOUS_THRESHOLD = 1000 // 10분에 1000회 이상
  private readonly SUSPICIOUS_WINDOW = 10 * 60 * 1000 // 10분
  private readonly BLOCK_DURATION = 60 * 60 * 1000 // 1시간

  checkRequest(request: NextRequest): { blocked: boolean; reason?: string } {
    const ip = getClientIdentifier(request)
    const now = Date.now()

    // 이미 차단된 IP 확인
    if (this.blockedIPs.has(ip)) {
      return { blocked: true, reason: 'IP blocked due to suspicious activity' }
    }

    // 의심스러운 패턴 확인
    const suspicious = this.suspiciousIPs.get(ip)
    if (suspicious) {
      if (now - suspicious.firstSeen > this.SUSPICIOUS_WINDOW) {
        // 시간 윈도우 초과, 카운터 리셋
        this.suspiciousIPs.set(ip, { count: 1, firstSeen: now })
      } else {
        suspicious.count++
        
        if (suspicious.count > this.SUSPICIOUS_THRESHOLD) {
          // DDoS 의심, IP 차단
          this.blockedIPs.add(ip)
          this.suspiciousIPs.delete(ip)
          
          // 일정 시간 후 차단 해제
          setTimeout(() => {
            this.blockedIPs.delete(ip)
          }, this.BLOCK_DURATION)
          
          console.warn(`DDoS 의심 IP 차단: ${ip}`)
          return { blocked: true, reason: 'DDoS protection triggered' }
        }
      }
    } else {
      this.suspiciousIPs.set(ip, { count: 1, firstSeen: now })
    }

    return { blocked: false }
  }
}

export const ddosProtection = new DDoSProtection()

// 종합 보안 체크
export async function securityCheck(request: NextRequest): Promise<NextResponse | null> {
  // 1. 화이트리스트 확인
  if (isWhitelisted(request)) {
    return null
  }

  // 2. DDoS 방어
  const ddosCheck = ddosProtection.checkRequest(request)
  if (ddosCheck.blocked) {
    return new NextResponse(
      JSON.stringify({
        error: 'Access blocked',
        message: '보안상의 이유로 접근이 차단되었습니다.',
        code: 'SECURITY_BLOCK'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // 3. Rate Limiting
  return await rateLimit(request)
}