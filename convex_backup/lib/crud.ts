/**
 * 공통 CRUD 유틸리티 함수들
 * DRY 원칙을 적용하여 반복되는 CRUD 로직을 추상화
 */

import { GenericId, v } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id, TableNames } from "../_generated/dataModel";
import { DataModel } from "../schema";

// 공통 에러 메시지
export const CRUD_ERRORS = {
  NOT_FOUND: "리소스를 찾을 수 없습니다",
  UNAUTHORIZED: "접근 권한이 없습니다",
  ALREADY_EXISTS: "이미 존재하는 리소스입니다",
  INVALID_DATA: "잘못된 데이터입니다",
  CREATION_FAILED: "생성에 실패했습니다",
  UPDATE_FAILED: "업데이트에 실패했습니다",
  DELETE_FAILED: "삭제에 실패했습니다",
} as const;

// 기본 CRUD 인터페이스
export interface CrudOptions {
  tableName: TableNames;
  userIdField?: string;
  checkOwnership?: boolean;
  allowPublicRead?: boolean;
}

// 페이징 옵션
export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

// 정렬 옵션
export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}

/**
 * 사용자 소유권 확인 유틸리티
 */
export async function checkUserOwnership<T extends string>(
  ctx: QueryCtx | MutationCtx,
  tableName: T,
  resourceId: Id<any>,
  userId: Id<"users">,
  userIdField: string = "userId"
): Promise<boolean> {
  const resource = await ctx.db.get(resourceId);
  if (!resource) return false;
  
  return (resource as any)[userIdField] === userId;
}

/**
 * 리소스 존재 확인
 */
export async function resourceExists<T extends string>(
  ctx: QueryCtx | MutationCtx,
  tableName: T,
  resourceId: Id<any>
): Promise<boolean> {
  const resource = await ctx.db.get(resourceId);
  return !!resource;
}

/**
 * 공통 생성 함수
 */
export async function createResource<T extends string>(
  ctx: MutationCtx,
  tableName: T,
  data: Omit<any, "_id" | "_creationTime">,
  userId?: Id<"users">
): Promise<Id<any>> {
  try {
    // 타임스탬프 자동 추가
    const now = new Date().toISOString();
    const resourceData = {
      ...data,
      ...(userId && { userId }),
      ...(typeof data === 'object' && !('createdAt' in data) && { createdAt: now }),
      ...(typeof data === 'object' && !('updatedAt' in data) && { updatedAt: now }),
    } as any;

    return await ctx.db.insert(tableName as any, resourceData);
  } catch (error) {
    console.error(`Failed to create ${tableName}:`, error);
    throw new Error(CRUD_ERRORS.CREATION_FAILED);
  }
}

/**
 * 공통 조회 함수 (단일)
 */
export async function getResource<T extends string>(
  ctx: QueryCtx,
  tableName: T,
  resourceId: Id<any>,
  userId?: Id<"users">,
  checkOwnership: boolean = true
): Promise<any | null> {
  try {
    const resource = await ctx.db.get(resourceId);
    
    if (!resource) return null;
    
    // 소유권 확인
    if (checkOwnership && userId) {
      const hasAccess = await checkUserOwnership(ctx, tableName, resourceId, userId);
      if (!hasAccess) {
        throw new Error(CRUD_ERRORS.UNAUTHORIZED);
      }
    }
    
    return resource;
  } catch (error) {
    console.error(`Failed to get ${tableName}:`, error);
    throw error;
  }
}

/**
 * 공통 목록 조회 함수
 */
export async function listResources<T extends string>(
  ctx: QueryCtx,
  tableName: T,
  userId?: Id<"users">,
  options: {
    pagination?: PaginationOptions;
    sort?: SortOptions;
    indexName?: string;
    filter?: any;
  } = {}
): Promise<any[]> {
  try {
    let query: any = ctx.db.query(tableName as any);
    
    // 인덱스 사용
    if (options.indexName && userId) {
      query = query.withIndex(options.indexName as any, (q: any) => q.eq("userId", userId));
    }
    
    // 정렬
    if (options.sort) {
      query = query.order(options.sort.direction);
    }
    
    // 페이징
    if (options.pagination?.limit) {
      query = query.take(options.pagination.limit);
    }
    
    return await query.collect();
  } catch (error) {
    console.error(`Failed to list ${tableName}:`, error);
    throw error;
  }
}

/**
 * 공통 업데이트 함수
 */
export async function updateResource<T extends string>(
  ctx: MutationCtx,
  tableName: T,
  resourceId: Id<any>,
  updates: Partial<any>,
  userId?: Id<"users">,
  checkOwnership: boolean = true
): Promise<void> {
  try {
    // 소유권 확인
    if (checkOwnership && userId) {
      const hasAccess = await checkUserOwnership(ctx, tableName, resourceId, userId);
      if (!hasAccess) {
        throw new Error(CRUD_ERRORS.UNAUTHORIZED);
      }
    }
    
    // 업데이트 타임스탬프 추가
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    } as any;
    
    await ctx.db.patch(resourceId, updateData);
  } catch (error) {
    console.error(`Failed to update ${tableName}:`, error);
    throw error;
  }
}

/**
 * 공통 삭제 함수
 */
export async function deleteResource<T extends string>(
  ctx: MutationCtx,
  tableName: T,
  resourceId: Id<any>,
  userId?: Id<"users">,
  checkOwnership: boolean = true
): Promise<void> {
  try {
    // 소유권 확인
    if (checkOwnership && userId) {
      const hasAccess = await checkUserOwnership(ctx, tableName, resourceId, userId);
      if (!hasAccess) {
        throw new Error(CRUD_ERRORS.UNAUTHORIZED);
      }
    }
    
    await ctx.db.delete(resourceId);
  } catch (error) {
    console.error(`Failed to delete ${tableName}:`, error);
    throw error;
  }
}

/**
 * 배치 삭제 함수
 */
export async function batchDeleteResources<T extends string>(
  ctx: MutationCtx,
  tableName: T,
  resourceIds: Id<any>[],
  userId?: Id<"users">,
  checkOwnership: boolean = true
): Promise<void> {
  try {
    for (const resourceId of resourceIds) {
      await deleteResource(ctx, tableName, resourceId, userId, checkOwnership);
    }
  } catch (error) {
    console.error(`Failed to batch delete ${String(tableName)}:`, error);
    throw error;
  }
}

/**
 * 카운트 조회 함수
 */
export async function countResources<T extends string>(
  ctx: QueryCtx,
  tableName: T,
  userId?: Id<"users">,
  indexName?: string
): Promise<number> {
  try {
    let query: any = ctx.db.query(tableName as any);
    
    if (indexName && userId) {
      query = query.withIndex(indexName as any, (q: any) => q.eq("userId", userId));
    }
    
    const results = await query.collect();
    return results.length;
  } catch (error) {
    console.error(`Failed to count ${String(tableName)}:`, error);
    throw error;
  }
}

/**
 * 중복 확인 함수
 */
export async function checkDuplicate<T extends string>(
  ctx: QueryCtx,
  tableName: T,
  field: string,
  value: any,
  excludeId?: Id<any>
): Promise<boolean> {
  try {
    const query: any = ctx.db.query(tableName as any);
    const results = await query.collect();
    
    const duplicates = results.filter((item: any) => {
      if (excludeId && item._id === excludeId) return false;
      return item[field] === value;
    });
    
    return duplicates.length > 0;
  } catch (error) {
    console.error(`Failed to check duplicate in ${String(tableName)}:`, error);
    throw error;
  }
}

// 타입별 특화된 CRUD 클래스
export class CrudService<T extends string> {
  constructor(
    private tableName: T,
    private options: CrudOptions = { tableName: "users" as TableNames, checkOwnership: true }
  ) {
    this.options = { ...this.options, tableName: String(tableName) as TableNames };
  }

  async create(ctx: MutationCtx, data: Omit<any, "_id" | "_creationTime">, userId?: Id<"users">) {
    return createResource(ctx, this.tableName, data, userId);
  }

  async get(ctx: QueryCtx, id: Id<any>, userId?: Id<"users">) {
    return getResource(ctx, this.tableName, id, userId, this.options.checkOwnership);
  }

  async list(ctx: QueryCtx, userId?: Id<"users">, options: any = {}) {
    return listResources(ctx, this.tableName, userId, options);
  }

  async update(ctx: MutationCtx, id: Id<any>, updates: Partial<any>, userId?: Id<"users">) {
    return updateResource(ctx, this.tableName, id, updates, userId, this.options.checkOwnership);
  }

  async delete(ctx: MutationCtx, id: Id<any>, userId?: Id<"users">) {
    return deleteResource(ctx, this.tableName, id, userId, this.options.checkOwnership);
  }

  async count(ctx: QueryCtx, userId?: Id<"users">, indexName?: string) {
    return countResources(ctx, this.tableName, userId, indexName);
  }
}