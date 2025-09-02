import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { securityCheck } from '@/lib/security/rate-limit'
import logger from '@/lib/monitoring/logger'

// 보호된 경로 정의
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/convex(.*)', 
  '/api/payment(.*)',
  '/api/admin(.*)'
])

// 인증이 필요없는 API 경로
const isPublicApiRoute = createRouteMatcher([
  '/api/health',
  '/api/webhooks(.*)',
  '/api/clerk-users-webhook',
  '/api/lemonsqueezy-webhook'
])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const startTime = Date.now()
  const { pathname } = req.nextUrl
  
  try {
    // 1. 보안 검사 (Rate Limiting, DDoS 방어)
    const securityResponse = await securityCheck(req)
    if (securityResponse) {
      logRequest(req, securityResponse.status, Date.now() - startTime, 'Security blocked')
      return securityResponse
    }

    // 2. 헬스체크는 인증 우회
    if (pathname === '/api/health') {
      logRequest(req, 200, Date.now() - startTime, 'Health check')
      return NextResponse.next()
    }

    // 3. 웹훅은 인증 우회 (자체 검증 로직 있음)
    if (isPublicApiRoute(req)) {
      logRequest(req, 200, Date.now() - startTime, 'Public API')
      return NextResponse.next()
    }

    // 4. 보호된 경로에 대한 인증 검사
    if (isProtectedRoute(req)) {
      try {
        const { userId } = await auth.protect()
        
        // 인증된 사용자 정보를 헤더에 추가 (Rate Limiting에서 사용)
        const response = NextResponse.next()
        response.headers.set('x-user-id', userId || '')
        
        logRequest(req, 200, Date.now() - startTime, `Authenticated: ${userId}`)
        return response
        
      } catch (error) {
        // 인증 실패 시 로그인 페이지로 리디렉션
        const signInUrl = new URL('/sign-in', req.url)
        signInUrl.searchParams.set('redirect_url', pathname)
        
        logRequest(req, 302, Date.now() - startTime, 'Authentication required')
        return NextResponse.redirect(signInUrl)
      }
    }

    // 5. 일반 요청 처리
    logRequest(req, 200, Date.now() - startTime, 'Public route')
    return NextResponse.next()

  } catch (error) {
    // 미들웨어 에러 처리
    logger.error('Middleware error', error instanceof Error ? error : new Error(String(error)), {
      pathname,
      method: req.method,
      userAgent: req.headers.get('user-agent'),
    })

    // 에러 시 기본 응답
    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'MIDDLEWARE_ERROR'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

// 요청 로깅 함수
function logRequest(req: NextRequest, status: number, duration: number, note?: string) {
  const { pathname, search } = req.nextUrl
  const method = req.method
  const userAgent = req.headers.get('user-agent') || 'Unknown'
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
           req.headers.get('x-real-ip') || 
           req.ip || 'Unknown'

  // API 요청만 로깅 (정적 파일 제외)
  if (pathname.startsWith('/api/') || pathname.startsWith('/dashboard')) {
    logger.request(method, `${pathname}${search}`, status, duration, {
      ip,
      userAgent: userAgent.substring(0, 100), // 길이 제한
      note
    })
  }
}

export const config = {
  matcher: [
    // Next.js 내부 파일과 정적 파일 제외, 검색 매개변수에 있는 경우는 제외
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    
    // API 및 tRPC 경로 항상 실행
    '/(api|trpc)(.*)',
    
    // 대시보드 경로도 항상 실행  
    '/dashboard(.*)',
  ],
}