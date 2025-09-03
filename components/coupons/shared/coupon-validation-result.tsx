"use client";

import { CheckCircle, AlertCircle, Loader2, Gift, Percent, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getCouponValueText } from "@/lib/coupon-utils";
import type { CouponValidationResult } from "@/types/coupon";
import { cn } from "@/lib/utils";

interface CouponValidationResultProps {
  validation?: CouponValidationResult;
  isLoading: boolean;
  isApplied: boolean;
  className?: string;
}

export function CouponValidationResultComponent({
  validation,
  isLoading,
  isApplied,
  className
}: CouponValidationResultProps) {
  if (isLoading) {
    return (
      <Alert className={cn("border-blue-200 bg-blue-50", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="text-blue-700">
          쿠폰을 확인하는 중...
        </AlertDescription>
      </Alert>
    );
  }

  if (!validation) return null;

  if (validation.error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{validation.error}</AlertDescription>
      </Alert>
    );
  }

  if (validation.valid && validation.coupon) {
    const { coupon } = validation;
    
    const getIcon = () => {
      switch (coupon.type) {
        case 'percentage':
          return <Percent className="h-4 w-4" />;
        case 'fixed_amount':
          return <DollarSign className="h-4 w-4" />;
        case 'credits':
          return <Gift className="h-4 w-4" />;
        default:
          return <CheckCircle className="h-4 w-4" />;
      }
    };

    return (
      <Alert className={cn("border-green-200 bg-green-50", className)}>
        <div className="flex items-start gap-3">
          <div className="text-green-600 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <AlertDescription className="text-green-700 font-medium">
                {coupon.name}
              </AlertDescription>
              {isApplied && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  적용됨
                </Badge>
              )}
            </div>
            
            {coupon.description && (
              <p className="text-sm text-green-600">{coupon.description}</p>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-600">
                {getCouponValueText(coupon)}
              </span>
              {coupon.discountAmount > 0 && (
                <span className="font-semibold text-green-700">
                  할인: {formatCurrency(coupon.discountAmount)}
                </span>
              )}
            </div>
            
            {coupon.type === 'credits' && (
              <p className="text-xs text-green-600">
                ⓘ 크레딧은 결제 완료 후 지급됩니다
              </p>
            )}
          </div>
        </div>
      </Alert>
    );
  }

  return null;
}

// Export with proper display name for debugging
CouponValidationResultComponent.displayName = 'CouponValidationResult';
export const CouponValidationResult = CouponValidationResultComponent;