import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getSubscription,
  updateSubscription,
  cancelSubscription,
  lemonSqueezySetup,
} from "@lemonsqueezy/lemonsqueezy.js";

// Lemon Squeezy API 설정
lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError: (error) => {
    console.error("Lemon Squeezy API Error:", error);
  }
});

// GET: 구독 정보 조회
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get("id");

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId가 필요합니다" }, { status: 400 });
    }

    // Lemon Squeezy에서 구독 정보 조회
    const subscription = await getSubscription(subscriptionId);

    if (subscription.error) {
      console.error("Subscription fetch error:", subscription.error);
      return NextResponse.json(
        { error: "구독 정보를 조회할 수 없습니다" }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscription: subscription.data?.data,
    });

  } catch (error) {
    console.error("Subscription GET API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST: 구독 업데이트 (일시정지, 재개 등)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await req.json();
    const { subscriptionId, action, ...updateData } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId가 필요합니다" }, { status: 400 });
    }

    let result;

    switch (action) {
      case "cancel":
        result = await cancelSubscription(subscriptionId);
        break;
      
      case "update":
        result = await updateSubscription(subscriptionId, updateData);
        break;
      
      default:
        return NextResponse.json({ error: "유효하지 않은 action입니다" }, { status: 400 });
    }

    if (result.error) {
      console.error("Subscription action error:", result.error);
      return NextResponse.json(
        { error: "구독 작업 중 오류가 발생했습니다" }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscription: result.data?.data,
      message: `구독이 성공적으로 ${action === "cancel" ? "취소" : "업데이트"}되었습니다`,
    });

  } catch (error) {
    console.error("Subscription POST API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}