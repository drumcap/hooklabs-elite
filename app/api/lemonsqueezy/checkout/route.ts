import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  createCheckout,
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
    const { variantId, customData } = body;

    if (!variantId) {
      return NextResponse.json({ error: "variantId가 필요합니다" }, { status: 400 });
    }

    // Lemon Squeezy checkout 생성
    const checkout = await createCheckout(
      process.env.LEMONSQUEEZY_STORE_ID!,
      variantId,
      {
        customData: {
          clerk_user_id: userId, // Clerk user ID를 명확하게 저장
          ...customData,
        },
        productOptions: {
          enabledVariants: [parseInt(variantId)],
          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?checkout=success`,
        },
        checkoutOptions: {
          embed: false,
          media: true,
          logo: true,
        },
        checkoutData: {
          email: body.email,
          name: body.name,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간 후 만료
      }
    );

    if (checkout.error) {
      console.error("Checkout creation error:", checkout.error);
      return NextResponse.json(
        { error: "체크아웃 생성 중 오류가 발생했습니다" }, 
        { status: 500 }
      );
    }

    // 체크아웃 URL 반환
    return NextResponse.json({
      checkoutUrl: checkout.data?.data.attributes.url,
      checkoutId: checkout.data?.data.id,
    });

  } catch (error) {
    console.error("Checkout API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}