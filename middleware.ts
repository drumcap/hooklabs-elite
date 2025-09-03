import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { 
  defaultRateLimit, 
  authRateLimit, 
  paymentRateLimit,
  aiRateLimit,
  shouldBypassRateLimit,
  getClientIP 
} from '@/lib/rate-limiting'
import { 
  applyCORS, 
  applySecurityHeaders, 
  InputValidator,
  SecurityAuditLogger 
} from '@/lib/security'

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

// Rate Limit 적용 경로별 설정
const isAuthRoute = createRouteMatcher(['/api/auth(.*)', '/api/login', '/api/register'])
const isPaymentRoute = createRouteMatcher(['/api/payment(.*)', '/api/lemonsqueezy(.*)'])
const isAIRoute = createRouteMatcher(['/api/ai(.*)', '/api/generate(.*)'])
const isUploadRoute = createRouteMatcher(['/api/upload(.*)'])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const startTime = Date.now()
  const { pathname } = req.nextUrl
  const ip = getClientIP(req)
  
  try {
    // 1. OPTIONS 요청 처리 (CORS Preflight)
    if (req.method === 'OPTIONS') {
      const corsResponse = applyCORS(req, new NextResponse(null, { status: 200 }))
      return applySecurityHeaders(corsResponse)
    }

    // 2. Rate Limiting 우회 조건 확인
    if (!shouldBypassRateLimit(req)) {
      // 경로별 Rate Limit 적용
      let rateLimitResponse = null
      
      if (isAuthRoute(req)) {
        rateLimitResponse = await authRateLimit(req)
      } else if (isPaymentRoute(req)) {
        rateLimitResponse = await paymentRateLimit(req)
      } else if (isAIRoute(req)) {
        rateLimitResponse = await aiRateLimit(req)
      } else if (pathname.startsWith('/api/')) {
        rateLimitResponse = await defaultRateLimit(req)
      }

      if (rateLimitResponse) {
        SecurityAuditLogger.logRateLimitExceeded(pathname, req)
        logRequest(req, rateLimitResponse.status, Date.now() - startTime, 'Rate limit exceeded')
        return applySecurityHeaders(applyCORS(req, rateLimitResponse))
      }
    }

    // 3. 입력 검증 (POST/PUT/PATCH 요청)
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        const body = await req.clone().text()
        if (body) {
          const validation = InputValidator.validate(body, {
            maxLength: 1000000, // 1MB
            allowHTML: pathname.includes('/content/'), // 콘텐츠 API에서만 HTML 허용
          })

          if (!validation.isValid) {
            // 보안 위험 로깅
            if (validation.errors.some(e => e.includes('SQL') || e.includes('XSS'))) {
              SecurityAuditLogger.logSuspiciousActivity(
                `Input validation failed: ${validation.errors.join(', ')}`,
                req
              )
            }

            const errorResponse = NextResponse.json(
              {
                error: 'Invalid input',
                message: '입력 데이터가 유효하지 않습니다.',
                details: validation.errors,
              },
              { status: 400 }
            )
            
            return applySecurityHeaders(applyCORS(req, errorResponse))
          }
        }
      } catch (error) {
        // Body parsing 실패는 무시 (다른 미들웨어에서 처리)
      }
    }

    // 4. 헬스체크는 인증 우회
    if (pathname === '/api/health') {
      logRequest(req, 200, Date.now() - startTime, 'Health check')
      const response = NextResponse.next()
      return applySecurityHeaders(applyCORS(req, response))
    }

    // 5. 웹훅은 인증 우회 (자체 검증 로직 있음)
    if (isPublicApiRoute(req)) {
      logRequest(req, 200, Date.now() - startTime, 'Public API')
      const response = NextResponse.next()
      return applySecurityHeaders(applyCORS(req, response))
    }

    // 6. 보호된 경로에 대한 인증 검사
    if (isProtectedRoute(req)) {
      try {
        const { userId } = await auth.protect()
        
        // 인증된 사용자 정보를 헤더에 추가
        const response = NextResponse.next()
        response.headers.set('x-user-id', userId || '')
        response.headers.set('x-client-ip', ip)
        
        logRequest(req, 200, Date.now() - startTime, `Authenticated: ${userId}`)
        return applySecurityHeaders(applyCORS(req, response))
        
      } catch (error) {
        SecurityAuditLogger.logUnauthorizedAccess(pathname, req)
        
        // API 요청인 경우 401 반환
        if (pathname.startsWith('/api/')) {
          const errorResponse = NextResponse.json(
            {
              error: 'Unauthorized',
              message: '인증이 필요합니다.',
            },
            { status: 401 }
          )
          
          logRequest(req, 401, Date.now() - startTime, 'Authentication required')
          return applySecurityHeaders(applyCORS(req, errorResponse))
        }

        // 웹 페이지인 경우 로그인 페이지로 리디렉션
        const signInUrl = new URL('/sign-in', req.url)
        signInUrl.searchParams.set('redirect_url', pathname)
        
        logRequest(req, 302, Date.now() - startTime, 'Authentication required')
        return NextResponse.redirect(signInUrl)
      }
    }

    // 7. 일반 요청 처리
    logRequest(req, 200, Date.now() - startTime, 'Public route')
    const response = NextResponse.next()
    return applySecurityHeaders(applyCORS(req, response))

  } catch (error) {
    // 미들웨어 에러 처리
    console.error('Middleware error:', error, {
      pathname,
      method: req.method,
      userAgent: req.headers.get('user-agent'),
      ip,
    })

    // 에러 로깅
    SecurityAuditLogger.logSuspiciousActivity(
      `Middleware error: ${error instanceof Error ? error.message : String(error)}`,
      req
    )

    // 에러 시 기본 응답
    const errorResponse = new NextResponse(
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

    return applySecurityHeaders(applyCORS(req, errorResponse))
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