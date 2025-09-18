import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { getAuthUserId } from "../auth";

// 🚀 실시간 동기화 성능 최적화 시스템

interface RealtimeSubscription {
  id: string;
  userId: string;
  type: 'posts' | 'personas' | 'analytics' | 'notifications';
  filters?: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  lastActivity: number;
}

interface RealtimeEvent {
  id: string;
  type: string;
  data: any;
  userId?: string;
  targetUsers?: string[];
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  ttl?: number; // Time to live in ms
}

interface OptimizedUpdate {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  previousData?: any;
  userId: string;
  affectedFields?: string[];
  timestamp: number;
}

// 메모리 기반 실시간 상태 관리 (실제로는 Redis 권장)
const activeSubscriptions = new Map<string, RealtimeSubscription>();
const eventQueue = new Map<string, RealtimeEvent[]>();
const updateBatches = new Map<string, OptimizedUpdate[]>();

// 🎯 최적화된 실시간 구독 관리
export const subscribeToRealtimeUpdates = mutation({
  args: {
    subscriptionType: v.string(),
    filters: v.optional(v.any()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, { subscriptionType, filters = {}, priority = 'medium' }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const subscriptionId = crypto.randomUUID();
    const now = Date.now();

    const subscription: RealtimeSubscription = {
      id: subscriptionId,
      userId,
      type: subscriptionType as any,
      filters,
      priority: priority as any,
      createdAt: now,
      lastActivity: now,
    };

    activeSubscriptions.set(subscriptionId, subscription);

    // 기존 구독 정리 (사용자당 최대 10개)
    const userSubscriptions = Array.from(activeSubscriptions.values())
      .filter(sub => sub.userId === userId)
      .sort((a, b) => b.lastActivity - a.lastActivity);

    if (userSubscriptions.length > 10) {
      const oldSubscriptions = userSubscriptions.slice(10);
      oldSubscriptions.forEach(sub => {
        activeSubscriptions.delete(sub.id);
      });
    }

    return {
      subscriptionId,
      message: `${subscriptionType} 실시간 구독이 활성화되었습니다`,
      activeSubscriptions: userSubscriptions.length,
    };
  },
});

// 📊 최적화된 게시물 실시간 조회
export const getPostsRealtime = query({
  args: {
    subscriptionId: v.optional(v.string()),
    lastUpdateTime: v.optional(v.number()),
    includeDeltas: v.optional(v.boolean()), // 변화분만 전송
  },
  handler: async (ctx, { subscriptionId, lastUpdateTime, includeDeltas = false }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const now = Date.now();

    // 구독 활성화 상태 업데이트
    if (subscriptionId && activeSubscriptions.has(subscriptionId)) {
      const subscription = activeSubscriptions.get(subscriptionId)!;
      subscription.lastActivity = now;
    }

    try {
      // 변화분만 전송하는 경우
      if (includeDeltas && lastUpdateTime) {
        const updates = updateBatches.get(userId) || [];
        const recentUpdates = updates.filter(update => update.timestamp > lastUpdateTime);

        if (recentUpdates.length === 0) {
          return {
            type: 'no-changes',
            timestamp: now,
            hasMore: false,
          };
        }

        // 업데이트를 테이블별로 그룹화
        const groupedUpdates = recentUpdates.reduce((acc, update) => {
          if (!acc[update.table]) {
            acc[update.table] = [];
          }
          acc[update.table].push(update);
          return acc;
        }, {} as Record<string, OptimizedUpdate[]>);

        return {
          type: 'delta-updates',
          updates: groupedUpdates,
          timestamp: now,
          hasMore: updates.length > recentUpdates.length,
        };
      }

      // 전체 데이터 조회 (최적화된 쿼리)
      const posts = await ctx.db
        .query("socialPosts")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .order("desc")
        .take(50); // 최신 50개만

      // 관련 데이터 배치 조회
      const personaIds = [...new Set(posts.map(p => p.personaId))];
      const personas = await Promise.all(
        personaIds.map(id => ctx.db.get(id))
      );

      const personaMap = new Map(
        personas.filter(Boolean).map(p => [p!._id, p])
      );

      const enrichedPosts = posts.map(post => ({
        ...post,
        persona: personaMap.get(post.personaId),
      }));

      return {
        type: 'full-data',
        data: enrichedPosts,
        timestamp: now,
        totalCount: posts.length,
      };

    } catch (error) {
      console.error('Realtime query error:', error);
      return {
        type: 'error',
        error: (error as any)?.message || error,
        timestamp: now,
      };
    }
  },
});

// 🔄 최적화된 데이터 변경 추적
export const trackDataChange = mutation({
  args: {
    table: v.string(),
    operation: v.string(),
    documentId: v.string(),
    data: v.any(),
    previousData: v.optional(v.any()),
    affectedFields: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { table, operation, documentId, data, previousData, affectedFields }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return; // 비인증 사용자의 변경사항은 추적하지 않음
    }

    const now = Date.now();
    
    const update: OptimizedUpdate = {
      id: documentId,
      table,
      operation: operation as any,
      data,
      previousData,
      userId,
      affectedFields,
      timestamp: now,
    };

    // 사용자별 업데이트 배치에 추가
    if (!updateBatches.has(userId)) {
      updateBatches.set(userId, []);
    }

    const userBatch = updateBatches.get(userId)!;
    userBatch.push(update);

    // 배치 크기 제한 (최대 1000개)
    if (userBatch.length > 1000) {
      userBatch.splice(0, userBatch.length - 1000);
    }

    // 관련된 구독자들에게 이벤트 전파
    await propagateRealtimeEvent({
      id: crypto.randomUUID(),
      type: `${table}:${operation}`,
      data: {
        id: documentId,
        ...data,
        affectedFields,
      },
      userId,
      priority: 'medium',
      timestamp: now,
    });

    return { success: true, updateId: update.id };
  },
});

// 📡 실시간 이벤트 전파
async function propagateRealtimeEvent(event: RealtimeEvent) {
  // 관련된 구독자들 찾기
  const relevantSubscriptions = Array.from(activeSubscriptions.values())
    .filter(sub => {
      // 이벤트 타입 매칭
      if (event.type.startsWith('socialPosts:') && sub.type === 'posts') {
        return true;
      }
      if (event.type.startsWith('personas:') && sub.type === 'personas') {
        return true;
      }
      
      // 사용자 매칭
      if (event.userId && sub.userId !== event.userId) {
        return false;
      }

      return false;
    });

  // 우선순위별로 그룹화
  const highPriority = relevantSubscriptions.filter(sub => sub.priority === 'high');
  const mediumPriority = relevantSubscriptions.filter(sub => sub.priority === 'medium');
  const lowPriority = relevantSubscriptions.filter(sub => sub.priority === 'low');

  // 우선순위 순으로 이벤트 큐에 추가
  [highPriority, mediumPriority, lowPriority].forEach((subs, index) => {
    subs.forEach(sub => {
      if (!eventQueue.has(sub.id)) {
        eventQueue.set(sub.id, []);
      }
      
      const queue = eventQueue.get(sub.id)!;
      queue.push(event);
      
      // 큐 크기 제한
      if (queue.length > 100) {
        queue.splice(0, queue.length - 100);
      }
    });
  });
}

// 🎯 실시간 이벤트 폴링 (Long Polling 방식)
export const pollRealtimeEvents = query({
  args: {
    subscriptionId: v.string(),
    lastEventTime: v.optional(v.number()),
    timeout: v.optional(v.number()),
  },
  handler: async (ctx, { subscriptionId, lastEventTime = 0, timeout = 30000 }) => {
    const subscription = activeSubscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error("유효하지 않은 구독 ID입니다");
    }

    const userId = await getAuthUserId(ctx);
    if (!userId || userId !== subscription.userId) {
      throw new Error("구독 권한이 없습니다");
    }

    const startTime = Date.now();
    const events = eventQueue.get(subscriptionId) || [];
    
    // 새로운 이벤트 필터링
    const newEvents = events.filter(event => event.timestamp > lastEventTime);
    
    if (newEvents.length > 0) {
      // 즉시 반환
      return {
        events: newEvents,
        hasMore: events.length > newEvents.length,
        timestamp: Date.now(),
        pollingTime: Date.now() - startTime,
      };
    }

    // Long polling 시뮬레이션 (실제로는 WebSocket 사용 권장)
    // Convex에서는 자동으로 실시간 업데이트가 처리되므로 여기서는 간단히 구현
    return {
      events: [],
      hasMore: false,
      timestamp: Date.now(),
      pollingTime: Date.now() - startTime,
    };
  },
});

// 📊 실시간 성능 메트릭
export const getRealtimeMetrics = query({
  args: {
    timeRange: v.optional(v.string()),
  },
  handler: async (ctx, { timeRange = '1h' }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const now = Date.now();
    const timeRangeMs = {
      '5m': 5 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    }[timeRange] || 60 * 60 * 1000;

    // 활성 구독 통계
    const userSubscriptions = Array.from(activeSubscriptions.values())
      .filter(sub => sub.userId === userId);

    const activeSubscriptionsCount = userSubscriptions.filter(
      sub => now - sub.lastActivity < 5 * 60 * 1000 // 5분 내 활동
    ).length;

    // 업데이트 통계
    const userUpdates = updateBatches.get(userId) || [];
    const recentUpdates = userUpdates.filter(
      update => now - update.timestamp < timeRangeMs
    );

    const updateStats = recentUpdates.reduce((acc, update) => {
      acc.total++;
      acc.byOperation[update.operation] = (acc.byOperation[update.operation] || 0) + 1;
      acc.byTable[update.table] = (acc.byTable[update.table] || 0) + 1;
      return acc;
    }, {
      total: 0,
      byOperation: {} as Record<string, number>,
      byTable: {} as Record<string, number>,
    });

    // 이벤트 큐 통계
    const userEventQueues = Array.from(eventQueue.entries())
      .filter(([subId]) => {
        const sub = activeSubscriptions.get(subId);
        return sub && sub.userId === userId;
      });

    const totalQueuedEvents = userEventQueues.reduce(
      (sum, [, events]) => sum + events.length, 0
    );

    return {
      subscriptions: {
        total: userSubscriptions.length,
        active: activeSubscriptionsCount,
        byType: userSubscriptions.reduce((acc, sub) => {
          acc[sub.type] = (acc[sub.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byPriority: userSubscriptions.reduce((acc, sub) => {
          acc[sub.priority] = (acc[sub.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      updates: updateStats,
      events: {
        totalQueued: totalQueuedEvents,
        avgQueueSize: userEventQueues.length > 0 
          ? totalQueuedEvents / userEventQueues.length 
          : 0,
      },
      performance: {
        timeRange,
        updatesPerMinute: recentUpdates.length / (timeRangeMs / (60 * 1000)),
        memoryUsage: {
          subscriptions: activeSubscriptions.size,
          updateBatches: Array.from(updateBatches.values()).flat().length,
          eventQueues: Array.from(eventQueue.values()).flat().length,
        },
      },
    };
  },
});

// 🧹 실시간 데이터 정리
export const cleanupRealtimeData = action({
  args: {
    olderThanMinutes: v.optional(v.number()),
  },
  handler: async (ctx, { olderThanMinutes = 60 }) => {
    const cutoffTime = Date.now() - olderThanMinutes * 60 * 1000;
    let cleanedCount = 0;

    // 비활성 구독 정리
    for (const [id, subscription] of activeSubscriptions) {
      if (subscription.lastActivity < cutoffTime) {
        activeSubscriptions.delete(id);
        eventQueue.delete(id);
        cleanedCount++;
      }
    }

    // 오래된 업데이트 배치 정리
    for (const [userId, updates] of updateBatches) {
      const filteredUpdates = updates.filter(update => update.timestamp >= cutoffTime);
      if (filteredUpdates.length !== updates.length) {
        updateBatches.set(userId, filteredUpdates);
        cleanedCount += updates.length - filteredUpdates.length;
      }
    }

    // 오래된 이벤트 큐 정리
    for (const [subId, events] of eventQueue) {
      const filteredEvents = events.filter(event => event.timestamp >= cutoffTime);
      if (filteredEvents.length !== events.length) {
        eventQueue.set(subId, filteredEvents);
        cleanedCount += events.length - filteredEvents.length;
      }
    }

    return {
      success: true,
      cleanedCount,
      activeSubscriptions: activeSubscriptions.size,
      totalUpdateBatches: Array.from(updateBatches.values()).flat().length,
      totalEventQueues: Array.from(eventQueue.values()).flat().length,
    };
  },
});

// 🎯 실시간 연결 상태 체크
export const checkRealtimeConnection = query({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, { subscriptionId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const subscription = activeSubscriptions.get(subscriptionId);
    if (!subscription) {
      return {
        connected: false,
        error: "구독을 찾을 수 없습니다",
      };
    }

    if (subscription.userId !== userId) {
      return {
        connected: false,
        error: "구독 권한이 없습니다",
      };
    }

    const now = Date.now();
    const lastActivityAge = now - subscription.lastActivity;
    const isActive = lastActivityAge < 5 * 60 * 1000; // 5분

    return {
      connected: true,
      subscription: {
        id: subscription.id,
        type: subscription.type,
        priority: subscription.priority,
        createdAt: subscription.createdAt,
        lastActivity: subscription.lastActivity,
        lastActivityAge,
        isActive,
      },
      queueStats: {
        pendingEvents: eventQueue.get(subscriptionId)?.length || 0,
        totalUpdates: updateBatches.get(userId)?.length || 0,
      },
    };
  },
});

// 🚀 실시간 배치 업데이트 (성능 최적화)
export const batchRealtimeUpdates = mutation({
  args: {
    updates: v.array(v.object({
      table: v.string(),
      operation: v.string(),
      documentId: v.string(),
      data: v.any(),
      affectedFields: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, { updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("인증이 필요합니다");
    }

    const now = Date.now();
    const processedUpdates: OptimizedUpdate[] = [];

    // 업데이트를 배치로 처리
    for (const update of updates) {
      const optimizedUpdate: OptimizedUpdate = {
        id: update.documentId,
        table: update.table,
        operation: update.operation as any,
        data: update.data,
        userId,
        affectedFields: update.affectedFields,
        timestamp: now,
      };

      processedUpdates.push(optimizedUpdate);

      // 실시간 이벤트 생성
      await propagateRealtimeEvent({
        id: crypto.randomUUID(),
        type: `${update.table}:${update.operation}`,
        data: {
          id: update.documentId,
          ...update.data,
          affectedFields: update.affectedFields,
        },
        userId,
        priority: 'medium',
        timestamp: now,
      });
    }

    // 사용자 업데이트 배치에 추가
    if (!updateBatches.has(userId)) {
      updateBatches.set(userId, []);
    }

    const userBatch = updateBatches.get(userId)!;
    userBatch.push(...processedUpdates);

    // 배치 크기 제한
    if (userBatch.length > 1000) {
      userBatch.splice(0, userBatch.length - 1000);
    }

    return {
      success: true,
      processedCount: processedUpdates.length,
      batchSize: userBatch.length,
    };
  },
});