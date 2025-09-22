/**
 * CreditService 단위 테스트
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CreditService } from "../services/CreditService";
import { CREDIT_TYPES, CreditRecord } from "../types/credit";

describe("CreditService", () => {
  const mockUserId = "user123" as any;

  const mockCredits: CreditRecord[] = [
    {
      _id: "credit1" as any,
      userId: mockUserId,
      amount: 100,
      type: CREDIT_TYPES.PURCHASED,
      description: "Initial credits",
      _creationTime: Date.now(),
    },
    {
      _id: "credit2" as any,
      userId: mockUserId,
      amount: -30,
      type: CREDIT_TYPES.USED,
      description: "Used for content generation",
      _creationTime: Date.now(),
    },
    {
      _id: "credit3" as any,
      userId: mockUserId,
      amount: 50,
      type: CREDIT_TYPES.BONUS,
      description: "Bonus credits",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후 만료
      _creationTime: Date.now(),
    },
  ];

  describe("calculateBalance", () => {
    it("should calculate credit balance correctly", () => {
      const balance = CreditService.calculateBalance(mockCredits, mockUserId);

      expect(balance.userId).toBe(mockUserId);
      expect(balance.totalCredits).toBe(150); // 100 + 50
      expect(balance.availableCredits).toBe(150); // 100 + 50
      expect(balance.usedCredits).toBe(30); // abs(-30)
      expect(balance.expiredCredits).toBe(0);
    });

    it("should handle expired credits", () => {
      const expiredCredits: CreditRecord[] = [
        ...mockCredits,
        {
          _id: "credit4" as any,
          userId: mockUserId,
          amount: 25,
          type: CREDIT_TYPES.BONUS,
          description: "Expired bonus",
          expiresAt: new Date(Date.now() - 1000).toISOString(), // 1초 전 만료
          _creationTime: Date.now(),
        },
      ];

      const balance = CreditService.calculateBalance(expiredCredits, mockUserId);
      expect(balance.availableCredits).toBe(150); // 만료된 25는 제외
      expect(balance.totalCredits).toBe(175); // 전체는 포함
    });

    it("should return zero for negative available credits", () => {
      const negativeCredits: CreditRecord[] = [
        {
          _id: "credit5" as any,
          userId: mockUserId,
          amount: -100,
          type: CREDIT_TYPES.USED,
          description: "Large usage",
          _creationTime: Date.now(),
        },
      ];

      const balance = CreditService.calculateBalance(negativeCredits, mockUserId);
      expect(balance.availableCredits).toBe(0); // Math.max(0, -100) = 0
    });
  });

  describe("filterExpiringCredits", () => {
    it("should filter credits expiring within specified days", () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const nextWeek = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();

      const testCredits: CreditRecord[] = [
        {
          _id: "credit6" as any,
          userId: mockUserId,
          amount: 50,
          type: CREDIT_TYPES.BONUS,
          description: "Expiring tomorrow",
          expiresAt: tomorrow,
          _creationTime: Date.now(),
        },
        {
          _id: "credit7" as any,
          userId: mockUserId,
          amount: 75,
          type: CREDIT_TYPES.BONUS,
          description: "Expiring next week",
          expiresAt: nextWeek,
          _creationTime: Date.now(),
        },
      ];

      const expiringCredits = CreditService.filterExpiringCredits(testCredits, 7);
      expect(expiringCredits).toHaveLength(1);
      expect(expiringCredits[0].description).toBe("Expiring tomorrow");
    });

    it("should exclude used and expired credits", () => {
      const testCredits: CreditRecord[] = [
        {
          _id: "credit8" as any,
          userId: mockUserId,
          amount: -30,
          type: CREDIT_TYPES.USED,
          description: "Used credit",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          _creationTime: Date.now(),
        },
        {
          _id: "credit9" as any,
          userId: mockUserId,
          amount: 25,
          type: CREDIT_TYPES.EXPIRED,
          description: "Already expired",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          _creationTime: Date.now(),
        },
      ];

      const expiringCredits = CreditService.filterExpiringCredits(testCredits, 7);
      expect(expiringCredits).toHaveLength(0);
    });
  });

  describe("createCreditRecord", () => {
    it("should create valid credit record", () => {
      const request = {
        userId: mockUserId,
        amount: 100,
        type: CREDIT_TYPES.PURCHASED,
        description: "Test credit",
        relatedOrderId: "order123",
        metadata: { source: "test" },
      };

      const creditData = CreditService.createCreditRecord(request);

      expect(creditData.userId).toBe(mockUserId);
      expect(creditData.amount).toBe(100);
      expect(creditData.type).toBe(CREDIT_TYPES.PURCHASED);
      expect(creditData.description).toBe("Test credit");
      expect(creditData.relatedOrderId).toBe("order123");
      expect(creditData.metadata).toEqual({ source: "test" });
    });

    it("should throw error for invalid amount", () => {
      const request = {
        userId: mockUserId,
        amount: -1, // Invalid negative amount for addition
        type: CREDIT_TYPES.PURCHASED,
        description: "Invalid credit",
      };

      expect(() => CreditService.createCreditRecord(request))
        .toThrow("유효한 크레딧 금액이 아닙니다");
    });
  });

  describe("createUsageRecord", () => {
    it("should create usage record with negative amount", () => {
      const request = {
        userId: mockUserId,
        amount: 50,
        description: "Content generation",
      };

      const usageData = CreditService.createUsageRecord(request);

      expect(usageData.amount).toBe(-50); // Should be negative
      expect(usageData.type).toBe(CREDIT_TYPES.USED);
      expect(usageData.description).toBe("Content generation");
    });
  });
});