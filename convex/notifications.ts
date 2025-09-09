/**
 * 알림 시스템
 */

import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// 새 포스트 알림
export const notifyNewPost = internalAction({
  args: {
    postId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { postId, userId }) => {
    // 실제 구현에서는 팔로워들에게 알림 전송
    console.log(`새 포스트 알림: ${postId} by user ${userId}`);
    
    // 알림 큐에 추가
    await ctx.runMutation(internalMutation({
      args: {
        type: v.literal("new_post"),
        userId: v.id("users"),
        data: v.any(),
      },
      handler: async (ctx, args) => {
        // 알림 저장 로직
      },
    }), {
      type: "new_post",
      userId,
      data: { postId },
    });
  },
});

// 낮은 크레딧 알림
export const sendLowCreditAlert = internalAction({
  args: {
    userId: v.id("users"),
    credits: v.number(),
  },
  handler: async (ctx, { userId, credits }) => {
    console.log(`크레딧 부족 알림: User ${userId} has ${credits} credits remaining`);
    
    // 이메일 알림 준비
    const emailData = {
      to: await getUserEmail(ctx, userId),
      subject: "크레딧이 부족합니다",
      body: `남은 크레딧: ${credits}개. 크레딧을 충전해주세요.`,
    };
    
    // 실제 구현에서는 이메일 서비스 호출
    await sendEmail(emailData);
    
    // 인앱 알림 생성
    await ctx.runMutation(createInAppNotification, {
      userId,
      type: "low_credits",
      title: "크레딧 부족",
      message: `남은 크레딧이 ${credits}개입니다.`,
      priority: "high",
    });
  },
});

// 인앱 알림 생성
const createInAppNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    priority: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // notifications 테이블이 있다면 저장
    // 현재는 로그만 출력
    console.log("인앱 알림 생성:", args);
  },
});

// 사용자 이메일 조회 (헬퍼 함수)
async function getUserEmail(ctx: any, userId: Id<"users">): Promise<string> {
  const user = await ctx.runQuery(internalQuery({
    args: { id: v.id("users") },
    handler: async (ctx, { id }) => {
      return await ctx.db.get(id);
    },
  }), { id: userId });
  
  // 실제 구현에서는 Clerk에서 이메일 조회
  return user?.name || "user@example.com";
}

// 이메일 전송 (헬퍼 함수)
async function sendEmail(data: { to: string; subject: string; body: string }) {
  // 실제 구현에서는 Resend, SendGrid 등 사용
  console.log("이메일 전송:", data);
  
  // 환경 변수에서 API 키 확인
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return;
  }
  
  // Resend API 호출 예시
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HookLabs Elite <noreply@hooklabs.com>",
        to: data.to,
        subject: data.subject,
        text: data.body,
      }),
    });
    
    if (!response.ok) {
      console.error("Failed to send email:", await response.text());
    }
  } catch (error) {
    console.error("Email send error:", error);
  }
}

// 내부 쿼리 정의 (재사용 가능)
const internalQuery = {
  args: { id: v.id("users") },
  handler: async (ctx: any, { id }: any) => {
    return await ctx.db.get(id);
  },
};