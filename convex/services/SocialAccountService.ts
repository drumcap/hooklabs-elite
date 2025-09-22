/**
 * 소셜 미디어 계정 서비스 - 비즈니스 로직 분리
 */

import { DatabaseReader, DatabaseWriter } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import {
  SocialAccountInfo,
  CreateSocialAccountRequest,
  UpdateTokenRequest,
  UpdateAccountStatusRequest,
  AccountFilterOptions,
  SOCIAL_PLATFORMS,
  ACCOUNT_STATUS
} from "../types/socialAccount";

export class SocialAccountService {
  /**
   * 소셜 계정 필터링
   */
  static async filterAccounts(
    db: DatabaseReader,
    userId: Id<"users">,
    options: AccountFilterOptions
  ): Promise<SocialAccountInfo[]> {
    let query = db
      .query("socialAccounts")
      .withIndex("byUserId", (q) => q.eq("userId", userId));

    const accounts = await query.collect();

    return accounts.filter(account => {
      if (options.platform && account.platform !== options.platform) {
        return false;
      }
      if (options.isActive !== undefined && account.isActive !== options.isActive) {
        return false;
      }
      if (options.status && account.status !== options.status) {
        return false;
      }
      return true;
    }) as SocialAccountInfo[];
  }

  /**
   * 계정 정보에서 민감한 토큰 제거
   */
  static sanitizeAccountInfo(account: any): SocialAccountInfo {
    const { accessToken, refreshToken, ...sanitized } = account;
    return sanitized as SocialAccountInfo;
  }

  /**
   * 계정 정보 배열에서 민감한 토큰 제거
   */
  static sanitizeAccountList(accounts: any[]): SocialAccountInfo[] {
    return accounts.map(account => this.sanitizeAccountInfo(account));
  }

  /**
   * 토큰 만료 확인
   */
  static isTokenExpired(tokenExpiresAt?: string): boolean {
    if (!tokenExpiresAt) {
      return false;
    }
    return new Date() > new Date(tokenExpiresAt);
  }

  /**
   * 계정 생성 데이터 검증
   */
  static validateCreateRequest(request: CreateSocialAccountRequest): void {
    if (!Object.values(SOCIAL_PLATFORMS).includes(request.platform)) {
      throw new Error(`지원하지 않는 플랫폼입니다: ${request.platform}`);
    }

    if (!request.platformUserId || !request.username) {
      throw new Error("플랫폼 사용자 ID와 사용자명은 필수입니다");
    }

    if (!request.accessToken) {
      throw new Error("액세스 토큰은 필수입니다");
    }
  }

  /**
   * 토큰 업데이트 데이터 검증
   */
  static validateTokenUpdate(request: UpdateTokenRequest): void {
    if (!request.accessToken) {
      throw new Error("액세스 토큰은 필수입니다");
    }
  }

  /**
   * 계정 상태 업데이트 데이터 검증
   */
  static validateStatusUpdate(request: UpdateAccountStatusRequest): void {
    if (!Object.values(ACCOUNT_STATUS).includes(request.status)) {
      throw new Error(`유효하지 않은 상태입니다: ${request.status}`);
    }
  }

  /**
   * 플랫폼별 중복 계정 확인
   */
  static async checkDuplicateAccount(
    db: DatabaseReader,
    userId: Id<"users">,
    platform: string,
    platformUserId: string
  ): Promise<boolean> {
    const existing = await db
      .query("socialAccounts")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("platform"), platform),
          q.eq(q.field("platformUserId"), platformUserId)
        )
      )
      .first();

    return !!existing;
  }

  /**
   * 계정 소유권 확인
   */
  static async verifyAccountOwnership(
    db: DatabaseReader,
    accountId: Id<"socialAccounts">,
    userId: Id<"users">
  ): Promise<boolean> {
    const account = await db.get(accountId);
    return account?.userId === userId;
  }
}