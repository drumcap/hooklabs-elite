"use client";

import { useState } from "react";
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Calendar,
  Users,
  TrendingUp,
  Copy,
  Gift,
  Percent,
  DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
  getCouponStatus, 
  formatDate, 
  formatCurrency, 
  getCouponValueText,
  calculateUsageRate 
} from "@/lib/coupon-utils";
import { COUPON_STATUS_COLORS } from "@/types/coupon";
import type { CouponCardProps } from "@/types/coupon";
import { cn } from "@/lib/utils";

export function CouponCard({
  coupon,
  showActions = false,
  onEdit,
  onDelete,
  onToggleStatus,
  className,
  variant = 'default'
}: CouponCardProps) {
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const status = getCouponStatus(coupon);
  const usageRate = calculateUsageRate(coupon);
  const hasUsageLimit = coupon.usageLimit && coupon.usageLimit > 0;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      toast.success("쿠폰 코드가 복사되었습니다!");
    } catch (error) {
      toast.error("복사에 실패했습니다.");
    }
  };

  const handleAction = async (action: () => Promise<void> | void) => {
    setIsActionLoading(true);
    try {
      await action();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getTypeIcon = () => {
    switch (coupon.type) {
      case 'percentage':
        return <Percent className="h-4 w-4" />;
      case 'fixed_amount':
        return <DollarSign className="h-4 w-4" />;
      case 'credits':
        return <Gift className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    const colorClass = COUPON_STATUS_COLORS[status];
    const statusText = {
      active: '활성',
      inactive: '비활성',
      expired: '만료',
      depleted: '소진'
    }[status];

    return (
      <Badge variant="outline" className={cn("text-xs", colorClass)}>
        {statusText}
      </Badge>
    );
  };

  if (variant === 'compact') {
    return (
      <Card className={cn("hover:shadow-md transition-shadow", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">
                {getTypeIcon()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">{coupon.name}</h3>
                  {getStatusBadge()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {coupon.code} • {getCouponValueText(coupon)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasUsageLimit && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {coupon.usageCount}/{coupon.usageLimit}
                  </p>
                </div>
              )}
              
              {showActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyCode}>
                      <Copy className="h-4 w-4 mr-2" />
                      코드 복사
                    </DropdownMenuItem>
                    {onEdit && (
                      <DropdownMenuItem onClick={onEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        편집
                      </DropdownMenuItem>
                    )}
                    {onToggleStatus && (
                      <DropdownMenuItem 
                        onClick={() => handleAction(onToggleStatus)}
                      >
                        {coupon.isActive ? (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-2" />
                            비활성화
                          </>
                        ) : (
                          <>
                            <ToggleRight className="h-4 w-4 mr-2" />
                            활성화
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleAction(onDelete)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("hover:shadow-lg transition-all duration-200", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-primary">
              {getTypeIcon()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg leading-none">{coupon.name}</h3>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="font-mono text-sm bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors"
                  title="클릭하여 복사"
                >
                  {coupon.code}
                </button>
                <span className="text-sm font-medium text-primary">
                  {getCouponValueText(coupon)}
                </span>
              </div>
            </div>
          </div>
          
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyCode}>
                  <Copy className="h-4 w-4 mr-2" />
                  코드 복사
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    편집
                  </DropdownMenuItem>
                )}
                {onToggleStatus && (
                  <DropdownMenuItem 
                    onClick={() => handleAction(onToggleStatus)}
                    disabled={isActionLoading}
                  >
                    {coupon.isActive ? (
                      <>
                        <ToggleLeft className="h-4 w-4 mr-2" />
                        비활성화
                      </>
                    ) : (
                      <>
                        <ToggleRight className="h-4 w-4 mr-2" />
                        활성화
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleAction(onDelete)}
                      className="text-destructive focus:text-destructive"
                      disabled={isActionLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {coupon.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {coupon.description}
          </p>
        )}
        
        {/* 사용량 프로그레스 */}
        {hasUsageLimit && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">사용 현황</span>
              <span className="font-medium">
                {coupon.usageCount}/{coupon.usageLimit} ({usageRate.toFixed(0)}%)
              </span>
            </div>
            <Progress value={usageRate} className="h-2" />
          </div>
        )}
        
        {/* 추가 정보 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">유효기간</p>
              <p className="font-medium">
                {formatDate(coupon.validFrom)} ~{' '}
                {coupon.validUntil ? formatDate(coupon.validUntil) : '무제한'}
              </p>
            </div>
          </div>
          
          {coupon.usageCount > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">사용 횟수</p>
                <p className="font-medium">{coupon.usageCount}회</p>
              </div>
            </div>
          )}
          
          {coupon.minAmount && (
            <div className="col-span-2 text-xs text-muted-foreground">
              최소 주문금액: {formatCurrency(coupon.minAmount)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

CouponCard.displayName = 'CouponCard';