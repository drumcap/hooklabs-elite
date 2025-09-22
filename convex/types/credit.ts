/**
 * 크레딧 시스템 타입 정의
 */

import { Doc, Id } from "../_generated/dataModel";

// 크레딧 타입 열거형
export const CREDIT_TYPES = {
  EARNED: 'earned',
  PURCHASED: 'purchased',
  BONUS: 'bonus',
  REFUNDED: 'refunded',
  USED: 'used',
  EXPIRED: 'expired'
} as const;

export type CreditType = typeof CREDIT_TYPES[keyof typeof CREDIT_TYPES];

// 크레딧 레코드 타입
export interface CreditRecord {
  _id: Id<"credits">;
  userId: Id<"users">;
  amount: number;
  type: CreditType;
  description: string;
  expiresAt?: string;
  relatedOrderId?: string;
  metadata?: Record<string, unknown>;
  _creationTime: number;
}

// 크레딧 잔액 정보
export interface CreditBalance {
  userId: Id<"users">;
  totalCredits: number;
  availableCredits: number;
  usedCredits: number;
  expiredCredits: number;
  lastUpdated: string;
}

// 크레딧 추가 요청
export interface AddCreditRequest {
  userId: Id<"users">;
  amount: number;
  type: CreditType;
  description: string;
  expiresAt?: string;
  relatedOrderId?: string;
  metadata?: Record<string, unknown>;
}

// 크레딧 사용 요청
export interface UseCreditRequest {
  userId: Id<"users">;
  amount: number;
  description: string;
  relatedOrderId?: string;
  metadata?: Record<string, unknown>;
}

// 크레딧 필터 옵션
export interface CreditFilterOptions {
  types?: CreditType[];
  startDate?: string;
  endDate?: string;
  includeExpired?: boolean;
}

// 크레딧 집계 결과
export interface CreditAggregation {
  totalByType: Record<CreditType, number>;
  monthlyTotals: Array<{
    month: string;
    total: number;
    byType: Record<CreditType, number>;
  }>;
  expiringCredits: CreditRecord[];
}