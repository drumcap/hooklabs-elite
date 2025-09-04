import type { Coupon, CouponStatus } from "@/types/coupon";

/**
 * 쿠폰 상태별 색상 정의
 */
export const COUPON_STATUS_COLORS = {
  active: '#10b981',      // green-500
  inactive: '#6b7280',    // gray-500  
  expired: '#ef4444',     // red-500
  depleted: '#f59e0b',    // amber-500
} as const;

/**
 * 쿠폰 상태를 계산하는 유틸리티 함수
 */
export const getCouponStatus = (coupon: Coupon): CouponStatus => {
  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null;

  if (!coupon.isActive) {
    return 'inactive';
  }

  if (validUntil && validUntil < now) {
    return 'expired';
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return 'depleted';
  }

  return 'active';
};

/**
 * 쿠폰 코드를 자동 생성하는 함수
 */
export const generateCouponCode = (length = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 할인 금액을 계산하는 함수
 */
export const calculateDiscountAmount = (
  coupon: Pick<Coupon, 'type' | 'value' | 'maxDiscount'>,
  orderAmount: number
): number => {
  let discountAmount = 0;

  if (coupon.type === 'percentage') {
    discountAmount = (orderAmount * coupon.value) / 100;
    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else if (coupon.type === 'fixed_amount') {
    discountAmount = Math.min(coupon.value, orderAmount);
  } else if (coupon.type === 'credits') {
    // 크레딧 타입의 경우 주문 금액에 영향을 주지 않음
    discountAmount = 0;
  }

  return Math.round(discountAmount);
};

/**
 * 쿠폰 유효성을 검사하는 함수
 */
export const validateCouponClient = (
  coupon: Coupon,
  orderAmount?: number,
  userUsageCount = 0
): { valid: boolean; error?: string } => {
  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null;

  if (!coupon.isActive) {
    return { valid: false, error: '비활성화된 쿠폰입니다.' };
  }

  if (validFrom > now) {
    return { valid: false, error: '아직 사용할 수 없는 쿠폰입니다.' };
  }

  if (validUntil && validUntil < now) {
    return { valid: false, error: '만료된 쿠폰입니다.' };
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, error: '사용 횟수가 초과된 쿠폰입니다.' };
  }

  if (orderAmount && coupon.minAmount && orderAmount < coupon.minAmount) {
    return { 
      valid: false, 
      error: `최소 주문 금액 ${(coupon.minAmount / 100).toLocaleString()}원 이상이어야 합니다.` 
    };
  }

  if (coupon.userLimit && userUsageCount >= coupon.userLimit) {
    return { valid: false, error: '이미 사용 한도에 도달한 쿠폰입니다.' };
  }

  return { valid: true };
};

/**
 * 금액을 원화 형식으로 포맷팅하는 함수
 */
export const formatCurrency = (
  amount: number, 
  currency = 'KRW',
  includeSymbol = true
): string => {
  const formatted = amount.toLocaleString('ko-KR');
  return includeSymbol ? `${formatted}원` : formatted;
};

/**
 * 날짜를 한국어 형식으로 포맷팅하는 함수
 */
export const formatDate = (date: string | Date, includeTime = false): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (includeTime) {
    return dateObj.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return dateObj.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * 쿠폰 타입에 따른 표시 텍스트를 반환하는 함수
 */
export const getCouponValueText = (coupon: Pick<Coupon, 'type' | 'value'>): string => {
  switch (coupon.type) {
    case 'percentage':
      return `${coupon.value}% 할인`;
    case 'fixed_amount':
      return `${formatCurrency(coupon.value)} 할인`;
    case 'credits':
      return `${coupon.value} 크레딧 지급`;
    default:
      return `${coupon.value}`;
  }
};

/**
 * CSV 형식으로 데이터를 변환하는 함수
 */
export const convertToCSV = (data: Record<string, any>[]): string => {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','), // header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // CSV에서 쉼표와 따옴표를 이스케이프
        return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
};

/**
 * CSV 파일을 다운로드하는 함수
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * 쿠폰 사용률을 계산하는 함수
 */
export const calculateUsageRate = (coupon: Pick<Coupon, 'usageCount' | 'usageLimit'>): number => {
  if (!coupon.usageLimit) return 0;
  return Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100);
};