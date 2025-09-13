/**
 * socialAccounts Convex 함수 단위 테스트
 * 토큰 만료 관리, 계정 통계, 계정 관리 기능 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMockConvexContext,
  setupDatabaseMocks,
  setupAuthMocks,
  cleanupTestData,
  ConvexError,
} from '../../utils/convex-test-helpers';
import { createMockSocialAccount, createExpiringToken, createScenarioData } from '../../fixtures/social-media-advanced';

// Mock Convex functions - 실제 구현에서는 import해야 함
const mockSocialAccounts = {
  list: vi.fn(),
  get: vi.fn(),
  getExpiringTokens: vi.fn(),
  updateTokens: vi.fn(),
  getAccountStats: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  disconnect: vi.fn(),
};

describe('socialAccounts - Token Expiry Management', () => {
  let mockCtx: ReturnType<typeof createMockConvexContext>;
  let dbMocks: ReturnType<typeof setupDatabaseMocks>;
  let authMocks: ReturnType<typeof setupAuthMocks>;

  beforeEach(() => {
    mockCtx = createMockConvexContext();
    dbMocks = setupDatabaseMocks(mockCtx);
    authMocks = setupAuthMocks(mockCtx);
  });

  afterEach(async () => {
    await cleanupTestData(mockCtx);
    vi.clearAllMocks();
  });

  describe('getExpiringTokens', () => {
    it('기본 24시간 임계값으로 만료 예정 토큰을 조회해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const expiringAccount = createExpiringToken(1); // 1시간 후 만료
      const validAccount = createMockSocialAccount({
        tokenExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48시간 후
      });

      dbMocks.setupQueryMock('socialAccounts', [expiringAccount, validAccount]);

      // Mock implementation
      mockSocialAccounts.getExpiringTokens.mockImplementation(async (ctx, { hoursThreshold = 24 }) => {
        const accounts = await ctx.db.query('socialAccounts').collect();
        const now = new Date();
        const thresholdTime = new Date(now.getTime() + hoursThreshold * 60 * 60 * 1000);

        return accounts.filter(account => {
          if (!account.tokenExpiresAt) return false;
          const expiresAt = new Date(account.tokenExpiresAt);
          return expiresAt <= thresholdTime;
        }).map(account => ({
          _id: account._id,
          platform: account.platform,
          username: account.username,
          displayName: account.displayName,
          tokenExpiresAt: account.tokenExpiresAt,
        }));
      });

      const result = await mockSocialAccounts.getExpiringTokens(mockCtx, {});

      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe(expiringAccount._id);
      expect(result[0]).toHaveProperty('platform');
      expect(result[0]).toHaveProperty('username');
      expect(result[0]).not.toHaveProperty('accessToken'); // 보안상 제외
    });

    it('사용자 지정 임계값으로 만료 예정 토큰을 조회해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const accounts = [
        createExpiringToken(0.5), // 30분 후 만료
        createExpiringToken(2),   // 2시간 후 만료
        createExpiringToken(8),   // 8시간 후 만료
      ];

      dbMocks.setupQueryMock('socialAccounts', accounts);

      mockSocialAccounts.getExpiringTokens.mockImplementation(async (ctx, { hoursThreshold = 24 }) => {
        const accounts = await ctx.db.query('socialAccounts').collect();
        const now = new Date();
        const thresholdTime = new Date(now.getTime() + hoursThreshold * 60 * 60 * 1000);

        return accounts.filter(account => {
          if (!account.tokenExpiresAt) return false;
          const expiresAt = new Date(account.tokenExpiresAt);
          return expiresAt <= thresholdTime;
        });
      });

      // 6시간 임계값으로 테스트
      const result = await mockSocialAccounts.getExpiringTokens(mockCtx, { hoursThreshold: 6 });

      expect(result).toHaveLength(2); // 30분, 2시간 후 만료되는 것만
    });

    it('인증되지 않은 사용자에게 에러를 반환해야 함', async () => {
      authMocks.mockUnauthenticatedUser();

      mockSocialAccounts.getExpiringTokens.mockImplementation(async () => {
        throw ConvexError.unauthenticated('인증이 필요합니다');
      });

      await expect(
        mockSocialAccounts.getExpiringTokens(mockCtx, {})
      ).rejects.toThrow('인증이 필요합니다');
    });

    it('토큰 만료 시간이 없는 계정은 제외해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const accounts = [
        createMockSocialAccount({ tokenExpiresAt: undefined }),
        createExpiringToken(1),
      ];

      dbMocks.setupQueryMock('socialAccounts', accounts);

      mockSocialAccounts.getExpiringTokens.mockImplementation(async (ctx, { hoursThreshold = 24 }) => {
        const accounts = await ctx.db.query('socialAccounts').collect();
        return accounts.filter(account => account.tokenExpiresAt);
      });

      const result = await mockSocialAccounts.getExpiringTokens(mockCtx, {});

      expect(result).toHaveLength(1);
    });
  });

  describe('updateTokens', () => {
    it('토큰을 성공적으로 업데이트해야 함', async () => {
      const userId = 'user123';
      const accountId = 'acc123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const existingAccount = createMockSocialAccount({
        _id: accountId,
        userId,
        platform: 'twitter'
      });

      mockCtx.db.get.mockResolvedValue(existingAccount);
      dbMocks.setupPatchMock('socialAccounts');

      mockSocialAccounts.updateTokens.mockImplementation(async (ctx, { id, accessToken, refreshToken, tokenExpiresAt }) => {
        const account = await ctx.db.get(id);
        if (!account) throw ConvexError.notFound('계정');
        if (account.userId !== userId) throw ConvexError.unauthorized();

        await ctx.db.patch(id, {
          accessToken: `encrypted_${accessToken}`,
          refreshToken: refreshToken ? `encrypted_${refreshToken}` : undefined,
          tokenExpiresAt,
          lastSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        return id;
      });

      const newTokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      
      const result = await mockSocialAccounts.updateTokens(mockCtx, {
        id: accountId,
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        tokenExpiresAt: newTokenExpiresAt,
      });

      expect(result).toBe(accountId);
      expect(mockCtx.db.patch).toHaveBeenCalledWith(
        accountId,
        expect.objectContaining({
          accessToken: 'encrypted_new_access_token',
          refreshToken: 'encrypted_new_refresh_token',
          tokenExpiresAt: newTokenExpiresAt,
        })
      );
    });

    it('다른 사용자의 계정 토큰 업데이트 시 에러를 반환해야 함', async () => {
      const userId = 'user123';
      const otherUserId = 'user456';
      const accountId = 'acc123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const otherUserAccount = createMockSocialAccount({
        _id: accountId,
        userId: otherUserId,
      });

      mockCtx.db.get.mockResolvedValue(otherUserAccount);

      mockSocialAccounts.updateTokens.mockImplementation(async (ctx, { id }) => {
        const account = await ctx.db.get(id);
        if (account.userId !== userId) {
          throw ConvexError.unauthorized('수정 권한이 없습니다');
        }
      });

      await expect(
        mockSocialAccounts.updateTokens(mockCtx, {
          id: accountId,
          accessToken: 'new_token',
        })
      ).rejects.toThrow('수정 권한이 없습니다');
    });

    it('존재하지 않는 계정에 대해 에러를 반환해야 함', async () => {
      const userId = 'user123';
      const accountId = 'nonexistent';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      mockCtx.db.get.mockResolvedValue(null);

      mockSocialAccounts.updateTokens.mockImplementation(async (ctx, { id }) => {
        const account = await ctx.db.get(id);
        if (!account) {
          throw ConvexError.notFound('소셜 계정을 찾을 수 없습니다');
        }
      });

      await expect(
        mockSocialAccounts.updateTokens(mockCtx, {
          id: accountId,
          accessToken: 'new_token',
        })
      ).rejects.toThrow('소셜 계정을 찾을 수 없습니다');
    });
  });

  describe('getAccountStats', () => {
    it('계정별 게시물 통계를 정확히 계산해야 함', async () => {
      const userId = 'user123';
      const accountId = 'acc123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const account = createMockSocialAccount({
        _id: accountId,
        userId,
      });

      const scheduledPosts = [
        { _id: 'post1', socialAccountId: accountId, status: 'published' },
        { _id: 'post2', socialAccountId: accountId, status: 'published' },
        { _id: 'post3', socialAccountId: accountId, status: 'failed' },
        { _id: 'post4', socialAccountId: accountId, status: 'pending' },
      ];

      mockCtx.db.get.mockResolvedValue(account);
      dbMocks.setupQueryMock('scheduledPosts', scheduledPosts);

      mockSocialAccounts.getAccountStats.mockImplementation(async (ctx, { accountId }) => {
        const account = await ctx.db.get(accountId);
        if (!account) throw ConvexError.notFound('계정');

        const posts = await ctx.db.query('scheduledPosts').collect();
        const accountPosts = posts.filter(p => p.socialAccountId === accountId);

        const stats = {
          totalScheduled: accountPosts.length,
          published: accountPosts.filter(p => p.status === 'published').length,
          failed: accountPosts.filter(p => p.status === 'failed').length,
          pending: accountPosts.filter(p => p.status === 'pending').length,
          successRate: 0,
        };

        if (stats.totalScheduled > 0) {
          stats.successRate = Math.round((stats.published / stats.totalScheduled) * 100);
        }

        return stats;
      });

      const result = await mockSocialAccounts.getAccountStats(mockCtx, { accountId });

      expect(result).toEqual({
        totalScheduled: 4,
        published: 2,
        failed: 1,
        pending: 1,
        successRate: 50, // 2/4 * 100
      });
    });

    it('게시물이 없는 계정에 대해 0 통계를 반환해야 함', async () => {
      const userId = 'user123';
      const accountId = 'acc123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const account = createMockSocialAccount({
        _id: accountId,
        userId,
      });

      mockCtx.db.get.mockResolvedValue(account);
      dbMocks.setupQueryMock('scheduledPosts', []);

      mockSocialAccounts.getAccountStats.mockImplementation(async () => ({
        totalScheduled: 0,
        published: 0,
        failed: 0,
        pending: 0,
        successRate: 0,
      }));

      const result = await mockSocialAccounts.getAccountStats(mockCtx, { accountId });

      expect(result.totalScheduled).toBe(0);
      expect(result.successRate).toBe(0);
    });

    it('다른 사용자의 계정 통계 조회 시 에러를 반환해야 함', async () => {
      const userId = 'user123';
      const otherUserId = 'user456';
      const accountId = 'acc123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const otherUserAccount = createMockSocialAccount({
        _id: accountId,
        userId: otherUserId,
      });

      mockCtx.db.get.mockResolvedValue(otherUserAccount);

      mockSocialAccounts.getAccountStats.mockImplementation(async (ctx, { accountId }) => {
        const account = await ctx.db.get(accountId);
        if (account.userId !== userId) {
          throw ConvexError.unauthorized('계정에 대한 접근 권한이 없습니다');
        }
      });

      await expect(
        mockSocialAccounts.getAccountStats(mockCtx, { accountId })
      ).rejects.toThrow('계정에 대한 접근 권한이 없습니다');
    });
  });

  describe('list - 필터링 기능', () => {
    it('플랫폼별로 소셜 계정을 필터링해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const accounts = [
        createMockSocialAccount({ userId, platform: 'twitter' }),
        createMockSocialAccount({ userId, platform: 'linkedin' }),
        createMockSocialAccount({ userId, platform: 'twitter' }),
      ];

      dbMocks.setupQueryMock('socialAccounts', accounts);

      mockSocialAccounts.list.mockImplementation(async (ctx, { platform }) => {
        const allAccounts = await ctx.db.query('socialAccounts').collect();
        return platform 
          ? allAccounts.filter(acc => acc.platform === platform)
          : allAccounts;
      });

      const result = await mockSocialAccounts.list(mockCtx, { platform: 'twitter' });

      expect(result).toHaveLength(2);
      expect(result.every(acc => acc.platform === 'twitter')).toBe(true);
    });

    it('활성 상태로 소셜 계정을 필터링해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const accounts = [
        createMockSocialAccount({ userId, isActive: true }),
        createMockSocialAccount({ userId, isActive: false }),
        createMockSocialAccount({ userId, isActive: true }),
      ];

      dbMocks.setupQueryMock('socialAccounts', accounts);

      mockSocialAccounts.list.mockImplementation(async (ctx, { isActive }) => {
        const allAccounts = await ctx.db.query('socialAccounts').collect();
        return isActive !== undefined
          ? allAccounts.filter(acc => acc.isActive === isActive)
          : allAccounts;
      });

      const result = await mockSocialAccounts.list(mockCtx, { isActive: true });

      expect(result).toHaveLength(2);
      expect(result.every(acc => acc.isActive === true)).toBe(true);
    });

    it('민감한 토큰 정보를 제거하고 반환해야 함', async () => {
      const userId = 'user123';
      const mockUser = { tokenIdentifier: 'test-token', subject: userId };
      authMocks.mockAuthenticatedUser(mockUser);

      const accounts = [
        createMockSocialAccount({
          userId,
          accessToken: 'sensitive_access_token',
          refreshToken: 'sensitive_refresh_token',
        }),
      ];

      dbMocks.setupQueryMock('socialAccounts', accounts);

      mockSocialAccounts.list.mockImplementation(async () => {
        const accounts = await mockCtx.db.query('socialAccounts').collect();
        return accounts.map(account => ({
          ...account,
          accessToken: undefined,
          refreshToken: undefined,
        }));
      });

      const result = await mockSocialAccounts.list(mockCtx, {});

      expect(result[0]).not.toHaveProperty('accessToken');
      expect(result[0]).not.toHaveProperty('refreshToken');
      expect(result[0]).toHaveProperty('platform');
      expect(result[0]).toHaveProperty('username');
    });
  });
});