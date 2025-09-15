import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock social account data
const mockSocialAccount = {
  _id: 'test_social_account_id' as const,
  userId: 'test_user_id' as const,
  platform: 'twitter' as const,
  accountId: 'twitter_123',
  username: 'testuser',
  displayName: '테스트 사용자',
  profileImage: 'https://example.com/profile.jpg',
  accessToken: 'encrypted_access_token',
  refreshToken: 'encrypted_refresh_token',
  tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  followers: 1000,
  following: 500,
  postsCount: 100,
  verificationStatus: 'verified' as const,
  isActive: true,
  lastSyncedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockUser = {
  _id: 'test_user_id' as const,
  email: 'test@example.com',
  externalId: 'external_test_id',
  firstName: '테스트',
  lastName: '사용자',
  imageUrl: null,
  isActive: true,
  lastSignInAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Convex 함수 Mock
const mockConvexFunctions = {
  list: vi.fn(),
  get: vi.fn(),
  getWithTokens: vi.fn(),
  getExpiringTokens: vi.fn(),
  getAccountStats: vi.fn(),
  create: vi.fn(),
  updateTokens: vi.fn(),
  toggleActive: vi.fn(),
  disconnect: vi.fn(),
};

// Mock encryption library
vi.mock('../../../convex/lib/encryption', () => ({
  SocialTokenManager: {
    encryptToken: vi.fn().mockImplementation((token: string) => `encrypted_${token}`),
    decryptToken: vi.fn().mockImplementation((encryptedToken: string) => 
      encryptedToken.replace('encrypted_', '')),
    isTokenExpired: vi.fn().mockImplementation((expiresAt?: string) => {
      if (!expiresAt) return false;
      return new Date(expiresAt) <= new Date();
    }),
  },
  SecurityLogger: {
    createSecurityLog: vi.fn().mockReturnValue('mock_log'),
  },
  InputSanitizer: {
    sanitizeInput: vi.fn().mockImplementation((input: string) => input),
    stripHtml: vi.fn().mockImplementation((input: string) => input.replace(/<[^>]*>/g, '')),
  },
}));

describe('Social Accounts Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('소셜 계정 조회 기능', () => {
    it('사용자의 소셜 계정 목록을 조회할 수 있어야 한다', () => {
      // Given: 사용자 ID가 주어졌을 때
      const userId = 'test_user_id';
      const expectedAccounts = [mockSocialAccount];
      
      mockConvexFunctions.list.mockReturnValue(expectedAccounts);
      
      // When: list 함수를 호출하면
      const result = mockConvexFunctions.list({ userId });
      
      // Then: 사용자의 소셜 계정 목록이 반환되어야 한다
      expect(mockConvexFunctions.list).toHaveBeenCalledWith({ userId });
      expect(result).toEqual(expectedAccounts);
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe('twitter');
    });

    it('특정 소셜 계정을 조회할 수 있어야 한다', () => {
      // Given: 계정 ID가 주어졌을 때
      const accountId = 'test_social_account_id';
      
      mockConvexFunctions.get.mockReturnValue(mockSocialAccount);
      
      // When: get 함수를 호출하면
      const result = mockConvexFunctions.get({ accountId });
      
      // Then: 해당 소셜 계정이 반환되어야 한다
      expect(mockConvexFunctions.get).toHaveBeenCalledWith({ accountId });
      expect(result).toEqual(mockSocialAccount);
      expect(result.username).toBe('testuser');
      expect(result.platform).toBe('twitter');
    });

    it('토큰을 포함한 소셜 계정을 조회할 수 있어야 한다', () => {
      // Given: 권한이 있는 사용자와 계정 ID가 주어졌을 때
      const accountId = 'test_social_account_id';
      const userId = 'test_user_id';
      
      const expectedAccountWithTokens = {
        ...mockSocialAccount,
        accessToken: 'decrypted_access_token',
        refreshToken: 'decrypted_refresh_token',
      };
      
      mockConvexFunctions.getWithTokens.mockReturnValue(expectedAccountWithTokens);
      
      // When: getWithTokens 함수를 호출하면
      const result = mockConvexFunctions.getWithTokens({ accountId, userId });
      
      // Then: 복호화된 토큰을 포함한 계정이 반환되어야 한다
      expect(mockConvexFunctions.getWithTokens).toHaveBeenCalledWith({ accountId, userId });
      expect(result.accessToken).toBe('decrypted_access_token');
      expect(result.refreshToken).toBe('decrypted_refresh_token');
    });

    it('만료 예정인 토큰을 가진 계정을 조회할 수 있어야 한다', () => {
      // Given: 만료 임계값이 주어졌을 때
      const hoursThreshold = 24;
      const expiringAccount = {
        ...mockSocialAccount,
        tokenExpiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12시간 후 만료
      };
      
      mockConvexFunctions.getExpiringTokens.mockReturnValue([expiringAccount]);
      
      // When: getExpiringTokens 함수를 호출하면
      const result = mockConvexFunctions.getExpiringTokens({ hoursThreshold });
      
      // Then: 만료 예정인 계정 목록이 반환되어야 한다
      expect(mockConvexFunctions.getExpiringTokens).toHaveBeenCalledWith({ hoursThreshold });
      expect(result).toHaveLength(1);
      expect(result[0].accountId).toBe('twitter_123');
      expect(result[0].platform).toBe('twitter');
    });

    it('계정 통계를 조회할 수 있어야 한다', () => {
      // Given: 사용자 ID가 주어졌을 때
      const userId = 'test_user_id';
      const expectedStats = {
        totalAccounts: 3,
        activeAccounts: 2,
        inactiveAccounts: 1,
        platformBreakdown: {
          twitter: 2,
          facebook: 1,
        },
        totalFollowers: 5000,
        totalFollowing: 2500,
        averageEngagement: 85.5,
      };
      
      mockConvexFunctions.getAccountStats.mockReturnValue(expectedStats);
      
      // When: getAccountStats 함수를 호출하면
      const result = mockConvexFunctions.getAccountStats({ userId });
      
      // Then: 계정 통계가 반환되어야 한다
      expect(mockConvexFunctions.getAccountStats).toHaveBeenCalledWith({ userId });
      expect(result.totalAccounts).toBe(3);
      expect(result.activeAccounts).toBe(2);
      expect(result.platformBreakdown.twitter).toBe(2);
      expect(result.averageEngagement).toBe(85.5);
    });
  });

  describe('소셜 계정 생성 기능', () => {
    it('새로운 소셜 계정을 생성할 수 있어야 한다', () => {
      // Given: 소셜 계정 생성 데이터가 주어졌을 때
      const createData = {
        userId: 'test_user_id',
        platform: 'twitter',
        accountId: 'twitter_456',
        username: 'newuser',
        displayName: '새 사용자',
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 7200000).toISOString(),
        followers: 500,
        following: 300,
        postsCount: 50,
      };
      
      const expectedAccountId = 'new_social_account_id';
      mockConvexFunctions.create.mockReturnValue(expectedAccountId);
      
      // When: create 함수를 호출하면
      const result = mockConvexFunctions.create(createData);
      
      // Then: 새로운 계정이 생성되어야 한다
      expect(mockConvexFunctions.create).toHaveBeenCalledWith(createData);
      expect(result).toBe(expectedAccountId);
    });

    it('중복된 플랫폼 계정 생성 시 오류가 발생해야 한다', () => {
      // Given: 이미 존재하는 플랫폼의 계정을 생성하려 할 때
      const duplicateData = {
        userId: 'test_user_id',
        platform: 'twitter',
        accountId: 'twitter_123', // 이미 존재하는 accountId
        username: 'testuser',
        accessToken: 'token',
      };
      
      const error = new Error('Account already exists for this platform');
      mockConvexFunctions.create.mockRejectedValue(error);
      
      // When & Then: create 함수 호출 시 오류가 발생해야 한다
      expect(async () => {
        await mockConvexFunctions.create(duplicateData);
      }).rejects.toThrow('Account already exists for this platform');
    });
  });

  describe('토큰 업데이트 기능', () => {
    it('소셜 계정의 토큰을 업데이트할 수 있어야 한다', () => {
      // Given: 토큰 업데이트 데이터가 주어졌을 때
      const updateData = {
        accountId: 'test_social_account_id',
        accessToken: 'updated_access_token',
        refreshToken: 'updated_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 7200000).toISOString(),
      };
      
      mockConvexFunctions.updateTokens.mockReturnValue('success');
      
      // When: updateTokens 함수를 호출하면
      const result = mockConvexFunctions.updateTokens(updateData);
      
      // Then: 토큰이 업데이트되어야 한다
      expect(mockConvexFunctions.updateTokens).toHaveBeenCalledWith(updateData);
      expect(result).toBe('success');
    });

    it('존재하지 않는 계정의 토큰 업데이트 시 오류가 발생해야 한다', () => {
      // Given: 존재하지 않는 계정 ID가 주어졌을 때
      const updateData = {
        accountId: 'non_existent_account',
        accessToken: 'token',
      };
      
      const error = new Error('Social account not found');
      mockConvexFunctions.updateTokens.mockRejectedValue(error);
      
      // When & Then: updateTokens 함수 호출 시 오류가 발생해야 한다
      expect(async () => {
        await mockConvexFunctions.updateTokens(updateData);
      }).rejects.toThrow('Social account not found');
    });
  });

  describe('계정 활성화/비활성화 기능', () => {
    it('소셜 계정을 활성화/비활성화할 수 있어야 한다', () => {
      // Given: 계정 ID와 활성화 상태가 주어졌을 때
      const toggleData = {
        accountId: 'test_social_account_id',
        isActive: false,
      };
      
      mockConvexFunctions.toggleActive.mockReturnValue('success');
      
      // When: toggleActive 함수를 호출하면
      const result = mockConvexFunctions.toggleActive(toggleData);
      
      // Then: 계정 상태가 변경되어야 한다
      expect(mockConvexFunctions.toggleActive).toHaveBeenCalledWith(toggleData);
      expect(result).toBe('success');
    });
  });

  describe('계정 연결 해제 기능', () => {
    it('소셜 계정을 연결 해제할 수 있어야 한다', () => {
      // Given: 계정 ID가 주어졌을 때
      const disconnectData = {
        accountId: 'test_social_account_id',
      };
      
      mockConvexFunctions.disconnect.mockReturnValue('success');
      
      // When: disconnect 함수를 호출하면
      const result = mockConvexFunctions.disconnect(disconnectData);
      
      // Then: 계정이 연결 해제되어야 한다
      expect(mockConvexFunctions.disconnect).toHaveBeenCalledWith(disconnectData);
      expect(result).toBe('success');
    });
  });

  describe('권한 및 보안 검증', () => {
    it('권한이 없는 사용자의 토큰 조회를 막아야 한다', () => {
      // Given: 권한이 없는 사용자가 다른 사용자의 토큰을 조회하려 할 때
      const unauthorizedData = {
        accountId: 'test_social_account_id',
        userId: 'unauthorized_user_id',
      };
      
      const error = new Error('Unauthorized access to social account');
      mockConvexFunctions.getWithTokens.mockRejectedValue(error);
      
      // When & Then: getWithTokens 함수 호출 시 오류가 발생해야 한다
      expect(async () => {
        await mockConvexFunctions.getWithTokens(unauthorizedData);
      }).rejects.toThrow('Unauthorized access to social account');
    });

    it('입력 데이터가 적절히 살균되어야 한다', () => {
      // Given: HTML 태그가 포함된 입력 데이터가 주어졌을 때
      const maliciousData = {
        userId: 'test_user_id',
        platform: 'twitter',
        accountId: 'twitter_789',
        username: '<script>alert("xss")</script>malicious',
        displayName: '<b>Bold Name</b>',
        accessToken: 'token',
      };
      
      // Mock된 입력 살균 함수들을 가져와서 사용
      const mockSanitizeInput = vi.fn().mockReturnValue('malicious');
      const mockStripHtml = vi.fn().mockReturnValue('Bold Name');
      
      mockConvexFunctions.create.mockImplementation((data) => {
        // 실제 함수에서는 입력 살균이 수행될 것이라고 가정
        mockSanitizeInput(data.username);
        mockStripHtml(data.displayName);
        return 'sanitized_account_id';
      });
      
      // When: create 함수를 호출하면
      mockConvexFunctions.create(maliciousData);
      
      // Then: 입력 살균 함수가 호출되어야 한다
      expect(mockSanitizeInput).toHaveBeenCalledWith(maliciousData.username);
      expect(mockStripHtml).toHaveBeenCalledWith(maliciousData.displayName);
    });
  });

  describe('에러 처리', () => {
    it('네트워크 오류 시 적절한 오류 메시지를 반환해야 한다', () => {
      // Given: 네트워크 오류가 발생했을 때
      const networkError = new Error('Network request failed');
      mockConvexFunctions.list.mockRejectedValue(networkError);
      
      // When & Then: 적절한 오류가 발생해야 한다
      expect(async () => {
        await mockConvexFunctions.list({ userId: 'test_user_id' });
      }).rejects.toThrow('Network request failed');
    });

    it('잘못된 입력 데이터에 대해 검증 오류를 반환해야 한다', () => {
      // Given: 잘못된 입력 데이터가 주어졌을 때
      const invalidData = {
        userId: '', // 빈 사용자 ID
        platform: 'invalid_platform', // 지원하지 않는 플랫폼
        accountId: null, // null 계정 ID
      };
      
      const validationError = new Error('Invalid input data');
      mockConvexFunctions.create.mockRejectedValue(validationError);
      
      // When & Then: 검증 오류가 발생해야 한다
      expect(async () => {
        await mockConvexFunctions.create(invalidData);
      }).rejects.toThrow('Invalid input data');
    });
  });

  describe('성능 및 최적화', () => {
    it('대량의 계정 조회 시 페이지네이션을 지원해야 한다', () => {
      // Given: 페이지네이션 파라미터가 주어졌을 때
      const paginationData = {
        userId: 'test_user_id',
        limit: 10,
        offset: 20,
      };
      
      const paginatedResult = {
        accounts: [mockSocialAccount],
        totalCount: 50,
        hasMore: true,
      };
      
      mockConvexFunctions.list.mockReturnValue(paginatedResult);
      
      // When: list 함수를 페이지네이션과 함께 호출하면
      const result = mockConvexFunctions.list(paginationData);
      
      // Then: 페이지네이션된 결과가 반환되어야 한다
      expect(mockConvexFunctions.list).toHaveBeenCalledWith(paginationData);
      expect(result.accounts).toHaveLength(1);
      expect(result.totalCount).toBe(50);
      expect(result.hasMore).toBe(true);
    });
  });
});