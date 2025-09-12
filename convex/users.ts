import { internalMutation, internalQuery, query, QueryCtx } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";
import { AuthenticationError } from "./lib/errors";
import { requireAuth, getOptionalAuth } from "./lib/auth";
import { createResource, updateResource, checkDuplicate } from "./lib/crud";
import { DataSanitizer } from "./lib/validators";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    const userAttributes = {
      name: DataSanitizer.text(`${data.first_name || ''} ${data.last_name || ''}`).trim(),
      externalId: data.id,
    };

    const user = await userByExternalId(ctx, data.id);
    if (user === null) {
      await createResource(ctx, "users", userAttributes);
    } else {
      await updateResource(ctx, "users", user._id, userAttributes, undefined, false);
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});



export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new AuthenticationError("사용자 인증이 필요합니다");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const userId = await getOptionalAuth(ctx);
  if (!userId) {
    return null;
  }
  return await ctx.db.get(userId);
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}

// Internal query for avoiding circular references
export const getByIdInternal = internalQuery({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getByExternalIdInternal = internalQuery({
  args: { externalId: v.string() },
  handler: async (ctx, { externalId }) => {
    return await userByExternalId(ctx, externalId);
  },
});