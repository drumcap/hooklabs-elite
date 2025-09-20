import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 관리자 권한 확인 (간단한 보안 체크)
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('key');

    if (adminKey !== 'migrate-credits-2025') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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