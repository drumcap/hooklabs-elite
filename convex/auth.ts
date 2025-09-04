import { Auth } from "convex/server";
import { Id } from "./_generated/dataModel";
import { GenericDatabaseReader } from "convex/server";

/**
 * 인증된 사용자의 ID를 가져오는 헬퍼 함수
 */
export async function getAuthUserId(ctx: { auth: Auth; db: GenericDatabaseReader<any> }): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Clerk의 external ID를 사용하여 사용자 찾기
  const user = await ctx.db
    .query("users")
    .withIndex("by_external_id", (q: any) => q.eq("externalId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user._id;
}

/**
 * 인증된 사용자 정보를 가져오는 헬퍼 함수
 */
export async function getAuthUser(ctx: { auth: Auth; db: any }) {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_external_id", (q: any) => q.eq("externalId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * 선택적 인증 - 사용자가 로그인하지 않은 경우 null 반환
 */
export async function getOptionalAuthUserId(ctx: { auth: Auth; db: any }): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_external_id", (q: any) => q.eq("externalId", identity.subject))
    .unique();

  return user?._id ?? null;
}