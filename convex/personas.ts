import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

// 페르소나 목록 조회
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    return await ctx.db
      .query("personas")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// 특정 페르소나 조회
export const get = query({
  args: { id: v.id("personas") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const persona = await ctx.db.get(id);
    if (!persona) {
      throw new Error("페르소나를 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (persona.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    return persona;
  },
});

// 활성 페르소나 목록 조회
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    return await ctx.db
      .query("personas")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();
  },
});

// 페르소나 생성
export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    tone: v.string(),
    interests: v.array(v.string()),
    expertise: v.array(v.string()),
    description: v.optional(v.string()),
    avatar: v.optional(v.string()),
    settings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const now = new Date().toISOString();

    // 기본 프롬프트 템플릿 생성
    const promptTemplates = {
      system: `당신은 ${args.role} 역할을 하는 ${args.name}입니다. ${args.tone} 톤으로 소통하며, ${args.interests.join(", ")}에 관심이 있고 ${args.expertise.join(", ")} 분야의 전문성을 가지고 있습니다.`,
      content: "주어진 내용을 바탕으로 소셜 미디어에 적합한 게시물을 작성해주세요. 해시태그와 이모지를 적절히 사용하고, 독자의 관심을 끌 수 있도록 작성해주세요.",
      tone: args.tone
    };

    return await ctx.db.insert("personas", {
      userId,
      name: args.name,
      role: args.role,
      tone: args.tone,
      interests: args.interests,
      expertise: args.expertise,
      description: args.description,
      avatar: args.avatar,
      isActive: true,
      settings: args.settings,
      promptTemplates,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// 페르소나 수정
export const update = mutation({
  args: {
    id: v.id("personas"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    tone: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    expertise: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    avatar: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    settings: v.optional(v.any()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const persona = await ctx.db.get(id);
    if (!persona) {
      throw new Error("페르소나를 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (persona.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    const now = new Date().toISOString();
    
    // 프롬프트 템플릿 업데이트 (역할, 톤, 관심사, 전문분야가 변경된 경우)
    let promptTemplates = persona.promptTemplates;
    if (updates.role || updates.tone || updates.interests || updates.expertise) {
      const role = updates.role || persona.role;
      const tone = updates.tone || persona.tone;
      const interests = updates.interests || persona.interests;
      const expertise = updates.expertise || persona.expertise;
      const name = updates.name || persona.name;
      
      promptTemplates = {
        system: `당신은 ${role} 역할을 하는 ${name}입니다. ${tone} 톤으로 소통하며, ${interests.join(", ")}에 관심이 있고 ${expertise.join(", ")} 분야의 전문성을 가지고 있습니다.`,
        content: "주어진 내용을 바탕으로 소셜 미디어에 적합한 게시물을 작성해주세요. 해시태그와 이모지를 적절히 사용하고, 독자의 관심을 끌 수 있도록 작성해주세요.",
        tone: tone
      };
    }

    await ctx.db.patch(id, {
      ...updates,
      promptTemplates,
      updatedAt: now,
    });

    return id;
  },
});

// 페르소나 삭제
export const remove = mutation({
  args: { id: v.id("personas") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const persona = await ctx.db.get(id);
    if (!persona) {
      throw new Error("페르소나를 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (persona.userId !== userId) {
      throw new Error("삭제 권한이 없습니다");
    }

    // 해당 페르소나를 사용하는 게시물이 있는지 확인
    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("byPersonaId", (q) => q.eq("personaId", id))
      .first();

    if (posts) {
      throw new Error("이 페르소나를 사용하는 게시물이 있어서 삭제할 수 없습니다. 먼저 게시물을 삭제하거나 다른 페르소나로 변경해주세요.");
    }

    await ctx.db.delete(id);
    return id;
  },
});

// 페르소나 활성화/비활성화
export const toggleActive = mutation({
  args: { id: v.id("personas") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const persona = await ctx.db.get(id);
    if (!persona) {
      throw new Error("페르소나를 찾을 수 없습니다");
    }

    // 사용자 소유 확인
    if (persona.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    await ctx.db.patch(id, {
      isActive: !persona.isActive,
      updatedAt: new Date().toISOString(),
    });

    return id;
  },
});

// 페르소나별 게시물 수 조회
export const getPostCounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const personas = await ctx.db
      .query("personas")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const counts = await Promise.all(
      personas.map(async (persona) => {
        const postCount = await ctx.db
          .query("socialPosts")
          .withIndex("byPersonaId", (q) => q.eq("personaId", persona._id))
          .collect()
          .then(posts => posts.length);

        return {
          personaId: persona._id,
          personaName: persona.name,
          postCount,
        };
      })
    );

    return counts;
  },
});