import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * 수동으로 Clerk 사용자를 Convex DB에 동기화하는 함수
 * Clerk 웹훅 동기화가 실패했을 때 사용
 */
export const syncSingleUser = internalMutation({
  args: {
    externalId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { externalId, name, email }) => {
    // 이미 존재하는지 확인
    const existingUser = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
      .unique();

    if (existingUser) {
      console.log(`User ${externalId} already exists in Convex DB`);
      return existingUser._id;
    }

    // 새 사용자 생성
    const now = new Date().toISOString();
    const userId = await ctx.db.insert("users", {
      name: name || email || "사용자",
      externalId,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`Successfully synced user ${externalId} to Convex DB`);
    return userId;
  },
});

/**
 * 현재 인증된 사용자 자동 동기화 (mutation에서 호출 가능)
 */
export const syncCurrentUser = internalMutation({
  args: {
    identity: v.any(), // Clerk identity 객체
  },
  handler: async (ctx, { identity }): Promise<string> => {
    if (!identity) {
      throw new Error("Identity is required");
    }

    const externalId = identity.subject;
    const name = identity.name;
    const email = identity.email;

    // 기존 함수 사용 - api 임포트가 순환 참조를 만드므로 내부적으로 처리
    return await ctx.runMutation(internal.users.createUserFromAuth, {
      externalId,
      name: name || "",
    });
  },
});