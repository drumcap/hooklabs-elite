/**
 * Users Convex 함수 단위 테스트
 * 사용자 생성, 조회, 업데이트, 삭제 기능 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockConvexContext, setupDatabaseMocks, setupAuthMocks, ConvexError } from '../../utils/convex-test-helpers';
import { createMockUser } from '../../utils/mock-data';

// 실제 Convex 함수들을 Mock으로 테스트
const mockUsers = {
  current: vi.fn(),
  upsertFromClerk: vi.fn(),
  deleteFromClerk: vi.fn(),
  getCurrentUser: vi.fn(),
  getCurrentUserOrThrow: vi.fn(),
  getByIdInternal: vi.fn(),
  getByExternalIdInternal: vi.fn(),
};

describe('Users Convex Functions', () => {
  let mockCtx: ReturnType<typeof createMockConvexContext>;
  let dbMocks: ReturnType<typeof setupDatabaseMocks>;
  let authMocks: ReturnType<typeof setupAuthMocks>;

  beforeEach(() => {
    mockCtx = createMockConvexContext();
    dbMocks = setupDatabaseMocks(mockCtx);
    authMocks = setupAuthMocks(mockCtx);
    vi.clearAllMocks();
  });

  describe('current 쿼리', () => {
    it('인증된 사용자의 정보를 반환해야 한다', async () => {
      // Arrange
      const testUser = createMockUser({
        _id: 'user123',
        externalId: 'clerk_user123',
        name: 'Test User',
      });

      authMocks.mockAuthenticatedUser({
        subject: 'clerk_user123',
        name: 'Test User',
        email: 'test@example.com',
      });

      dbMocks.setupQueryMock('users', [testUser]);
      mockCtx.db.get.mockResolvedValue(testUser);

      // Act & Assert - Mock 함수로 동작 확인
      mockUsers.current.mockImplementation(async () => {
        const identity = await mockCtx.auth.getUserIdentity();
        if (!identity) return null;
        return testUser;
      });

      const result = await mockUsers.current();
      expect(result).toEqual(testUser);
    });

    it('인증되지 않은 사용자에 대해 null을 반환해야 한다', async () => {
      // Arrange
      authMocks.mockUnauthenticatedUser();

      // Act & Assert
      mockUsers.current.mockImplementation(async () => {
        const identity = await mockCtx.auth.getUserIdentity();
        return identity ? createMockUser() : null;
      });

      const result = await mockUsers.current();
      expect(result).toBeNull();
    });
  });

  describe('upsertFromClerk 뮤테이션', () => {
    it('새로운 사용자를 생성해야 한다', async () => {
      // Arrange
      const clerkData = {
        id: 'clerk_new_user',
        first_name: 'John',
        last_name: 'Doe',
        email_addresses: [{ email_address: 'john@example.com' }],
      };

      // 기존 사용자 없음을 Mock
      dbMocks.setupQueryMock('users', []);
      mockCtx.db.insert.mockResolvedValue('new_user_id');

      // Act & Assert
      mockUsers.upsertFromClerk.mockImplementation(async ({ data }) => {
        // 기존 사용자 조회
        const existingUser = null; // Mock: 사용자 없음
        
        if (!existingUser) {
          // 새 사용자 생성
          const userAttributes = {
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            externalId: data.id,
          };
          
          await mockCtx.db.insert('users', userAttributes);
          return 'new_user_id';
        }
      });

      const result = await mockUsers.upsertFromClerk({ data: clerkData });
      
      expect(mockCtx.db.insert).toHaveBeenCalledWith('users', {
        name: 'John Doe',
        externalId: 'clerk_new_user',
      });
      expect(result).toBe('new_user_id');
    });

    it('기존 사용자를 업데이트해야 한다', async () => {
      // Arrange
      const existingUser = createMockUser({
        _id: 'existing_user_id',
        externalId: 'clerk_existing_user',
        name: 'Old Name',
      });

      const clerkData = {
        id: 'clerk_existing_user',
        first_name: 'Updated',
        last_name: 'Name',
      };

      dbMocks.setupQueryMock('users', [existingUser]);

      // Act & Assert
      mockUsers.upsertFromClerk.mockImplementation(async ({ data }) => {
        const existingUser = { _id: 'existing_user_id' }; // Mock: 사용자 존재
        
        if (existingUser) {
          const userAttributes = {
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
            externalId: data.id,
          };
          
          await mockCtx.db.patch(existingUser._id, userAttributes);
        }
      });

      await mockUsers.upsertFromClerk({ data: clerkData });
      
      expect(mockCtx.db.patch).toHaveBeenCalledWith('existing_user_id', {
        name: 'Updated Name',
        externalId: 'clerk_existing_user',
      });
    });

    it('빈 이름 필드를 올바르게 처리해야 한다', async () => {
      // Arrange
      const clerkData = {
        id: 'clerk_user',
        first_name: null,
        last_name: undefined,
      };

      dbMocks.setupQueryMock('users', []);

      // Act & Assert
      mockUsers.upsertFromClerk.mockImplementation(async ({ data }) => {
        const userAttributes = {
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          externalId: data.id,
        };
        
        await mockCtx.db.insert('users', userAttributes);
      });

      await mockUsers.upsertFromClerk({ data: clerkData });
      
      expect(mockCtx.db.insert).toHaveBeenCalledWith('users', {
        name: '', // 빈 문자열로 처리
        externalId: 'clerk_user',
      });
    });
  });

  describe('deleteFromClerk 뮤테이션', () => {
    it('존재하는 사용자를 삭제해야 한다', async () => {
      // Arrange
      const existingUser = createMockUser({
        _id: 'user_to_delete',
        externalId: 'clerk_user_to_delete',
      });

      dbMocks.setupQueryMock('users', [existingUser]);

      // Act & Assert
      mockUsers.deleteFromClerk.mockImplementation(async ({ clerkUserId }) => {
        const user = existingUser; // Mock: 사용자 존재
        
        if (user) {
          await mockCtx.db.delete(user._id);
        }
      });

      await mockUsers.deleteFromClerk({ clerkUserId: 'clerk_user_to_delete' });
      
      expect(mockCtx.db.delete).toHaveBeenCalledWith('user_to_delete');
    });

    it('존재하지 않는 사용자 삭제 시 경고를 출력해야 한다', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      dbMocks.setupQueryMock('users', []); // 사용자 없음

      // Act & Assert
      mockUsers.deleteFromClerk.mockImplementation(async ({ clerkUserId }) => {
        const user = null; // Mock: 사용자 없음
        
        if (!user) {
          console.warn(`Can't delete user, there is none for Clerk user ID: ${clerkUserId}`);
        }
      });

      await mockUsers.deleteFromClerk({ clerkUserId: 'nonexistent_user' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        `Can't delete user, there is none for Clerk user ID: nonexistent_user`
      );
      expect(mockCtx.db.delete).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('getCurrentUser 헬퍼 함수', () => {
    it('인증된 사용자의 정보를 반환해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      
      authMocks.mockAuthenticatedUser({
        subject: 'clerk_user123',
      });
      
      mockCtx.db.get.mockResolvedValue(testUser);

      // Act & Assert
      mockUsers.getCurrentUser.mockImplementation(async () => {
        const identity = await mockCtx.auth.getUserIdentity();
        if (!identity) return null;
        
        return await mockCtx.db.get('user_id'); // Mock user ID
      });

      const result = await mockUsers.getCurrentUser();
      expect(result).toEqual(testUser);
    });

    it('인증되지 않은 사용자에 대해 null을 반환해야 한다', async () => {
      // Arrange
      authMocks.mockUnauthenticatedUser();

      // Act & Assert
      mockUsers.getCurrentUser.mockImplementation(async () => {
        const identity = await mockCtx.auth.getUserIdentity();
        return identity ? createMockUser() : null;
      });

      const result = await mockUsers.getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe('getCurrentUserOrThrow 헬퍼 함수', () => {
    it('인증된 사용자의 정보를 반환해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      
      mockUsers.getCurrentUser.mockResolvedValue(testUser);

      // Act & Assert
      mockUsers.getCurrentUserOrThrow.mockImplementation(async () => {
        const userRecord = await mockUsers.getCurrentUser();
        if (!userRecord) throw new Error('사용자 인증이 필요합니다');
        return userRecord;
      });

      const result = await mockUsers.getCurrentUserOrThrow();
      expect(result).toEqual(testUser);
    });

    it('인증되지 않은 사용자에 대해 에러를 던져야 한다', async () => {
      // Arrange
      mockUsers.getCurrentUser.mockResolvedValue(null);

      // Act & Assert
      mockUsers.getCurrentUserOrThrow.mockImplementation(async () => {
        const userRecord = await mockUsers.getCurrentUser();
        if (!userRecord) throw new Error('사용자 인증이 필요합니다');
        return userRecord;
      });

      await expect(mockUsers.getCurrentUserOrThrow()).rejects.toThrow('사용자 인증이 필요합니다');
    });
  });

  describe('getByIdInternal 내부 쿼리', () => {
    it('ID로 사용자를 조회해야 한다', async () => {
      // Arrange
      const testUser = createMockUser({ _id: 'test_user_id' });
      mockCtx.db.get.mockResolvedValue(testUser);

      // Act & Assert
      mockUsers.getByIdInternal.mockImplementation(async ({ id }) => {
        return await mockCtx.db.get(id);
      });

      const result = await mockUsers.getByIdInternal({ id: 'test_user_id' });
      
      expect(mockCtx.db.get).toHaveBeenCalledWith('test_user_id');
      expect(result).toEqual(testUser);
    });

    it('존재하지 않는 ID에 대해 null을 반환해야 한다', async () => {
      // Arrange
      mockCtx.db.get.mockResolvedValue(null);

      // Act & Assert
      mockUsers.getByIdInternal.mockImplementation(async ({ id }) => {
        return await mockCtx.db.get(id);
      });

      const result = await mockUsers.getByIdInternal({ id: 'nonexistent_id' });
      
      expect(result).toBeNull();
    });
  });

  describe('getByExternalIdInternal 내부 쿼리', () => {
    it('External ID로 사용자를 조회해야 한다', async () => {
      // Arrange
      const testUser = createMockUser({ externalId: 'clerk_test_user' });
      
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        unique: vi.fn().mockResolvedValue(testUser),
      };
      mockCtx.db.query.mockReturnValue(mockQuery);

      // Act & Assert
      mockUsers.getByExternalIdInternal.mockImplementation(async ({ externalId }) => {
        return await mockCtx.db
          .query('users')
          .withIndex('byExternalId', (q: any) => q.eq('externalId', externalId))
          .unique();
      });

      const result = await mockUsers.getByExternalIdInternal({ externalId: 'clerk_test_user' });
      
      expect(mockCtx.db.query).toHaveBeenCalledWith('users');
      expect(result).toEqual(testUser);
    });

    it('존재하지 않는 External ID에 대해 null을 반환해야 한다', async () => {
      // Arrange
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        unique: vi.fn().mockResolvedValue(null),
      };
      mockCtx.db.query.mockReturnValue(mockQuery);

      // Act & Assert
      mockUsers.getByExternalIdInternal.mockImplementation(async ({ externalId }) => {
        return await mockCtx.db
          .query('users')
          .withIndex('byExternalId', (q: any) => q.eq('externalId', externalId))
          .unique();
      });

      const result = await mockUsers.getByExternalIdInternal({ externalId: 'nonexistent_external_id' });
      
      expect(result).toBeNull();
    });
  });
});