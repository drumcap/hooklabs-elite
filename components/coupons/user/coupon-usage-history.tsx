"use client";

import { useState, useMemo } from "react";
import { Download, Search, Calendar, Filter, Ticket, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCouponUsageHistory } from "@/hooks/use-coupon-usage-history";
import { formatDate, formatCurrency, convertToCSV, downloadCSV } from "@/lib/coupon-utils";
import { CouponUsageHistorySkeleton } from "@/components/coupons/shared/coupon-skeletons";
import type { CouponUsageWithCoupon, UsageHistoryFilters } from "@/types/coupon";
import { cn } from "@/lib/utils";

interface CouponUsageHistoryProps {
  className?: string;
  pageSize?: number;
  showExport?: boolean;
}

export function CouponUsageHistory({ 
  className,
  pageSize = 20,
  showExport = true
}: CouponUsageHistoryProps) {
  const [limit, setLimit] = useState(pageSize);
  const [filters, setFilters] = useState<UsageHistoryFilters>({
    searchTerm: '',
    couponType: ''
  });
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { usages, isLoading, isEmpty } = useCouponUsageHistory(limit);

  const filteredAndSortedUsages = useMemo(() => {
    if (!usages) return [];

    let filtered = usages;

    // 검색 필터
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(usage =>
        usage.coupon?.code.toLowerCase().includes(searchLower) ||
        usage.coupon?.name.toLowerCase().includes(searchLower) ||
        usage.orderId?.toLowerCase().includes(searchLower)
      );
    }

    // 쿠폰 타입 필터
    if (filters.couponType) {
      filtered = filtered.filter(usage => 
        usage.coupon?.type === filters.couponType
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === 'date') {
        compareValue = new Date(a.usedAt).getTime() - new Date(b.usedAt).getTime();
      } else if (sortBy === 'amount') {
        compareValue = a.discountAmount - b.discountAmount;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [usages, filters, sortBy, sortOrder]);

  const handleExportCSV = () => {
    if (!filteredAndSortedUsages || filteredAndSortedUsages.length === 0) {
      return;
    }

    const csvData = filteredAndSortedUsages.map(usage => ({
      '사용일': formatDate(usage.usedAt, true),
      '쿠폰코드': usage.coupon?.code || '삭제된 쿠폰',
      '쿠폰명': usage.coupon?.name || '삭제된 쿠폰',
      '쿠폰타입': usage.coupon?.type || 'N/A',
      '할인금액': usage.discountAmount,
      '통화': usage.currency || 'KRW',
      '주문ID': usage.orderId || 'N/A'
    }));

    const csv = convertToCSV(csvData);
    downloadCSV(csv, `coupon-usage-history-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const toggleSort = (newSortBy: 'date' | 'amount') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return <CouponUsageHistorySkeleton />;
  }

  if (isEmpty && Object.values(filters).every(v => !v)) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            쿠폰 사용 내역
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Ticket className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">사용한 쿠폰이 없습니다</p>
              <p className="text-muted-foreground">쿠폰을 사용하면 여기에 내역이 표시됩니다</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            쿠폰 사용 내역
          </CardTitle>
          
          {showExport && filteredAndSortedUsages.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSV 내보내기
            </Button>
          )}
        </div>
        
        {/* 필터 및 검색 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="쿠폰명, 코드 또는 주문ID 검색..."
              value={filters.searchTerm || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="pl-9"
            />
          </div>
          
          <Select
            value={filters.couponType || ''}
            onValueChange={(value) => setFilters(prev => ({ ...prev, couponType: value || undefined }))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="타입 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체 타입</SelectItem>
              <SelectItem value="percentage">퍼센트 할인</SelectItem>
              <SelectItem value="fixed_amount">고정 할인</SelectItem>
              <SelectItem value="credits">크레딧</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* 정렬 버튼 */}
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('date')}
            className="flex items-center gap-1"
          >
            <Calendar className="h-3 w-3" />
            사용일
            <ArrowUpDown className="h-3 w-3" />
          </Button>
          <Button
            variant={sortBy === 'amount' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('amount')}
            className="flex items-center gap-1"
          >
            할인금액
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredAndSortedUsages.length === 0 ? (
          <div className="text-center py-8">
            <Filter className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              검색 조건에 맞는 내역이 없습니다
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedUsages.map((usage, index) => (
              <div key={usage._id} className={cn(
                "flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors",
                index % 2 === 0 && "bg-muted/10"
              )}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">
                      {usage.coupon?.name || '삭제된 쿠폰'}
                    </h4>
                    {usage.coupon?.type && (
                      <Badge variant="outline" className="text-xs">
                        {{
                          percentage: '퍼센트',
                          fixed_amount: '고정할인',
                          credits: '크레딧'
                        }[usage.coupon.type]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-mono">
                      {usage.coupon?.code || 'N/A'}
                    </span>
                    <span>{formatDate(usage.usedAt, true)}</span>
                    {usage.orderId && (
                      <span>주문 #{usage.orderId.slice(-6)}</span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-green-600 text-lg">
                    -{formatCurrency(usage.discountAmount)}
                  </p>
                  {usage.currency && usage.currency !== 'KRW' && (
                    <p className="text-xs text-muted-foreground">
                      {usage.currency}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {usages && filteredAndSortedUsages.length >= limit && usages.length >= limit && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setLimit(limit + pageSize)}
                  className="min-w-[120px]"
                >
                  더 보기 ({pageSize}개)
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

CouponUsageHistory.displayName = 'CouponUsageHistory';