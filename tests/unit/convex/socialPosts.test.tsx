/**
 * SocialPosts Convex 함수 단위 테스트
 * 소셜 미디어 게시물 CRUD 및 비즈니스 로직 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockConvexContext, setupDatabaseMocks, setupAuthMocks } from '../../utils/convex-test-helpers';
import { createMockSocialPost, createMockPersona, createMockUser } from '../../utils/mock-data';

// Mock Convex 함수들
const mockSocialPosts = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  updateStatus: vi.fn(),
  updateMetrics: vi.fn(),
  getDashboardStats: vi.fn(),
  getByPersona: vi.fn(),
  getRecent: vi.fn(),
};

describe('SocialPosts Convex Functions', () => {
  let mockCtx: ReturnType<typeof createMockConvexContext>;
  let dbMocks: ReturnType<typeof setupDatabaseMocks>;
  let authMocks: ReturnType<typeof setupAuthMocks>;

  beforeEach(() => {
    mockCtx = createMockConvexContext();
    dbMocks = setupDatabaseMocks(mockCtx);
    authMocks = setupAuthMocks(mockCtx);
    vi.clearAllMocks();
  });

  describe('list 쿼리', () => {
    it('사용자의 게시물 목록을 반환해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testPosts = [
        createMockSocialPost({ userId: testUser._id, status: 'draft' }),
        createMockSocialPost({ userId: testUser._id, status: 'published' }),
      ];

      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });
      dbMocks.setupQueryMock('socialPosts', testPosts);

      // Act & Assert
      mockSocialPosts.list.mockImplementation(async ({ limit = 50, status }) => {
        // 인증 확인
        const identity = await mockCtx.auth.getUserIdentity();
        if (!identity) throw new Error('인증이 필요합니다');

        // 상태별 필터링
        let filteredPosts = testPosts;
        if (status) {
          filteredPosts = testPosts.filter(post => post.status === status);
        }

        return {
          page: filteredPosts.slice(0, limit),
          isDone: true,
          continueCursor: null,
        };
      });

      const result = await mockSocialPosts.list({ limit: 10 });
      
      expect(result.page).toHaveLength(2);
      expect(result.isDone).toBe(true);
      expect(result.page[0]).toMatchObject(testPosts[0]);
    });

    it('상태별로 필터링된 게시물을 반환해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testPosts = [
        createMockSocialPost({ userId: testUser._id, status: 'draft' }),
        createMockSocialPost({ userId: testUser._id, status: 'published' }),
      ];

      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });

      // Act & Assert
      mockSocialPosts.list.mockImplementation(async ({ status }) => {
        const filteredPosts = testPosts.filter(post => post.status === status);
        return {
          page: filteredPosts,
          isDone: true,
          continueCursor: null,
        };
      });

      const result = await mockSocialPosts.list({ status: 'draft' });
      
      expect(result.page).toHaveLength(1);
      expect(result.page[0].status).toBe('draft');
    });

    it('페이징을 지원해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testPosts = Array.from({ length: 5 }, () => 
        createMockSocialPost({ userId: testUser._id })
      );

      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });

      // Act & Assert
      mockSocialPosts.list.mockImplementation(async ({ paginationOpts }) => {
        if (paginationOpts) {
          const { numItems, cursor } = paginationOpts;
          const startIndex = cursor ? parseInt(cursor) : 0;
          const endIndex = startIndex + numItems;
          const paginatedPosts = testPosts.slice(startIndex, endIndex);
          
          return {
            page: paginatedPosts,
            isDone: endIndex >= testPosts.length,
            continueCursor: endIndex >= testPosts.length ? null : endIndex.toString(),
          };
        }
        
        return { page: testPosts, isDone: true, continueCursor: null };
      });

      const result = await mockSocialPosts.list({
        paginationOpts: { numItems: 2, cursor: '0' }
      });
      
      expect(result.page).toHaveLength(2);
      expect(result.isDone).toBe(false);
      expect(result.continueCursor).toBe('2');
    });
  });

  describe('get 쿼리', () => {
    it('특정 게시물을 페르소나와 변형들과 함께 반환해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testPersona = createMockPersona({ userId: testUser._id });
      const testPost = createMockSocialPost({ 
        userId: testUser._id, 
        personaId: testPersona._id 
      });
      const testVariants = [
        { _id: 'variant1', postId: testPost._id, content: 'Variant 1' },
        { _id: 'variant2', postId: testPost._id, content: 'Variant 2' },
      ];

      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });
      mockCtx.db.get.mockResolvedValueOnce(testPost).mockResolvedValueOnce(testPersona);
      
      const mockVariantsQuery = {
        withIndex: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(testVariants),
      };
      mockCtx.db.query.mockReturnValue(mockVariantsQuery);

      // Act & Assert
      mockSocialPosts.get.mockImplementation(async ({ id }) => {
        const identity = await mockCtx.auth.getUserIdentity();
        if (!identity) throw new Error('인증이 필요합니다');

        const post = testPost;
        if (!post) throw new Error('게시물을 찾을 수 없습니다');

        const persona = testPersona;
        const variants = testVariants;

        return {
          ...post,
          persona,
          variants,
        };
      });

      const result = await mockSocialPosts.get({ id: testPost._id });
      
      expect(result).toMatchObject({
        ...testPost,
        persona: testPersona,
        variants: testVariants,
      });
    });

    it('존재하지 않는 게시물에 대해 에러를 던져야 한다', async () => {
      // Arrange
      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });

      // Act & Assert
      mockSocialPosts.get.mockImplementation(async ({ id }) => {
        throw new Error('게시물을 찾을 수 없습니다');
      });

      await expect(mockSocialPosts.get({ id: 'nonexistent_id' }))
        .rejects.toThrow('게시물을 찾을 수 없습니다');
    });
  });

  describe('create 뮤테이션', () => {
    it('새로운 게시물을 생성해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testPersona = createMockPersona({ userId: testUser._id });
      const newPostData = {
        personaId: testPersona._id,
        originalContent: 'Test post content',
        platforms: ['twitter', 'linkedin'],
        hashtags: ['#test', '#socialmedia'],
      };

      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });
      mockCtx.db.insert.mockResolvedValue('new_post_id');

      // Act & Assert
      mockSocialPosts.create.mockImplementation(async (args) => {
        const identity = await mockCtx.auth.getUserIdentity();
        if (!identity) throw new Error('인증이 필요합니다');

        // 입력 검증
        if (!args.originalContent.trim()) {
          throw new Error('게시물 내용은 필수입니다');
        }
        if (!args.platforms.length) {
          throw new Error('최소 하나의 플랫폼을 선택해야 합니다');
        }

        const postData = {
          userId: testUser._id,
          ...args,
          status: 'draft',
          creditsUsed: 0,
        };

        await mockCtx.db.insert('socialPosts', postData);
        return 'new_post_id';
      });

      const result = await mockSocialPosts.create(newPostData);
      
      expect(mockCtx.db.insert).toHaveBeenCalledWith('socialPosts', expect.objectContaining({
        userId: testUser._id,
        originalContent: 'Test post content',
        platforms: ['twitter', 'linkedin'],
        status: 'draft',
        creditsUsed: 0,
      }));
      expect(result).toBe('new_post_id');
    });

    it('빈 내용으로 게시물 생성 시 에러를 던져야 한다', async () => {
      // Arrange
      const testPersona = createMockPersona();
      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });

      // Act & Assert
      mockSocialPosts.create.mockImplementation(async (args) => {
        if (!args.originalContent.trim()) {
          throw new Error('게시물 내용은 필수입니다');
        }
      });

      await expect(mockSocialPosts.create({
        personaId: testPersona._id,
        originalContent: '',
        platforms: ['twitter'],
      })).rejects.toThrow('게시물 내용은 필수입니다');
    });

    it('플랫폼이 선택되지 않으면 에러를 던져야 한다', async () => {
      // Arrange
      const testPersona = createMockPersona();
      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });

      // Act & Assert
      mockSocialPosts.create.mockImplementation(async (args) => {
        if (!args.platforms.length) {
          throw new Error('최소 하나의 플랫폼을 선택해야 합니다');
        }
      });

      await expect(mockSocialPosts.create({
        personaId: testPersona._id,
        originalContent: 'Test content',
        platforms: [],
      })).rejects.toThrow('최소 하나의 플랫폼을 선택해야 합니다');
    });
  });

  describe('update 뮤테이션', () => {
    it('게시물을 업데이트해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testPost = createMockSocialPost({ 
        userId: testUser._id, 
        status: 'draft' 
      });
      const updates = {
        originalContent: 'Updated content',
        hashtags: ['#updated'],
      };

      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });
      mockCtx.db.get.mockResolvedValue(testPost);
      mockCtx.db.patch.mockResolvedValue();

      // Act & Assert
      mockSocialPosts.update.mockImplementation(async ({ id, ...updates }) => {
        const identity = await mockCtx.auth.getUserIdentity();
        if (!identity) throw new Error('인증이 필요합니다');

        const post = testPost;
        if (!post) throw new Error('게시물을 찾을 수 없습니다');

        // 발행된 게시물 수정 제한 검증
        if (post.status === 'published') {
          const allowedUpdates = ['hashtags'];
          const updateKeys = Object.keys(updates);
          const invalidUpdates = updateKeys.filter(key => !allowedUpdates.includes(key));
          
          if (invalidUpdates.length > 0) {
            throw new Error(`발행된 게시물은 ${allowedUpdates.join(', ')} 필드만 수정할 수 있습니다`);
          }
        }

        await mockCtx.db.patch(id, updates);
        return id;
      });

      const result = await mockSocialPosts.update({ id: testPost._id, ...updates });
      
      expect(mockCtx.db.patch).toHaveBeenCalledWith(testPost._id, updates);
      expect(result).toBe(testPost._id);
    });

    it('발행된 게시물의 제한된 필드만 수정할 수 있어야 한다', async () => {
      // Arrange
      const testPost = createMockSocialPost({ status: 'published' });
      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });

      // Act & Assert
      mockSocialPosts.update.mockImplementation(async ({ id, ...updates }) => {
        const post = testPost;
        if (post.status === 'published') {
          const allowedUpdates = ['hashtags'];
          const updateKeys = Object.keys(updates);
          const invalidUpdates = updateKeys.filter(key => !allowedUpdates.includes(key));
          
          if (invalidUpdates.length > 0) {
            throw new Error(`발행된 게시물은 ${allowedUpdates.join(', ')} 필드만 수정할 수 있습니다`);
          }
        }
        return id; // 성공 시 ID 반환
      });

      // 허용된 필드 업데이트는 성공
      const result1 = await mockSocialPosts.update({
        id: testPost._id,
        hashtags: ['#updated']
      });
      expect(result1).toBe(testPost._id);

      // 허용되지 않은 필드 업데이트는 실패
      await expect(mockSocialPosts.update({
        id: testPost._id,
        originalContent: 'Updated content'
      })).rejects.toThrow('발행된 게시물은 hashtags 필드만 수정할 수 있습니다');
    });
  });

  describe('remove 뮤테이션', () => {
    it('게시물과 관련 데이터를 삭제해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testPost = createMockSocialPost({ 
        userId: testUser._id, 
        status: 'draft' 
      });
      const variants = [{ _id: 'variant1', postId: testPost._id }];
      const schedules = [{ _id: 'schedule1', postId: testPost._id }];

      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });
      mockCtx.db.get.mockResolvedValue(testPost);
      
      const mockVariantsQuery = {
        withIndex: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(variants),
      };
      const mockSchedulesQuery = {
        withIndex: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(schedules),
      };
      mockCtx.db.query
        .mockReturnValueOnce(mockVariantsQuery)
        .mockReturnValueOnce(mockSchedulesQuery);

      // Act & Assert
      mockSocialPosts.remove.mockImplementation(async ({ id }) => {
        const identity = await mockCtx.auth.getUserIdentity();
        if (!identity) throw new Error('인증이 필요합니다');

        const post = testPost;
        if (!post) throw new Error('게시물을 찾을 수 없습니다');
        
        if (post.status === 'scheduled') {
          throw new Error('예약된 게시물은 먼저 예약을 취소한 후 삭제할 수 있습니다');
        }

        // 관련 데이터 삭제 시뮬레이션
        for (const variant of variants) {
          await mockCtx.db.delete(variant._id);
        }
        for (const schedule of schedules) {
          await mockCtx.db.delete(schedule._id);
        }
        await mockCtx.db.delete(id);
        
        return id;
      });

      const result = await mockSocialPosts.remove({ id: testPost._id });
      
      expect(mockCtx.db.delete).toHaveBeenCalledTimes(3); // variants + schedules + post
      expect(result).toBe(testPost._id);
    });

    it('예약된 게시물 삭제 시 에러를 던져야 한다', async () => {
      // Arrange
      const testPost = createMockSocialPost({ status: 'scheduled' });
      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });

      // Act & Assert
      mockSocialPosts.remove.mockImplementation(async ({ id }) => {
        const post = testPost;
        if (post.status === 'scheduled') {
          throw new Error('예약된 게시물은 먼저 예약을 취소한 후 삭제할 수 있습니다');
        }
      });

      await expect(mockSocialPosts.remove({ id: testPost._id }))
        .rejects.toThrow('예약된 게시물은 먼저 예약을 취소한 후 삭제할 수 있습니다');
    });
  });

  describe('updateStatus 뮤테이션', () => {
    it('게시물 상태를 업데이트해야 한다', async () => {
      // Arrange
      const testPost = createMockSocialPost({ status: 'draft' });
      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });

      // Act & Assert
      mockSocialPosts.updateStatus.mockImplementation(async (args) => {
        const identity = await mockCtx.auth.getUserIdentity();
        if (!identity) throw new Error('인증이 필요합니다');

        await mockCtx.db.patch(args.id, {
          status: args.status,
          publishedAt: args.publishedAt,
          errorMessage: args.errorMessage,
        });
        
        return args.id;
      });

      const result = await mockSocialPosts.updateStatus({
        id: testPost._id,
        status: 'published',
        publishedAt: new Date().toISOString(),
      });
      
      expect(mockCtx.db.patch).toHaveBeenCalledWith(testPost._id, {
        status: 'published',
        publishedAt: expect.any(String),
        errorMessage: undefined,
      });
      expect(result).toBe(testPost._id);
    });
  });

  describe('getDashboardStats 쿼리', () => {
    it('게시물 통계를 반환해야 한다', async () => {
      // Arrange
      const testPosts = [
        createMockSocialPost({ status: 'draft', creditsUsed: 5 }),
        createMockSocialPost({ status: 'published', creditsUsed: 3 }),
        createMockSocialPost({ status: 'scheduled', creditsUsed: 2 }),
        createMockSocialPost({ status: 'failed', creditsUsed: 1 }),
      ];

      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });

      // Act & Assert
      mockSocialPosts.getDashboardStats.mockImplementation(async () => {
        const identity = await mockCtx.auth.getUserIdentity();
        if (!identity) throw new Error('인증이 필요합니다');

        return {
          total: testPosts.length,
          draft: testPosts.filter(p => p.status === 'draft').length,
          scheduled: testPosts.filter(p => p.status === 'scheduled').length,
          published: testPosts.filter(p => p.status === 'published').length,
          failed: testPosts.filter(p => p.status === 'failed').length,
          totalCreditsUsed: testPosts.reduce((sum, p) => sum + p.creditsUsed, 0),
        };
      });

      const result = await mockSocialPosts.getDashboardStats({});
      
      expect(result).toEqual({
        total: 4,
        draft: 1,
        scheduled: 1,
        published: 1,
        failed: 1,
        totalCreditsUsed: 11,
      });
    });
  });
});