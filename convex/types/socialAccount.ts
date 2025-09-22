/**
 * 소셜 미디어 계정 관련 타입 정의
 */

import { Id } from "../_generated/dataModel";

// 소셜 미디어 플랫폼 열거형
export const SOCIAL_PLATFORMS = {
  TWITTER: 'twitter',
  LINKEDIN: 'linkedin',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  THREADS: 'threads'
} as const;

export type SocialPlatform = typeof SOCIAL_PLATFORMS[keyof typeof SOCIAL_PLATFORMS];

// 소셜 계정 상태
export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  TOKEN_EXPIRED: 'token_expired',
  ERROR: 'error'
} as const;

export type AccountStatus = typeof ACCOUNT_STATUS[keyof typeof ACCOUNT_STATUS];

// 소셜 계정 정보 (민감한 토큰 정보 제외)
export interface SocialAccountInfo {
  _id: Id<"socialAccounts">;
  userId: Id<"users">;
  platform: string;
  accountId: string;
  username: string;
  displayName: string;
  profileImage?: string;
  followers?: number;
  following?: number;
  postsCount?: number;
  verificationStatus?: string;
  isActive: boolean;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
  _creationTime: number;
}

// 소셜 계정 생성 요청
export interface CreateSocialAccountRequest {
  userId: Id<"users">;
  platform: SocialPlatform;
  platformUserId: string;
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  metadata?: Record<string, unknown>;
}

// 토큰 업데이트 요청
export interface UpdateTokenRequest {
  accountId: Id<"socialAccounts">;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
}

// 계정 상태 업데이트 요청
export interface UpdateAccountStatusRequest {
  accountId: Id<"socialAccounts">;
  status: AccountStatus;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

// 계정 필터 옵션
export interface AccountFilterOptions {
  platform?: string;
  isActive?: boolean;
}