"use client";

import { useState, useCallback, useMemo } from "react";
import { Loader2, X, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { useCouponValidation } from "@/hooks/use-coupon-validation";
import { CouponValidationResult } from "@/components/coupons/shared/coupon-validation-result";
import type { CouponValidatorProps } from "@/types/coupon";
import { cn } from "@/lib/utils";

export function CouponValidationForm({
  orderAmount = 0,
  onCouponApplied,
  onCouponRemoved,
  disabled = false,
  placeholder = "쿠폰 코드를 입력하세요",
  className,
  autoFocus = false,
  maxLength = 20
}: CouponValidatorProps) {
  const [code, setCode] = useState('');
  const [isApplied, setIsApplied] = useState(false);
  const [appliedCouponData, setAppliedCouponData] = useState<any>(null);

  // 500ms 디바운스로 API 호출 최적화
  const debouncedCode = useDebounce(code.trim(), 500);
  const { validation, isLoading, isValid } = useCouponValidation(
    debouncedCode, 
    orderAmount
  );

  const handleApply = useCallback(() => {
    if (validation?.valid && validation.coupon) {
      setIsApplied(true);
      setAppliedCouponData(validation.coupon);
      onCouponApplied?.(validation.coupon);
    }
  }, [validation, onCouponApplied]);

  const handleRemove = useCallback(() => {
    setCode('');
    setIsApplied(false);
    setAppliedCouponData(null);
    onCouponRemoved?.();
  }, [onCouponRemoved]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && validation?.valid && !isApplied) {
      e.preventDefault();
      handleApply();
    }
  }, [validation?.valid, handleApply, isApplied]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setCode(value);
    
    // 이미 적용된 상태에서 입력이 변경되면 적용 해제
    if (isApplied && value !== appliedCouponData?.code) {
      setIsApplied(false);
      setAppliedCouponData(null);
      onCouponRemoved?.();
    }
  }, [isApplied, appliedCouponData?.code, onCouponRemoved]);

  const showApplyButton = !isApplied && code.trim().length >= 3;
  const showValidation = (validation || isLoading) && code.trim().length >= 3;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Ticket className="h-5 w-5" />
          쿠폰 적용
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="coupon-input" className="text-sm font-medium">
            쿠폰 코드
          </Label>
          
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                id="coupon-input"
                value={code}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                maxLength={maxLength}
                className={cn(
                  "transition-all duration-200",
                  validation?.error && "border-destructive focus:border-destructive",
                  validation?.valid && "border-green-500 focus:border-green-500",
                  isApplied && "bg-green-50 border-green-300"
                )}
                aria-describedby="coupon-status coupon-help"
                aria-invalid={!!validation?.error}
              />
              
              {isApplied && appliedCouponData && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                  disabled={disabled}
                  aria-label="쿠폰 제거"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {showApplyButton && (
              <Button
                onClick={handleApply}
                disabled={!isValid || isLoading || disabled}
                className="min-w-[80px] shrink-0"
                aria-describedby="coupon-status"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "적용"
                )}
              </Button>
            )}

            {isApplied && (
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={disabled}
                className="min-w-[80px] shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                제거
              </Button>
            )}
          </div>
          
          <p id="coupon-help" className="text-xs text-muted-foreground">
            쿠폰 코드는 3자 이상 입력해주세요
          </p>
        </div>

        {/* 실시간 검증 결과 표시 */}
        <div id="coupon-status" role="status" aria-live="polite" aria-atomic="true">
          {showValidation && (
            <CouponValidationResult
              validation={validation}
              isLoading={isLoading && !!debouncedCode}
              isApplied={isApplied}
            />
          )}
        </div>

        {/* 주문 금액이 있는 경우 할인 요약 표시 */}
        {isApplied && appliedCouponData && orderAmount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">주문 금액:</span>
                <span>{orderAmount.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>쿠폰 할인:</span>
                <span>-{appliedCouponData.discountAmount.toLocaleString()}원</span>
              </div>
              <hr className="border-green-200" />
              <div className="flex justify-between font-semibold text-lg">
                <span>최종 결제 금액:</span>
                <span className="text-green-700">
                  {(orderAmount - appliedCouponData.discountAmount).toLocaleString()}원
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

CouponValidationForm.displayName = 'CouponValidationForm';