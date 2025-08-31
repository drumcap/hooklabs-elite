import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getCustomer,
  lemonSqueezySetup,
} from "@lemonsqueezy/lemonsqueezy.js";

// Lemon Squeezy API 설정
lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError: (error) => {
    console.error("Lemon Squeezy API Error:", error);
  }
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await req.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json({ error: "customerId가 필요합니다" }, { status: 400 });
    }

    // Lemon Squeezy에서 고객 정보 조회
    const customer = await getCustomer(customerId);

    if (customer.error) {
      console.error("Customer fetch error:", customer.error);
      return NextResponse.json(
        { error: "고객 정보를 조회할 수 없습니다" }, 
        { status: 500 }
      );
    }

    // 고객 포털 URL 반환
    const portalUrl = customer.data?.data.attributes.urls.customer_portal;
    
    if (!portalUrl) {
      return NextResponse.json(
        { error: "고객 포털 URL을 찾을 수 없습니다" }, 
        { status: 404 }
      );
    }

    return NextResponse.json({
      portalUrl: portalUrl,
    });

  } catch (error) {
    console.error("Portal API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}