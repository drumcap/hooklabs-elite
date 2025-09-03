import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { withApiMonitoring } from '@/lib/monitoring/apiMonitoring';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convexClient = new ConvexHttpClient(convexUrl);

export const POST = withApiMonitoring(
  async (req: NextRequest) => {
    try {
      const body = await req.json();

      // Web Vitals 데이터 저장
      await convexClient.mutation(api.performanceMetrics.recordWebVitals, body);

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Failed to record Web Vitals:', error);
      return NextResponse.json(
        { error: 'Failed to record Web Vitals' },
        { status: 500 }
      );
    }
  },
  { endpoint: '/api/monitoring/web-vitals' }
);