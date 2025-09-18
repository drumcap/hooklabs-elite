/**
 * 레거시 auth.ts - 이제 lib/auth.ts를 사용하세요
 * 
 * 이 파일은 기존 코드와의 호환성을 위해 유지되지만,
 * 새 코드에서는 lib/auth.ts의 함수들을 사용하는 것을 권장합니다.
 */

import { Auth } from "convex/server";
import { Id } from "./_generated/dataModel";
import { GenericDatabaseReader } from "convex/server";
import { requireAuth, getOptionalAuth, getUserContext } from "./lib/auth";

/**
 * @deprecated lib/auth.ts의 requireAuth() 사용을 권장합니다
 */
export async function getAuthUserId(ctx: { auth: Auth; db: GenericDatabaseReader<any> }): Promise<Id<"users">> {
  return await requireAuth(ctx as any);
}

/**
 * @deprecated lib/auth.ts의 getUserContext() 사용을 권장합니다
 */
export async function getAuthUser(ctx: { auth: Auth; db: any }) {
  const userId = await requireAuth(ctx as any);
  const user = await ctx.db.get(userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * @deprecated lib/auth.ts의 getOptionalAuth() 사용을 권장합니다
 */
export async function getOptionalAuthUserId(ctx: { auth: Auth; db: any }): Promise<Id<"users"> | null> {
  return await getOptionalAuth(ctx as any);
}