/**
 * 크레딧 서비스 - 비즈니스 로직 분리
 */

import { DatabaseReader, DatabaseWriter } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import {
  CreditRecord,
  CreditBalance,
  AddCreditRequest,
  UseCreditRequest,
  CreditFilterOptions,
  CREDIT_TYPES,
  CreditType
} from "../types/credit";
import { InsufficientCreditsError, NotFoundError } from "../lib/errors";
import { isValidCreditAmount } from "../lib/validators";

export class CreditService {
  /**
   * 크레딧 잔액 계산 (순수 함수)
   */
  static calculateBalance(credits: CreditRecord[], userId: Id<"users">): CreditBalance {
    const now = new Date().toISOString();

    const activeCredits = credits.filter(c => c.type !== CREDIT_TYPES.EXPIRED);
    const totalCredits = activeCredits.reduce((sum, credit) => sum + credit.amount, 0);

    const availableCredits = credits
      .filter(c =>
        c.type !== CREDIT_TYPES.EXPIRED &&
        (!c.expiresAt || c.expiresAt > now)
      )
      .reduce((sum, credit) => sum + credit.amount, 0);

    const usedCredits = credits
      .filter(c => c.type === CREDIT_TYPES.USED)
      .reduce((sum, credit) => sum + Math.abs(credit.amount), 0);

    const expiredCredits = credits
      .filter(c => c.type === CREDIT_TYPES.EXPIRED || (c.expiresAt && c.expiresAt <= now))
      .reduce((sum, credit) => sum + Math.abs(credit.amount), 0);

    return {
      userId,
      totalCredits,
      availableCredits: Math.max(0, availableCredits),
      usedCredits,
      expiredCredits,
      lastUpdated: now,
    };
  }

  /**
   * 크레딧 사용 가능성 검증
   */
  static async validateCreditUsage(
    db: DatabaseReader,
    userId: Id<"users">,
    amount: number
  ): Promise<CreditBalance> {
    if (!isValidCreditAmount(amount)) {
      throw new Error("유효한 크레딧 금액이 아닙니다");
    }

    const balance = await db
      .query("userCreditBalances")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    if (!balance) {
      throw new NotFoundError("크레딧 잔액", userId);
    }

    if (balance.availableCredits < amount) {
      throw new InsufficientCreditsError(amount, balance.availableCredits);
    }

    return balance;
  }

  /**
   * 크레딧 레코드 생성 (팩토리 메서드)
   */
  static createCreditRecord(request: AddCreditRequest): Omit<CreditRecord, '_id' | '_creationTime'> {
    if (!isValidCreditAmount(request.amount)) {
      throw new Error("유효한 크레딧 금액이 아닙니다");
    }

    return {
      userId: request.userId,
      amount: request.amount,
      type: request.type,
      description: request.description,
      expiresAt: request.expiresAt,
      relatedOrderId: request.relatedOrderId,
      metadata: request.metadata,
    };
  }

  /**
   * 크레딧 사용 레코드 생성
   */
  static createUsageRecord(request: UseCreditRequest): Omit<CreditRecord, '_id' | '_creationTime'> {
    return {
      userId: request.userId,
      amount: -Math.abs(request.amount), // 음수로 저장
      type: CREDIT_TYPES.USED,
      description: request.description,
      relatedOrderId: request.relatedOrderId,
      metadata: request.metadata,
    };
  }

  /**
   * 만료 예정 크레딧 필터링
   */
  static filterExpiringCredits(
    credits: CreditRecord[],
    daysAhead: number = 7
  ): CreditRecord[] {
    const now = new Date();
    const expiryDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

    return credits.filter(credit =>
      credit.type !== CREDIT_TYPES.USED &&
      credit.type !== CREDIT_TYPES.EXPIRED &&
      credit.expiresAt &&
      credit.expiresAt <= expiryDate &&
      credit.expiresAt > now.toISOString()
    );
  }

  /**
   * 만료된 크레딧 필터링
   */
  static filterExpiredCredits(credits: CreditRecord[]): CreditRecord[] {
    const now = new Date().toISOString();

    return credits.filter(credit =>
      credit.type !== CREDIT_TYPES.USED &&
      credit.type !== CREDIT_TYPES.EXPIRED &&
      credit.expiresAt &&
      credit.expiresAt <= now
    );
  }

  /**
   * 크레딧 내역 필터링
   */
  static filterCreditHistory(
    credits: CreditRecord[],
    options: CreditFilterOptions
  ): CreditRecord[] {
    let filtered = [...credits];

    if (options.types && options.types.length > 0) {
      filtered = filtered.filter(credit => options.types!.includes(credit.type));
    }

    if (options.startDate) {
      const startTime = new Date(options.startDate).getTime();
      filtered = filtered.filter(credit => credit._creationTime >= startTime);
    }

    if (options.endDate) {
      const endTime = new Date(options.endDate).getTime();
      filtered = filtered.filter(credit => credit._creationTime <= endTime);
    }

    if (!options.includeExpired) {
      filtered = filtered.filter(credit => credit.type !== CREDIT_TYPES.EXPIRED);
    }

    return filtered;
  }
}