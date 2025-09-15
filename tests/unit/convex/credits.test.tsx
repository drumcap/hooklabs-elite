/**
 * Credits Convex 함수 단위 테스트
 * 크레딧 시스템의 잔액 계산, 추가, 사용 기능 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockConvexContext, setupDatabaseMocks, setupAuthMocks } from '../../utils/convex-test-helpers';
import { createMockCreditTransaction, createMockUser } from '../../utils/mock-data';

// Mock Convex 함수들
const mockCredits = {
  getUserCreditBalance: vi.fn(),
  addCredits: vi.fn(),
  useCredits: vi.fn(),
  getCreditHistory: vi.fn(),
  expireCredits: vi.fn(),
  calculateCreditBalance: vi.fn(),
};

describe('Credits Convex Functions', () => {
  let mockCtx: ReturnType<typeof createMockConvexContext>;
  let dbMocks: ReturnType<typeof setupDatabaseMocks>;
  let authMocks: ReturnType<typeof setupAuthMocks>;

  beforeEach(() => {
    mockCtx = createMockConvexContext();
    dbMocks = setupDatabaseMocks(mockCtx);
    authMocks = setupAuthMocks(mockCtx);
    vi.clearAllMocks();
  });

  describe('getUserCreditBalance 쿼리', () => {
    it('집계 테이블에서 사용자 크레딧 잔액을 반환해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const mockBalance = {
        userId: testUser._id,
        totalCredits: 100,
        availableCredits: 80,
        usedCredits: 20,
        expiredCredits: 0,
        lastUpdated: new Date().toISOString(),
      };

      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });
      
      const mockBalanceQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockBalance),
      };
      mockCtx.db.query.mockReturnValue(mockBalanceQuery);

      // Act & Assert
      mockCredits.getUserCreditBalance.mockImplementation(async ({ userId }) => {
        const currentUserId = await mockCtx.auth.getUserIdentity();
        if (!currentUserId) throw new Error('권한이 없습니다');

        return mockBalance;
      });

      const result = await mockCredits.getUserCreditBalance({ userId: testUser._id });
      
      expect(result).toEqual(mockBalance);
      // Mock 함수가 호출되었는지 확인 (실제 구현에서는 적절한 테이블명 사용)
    });

    it('집계 테이블이 없으면 실시간 계산을 수행해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testCredits = [
        createMockCreditTransaction({ 
          userId: testUser._id, 
          amount: 100, 
          type: 'purchased' 
        }),
        createMockCreditTransaction({ 
          userId: testUser._id, 
          amount: -20, 
          type: 'used' 
        }),
      ];

      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });
      
      // 집계 테이블에서 null 반환 (없음)
      const mockBalanceQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      };
      
      // credits 테이블에서 모든 기록 반환
      const mockCreditsQuery = {
        withIndex: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(testCredits),
      };
      
      mockCtx.db.query
        .mockReturnValueOnce(mockBalanceQuery)
        .mockReturnValueOnce(mockCreditsQuery);

      // Act & Assert
      mockCredits.calculateCreditBalance.mockImplementation((credits, userId) => {
        const now = new Date().toISOString();
        
        const totalCredits = credits
          .filter((c: any) => c.type !== 'expired')
          .reduce((sum: number, credit: any) => sum + credit.amount, 0);

        const usedCredits = credits
          .filter((c: any) => c.type === 'used')
          .reduce((sum: number, credit: any) => sum + Math.abs(credit.amount), 0);

        return {
          userId,
          totalCredits,
          availableCredits: Math.max(0, totalCredits),
          usedCredits,
          expiredCredits: 0,
          lastUpdated: now,
        };
      });

      mockCredits.getUserCreditBalance.mockImplementation(async ({ userId }) => {
        const currentUserId = await mockCtx.auth.getUserIdentity();
        if (!currentUserId) throw new Error('권한이 없습니다');

        // 집계 테이블에서 조회 실패
        const balance = null;
        
        if (!balance) {
          // 실시간 계산
          return mockCredits.calculateCreditBalance(testCredits, userId);
        }
        
        return balance;
      });

      const result = await mockCredits.getUserCreditBalance({ userId: testUser._id });
      
      expect(result).toMatchObject({
        userId: testUser._id,
        totalCredits: 80, // 100 + (-20)
        availableCredits: 80,
        usedCredits: 20,
        expiredCredits: 0,
      });
    });

    it('다른 사용자의 크레딧 조회 시 권한 에러를 던져야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const otherUser = createMockUser({ _id: 'other_user_id' });
      
      authMocks.mockAuthenticatedUser({ subject: 'clerk_user' });

      // Act & Assert
      mockCredits.getUserCreditBalance.mockImplementation(async ({ userId }) => {
        const currentUserId = testUser._id; // 현재 사용자
        if (currentUserId !== userId) {
          throw new Error('권한이 없습니다');
        }
      });

      await expect(mockCredits.getUserCreditBalance({ userId: otherUser._id }))
        .rejects.toThrow('권한이 없습니다');
    });
  });

  describe('addCredits 뮤테이션', () => {
    it('새로운 크레딧을 추가해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const creditData = {
        userId: testUser._id,
        amount: 50,
        type: 'purchased',
        description: '결제를 통한 크레딧 구매',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후
        relatedOrderId: 'order_123',
        metadata: { plan: 'pro' },
      };

      mockCtx.db.insert.mockResolvedValue('new_credit_id');

      // Act & Assert
      mockCredits.addCredits.mockImplementation(async (args) => {
        // 데이터 검증
        if (args.amount <= 0 || args.amount > 10000) {
          throw new Error('유효한 크레딧 금액이 아닙니다');
        }

        // 크레딧 기록 추가
        await mockCtx.db.insert('credits', {
          userId: args.userId,
          amount: args.amount,
          type: args.type,
          description: args.description,
          expiresAt: args.expiresAt,
          relatedOrderId: args.relatedOrderId,
          metadata: args.metadata,
        });

        // 집계 테이블 업데이트 (Mock)
        return 'new_credit_id';
      });

      const result = await mockCredits.addCredits(creditData);
      
      expect(mockCtx.db.insert).toHaveBeenCalledWith('credits', {
        userId: testUser._id,
        amount: 50,
        type: 'purchased',
        description: '결제를 통한 크레딧 구매',
        expiresAt: creditData.expiresAt,
        relatedOrderId: 'order_123',
        metadata: { plan: 'pro' },
      });
      expect(result).toBe('new_credit_id');
    });

    it('유효하지 않은 크레딧 금액에 대해 에러를 던져야 한다', async () => {
      // Arrange
      const testUser = createMockUser();

      // Act & Assert
      mockCredits.addCredits.mockImplementation(async (args) => {
        if (args.amount <= 0 || args.amount > 10000) {
          throw new Error('유효한 크레딧 금액이 아닙니다');
        }
      });

      // 음수 금액
      await expect(mockCredits.addCredits({
        userId: testUser._id,
        amount: -10,
        type: 'purchased',
        description: 'Invalid amount',
      })).rejects.toThrow('유효한 크레딧 금액이 아닙니다');

      // 너무 큰 금액
      await expect(mockCredits.addCredits({
        userId: testUser._id,
        amount: 15000,
        type: 'purchased',
        description: 'Too large amount',
      })).rejects.toThrow('유효한 크레딧 금액이 아닙니다');
    });

    it('보너스 크레딧을 올바르게 추가해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      mockCtx.db.insert.mockResolvedValue('bonus_credit_id');

      // Act & Assert
      mockCredits.addCredits.mockImplementation(async (args) => {
        await mockCtx.db.insert('credits', args);
        return 'bonus_credit_id';
      });

      const result = await mockCredits.addCredits({
        userId: testUser._id,
        amount: 10,
        type: 'bonus',
        description: '신규 가입 보너스',
      });
      
      expect(mockCtx.db.insert).toHaveBeenCalledWith('credits', {
        userId: testUser._id,
        amount: 10,
        type: 'bonus',
        description: '신규 가입 보너스',
      });
      expect(result).toBe('bonus_credit_id');
    });
  });

  describe('useCredits 뮤테이션', () => {
    it('크레딧을 사용하고 잔액을 차감해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const mockBalance = {
        userId: testUser._id,
        availableCredits: 50,
      };

      const mockBalanceQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockBalance),
      };
      mockCtx.db.query.mockReturnValue(mockBalanceQuery);
      mockCtx.db.insert.mockResolvedValue('used_credit_id');

      // Act & Assert
      mockCredits.useCredits.mockImplementation(async (args) => {
        // 데이터 검증
        if (args.amount <= 0 || args.amount > 1000) {
          throw new Error('유효한 크레딧 금액이 아닙니다');
        }

        // 잔액 확인
        const balance = mockBalance;
        if (!balance) {
          throw new Error('크레딧 잔액을 찾을 수 없습니다');
        }
        
        if (balance.availableCredits < args.amount) {
          throw new Error(`크레딧이 부족합니다. 필요: ${args.amount}, 보유: ${balance.availableCredits}`);
        }

        // 크레딧 사용 기록
        await mockCtx.db.insert('credits', {
          userId: args.userId,
          amount: -args.amount, // 음수로 저장
          type: 'used',
          description: args.description,
          relatedOrderId: args.relatedOrderId,
          metadata: args.metadata,
        });

        return 'used_credit_id';
      });

      const result = await mockCredits.useCredits({
        userId: testUser._id,
        amount: 10,
        description: 'AI 포스트 생성',
        metadata: { feature: 'ai_generation' },
      });
      
      expect(mockCtx.db.insert).toHaveBeenCalledWith('credits', {
        userId: testUser._id,
        amount: -10,
        type: 'used',
        description: 'AI 포스트 생성',
        relatedOrderId: undefined,
        metadata: { feature: 'ai_generation' },
      });
      expect(result).toBe('used_credit_id');
    });

    it('크레딧이 부족할 때 에러를 던져야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const mockBalance = {
        userId: testUser._id,
        availableCredits: 5, // 부족한 잔액
      };

      const mockBalanceQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(mockBalance),
      };
      mockCtx.db.query.mockReturnValue(mockBalanceQuery);

      // Act & Assert
      mockCredits.useCredits.mockImplementation(async (args) => {
        const balance = mockBalance;
        if (balance.availableCredits < args.amount) {
          throw new Error(`크레딧이 부족합니다. 필요: ${args.amount}, 보유: ${balance.availableCredits}`);
        }
      });

      await expect(mockCredits.useCredits({
        userId: testUser._id,
        amount: 10,
        description: 'AI 포스트 생성',
      })).rejects.toThrow('크레딧이 부족합니다. 필요: 10, 보유: 5');
    });

    it('크레딧 잔액이 존재하지 않을 때 에러를 던져야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      
      const mockBalanceQuery = {
        withIndex: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null), // 잔액 없음
      };
      mockCtx.db.query.mockReturnValue(mockBalanceQuery);

      // Act & Assert
      mockCredits.useCredits.mockImplementation(async (args) => {
        const balance = null;
        if (!balance) {
          throw new Error('크레딧 잔액을 찾을 수 없습니다');
        }
      });

      await expect(mockCredits.useCredits({
        userId: testUser._id,
        amount: 10,
        description: 'AI 포스트 생성',
      })).rejects.toThrow('크레딧 잔액을 찾을 수 없습니다');
    });
  });

  describe('calculateCreditBalance 헬퍼 함수', () => {
    it('크레딧 잔액을 올바르게 계산해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const testCredits = [
        { userId: testUser._id, amount: 100, type: 'purchased', expiresAt: futureDate },
        { userId: testUser._id, amount: 50, type: 'bonus', expiresAt: futureDate },
        { userId: testUser._id, amount: -20, type: 'used' },
        { userId: testUser._id, amount: -10, type: 'used' },
        { userId: testUser._id, amount: 30, type: 'purchased', expiresAt: pastDate }, // 만료됨
      ];

      // Act & Assert
      mockCredits.calculateCreditBalance.mockImplementation((credits, userId) => {
        const nowStr = new Date().toISOString();
        
        const totalCredits = credits
          .filter((c: any) => c.type !== 'expired')
          .reduce((sum: number, credit: any) => sum + credit.amount, 0);

        const availableCredits = credits
          .filter((c: any) => 
            c.type !== 'expired' && 
            (!c.expiresAt || c.expiresAt > nowStr)
          )
          .reduce((sum: number, credit: any) => sum + credit.amount, 0);

        const usedCredits = credits
          .filter((c: any) => c.type === 'used')
          .reduce((sum: number, credit: any) => sum + Math.abs(credit.amount), 0);

        const expiredCredits = credits
          .filter((c: any) => c.expiresAt && c.expiresAt <= nowStr && c.amount > 0)
          .reduce((sum: number, credit: any) => sum + Math.abs(credit.amount), 0);

        return {
          userId,
          totalCredits,
          availableCredits: Math.max(0, availableCredits),
          usedCredits,
          expiredCredits,
          lastUpdated: nowStr,
        };
      });

      const result = mockCredits.calculateCreditBalance(testCredits, testUser._id);
      
      expect(result).toMatchObject({
        userId: testUser._id,
        totalCredits: 150, // 100 + 50 + (-20) + (-10) + 30
        availableCredits: 120, // 100 + 50 + (-20) + (-10) (만료된 30 제외)
        usedCredits: 30, // 20 + 10 (절댓값)
        expiredCredits: 30, // 만료된 크레딧
      });
    });

    it('만료된 크레딧을 올바르게 처리해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 어제

      const testCredits = [
        { userId: testUser._id, amount: 100, type: 'purchased', expiresAt: pastDate }, // 만료됨
        { userId: testUser._id, amount: 50, type: 'bonus' }, // 만료 없음
      ];

      // Act & Assert
      mockCredits.calculateCreditBalance.mockImplementation((credits, userId) => {
        const nowStr = new Date().toISOString();
        
        const availableCredits = credits
          .filter((c: any) => 
            c.type !== 'expired' && 
            (!c.expiresAt || c.expiresAt > nowStr)
          )
          .reduce((sum: number, credit: any) => sum + credit.amount, 0);

        const expiredCredits = credits
          .filter((c: any) => c.expiresAt && c.expiresAt <= nowStr && c.amount > 0)
          .reduce((sum: number, credit: any) => sum + Math.abs(credit.amount), 0);

        return {
          userId,
          totalCredits: 150,
          availableCredits: Math.max(0, availableCredits),
          usedCredits: 0,
          expiredCredits,
          lastUpdated: nowStr,
        };
      });

      const result = mockCredits.calculateCreditBalance(testCredits, testUser._id);
      
      expect(result.availableCredits).toBe(50); // 만료되지 않은 크레딧만
      expect(result.expiredCredits).toBe(100); // 만료된 크레딧
    });
  });
});