import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    // Clerk 기반 관리자 권한 확인
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 환경 변수를 통한 추가 보안 검증
    const adminSecret = process.env.ADMIN_MIGRATION_SECRET;
    if (!adminSecret) {
      console.error('ADMIN_MIGRATION_SECRET environment variable not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Authorization 헤더에서 비밀키 확인
    const authHeader = request.headers.get('authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');

    if (providedSecret !== adminSecret) {
      console.warn(`Unauthorized admin access attempt by user: ${userId}`);
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    // 감사 로그 기록
    console.log(`Admin credit migration initiated by user: ${userId} at ${new Date().toISOString()}`);

    // IP 주소 로깅 (선택적 보안 강화)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor || realIp || 'unknown';
    console.log(`Migration request from IP: ${clientIp}`);

    // Convex 직접 호출
    const convexUrl = process.env.CONVEX_DEPLOYMENT || process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Convex URL not configured');
    }

    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: 'credits:migrateExistingUserCredits',
        args: {},
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Convex API error: ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: '크레딧 마이그레이션이 완료되었습니다.',
      result
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    }, { status: 500 });
  }
}