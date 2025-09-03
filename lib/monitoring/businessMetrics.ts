import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
const convexClient = new ConvexHttpClient(convexUrl);

// 비즈니스 메트릭 타입
export enum MetricType {
  USER_ACTIVITY = 'user_activity',
  CONTENT_GENERATION = 'content_generation',
  PAYMENT = 'payment',
  ENGAGEMENT = 'engagement',
  SUBSCRIPTION = 'subscription',
  AI_USAGE = 'ai_usage',
  SOCIAL_POSTING = 'social_posting',
}

// 메트릭 이름
export enum MetricName {
  // User Activity
  USER_LOGIN = 'user_login',
  USER_SIGNUP = 'user_signup',
  USER_LOGOUT = 'user_logout',
  SESSION_DURATION = 'session_duration',
  PAGE_VIEW = 'page_view',
  FEATURE_USAGE = 'feature_usage',
  
  // Content Generation
  CONTENT_CREATED = 'content_created',
  CONTENT_EDITED = 'content_edited',
  CONTENT_DELETED = 'content_deleted',
  CONTENT_PUBLISHED = 'content_published',
  AI_GENERATION_REQUEST = 'ai_generation_request',
  AI_GENERATION_SUCCESS = 'ai_generation_success',
  AI_GENERATION_FAILURE = 'ai_generation_failure',
  
  // Payment
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_STARTED = 'subscription_started',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  REVENUE = 'revenue',
  
  // Engagement
  POST_VIEW = 'post_view',
  POST_LIKE = 'post_like',
  POST_SHARE = 'post_share',
  POST_COMMENT = 'post_comment',
  ENGAGEMENT_RATE = 'engagement_rate',
  
  // Social Posting
  POST_SCHEDULED = 'post_scheduled',
  POST_PUBLISHED = 'post_published',
  POST_FAILED = 'post_failed',
  PERSONA_CREATED = 'persona_created',
  SOCIAL_ACCOUNT_CONNECTED = 'social_account_connected',
}

// 비즈니스 메트릭 트래커
export class BusinessMetricsTracker {
  private static instance: BusinessMetricsTracker;
  private batchQueue: Map<string, any[]> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  private sessionStartTime: number;
  private pageViewStartTime: Map<string, number> = new Map();

  constructor() {
    this.sessionStartTime = Date.now();
    this.startBatchFlush();
  }

  static getInstance(): BusinessMetricsTracker {
    if (!BusinessMetricsTracker.instance) {
      BusinessMetricsTracker.instance = new BusinessMetricsTracker();
    }
    return BusinessMetricsTracker.instance;
  }

  // 메트릭 기록
  async track(
    metricType: MetricType,
    metricName: MetricName,
    value: number = 1,
    dimensions?: {
      platform?: string;
      personaId?: string;
      planType?: string;
      source?: string;
      campaign?: string;
    },
    metadata?: any
  ) {
    const metric = {
      metricType,
      metricName,
      value,
      dimensions,
      metadata,
      timestamp: new Date().toISOString(),
    };

    // 배치 큐에 추가
    const key = `${metricType}-${metricName}`;
    if (!this.batchQueue.has(key)) {
      this.batchQueue.set(key, []);
    }
    this.batchQueue.get(key)!.push(metric);

    // 큐 크기가 크면 즉시 플러시
    if (this.batchQueue.get(key)!.length >= 100) {
      await this.flushBatch(key);
    }
  }

  // 사용자 활동 추적
  trackUserActivity(activity: 'login' | 'signup' | 'logout') {
    const metricName = {
      login: MetricName.USER_LOGIN,
      signup: MetricName.USER_SIGNUP,
      logout: MetricName.USER_LOGOUT,
    }[activity];

    this.track(MetricType.USER_ACTIVITY, metricName);

    if (activity === 'logout') {
      // 세션 시간 기록
      const sessionDuration = (Date.now() - this.sessionStartTime) / 1000; // 초 단위
      this.track(MetricType.USER_ACTIVITY, MetricName.SESSION_DURATION, sessionDuration);
    }
  }

  // 페이지 뷰 추적
  trackPageView(pathname: string, metadata?: any) {
    // 이전 페이지의 체류 시간 계산
    if (this.pageViewStartTime.size > 0) {
      const lastPage = Array.from(this.pageViewStartTime.keys()).pop();
      if (lastPage) {
        const duration = (Date.now() - this.pageViewStartTime.get(lastPage)!) / 1000;
        this.track(
          MetricType.USER_ACTIVITY,
          MetricName.PAGE_VIEW,
          duration,
          undefined,
          { page: lastPage, duration }
        );
      }
    }

    // 새 페이지 시작 시간 기록
    this.pageViewStartTime.set(pathname, Date.now());
    
    this.track(
      MetricType.USER_ACTIVITY,
      MetricName.PAGE_VIEW,
      1,
      undefined,
      { page: pathname, ...metadata }
    );
  }

  // 콘텐츠 생성 추적
  trackContentGeneration(
    action: 'created' | 'edited' | 'deleted' | 'published',
    personaId?: string,
    metadata?: any
  ) {
    const metricName = {
      created: MetricName.CONTENT_CREATED,
      edited: MetricName.CONTENT_EDITED,
      deleted: MetricName.CONTENT_DELETED,
      published: MetricName.CONTENT_PUBLISHED,
    }[action];

    this.track(
      MetricType.CONTENT_GENERATION,
      metricName,
      1,
      { personaId },
      metadata
    );
  }

  // AI 사용량 추적
  trackAIUsage(
    status: 'request' | 'success' | 'failure',
    creditsUsed: number = 1,
    metadata?: any
  ) {
    const metricName = {
      request: MetricName.AI_GENERATION_REQUEST,
      success: MetricName.AI_GENERATION_SUCCESS,
      failure: MetricName.AI_GENERATION_FAILURE,
    }[status];

    this.track(
      MetricType.AI_USAGE,
      metricName,
      creditsUsed,
      undefined,
      metadata
    );
  }

  // 결제 추적
  trackPayment(
    status: 'initiated' | 'success' | 'failed',
    amount?: number,
    planType?: string,
    metadata?: any
  ) {
    const metricName = {
      initiated: MetricName.PAYMENT_INITIATED,
      success: MetricName.PAYMENT_SUCCESS,
      failed: MetricName.PAYMENT_FAILED,
    }[status];

    this.track(
      MetricType.PAYMENT,
      metricName,
      amount || 1,
      { planType },
      metadata
    );

    if (status === 'success' && amount) {
      this.track(
        MetricType.PAYMENT,
        MetricName.REVENUE,
        amount,
        { planType },
        metadata
      );
    }
  }

  // 구독 추적
  trackSubscription(
    action: 'started' | 'renewed' | 'cancelled',
    planType?: string,
    metadata?: any
  ) {
    const metricName = {
      started: MetricName.SUBSCRIPTION_STARTED,
      renewed: MetricName.SUBSCRIPTION_RENEWED,
      cancelled: MetricName.SUBSCRIPTION_CANCELLED,
    }[action];

    this.track(
      MetricType.SUBSCRIPTION,
      metricName,
      1,
      { planType },
      metadata
    );
  }

  // 소셜 포스팅 추적
  trackSocialPosting(
    status: 'scheduled' | 'published' | 'failed',
    platform?: string,
    personaId?: string,
    metadata?: any
  ) {
    const metricName = {
      scheduled: MetricName.POST_SCHEDULED,
      published: MetricName.POST_PUBLISHED,
      failed: MetricName.POST_FAILED,
    }[status];

    this.track(
      MetricType.SOCIAL_POSTING,
      metricName,
      1,
      { platform, personaId },
      metadata
    );
  }

  // 참여도 추적
  trackEngagement(
    action: 'view' | 'like' | 'share' | 'comment',
    platform?: string,
    value: number = 1,
    metadata?: any
  ) {
    const metricName = {
      view: MetricName.POST_VIEW,
      like: MetricName.POST_LIKE,
      share: MetricName.POST_SHARE,
      comment: MetricName.POST_COMMENT,
    }[action];

    this.track(
      MetricType.ENGAGEMENT,
      metricName,
      value,
      { platform },
      metadata
    );
  }

  // 기능 사용 추적
  trackFeatureUsage(
    featureName: string,
    value: number = 1,
    metadata?: any
  ) {
    this.track(
      MetricType.USER_ACTIVITY,
      MetricName.FEATURE_USAGE,
      value,
      undefined,
      { feature: featureName, ...metadata }
    );
  }

  // 배치 플러시
  private async flushBatch(key?: string) {
    const keysToFlush = key ? [key] : Array.from(this.batchQueue.keys());

    for (const k of keysToFlush) {
      const metrics = this.batchQueue.get(k);
      if (!metrics || metrics.length === 0) continue;

      try {
        // 메트릭들을 개별적으로 저장
        for (const metric of metrics) {
          await convexClient.mutation(api.performanceMetrics.recordBusinessMetric, metric);
        }
        
        // 큐 비우기
        this.batchQueue.set(k, []);
      } catch (error) {
        console.error(`Failed to flush metrics for ${k}:`, error);
      }
    }
  }

  // 배치 플러시 시작
  private startBatchFlush() {
    if (this.flushInterval) return;

    this.flushInterval = setInterval(() => {
      this.flushBatch();
    }, 30000); // 30초마다 플러시
  }

  // 정리
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // 남은 메트릭 플러시
    this.flushBatch();
  }
}

// 전역 인스턴스 생성 헬퍼
export const businessMetrics = BusinessMetricsTracker.getInstance();

// React Hook for tracking
export function useBusinessMetrics() {
  return businessMetrics;
}

// 커스텀 이벤트 트래킹
export function trackCustomEvent(
  eventName: string,
  properties?: Record<string, any>
) {
  // Mixpanel이나 Google Analytics와 통합 가능
  if (typeof window !== 'undefined' && (window as any).mixpanel) {
    (window as any).mixpanel.track(eventName, properties);
  }

  // 비즈니스 메트릭으로도 기록
  businessMetrics.trackFeatureUsage(eventName, 1, properties);
}

// 전환율 추적
export class ConversionTracker {
  private funnelSteps: Map<string, number> = new Map();
  private userFunnels: Map<string, Set<string>> = new Map();

  trackFunnelStep(userId: string, step: string, order: number) {
    // 단계 순서 저장
    this.funnelSteps.set(step, order);

    // 사용자별 완료 단계 추적
    if (!this.userFunnels.has(userId)) {
      this.userFunnels.set(userId, new Set());
    }
    this.userFunnels.get(userId)!.add(step);

    // 메트릭 기록
    businessMetrics.track(
      MetricType.USER_ACTIVITY,
      MetricName.FEATURE_USAGE,
      1,
      undefined,
      { funnel: step, order }
    );
  }

  getConversionRate(fromStep: string, toStep: string): number {
    let fromCount = 0;
    let toCount = 0;

    for (const [userId, steps] of this.userFunnels) {
      if (steps.has(fromStep)) {
        fromCount++;
        if (steps.has(toStep)) {
          toCount++;
        }
      }
    }

    return fromCount > 0 ? (toCount / fromCount) * 100 : 0;
  }

  getFunnelReport(): {
    steps: { name: string; count: number; rate: number }[];
    overallConversion: number;
  } {
    const sortedSteps = Array.from(this.funnelSteps.entries())
      .sort((a, b) => a[1] - b[1]);

    const report = sortedSteps.map(([ step], index) => {
      let count = 0;
      for (const steps of this.userFunnels.values()) {
        if (steps.has(step)) count++;
      }

      const rate = index === 0 ? 100 : 
        this.getConversionRate(sortedSteps[index - 1][0], step);

      return { name: step, count, rate };
    });

    const overallConversion = sortedSteps.length > 1 ?
      this.getConversionRate(sortedSteps[0][0], sortedSteps[sortedSteps.length - 1][0]) : 0;

    return { steps: report, overallConversion };
  }
}