// User Components
export { CouponValidationForm } from './user/coupon-validation-form';
export { CouponUsageHistory } from './user/coupon-usage-history';

// Admin Components  
export { AdminCouponDashboard } from './admin/admin-coupon-dashboard';
export { AdminCouponForm } from './admin/admin-coupon-form';
export { CouponStatsChart } from './admin/coupon-stats-chart';

// Shared Components
export { CouponCard } from './shared/coupon-card';
export { CouponValidationResult } from './shared/coupon-validation-result';
export { AccessDenied } from './shared/access-denied';

// Re-export types
export type {
  CouponValidatorProps,
  CouponDashboardProps,
  CreateCouponFormProps,
  CouponStatsViewProps,
  CouponCardProps,
} from '@/types/coupon';