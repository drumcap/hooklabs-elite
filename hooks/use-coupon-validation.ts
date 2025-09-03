"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { UseCouponValidationReturn } from "@/types/coupon";

/**
 * 쿠폰 검증을 위한 커스텀 훅
 * 실시간으로 쿠폰 코드의 유효성을 검증하고 할인 금액을 계산합니다.
 */
export const useCouponValidation = (
  code: string,
  orderAmount?: number
): UseCouponValidationReturn => {
  const { user } = useUser();
  const userId = user?.id as Id<"users"> | undefined;
  
  // 코드가 있고 3자 이상일 때만 쿼리 실행
  const validation = useQuery(
    api.coupons.validateCoupon,
    code.trim().length >= 3 ? { 
      code: code.trim().toUpperCase(), 
      userId, 
      orderAmount 
    } : "skip"
  );
  
  return {
    validation,
    isLoading: validation === undefined && code.trim().length >= 3,
    isValid: validation?.valid ?? false,
    error: validation?.error,
    discountAmount: validation?.coupon?.discountAmount ?? 0,
    couponData: validation?.coupon
  };
};