"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { UseCouponUsageHistoryReturn } from "@/types/coupon";

/**
 * 사용자 쿠폰 사용 내역을 위한 커스텀 훅
 * 로그인한 사용자의 쿠폰 사용 내역을 조회합니다.
 */
export const useCouponUsageHistory = (
  limit = 20
): UseCouponUsageHistoryReturn => {
  const { user } = useUser();
  
  const usages = useQuery(
    api.coupons.getUserCouponUsages,
    user ? { limit } : "skip"
  );
  
  return {
    usages,
    isLoading: usages === undefined && !!user,
    isEmpty: usages?.length === 0,
    error: undefined
  };
};