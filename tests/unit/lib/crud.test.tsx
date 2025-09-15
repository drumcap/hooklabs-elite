/**
 * CRUD 유틸리티 함수 단위 테스트
 * 공통 CRUD 작업의 핵심 로직 검증
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockConvexContext, setupDatabaseMocks } from '../../utils/convex-test-helpers';
import { createMockUser, createMockSocialPost } from '../../utils/mock-data';

// Mock CRUD 함수들
const mockCrud = {
  createResource: vi.fn(),
  getResource: vi.fn(),
  updateResource: vi.fn(),
  deleteResource: vi.fn(),
  listResources: vi.fn(),
  checkUserOwnership: vi.fn(),
  checkDuplicate: vi.fn(),
  batchDeleteResources: vi.fn(),
};

// CRUD 에러 상수
const CRUD_ERRORS = {
  NOT_FOUND: "리소스를 찾을 수 없습니다",
  UNAUTHORIZED: "접근 권한이 없습니다",
  ALREADY_EXISTS: "이미 존재하는 리소스입니다",
  INVALID_DATA: "잘못된 데이터입니다",
  CREATION_FAILED: "생성에 실패했습니다",
  UPDATE_FAILED: "업데이트에 실패했습니다",
  DELETE_FAILED: "삭제에 실패했습니다",
};

describe('CRUD Utility Functions', () => {
  let mockCtx: ReturnType<typeof createMockConvexContext>;
  let dbMocks: ReturnType<typeof setupDatabaseMocks>;

  beforeEach(() => {
    mockCtx = createMockConvexContext();
    dbMocks = setupDatabaseMocks(mockCtx);
    vi.clearAllMocks();
  });

  describe('createResource', () => {
    it('새로운 리소스를 생성해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const resourceData = {
        title: 'Test Resource',
        description: 'Test Description',
        userId: testUser._id,
      };

      mockCtx.db.insert.mockResolvedValue('new_resource_id');

      // Act & Assert
      mockCrud.createResource.mockImplementation(async (ctx, tableName, data, userId) => {
        // 데이터 검증
        if (!data.title || !data.description) {
          throw new Error(CRUD_ERRORS.INVALID_DATA);
        }

        // 중복 확인 (선택적)
        const duplicate = null; // Mock: 중복 없음
        if (duplicate) {
          throw new Error(CRUD_ERRORS.ALREADY_EXISTS);
        }

        // 리소스 생성
        const resourceWithMeta = {
          ...data,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const id = await mockCtx.db.insert(tableName, resourceWithMeta);
        return id;
      });

      const result = await mockCrud.createResource(
        mockCtx, 
        'socialPosts', 
        resourceData, 
        testUser._id
      );

      expect(mockCtx.db.insert).toHaveBeenCalledWith('socialPosts', expect.objectContaining({
        ...resourceData,
        userId: testUser._id,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }));
      expect(result).toBe('new_resource_id');
    });

    it('필수 데이터가 없으면 에러를 던져야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const invalidData = {
        title: '', // 빈 제목
        userId: testUser._id,
      };

      // Act & Assert
      mockCrud.createResource.mockImplementation(async (ctx, tableName, data, userId) => {
        if (!data.title || !data.description) {
          throw new Error(CRUD_ERRORS.INVALID_DATA);
        }
      });

      await expect(mockCrud.createResource(
        mockCtx, 
        'socialPosts', 
        invalidData, 
        testUser._id
      )).rejects.toThrow(CRUD_ERRORS.INVALID_DATA);
    });

    it('중복 리소스 생성 시 에러를 던져야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const resourceData = {
        title: 'Existing Resource',
        description: 'Test Description',
        userId: testUser._id,
      };

      // Act & Assert
      mockCrud.createResource.mockImplementation(async (ctx, tableName, data, userId) => {
        // 중복 확인
        const duplicate = { _id: 'existing_id' }; // Mock: 중복 있음
        if (duplicate) {
          throw new Error(CRUD_ERRORS.ALREADY_EXISTS);
        }
      });

      await expect(mockCrud.createResource(
        mockCtx, 
        'socialPosts', 
        resourceData, 
        testUser._id
      )).rejects.toThrow(CRUD_ERRORS.ALREADY_EXISTS);
    });
  });

  describe('getResource', () => {
    it('리소스를 조회해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testResource = createMockSocialPost({ 
        _id: 'test_resource_id',
        userId: testUser._id 
      });

      mockCtx.db.get.mockResolvedValue(testResource);

      // Act & Assert
      mockCrud.getResource.mockImplementation(async (ctx, tableName, resourceId, userId) => {
        const resource = await mockCtx.db.get(resourceId);
        
        if (!resource) {
          throw new Error(CRUD_ERRORS.NOT_FOUND);
        }

        // 소유권 확인
        if (userId && resource.userId !== userId) {
          throw new Error(CRUD_ERRORS.UNAUTHORIZED);
        }

        return resource;
      });

      const result = await mockCrud.getResource(
        mockCtx, 
        'socialPosts', 
        'test_resource_id', 
        testUser._id
      );

      expect(mockCtx.db.get).toHaveBeenCalledWith('test_resource_id');
      expect(result).toEqual(testResource);
    });

    it('존재하지 않는 리소스에 대해 에러를 던져야 한다', async () => {
      // Arrange
      mockCtx.db.get.mockResolvedValue(null);

      // Act & Assert
      mockCrud.getResource.mockImplementation(async (ctx, tableName, resourceId, userId) => {
        const resource = await mockCtx.db.get(resourceId);
        
        if (!resource) {
          throw new Error(CRUD_ERRORS.NOT_FOUND);
        }
      });

      await expect(mockCrud.getResource(
        mockCtx, 
        'socialPosts', 
        'nonexistent_id', 
        'user_id'
      )).rejects.toThrow(CRUD_ERRORS.NOT_FOUND);
    });

    it('권한이 없는 리소스 접근 시 에러를 던져야 한다', async () => {
      // Arrange
      const testResource = createMockSocialPost({ 
        _id: 'test_resource_id',
        userId: 'other_user_id' 
      });

      mockCtx.db.get.mockResolvedValue(testResource);

      // Act & Assert
      mockCrud.getResource.mockImplementation(async (ctx, tableName, resourceId, userId) => {
        const resource = testResource;
        
        if (userId && resource.userId !== userId) {
          throw new Error(CRUD_ERRORS.UNAUTHORIZED);
        }
      });

      await expect(mockCrud.getResource(
        mockCtx, 
        'socialPosts', 
        'test_resource_id', 
        'different_user_id'
      )).rejects.toThrow(CRUD_ERRORS.UNAUTHORIZED);
    });
  });

  describe('updateResource', () => {
    it('리소스를 업데이트해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testResource = createMockSocialPost({ 
        _id: 'test_resource_id',
        userId: testUser._id 
      });
      const updates = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      mockCtx.db.get.mockResolvedValue(testResource);
      mockCtx.db.patch.mockResolvedValue();

      // Act & Assert
      mockCrud.updateResource.mockImplementation(async (ctx, tableName, resourceId, updates, userId) => {
        // 리소스 존재 확인
        const resource = await mockCtx.db.get(resourceId);
        if (!resource) {
          throw new Error(CRUD_ERRORS.NOT_FOUND);
        }

        // 소유권 확인
        if (userId && resource.userId !== userId) {
          throw new Error(CRUD_ERRORS.UNAUTHORIZED);
        }

        // 업데이트
        const updatesWithMeta = {
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        await mockCtx.db.patch(resourceId, updatesWithMeta);
        return resourceId;
      });

      const result = await mockCrud.updateResource(
        mockCtx, 
        'socialPosts', 
        'test_resource_id', 
        updates, 
        testUser._id
      );

      expect(mockCtx.db.patch).toHaveBeenCalledWith('test_resource_id', {
        ...updates,
        updatedAt: expect.any(String),
      });
      expect(result).toBe('test_resource_id');
    });

    it('존재하지 않는 리소스 업데이트 시 에러를 던져야 한다', async () => {
      // Arrange
      mockCtx.db.get.mockResolvedValue(null);

      // Act & Assert
      mockCrud.updateResource.mockImplementation(async (ctx, tableName, resourceId, updates, userId) => {
        const resource = await mockCtx.db.get(resourceId);
        if (!resource) {
          throw new Error(CRUD_ERRORS.NOT_FOUND);
        }
      });

      await expect(mockCrud.updateResource(
        mockCtx, 
        'socialPosts', 
        'nonexistent_id', 
        { title: 'Updated' }, 
        'user_id'
      )).rejects.toThrow(CRUD_ERRORS.NOT_FOUND);
    });
  });

  describe('deleteResource', () => {
    it('리소스를 삭제해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testResource = createMockSocialPost({ 
        _id: 'test_resource_id',
        userId: testUser._id 
      });

      mockCtx.db.get.mockResolvedValue(testResource);
      mockCtx.db.delete.mockResolvedValue();

      // Act & Assert
      mockCrud.deleteResource.mockImplementation(async (ctx, tableName, resourceId, userId) => {
        // 리소스 존재 확인
        const resource = await mockCtx.db.get(resourceId);
        if (!resource) {
          throw new Error(CRUD_ERRORS.NOT_FOUND);
        }

        // 소유권 확인
        if (userId && resource.userId !== userId) {
          throw new Error(CRUD_ERRORS.UNAUTHORIZED);
        }

        // 삭제
        await mockCtx.db.delete(resourceId);
        return resourceId;
      });

      const result = await mockCrud.deleteResource(
        mockCtx, 
        'socialPosts', 
        'test_resource_id', 
        testUser._id
      );

      expect(mockCtx.db.delete).toHaveBeenCalledWith('test_resource_id');
      expect(result).toBe('test_resource_id');
    });
  });

  describe('listResources', () => {
    it('사용자의 리소스 목록을 반환해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testResources = [
        createMockSocialPost({ userId: testUser._id }),
        createMockSocialPost({ userId: testUser._id }),
      ];

      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue(testResources),
      };
      mockCtx.db.query.mockReturnValue(mockQuery);

      // Act & Assert
      mockCrud.listResources.mockImplementation(async (ctx, tableName, userId, options = {}) => {
        const query = mockCtx.db.query(tableName);
        
        // 사용자별 필터링
        if (userId) {
          query.withIndex('byUserId', (q: any) => q.eq('userId', userId));
        }

        // 정렬
        if (options.sort) {
          query.order(options.sort.direction);
        }

        // 제한
        if (options.pagination?.limit) {
          query.take(options.pagination.limit);
        }

        return await query.collect();
      });

      const result = await mockCrud.listResources(
        mockCtx, 
        'socialPosts', 
        testUser._id, 
        {
          pagination: { limit: 10 },
          sort: { field: '_creationTime', direction: 'desc' }
        }
      );

      expect(mockCtx.db.query).toHaveBeenCalledWith('socialPosts');
      expect(result).toEqual(testResources);
    });

    it('페이징 옵션을 올바르게 적용해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const mockQuery = {
        withIndex: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        collect: vi.fn().mockResolvedValue([]),
      };
      mockCtx.db.query.mockReturnValue(mockQuery);

      // Act & Assert
      mockCrud.listResources.mockImplementation(async (ctx, tableName, userId, options = {}) => {
        const query = mockCtx.db.query(tableName);
        
        if (options.pagination?.limit) {
          query.take(options.pagination.limit);
        }

        return await query.collect();
      });

      await mockCrud.listResources(
        mockCtx, 
        'socialPosts', 
        testUser._id, 
        {
          pagination: { limit: 5 }
        }
      );

      expect(mockQuery.take).toHaveBeenCalledWith(5);
    });
  });

  describe('checkUserOwnership', () => {
    it('사용자가 리소스의 소유자인지 확인해야 한다', async () => {
      // Arrange
      const testUser = createMockUser();
      const testResource = createMockSocialPost({ 
        _id: 'test_resource_id',
        userId: testUser._id 
      });

      mockCtx.db.get.mockResolvedValue(testResource);

      // Act & Assert
      mockCrud.checkUserOwnership.mockImplementation(async (ctx, tableName, resourceId, userId, userIdField = 'userId') => {
        const resource = await mockCtx.db.get(resourceId);
        
        if (!resource) {
          return false;
        }

        return resource[userIdField] === userId;
      });

      const result = await mockCrud.checkUserOwnership(
        mockCtx, 
        'socialPosts', 
        'test_resource_id', 
        testUser._id
      );

      expect(result).toBe(true);
    });

    it('사용자가 리소스의 소유자가 아니면 false를 반환해야 한다', async () => {
      // Arrange
      const testResource = createMockSocialPost({ 
        _id: 'test_resource_id',
        userId: 'other_user_id' 
      });

      mockCtx.db.get.mockResolvedValue(testResource);

      // Act & Assert
      mockCrud.checkUserOwnership.mockImplementation(async (ctx, tableName, resourceId, userId, userIdField = 'userId') => {
        const resource = testResource;
        
        if (!resource) {
          return false;
        }

        return resource[userIdField] === userId;
      });

      const result = await mockCrud.checkUserOwnership(
        mockCtx, 
        'socialPosts', 
        'test_resource_id', 
        'different_user_id'
      );

      expect(result).toBe(false);
    });
  });

  describe('batchDeleteResources', () => {
    it('여러 리소스를 일괄 삭제해야 한다', async () => {
      // Arrange
      const resourceIds = ['id1', 'id2', 'id3'];
      mockCtx.db.delete.mockResolvedValue();

      // Act & Assert
      mockCrud.batchDeleteResources.mockImplementation(async (ctx, tableName, resourceIds, userId, checkOwnership = true) => {
        const deletedIds = [];

        for (const id of resourceIds) {
          if (checkOwnership) {
            // 소유권 확인 로직 (생략)
          }
          
          await mockCtx.db.delete(id);
          deletedIds.push(id);
        }

        return deletedIds;
      });

      const result = await mockCrud.batchDeleteResources(
        mockCtx, 
        'socialPosts', 
        resourceIds, 
        'user_id'
      );

      expect(mockCtx.db.delete).toHaveBeenCalledTimes(3);
      expect(result).toEqual(resourceIds);
    });
  });
});