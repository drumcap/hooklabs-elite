/**
 * 데이터 파이프라인 타입 정의
 */

import { Id } from "../_generated/dataModel";

// 이벤트 스트림 타입
export interface EventStream {
  id: string;
  source: 'web' | 'mobile' | 'api' | 'social' | 'webhook';
  eventType: string;
  userId?: Id<"users">;
  sessionId?: string;
  payload: Record<string, any>;
  metadata?: {
    ip?: string;
    userAgent?: string;
    referer?: string;
    platform?: string;
  };
  timestamp: string;
  processedAt?: string;
}

// 소셜 미디어 메트릭
export interface SocialMetric {
  platform: 'twitter' | 'threads' | 'linkedin';
  postId: string;
  userId: Id<"users">;
  metrics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    clicks?: number;
    saves?: number;
  };
  engagementRate?: number;
  timestamp: string;
  raw?: any; // 원본 API 응답
}

// 집계 윈도우
export type AggregationWindow = '5min' | '1hour' | '24hour' | '7days' | '30days';

// 집계 결과
export interface AggregationResult {
  window: AggregationWindow;
  startTime: string;
  endTime: string;
  metrics: {
    count: number;
    sum?: number;
    avg?: number;
    min?: number;
    max?: number;
    p50?: number;
    p95?: number;
    p99?: number;
  };
  dimensions?: Record<string, any>;
}

// 데이터 품질 체크 결과
export interface DataQualityResult {
  dataset: string;
  timestamp: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  qualityScore: number; // 0-100
  issues: Array<{
    field: string;
    issue: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

// 파이프라인 상태
export interface PipelineStatus {
  name: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startedAt: string;
  completedAt?: string;
  processedCount: number;
  failedCount: number;
  errorMessages?: string[];
  nextRun?: string;
}

// 이상치 탐지 결과
export interface AnomalyDetectionResult {
  metric: string;
  value: number;
  expectedRange: {
    min: number;
    max: number;
  };
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  context?: Record<string, any>;
}

// 파이프라인 메트릭
export interface PipelineMetrics {
  throughput: {
    eventsPerSecond: number;
    bytesPerSecond: number;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
  dataQuality: {
    score: number;
    validationErrors: number;
    schemaViolations: number;
  };
}

// 변환 규칙
export interface TransformationRule {
  id: string;
  name: string;
  sourceType: string;
  targetType: string;
  transform: (input: any) => any;
  validation?: (output: any) => boolean;
}

// 캐시 엔트리
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: string;
  accessCount: number;
  lastAccessedAt: string;
}

// 알림 규칙
export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  window: AggregationWindow;
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: Array<'email' | 'slack' | 'webhook' | 'sms'>;
  cooldown: number; // 분 단위
  enabled: boolean;
}

// 배치 작업
export interface BatchJob {
  id: string;
  type: 'import' | 'export' | 'transform' | 'aggregate';
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: {
    source?: string;
    destination?: string;
    query?: string;
    transformations?: string[];
    schedule?: string;
  };
  progress: {
    total: number;
    processed: number;
    failed: number;
    percentage: number;
  };
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

// 데이터 계보 (Lineage)
export interface DataLineage {
  datasetId: string;
  sources: Array<{
    type: string;
    id: string;
    timestamp: string;
  }>;
  transformations: Array<{
    type: string;
    timestamp: string;
    version: string;
  }>;
  destinations: Array<{
    type: string;
    id: string;
    timestamp: string;
  }>;
  metadata?: Record<string, any>;
}

// 스키마 진화
export interface SchemaEvolution {
  version: string;
  changes: Array<{
    type: 'add' | 'remove' | 'modify' | 'rename';
    field: string;
    from?: any;
    to?: any;
    timestamp: string;
  }>;
  compatible: boolean;
  migrationRequired: boolean;
}