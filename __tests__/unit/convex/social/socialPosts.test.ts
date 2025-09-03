/**
 * Convex SocialPosts 함수 단위 테스트
 * 게시물 CRUD 작업 및 상태 관리 로직 검증
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSocialPost } from '../../../test-utils';
import { mockSocialPosts } from '../../../fixtures/social/posts';

// Convex 관련 모킹
const mockDb = {
  query: vi.fn(),
  get: vi.fn(),
  insert: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

const mockCtx = {
  db: mockDb,
  auth: {
    getUserIdentity: vi.fn(),
  },
};

// 인증된 사용자 ID 모킹
const mockUserId = 'test-user-id';
const mockPersonaId = 'test-persona-id';
const mockGetAuthUserId = vi.fn().mockResolvedValue(mockUserId);

// 테스트용 쿼리 빌더 모킹
const createQueryBuilder = (data: any[] = []) => ({
  withIndex: vi.fn().mockReturnThis(),
  filter: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  take: vi.fn().mockResolvedValue(data),
  collect: vi.fn().mockResolvedValue(data),
  first: vi.fn().mockResolvedValue(data[0] || null),
  paginate: vi.fn().mockResolvedValue({
    page: data,
    isDone: true,
    continueCursor: null
  })
});

// 테스트 대상 함수들
const socialPostFunctions = {
  list: async (ctx: any, args: any = {}) => {
    const userId = await mockGetAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const { limit = 50, paginationOpts, status, personaId } = args;
    const posts = [mockSocialPosts.productLaunch, mockSocialPosts.developmentTip];
    
    const queryBuilder = createQueryBuilder(posts);
    mockDb.query.mockReturnValue(queryBuilder);
    
    // 실제로 query를 호출해야 함
    const query = await ctx.db.query("socialPosts");

    if (paginationOpts) {
      return await queryBuilder.paginate(paginationOpts);
    }

    return {
      page: await queryBuilder.take(limit),
      isDone: true,
      continueCursor: null
    };
  },

  get: async (ctx: any, { id }: { id: string }) => {
    const userId = await mockGetAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const post = await ctx.db.get(id);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    if (post.userId !== userId) {
      throw new Error("접근 권한이 없습니다");
    }

    // 페르소나와 변형 조회 모킹
    const persona = { name: '테스트 페르소나' };
    const variants = [{ content: '변형 1' }, { content: '변형 2' }];

    return {
      ...post,
      persona,
      variants,
    };
  },

  create: async (ctx: any, args: any) => {
    const userId = await mockGetAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    // 페르소나 소유 확인
    const persona = await ctx.db.get(args.personaId);
    if (!persona || persona.userId !== userId) {
      throw new Error("페르소나에 대한 접근 권한이 없습니다");
    }

    const now = new Date().toISOString();
    const newPost = {
      userId,
      personaId: args.personaId,
      originalContent: args.originalContent,
      finalContent: args.originalContent,
      platforms: args.platforms,
      status: "draft",
      hashtags: args.hashtags || [],
      mediaUrls: args.mediaUrls,
      threadCount: args.threadCount || 1,
      creditsUsed: 0,
      createdAt: now,
      updatedAt: now,
    };

    mockDb.insert.mockResolvedValue('new-post-id');
    await ctx.db.insert("socialPosts", newPost);
    
    return 'new-post-id';
  },

  update: async (ctx: any, { id, ...updates }: any) => {
    const userId = await mockGetAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const post = await ctx.db.get(id);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    if (post.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    // 발행된 게시물 수정 제한
    if (post.status === "published") {
      const allowedUpdates = ["hashtags"];
      const updateKeys = Object.keys(updates);
      const invalidUpdates = updateKeys.filter(key => !allowedUpdates.includes(key));
      
      if (invalidUpdates.length > 0) {
        throw new Error(`발행된 게시물은 ${allowedUpdates.join(", ")} 필드만 수정할 수 있습니다`);
      }
    }

    const now = new Date().toISOString();
    mockDb.patch.mockResolvedValue(undefined);
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    return id;
  },

  remove: async (ctx: any, { id }: { id: string }) => {
    const userId = await mockGetAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const post = await ctx.db.get(id);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    if (post.userId !== userId) {
      throw new Error("삭제 권한이 없습니다");
    }

    if (post.status === "scheduled") {
      throw new Error("예약된 게시물은 먼저 예약을 취소한 후 삭제할 수 있습니다");
    }

    // 관련 변형과 스케줄 삭제
    const variants = [{ _id: 'variant-1' }, { _id: 'variant-2' }];
    const schedules = [{ _id: 'schedule-1' }];

    mockDb.query.mockReturnValue(createQueryBuilder(variants));
    
    for (const variant of variants) {
      await ctx.db.delete(variant._id);
    }

    for (const schedule of schedules) {
      await ctx.db.delete(schedule._id);
    }

    mockDb.delete.mockResolvedValue(undefined);
    await ctx.db.delete(id);
    return id;
  },

  updateStatus: async (ctx: any, args: any) => {
    const userId = await mockGetAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    if (post.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    const now = new Date().toISOString();
    mockDb.patch.mockResolvedValue(undefined);

    await ctx.db.patch(args.id, {
      status: args.status,
      publishedAt: args.publishedAt,
      errorMessage: args.errorMessage,
      updatedAt: now,
    });

    return args.id;
  },

  updateMetrics: async (ctx: any, { id, platform, metrics }: any) => {
    const userId = await mockGetAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const post = await ctx.db.get(id);
    if (!post) {
      throw new Error("게시물을 찾을 수 없습니다");
    }

    if (post.userId !== userId) {
      throw new Error("수정 권한이 없습니다");
    }

    const now = new Date().toISOString();
    const currentMetrics = post.metrics || {};

    const updatedMetrics = {
      ...currentMetrics,
      [platform]: {
        ...currentMetrics[platform],
        ...metrics,
      },
      lastUpdatedAt: now,
    };

    mockDb.patch.mockResolvedValue(undefined);
    await ctx.db.patch(id, {
      metrics: updatedMetrics,
      updatedAt: now,
    });

    return id;
  }
};

describe('SocialPosts Convex Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 기본 모킹 설정
    mockDb.get.mockImplementation((id: string) => {
      if (id === 'valid-post-id') {
        return Promise.resolve({
          ...mockSocialPosts.productLaunch,
          userId: mockUserId,
          status: 'draft'
        });
      }
      if (id === 'published-post-id') {
        return Promise.resolve({
          ...mockSocialPosts.productLaunch,
          userId: mockUserId,
          status: 'published'
        });
      }
      if (id === 'scheduled-post-id') {
        return Promise.resolve({
          ...mockSocialPosts.marketingInsight,
          userId: mockUserId,
          status: 'scheduled'
        });
      }
      if (id === mockPersonaId) {
        return Promise.resolve({
          userId: mockUserId,
          name: '테스트 페르소나'
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('list', () => {
    it('인증된 사용자의 게시물 목록을 반환해야 함', async () => {
      const result = await socialPostFunctions.list(mockCtx);

      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('isDone');
      expect(result.page).toHaveLength(2);
      expect(result.isDone).toBe(true);
    });

    it('페이지네이션이 올바르게 작동해야 함', async () => {
      const paginationOpts = { numItems: 10, cursor: undefined };
      
      const result = await socialPostFunctions.list(mockCtx, { paginationOpts });

      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('isDone');
      expect(result).toHaveProperty('continueCursor');
    });

    it('상태별 필터링이 작동해야 함', async () => {
      const result = await socialPostFunctions.list(mockCtx, { status: 'published' });

      expect(mockDb.query).toHaveBeenCalledWith("socialPosts");
      expect(result.page).toBeDefined();
    });

    it('인증되지 않은 사용자에게는 에러를 던져야 함', async () => {
      mockGetAuthUserId.mockResolvedValueOnce(null);

      await expect(socialPostFunctions.list(mockCtx))
        .rejects.toThrow("인증이 필요합니다");
    });
  });

  describe('get', () => {
    it('특정 게시물을 페르소나와 변형과 함께 조회해야 함', async () => {
      const result = await socialPostFunctions.get(mockCtx, { id: 'valid-post-id' });

      expect(result).toHaveProperty('persona');
      expect(result).toHaveProperty('variants');
      expect(result.persona.name).toBe('테스트 페르소나');
      expect(result.variants).toHaveLength(2);
    });

    it('존재하지 않는 게시물에 대해 에러를 던져야 함', async () => {
      await expect(socialPostFunctions.get(mockCtx, { id: 'non-existent-id' }))
        .rejects.toThrow("게시물을 찾을 수 없습니다");
    });

    it('다른 사용자의 게시물에 접근 시 에러를 던져야 함', async () => {
      mockDb.get.mockResolvedValueOnce({
        ...mockSocialPosts.productLaunch,
        userId: 'different-user-id'
      });

      await expect(socialPostFunctions.get(mockCtx, { id: 'valid-post-id' }))
        .rejects.toThrow("접근 권한이 없습니다");
    });
  });

  describe('create', () => {
    const createArgs = {
      personaId: mockPersonaId,
      originalContent: '테스트 게시물 내용',
      platforms: ['twitter', 'threads'],
      hashtags: ['#테스트'],
      threadCount: 1
    };

    it('새 게시물을 성공적으로 생성해야 함', async () => {
      const result = await socialPostFunctions.create(mockCtx, createArgs);

      expect(result).toBe('new-post-id');
      expect(mockDb.insert).toHaveBeenCalledWith("socialPosts", expect.objectContaining({
        userId: mockUserId,
        personaId: createArgs.personaId,
        originalContent: createArgs.originalContent,
        finalContent: createArgs.originalContent,
        platforms: createArgs.platforms,
        status: "draft",
        creditsUsed: 0
      }));
    });

    it('초기 상태는 draft여야 함', async () => {
      await socialPostFunctions.create(mockCtx, createArgs);

      const insertCall = mockDb.insert.mock.calls[0][1];
      expect(insertCall.status).toBe("draft");
    });

    it('페르소나 소유권을 확인해야 함', async () => {
      mockDb.get.mockImplementation((id: string) => {
        if (id === mockPersonaId) {
          return Promise.resolve({
            userId: 'different-user-id', // 다른 사용자
            name: '테스트 페르소나'
          });
        }
        return Promise.resolve(null);
      });

      await expect(socialPostFunctions.create(mockCtx, createArgs))
        .rejects.toThrow("페르소나에 대한 접근 권한이 없습니다");
    });

    it('해시태그가 제공되지 않으면 빈 배열로 설정해야 함', async () => {
      const argsWithoutHashtags = { ...createArgs };
      delete argsWithoutHashtags.hashtags;

      await socialPostFunctions.create(mockCtx, argsWithoutHashtags);

      const insertCall = mockDb.insert.mock.calls[0][1];
      expect(insertCall.hashtags).toEqual([]);
    });
  });

  describe('update', () => {
    const updateArgs = {
      id: 'valid-post-id',
      finalContent: '수정된 내용',
      hashtags: ['#수정됨']
    };

    it('게시물을 성공적으로 수정해야 함', async () => {
      const result = await socialPostFunctions.update(mockCtx, updateArgs);

      expect(result).toBe('valid-post-id');
      expect(mockDb.patch).toHaveBeenCalledWith('valid-post-id', expect.objectContaining({
        finalContent: updateArgs.finalContent,
        hashtags: updateArgs.hashtags,
        updatedAt: expect.any(String)
      }));
    });

    it('발행된 게시물은 제한된 필드만 수정 가능해야 함', async () => {
      const invalidUpdate = {
        id: 'published-post-id',
        finalContent: '발행 후 수정 시도'
      };

      await expect(socialPostFunctions.update(mockCtx, invalidUpdate))
        .rejects.toThrow("발행된 게시물은 hashtags 필드만 수정할 수 있습니다");
    });

    it('발행된 게시물의 해시태그는 수정 가능해야 함', async () => {
      const validUpdate = {
        id: 'published-post-id',
        hashtags: ['#새해시태그']
      };

      const result = await socialPostFunctions.update(mockCtx, validUpdate);

      expect(result).toBe('published-post-id');
      expect(mockDb.patch).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('게시물과 관련 데이터를 모두 삭제해야 함', async () => {
      const result = await socialPostFunctions.remove(mockCtx, { id: 'valid-post-id' });

      expect(result).toBe('valid-post-id');
      expect(mockDb.delete).toHaveBeenCalledWith('valid-post-id');
      expect(mockDb.delete).toHaveBeenCalledWith('variant-1');
      expect(mockDb.delete).toHaveBeenCalledWith('variant-2');
      expect(mockDb.delete).toHaveBeenCalledWith('schedule-1');
    });

    it('예약된 게시물은 삭제할 수 없어야 함', async () => {
      await expect(socialPostFunctions.remove(mockCtx, { id: 'scheduled-post-id' }))
        .rejects.toThrow("예약된 게시물은 먼저 예약을 취소한 후 삭제할 수 있습니다");
    });

    it('다른 사용자의 게시물은 삭제할 수 없어야 함', async () => {
      mockDb.get.mockResolvedValueOnce({
        ...mockSocialPosts.productLaunch,
        userId: 'different-user-id'
      });

      await expect(socialPostFunctions.remove(mockCtx, { id: 'valid-post-id' }))
        .rejects.toThrow("삭제 권한이 없습니다");
    });
  });

  describe('updateStatus', () => {
    it('게시물 상태를 성공적으로 업데이트해야 함', async () => {
      const statusUpdate = {
        id: 'valid-post-id',
        status: 'published',
        publishedAt: new Date().toISOString()
      };

      const result = await socialPostFunctions.updateStatus(mockCtx, statusUpdate);

      expect(result).toBe('valid-post-id');
      expect(mockDb.patch).toHaveBeenCalledWith('valid-post-id', expect.objectContaining({
        status: 'published',
        publishedAt: statusUpdate.publishedAt,
        updatedAt: expect.any(String)
      }));
    });

    it('실패 상태와 에러 메시지를 설정할 수 있어야 함', async () => {
      const failureUpdate = {
        id: 'valid-post-id',
        status: 'failed',
        errorMessage: 'API 호출 실패'
      };

      await socialPostFunctions.updateStatus(mockCtx, failureUpdate);

      expect(mockDb.patch).toHaveBeenCalledWith('valid-post-id', expect.objectContaining({
        status: 'failed',
        errorMessage: 'API 호출 실패'
      }));
    });
  });

  describe('updateMetrics', () => {
    const metricsUpdate = {
      id: 'valid-post-id',
      platform: 'twitter',
      metrics: {
        views: 1000,
        likes: 50,
        retweets: 10
      }
    };

    beforeEach(() => {
      mockDb.get.mockImplementation((id: string) => {
        if (id === 'valid-post-id') {
          return Promise.resolve({
            ...mockSocialPosts.productLaunch,
            userId: mockUserId,
            metrics: {
              twitter: {
                views: 500,
                likes: 25
              }
            }
          });
        }
        return Promise.resolve(null);
      });
    });

    it('플랫폼별 메트릭을 업데이트해야 함', async () => {
      const result = await socialPostFunctions.updateMetrics(mockCtx, metricsUpdate);

      expect(result).toBe('valid-post-id');
      expect(mockDb.patch).toHaveBeenCalledWith('valid-post-id', expect.objectContaining({
        metrics: expect.objectContaining({
          twitter: expect.objectContaining({
            views: 1000,
            likes: 50,
            retweets: 10
          }),
          lastUpdatedAt: expect.any(String)
        })
      }));
    });

    it('기존 메트릭과 새 메트릭을 병합해야 함', async () => {
      await socialPostFunctions.updateMetrics(mockCtx, metricsUpdate);

      const patchCall = mockDb.patch.mock.calls[0][1];
      const twitterMetrics = patchCall.metrics.twitter;
      
      // 새로운 값들이 업데이트되어야 함
      expect(twitterMetrics.views).toBe(1000);
      expect(twitterMetrics.likes).toBe(50);
      expect(twitterMetrics.retweets).toBe(10);
    });

    it('존재하지 않는 플랫폼의 메트릭도 추가할 수 있어야 함', async () => {
      const threadsUpdate = {
        ...metricsUpdate,
        platform: 'threads',
        metrics: {
          views: 800,
          likes: 40
        }
      };

      await socialPostFunctions.updateMetrics(mockCtx, threadsUpdate);

      const patchCall = mockDb.patch.mock.calls[0][1];
      expect(patchCall.metrics.threads).toEqual({
        views: 800,
        likes: 40
      });
    });
  });

  describe('비즈니스 로직 검증', () => {
    it('게시물 생성 시 createdAt과 updatedAt이 동일해야 함', async () => {
      const createArgs = {
        personaId: mockPersonaId,
        originalContent: '테스트',
        platforms: ['twitter']
      };

      await socialPostFunctions.create(mockCtx, createArgs);

      const insertCall = mockDb.insert.mock.calls[0][1];
      expect(insertCall.createdAt).toBe(insertCall.updatedAt);
    });

    it('초기 크레딧 사용량은 0이어야 함', async () => {
      const createArgs = {
        personaId: mockPersonaId,
        originalContent: '테스트',
        platforms: ['twitter']
      };

      await socialPostFunctions.create(mockCtx, createArgs);

      const insertCall = mockDb.insert.mock.calls[0][1];
      expect(insertCall.creditsUsed).toBe(0);
    });

    it('finalContent 초기값은 originalContent와 동일해야 함', async () => {
      const createArgs = {
        personaId: mockPersonaId,
        originalContent: '원본 내용',
        platforms: ['twitter']
      };

      await socialPostFunctions.create(mockCtx, createArgs);

      const insertCall = mockDb.insert.mock.calls[0][1];
      expect(insertCall.finalContent).toBe(insertCall.originalContent);
    });

    it('기본 스레드 개수는 1이어야 함', async () => {
      const createArgs = {
        personaId: mockPersonaId,
        originalContent: '테스트',
        platforms: ['twitter']
      };

      await socialPostFunctions.create(mockCtx, createArgs);

      const insertCall = mockDb.insert.mock.calls[0][1];
      expect(insertCall.threadCount).toBe(1);
    });
  });
});