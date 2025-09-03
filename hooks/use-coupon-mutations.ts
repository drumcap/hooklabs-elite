"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { CreateCouponFormData, UpdateCouponFormData } from "@/types/coupon";

/**
 * 쿠폰 생성을 위한 커스텀 훅
 */
export const useCouponCreation = () => {
  const createCouponMutation = useMutation(api.coupons.createCoupon);
  const router = useRouter();
  
  const createCoupon = async (data: CreateCouponFormData) => {
    try {
      const couponId = await createCouponMutation({
        ...data,
        code: data.code.toUpperCase(),
        validFrom: data.validFrom.toISOString(),
        validUntil: data.validUntil?.toISOString(),
        currency: data.currency || 'KRW',
        isActive: data.isActive ?? true,
      });
      
      toast.success("쿠폰이 성공적으로 생성되었습니다!");
      return couponId;
    } catch (error: any) {
      if (error.message?.includes('이미 존재하는')) {
        toast.error("이미 존재하는 쿠폰 코드입니다.");
      } else {
        toast.error("쿠폰 생성 중 오류가 발생했습니다.");
      }
      throw error;
    }
  };
  
  return { createCoupon };
};

/**
 * 쿠폰 업데이트를 위한 커스텀 훅
 */
export const useCouponUpdate = () => {
  const updateCouponMutation = useMutation(api.coupons.updateCoupon);
  
  const updateCoupon = async (
    couponId: Id<"coupons">, 
    updates: UpdateCouponFormData
  ) => {
    try {
      const processedUpdates = {
        ...updates,
        validUntil: updates.validUntil?.toISOString(),
      };
      
      await updateCouponMutation({ 
        couponId, 
        updates: processedUpdates 
      });
      
      toast.success("쿠폰이 성공적으로 업데이트되었습니다!");
      return couponId;
    } catch (error) {
      toast.error("쿠폰 업데이트 중 오류가 발생했습니다.");
      throw error;
    }
  };
  
  return { updateCoupon };
};

/**
 * 쿠폰 사용을 위한 커스텀 훅
 */
export const useCouponApplication = () => {
  const useCouponMutation = useMutation(api.coupons.useCoupon);
  
  const applyCoupon = async (
    userId: Id<"users">,
    couponCode: string,
    discountAmount: number,
    orderId?: string,
    subscriptionId?: Id<"subscriptions">
  ) => {
    try {
      const usageId = await useCouponMutation({
        userId,
        couponCode,
        discountAmount,
        orderId,
        subscriptionId,
        currency: "KRW"
      });
      
      toast.success("쿠폰이 성공적으로 적용되었습니다!");
      return usageId;
    } catch (error) {
      toast.error("쿠폰 적용 중 오류가 발생했습니다.");
      throw error;
    }
  };
  
  return { applyCoupon };
};