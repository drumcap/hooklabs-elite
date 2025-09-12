/**
 * 보안 강화된 API 라우트 예제 - 임시 비활성화
 * TODO: security-enhanced 모듈이 활성화된 후 재활성화하세요
 * - 인증, Rate Limiting, 입력 검증, 로깅이 모두 포함된 템플릿
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// TODO: security-enhanced 모듈 활성화 후 재활성화
// import { SecureAPIHandler, commonSchemas } from '@/lib/security-enhanced';

// 간단한 ID 스키마 (commonSchemas 대체)
const idSchema = z.string().uuid();
const dateSchema = z.string().datetime();

// 요청 스키마 정의
const requestSchema = z.object({
  action: z.enum(['create', 'update', 'delete']),
  data: z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(10000),
    tags: z.array(z.string()).max(10).optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
  }),
  metadata: z.object({
    source: z.string().optional(),
    timestamp: dateSchema.optional(),
  }).optional(),
});

// 간단한 JSON 응답 헬퍼
function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * GET 핸들러 - 데이터 조회 (간소화된 버전)
 */
export async function GET(req: NextRequest) {
  try {
    // 간단한 예제 응답 (보안 모듈 비활성화로 인한 임시 구현)
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    // ID 검증 (간소화)
    if (id && !idSchema.safeParse(id).success) {
      return jsonResponse(
        { error: 'Invalid ID format' },
        400
      );
    }

    // 모의 데이터 조회 로직
    const data = {
      id: id || 'all',
      items: [],
      includeDeleted,
      timestamp: new Date().toISOString(),
      note: 'SecureAPIHandler가 비활성화되어 있어 간소화된 버전입니다.'
    };

    return jsonResponse({
      success: true,
      data,
    });

  } catch (error) {
    console.error('GET handler error:', error);
    return jsonResponse(
      { error: 'Failed to fetch data' },
      500
    );
  }
}

/**
 * POST 핸들러 - 데이터 생성 (간소화된 버전)
 */
export async function POST(req: NextRequest) {
  try {
    // 간단한 body 파싱 및 검증
    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return jsonResponse(
        { error: 'Invalid request data', details: validation.error.issues },
        400
      );
    }

    const { action, data, metadata } = validation.data;

    // 액션별 처리 (간소화)
    let result;
    switch (action) {
      case 'create':
        result = await handleCreate('mock-user-id', data, metadata);
        break;
      
      case 'update':
        result = await handleUpdate('mock-user-id', data, metadata);
        break;
      
      case 'delete':
        result = await handleDelete('mock-user-id', data, metadata);
        break;
      
      default:
        return jsonResponse(
          { error: 'Invalid action' },
          400
        );
    }

    return jsonResponse({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
      note: 'SecureAPIHandler가 비활성화되어 있어 간소화된 버전입니다.'
    });

  } catch (error) {
    console.error('POST handler error:', error);
    return jsonResponse(
      { error: 'Operation failed' },
      500
    );
  }
}

/**
 * PUT 핸들러 - 데이터 업데이트 (간소화된 버전)
 */
export async function PUT(req: NextRequest) {
  try {
    // PUT 요청용 스키마 (ID 필수)
    const putSchema = requestSchema.extend({
      id: idSchema,
    });

    // 간단한 body 파싱 및 검증
    const body = await req.json();
    const validation = putSchema.safeParse(body);
    
    if (!validation.success) {
      return jsonResponse(
        { error: 'Invalid request data', details: validation.error.issues },
        400
      );
    }

    const { id, data, metadata } = validation.data;

    // 권한 확인 (간소화)
    const hasPermission = await checkUserPermission('mock-user-id', id, 'update');
    if (!hasPermission) {
      return jsonResponse(
        { error: 'Permission denied' },
        403
      );
    }

    // 업데이트 로직
    const result = await updateResource(id, data, metadata);

    return jsonResponse({
      success: true,
      id,
      updated: result,
      timestamp: new Date().toISOString(),
      note: 'SecureAPIHandler가 비활성화되어 있어 간소화된 버전입니다.'
    });

  } catch (error) {
    console.error('PUT handler error:', error);
    return jsonResponse(
      { error: 'Update failed' },
      500
    );
  }
}

/**
 * DELETE 핸들러 - 데이터 삭제 (간소화된 버전)
 */
export async function DELETE(req: NextRequest) {
  try {
    // URL에서 ID 파싱
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || !idSchema.safeParse(id).success) {
      return jsonResponse(
        { error: 'Valid ID required' },
        400
      );
    }

    // 권한 확인 (간소화)
    const hasPermission = await checkUserPermission('mock-user-id', id, 'delete');
    if (!hasPermission) {
      return jsonResponse(
        { error: 'Permission denied' },
        403
      );
    }

    // 소프트 삭제 수행
    const result = await softDeleteResource(id, 'mock-user-id');

    return jsonResponse({
      success: true,
      deleted: id,
      result,
      timestamp: new Date().toISOString(),
      note: 'SecureAPIHandler가 비활성화되어 있어 간소화된 버전입니다.'
    });

  } catch (error) {
    console.error('DELETE handler error:', error);
    return jsonResponse(
      { error: 'Delete failed' },
      500
    );
  }
}

// ==================== Helper Functions ====================

async function handleCreate(userId: string, data: any, metadata: any) {
  // 생성 로직 구현
  console.log('Creating resource for user:', userId);
  return { id: 'new-id', ...data };
}

async function handleUpdate(userId: string, data: any, metadata: any) {
  // 업데이트 로직 구현
  console.log('Updating resource for user:', userId);
  return { updated: true, ...data };
}

async function handleDelete(userId: string, data: any, metadata: any) {
  // 삭제 로직 구현
  console.log('Deleting resource for user:', userId);
  return { deleted: true };
}

async function checkUserPermission(
  userId: string,
  resourceId: string,
  action: 'read' | 'update' | 'delete'
): Promise<boolean> {
  // 실제 권한 확인 로직 구현
  // 예: 데이터베이스에서 리소스 소유자 확인
  console.log(`Checking ${action} permission for user ${userId} on resource ${resourceId}`);
  return true; // 예제에서는 항상 true
}

async function updateResource(id: string, data: any, metadata: any) {
  // 실제 업데이트 로직
  console.log(`Updating resource ${id}`);
  return { id, ...data, updatedAt: new Date().toISOString() };
}

async function softDeleteResource(id: string, deletedBy: string) {
  // 소프트 삭제 로직
  console.log(`Soft deleting resource ${id} by ${deletedBy}`);
  return {
    id,
    deletedAt: new Date().toISOString(),
    deletedBy,
  };
}