import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convexClient = new ConvexHttpClient(convexUrl);

export async function POST(req: NextRequest) {
    try {
      const body = await req.json();

      // TODO: performanceMetrics 모듈이 비활성화되어 있으므로 임시로 비활성화
      // await convexClient.mutation(api.performanceMetrics.recordWebVitals, body);
      console.log('Web Vitals data received (not stored):', body);

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Failed to record Web Vitals:', error);
      return NextResponse.json(
        { error: 'Failed to record Web Vitals' },
        { status: 500 }
      );
    }
}