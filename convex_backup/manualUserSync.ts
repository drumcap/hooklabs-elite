import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * 관리자용: 특정 Clerk 사용자를 수동으로 Convex DB에 동기화
 * 웹훅이 실패했을 때 사용하는 유틸리티 함수
 */
export const manualSync = mutation({
  args: {
    externalId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { externalId, name, email }): Promise<{
    success: boolean;
    userId?: Id<"users">;
    message?: string;
    error?: string;
  }> => {
    // 이미 존재하는지 확인
    const existingUser = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
      .unique();

    if (existingUser) {
      console.log(`User ${externalId} already exists in Convex DB with ID: ${existingUser._id}`);
      return {
        success: true,
        userId: existingUser._id,
        message: "User already exists",
      };
    }

    try {
      // 새 사용자 생성
      const userId: Id<"users"> = await ctx.runMutation(internal.users.createUserFromAuth, {
        externalId,
        name: name || "동기화된 사용자",
        email,
      });

      console.log(`Successfully synced user ${externalId} to Convex DB with ID: ${userId}`);

      return {
        success: true,
        userId,
        message: "User successfully synced",
      };
    } catch (error) {
      console.error(`Failed to sync user ${externalId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});