"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { UseCouponStatsReturn } from "@/types/coupon";

/**
 * 쿠폰 통계를 위한 커스텀 훅
 * 특정 쿠폰의 사용 통계를 조회합니다.
 */
export const useCouponStats = (
  couponId: Id<"coupons">
): UseCouponStatsReturn => {
  const stats = useQuery(api.coupons.getCouponStats, { couponId });
  
  return {
    stats: stats === null ? undefined : stats,
    isLoading: stats === undefined,
    notFound: stats === null,
    error: undefined
  };
};