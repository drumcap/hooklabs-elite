// ======================
// 레디니스 프로브 API 엔드포인트
// HookLabs Elite - 소셜 미디어 자동화 플랫폼
// Kubernetes 레디니스 프로브 전용 (라이브니스보다 빠르고 간단)
// ======================

import { NextRequest, NextResponse } from 'next/server';

// 간단한 레디니스 상태
interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
  checks: {
    server: boolean;
    environment: boolean;
    essential_config: boolean;
  };
}

// 간단한 환경 변수 확인
function checkEssentialConfig(): boolean {
  const required = [
    'NEXT_PUBLIC_CONVEX_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  ];
  
  return required.every(key => Boolean(process.env[key]));
}

export async function GET(request: NextRequest) {
  try {
    const readinessStatus: ReadinessStatus = {
      ready: true,
      timestamp: new Date().toISOString(),
      checks: {
        server: true, // 서버가 실행 중이므로 true
        environment: Boolean(process.env.NODE_ENV),
        essential_config: checkEssentialConfig()
      }
    };

    // 모든 체크가 통과했는지 확인
    const allChecksPass = Object.values(readinessStatus.checks).every(Boolean);
    readinessStatus.ready = allChecksPass;

    const statusCode = readinessStatus.ready ? 200 : 503;

    return NextResponse.json(readinessStatus, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Readiness-Check': 'true',
        'X-Ready': readinessStatus.ready.toString()
      }
    });

  } catch (error) {
    console.error('Readiness check error:', error);
    
    const errorStatus: ReadinessStatus = {
      ready: false,
      timestamp: new Date().toISOString(),
      checks: {
        server: false,
        environment: false,
        essential_config: false
      }
    };

    return NextResponse.json(errorStatus, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Readiness-Check': 'error'
      }
    });
  }
}

// HEAD 요청 지원 (더 빠른 체크용)
export async function HEAD(request: NextRequest) {
  try {
    const isReady = checkEssentialConfig();
    
    return new NextResponse(null, { 
      status: isReady ? 200 : 503,
      headers: {
        'X-Ready': isReady.toString(),
        'Cache-Control': 'no-cache'
      }
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}