/**
 * 보안 강화된 API 라우트 예제
 * - 인증, Rate Limiting, 입력 검증, 로깅이 모두 포함된 템플릿
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SecureAPIHandler, commonSchemas } from '@/lib/security-enhanced';

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
    timestamp: commonSchemas.date.optional(),
  }).optional(),
});

// API 핸들러 인스턴스 생성
const apiHandler = new SecureAPIHandler({
  rateLimitConfig: {
    window: 60,        // 1분
    max: 30,          // 30 요청/분
  },
  schema: requestSchema,
});

/**
 * GET 핸들러 - 데이터 조회
 */
export async function GET(req: NextRequest) {
  return apiHandler.handle(req, async (req, { userId }) => {
    try {
      // URL 파라미터 파싱
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');
      const includeDeleted = searchParams.get('includeDeleted') === 'true';

      // ID 검증
      if (id && !commonSchemas.id.safeParse(id).success) {
        return NextResponse.json(
          { error: 'Invalid ID format' },
          { status: 400 }
        );
      }

      // 데이터 조회 로직
      const data = {
        id: id || 'all',
        userId,
        items: [],
        includeDeleted,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        data,
      });

    } catch (error) {
      console.error('GET handler error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST 핸들러 - 데이터 생성
 */
export async function POST(req: NextRequest) {
  return apiHandler.handle(req, async (req, { userId, body }) => {
    try {
      // body는 이미 검증됨 (requestSchema)
      const { action, data, metadata } = body;

      // 액션별 처리
      let result;
      switch (action) {
        case 'create':
          result = await handleCreate(userId, data, metadata);
          break;
        
        case 'update':
          result = await handleUpdate(userId, data, metadata);
          break;
        
        case 'delete':
          result = await handleDelete(userId, data, metadata);
          break;
        
        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        action,
        result,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('POST handler error:', error);
      return NextResponse.json(
        { error: 'Operation failed' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT 핸들러 - 데이터 업데이트
 */
export async function PUT(req: NextRequest) {
  // PUT 요청용 스키마 (ID 필수)
  const putSchema = requestSchema.extend({
    id: commonSchemas.id,
  });

  const putHandler = new SecureAPIHandler({
    rateLimitConfig: {
      window: 60,
      max: 20, // PUT은 더 제한적
    },
    schema: putSchema,
  });

  return putHandler.handle(req, async (req, { userId, body }) => {
    try {
      const { id, data, metadata } = body;

      // 권한 확인 (소유권 검증 등)
      const hasPermission = await checkUserPermission(userId, id, 'update');
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        );
      }

      // 업데이트 로직
      const result = await updateResource(id, data, metadata);

      return NextResponse.json({
        success: true,
        id,
        updated: result,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('PUT handler error:', error);
      return NextResponse.json(
        { error: 'Update failed' },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE 핸들러 - 데이터 삭제
 */
export async function DELETE(req: NextRequest) {
  // DELETE는 더 엄격한 Rate Limit
  const deleteHandler = new SecureAPIHandler({
    rateLimitConfig: {
      window: 300,     // 5분
      max: 5,          // 5 요청/5분
    },
  });

  return deleteHandler.handle(req, async (req, { userId }) => {
    try {
      // URL에서 ID 파싱
      const { searchParams } = new URL(req.url);
      const id = searchParams.get('id');

      if (!id || !commonSchemas.id.safeParse(id).success) {
        return NextResponse.json(
          { error: 'Valid ID required' },
          { status: 400 }
        );
      }

      // 권한 확인
      const hasPermission = await checkUserPermission(userId, id, 'delete');
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        );
      }

      // 소프트 삭제 수행
      const result = await softDeleteResource(id, userId);

      return NextResponse.json({
        success: true,
        deleted: id,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('DELETE handler error:', error);
      return NextResponse.json(
        { error: 'Delete failed' },
        { status: 500 }
      );
    }
  });
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