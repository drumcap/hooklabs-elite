"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { UseAdminCouponsReturn } from "@/types/coupon";

/**
 * 관리자 쿠폰 목록을 위한 커스텀 훅
 * 관리자 권한이 있는 경우에만 쿠폰 목록을 조회합니다.
 */
export const useAdminCoupons = (
  isActive?: boolean,
  limit = 100
): UseAdminCouponsReturn => {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'admin';
  
  const coupons = useQuery(
    api.coupons.getAllCoupons,
    isAdmin ? { isActive, limit } : "skip"
  );
  
  return {
    coupons,
    isLoading: coupons === undefined && isAdmin,
    isAdmin,
    error: undefined // Convex queries don't throw errors, they return undefined
  };
};