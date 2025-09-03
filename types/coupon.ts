import type { Doc, Id } from "@/convex/_generated/dataModel";

// Base types from Convex schema
export type Coupon = Doc<"coupons">;
export type CouponUsage = Doc<"couponUsages">;
export type CouponId = Id<"coupons">;
export type UserId = Id<"users">;

// Coupon validation result type
export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: {
    id: CouponId;
    code: string;
    name: string;
    description?: string;
    type: string;
    value: number;
    currency?: string;
    discountAmount: number;
  };
}

// Coupon usage with coupon data
export interface CouponUsageWithCoupon extends CouponUsage {
  coupon: {
    code: string;
    name: string;
    type: string;
  } | null;
}

// Coupon statistics result
export interface CouponStatsResult {
  coupon: {
    id: CouponId;
    code: string;
    name: string;
    type: string;
    value: number;
    usageLimit?: number;
    usageCount: number;
  };
  stats: {
    totalUsages: number;
    totalDiscount: number;
    uniqueUsers: number;
    usagesByDate: Record<string, number>;
    remainingUses: number | null;
  };
}

// Form data types
export interface CreateCouponFormData {
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'credits';
  value: number;
  currency?: string;
  minAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  userLimit?: number;
  validFrom: Date;
  validUntil?: Date;
  isActive?: boolean;
}

export interface UpdateCouponFormData {
  name?: string;
  description?: string;
  value?: number;
  minAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  userLimit?: number;
  validUntil?: Date;
  isActive?: boolean;
}

// Filter types
export interface CouponFilters {
  isActive?: boolean;
  searchTerm?: string;
  type?: string;
  sortBy?: 'name' | 'created' | 'usage' | 'expiry';
  sortOrder?: 'asc' | 'desc';
}

export interface UsageHistoryFilters {
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  couponType?: string;
}

// Component prop types
export interface CouponValidatorProps {
  orderAmount?: number;
  onCouponApplied?: (coupon: CouponValidationResult['coupon']) => void;
  onCouponRemoved?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  maxLength?: number;
}

export interface CouponDashboardProps {
  initialFilter?: CouponFilters;
  pageSize?: number;
  onCouponSelect?: (couponId: CouponId) => void;
  showActions?: boolean;
  compact?: boolean;
}

export interface CreateCouponFormProps {
  defaultValues?: Partial<CreateCouponFormData>;
  onSuccess?: (couponId: CouponId) => void;
  onCancel?: () => void;
  isModal?: boolean;
  useSteps?: boolean;
}

export interface EditCouponModalProps {
  coupon: Coupon;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export interface CouponStatsViewProps {
  couponId: CouponId;
  showExportButton?: boolean;
  compact?: boolean;
}

export interface CouponCardProps {
  coupon: Coupon;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

// Hook return types
export interface UseCouponValidationReturn {
  validation?: CouponValidationResult;
  isLoading: boolean;
  isValid: boolean;
  error?: string;
  discountAmount: number;
  couponData?: CouponValidationResult['coupon'];
}

export interface UseAdminCouponsReturn {
  coupons?: Coupon[];
  isLoading: boolean;
  isAdmin: boolean;
  error?: Error;
}

export interface UseCouponUsageHistoryReturn {
  usages?: CouponUsageWithCoupon[];
  isLoading: boolean;
  isEmpty: boolean;
  error?: Error;
}

export interface UseCouponStatsReturn {
  stats?: CouponStatsResult;
  isLoading: boolean;
  notFound: boolean;
  error?: Error;
}

// Utility types
export type CouponType = 'percentage' | 'fixed_amount' | 'credits';
export type CouponStatus = 'active' | 'inactive' | 'expired' | 'depleted';

// Constants
export const COUPON_TYPES: Record<CouponType, { label: string; description: string }> = {
  percentage: {
    label: '퍼센트 할인',
    description: '주문 금액의 일정 퍼센트를 할인합니다'
  },
  fixed_amount: {
    label: '고정 금액 할인',
    description: '고정된 금액을 할인합니다'
  },
  credits: {
    label: '크레딧 지급',
    description: '사용자에게 크레딧을 지급합니다'
  }
} as const;

export const COUPON_STATUS_COLORS: Record<CouponStatus, string> = {
  active: 'text-green-600 bg-green-50 border-green-200',
  inactive: 'text-gray-600 bg-gray-50 border-gray-200',
  expired: 'text-red-600 bg-red-50 border-red-200',
  depleted: 'text-orange-600 bg-orange-50 border-orange-200'
} as const;