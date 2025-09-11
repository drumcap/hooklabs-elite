// 테스트용 데이터 픽스처

export const mockUser = {
  id: 'user_test123',
  emailAddress: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
  imageUrl: 'https://example.com/avatar.jpg',
}

export const mockSubscription = {
  _id: 'subscription_test123' as any,
  userId: 'user_test123' as any,
  lemonSqueezySubscriptionId: 'ls_sub_123',
  lemonSqueezyCustomerId: 'ls_cust_123',
  lemonSqueezyProductId: 'ls_prod_123',
  lemonSqueezyVariantId: 'ls_var_123',
  status: 'active',
  planName: 'Pro Plan',
  cardBrand: 'visa',
  cardLastFour: '4242',
  intervalUnit: 'month',
  intervalCount: 1,
  price: 2900, // $29.00 in cents
  currency: 'USD',
  isUsageBased: true,
  usageLimit: 10000,
  currentUsage: 2500,
  usageUnit: 'requests',
  overage: 0,
  overageRate: 5, // 5 cents per overage unit
  renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockUsageRecord = {
  _id: 'usage_test123' as any,
  userId: 'user_test123' as any,
  subscriptionId: 'subscription_test123' as any,
  resourceType: 'api_requests',
  amount: 100,
  unit: 'requests',
  description: 'API 요청',
  recordedAt: new Date().toISOString(),
  periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  periodEnd: new Date().toISOString(),
}

export const mockCreditBalance = {
  _id: 'credit_balance_test123' as any,
  userId: 'user_test123' as any,
  totalCredits: 5000,
  availableCredits: 3500,
  usedCredits: 1500,
  expiredCredits: 0,
  lastUpdated: new Date().toISOString(),
}

export const mockCredit = {
  _id: 'credit_test123' as any,
  userId: 'user_test123' as any,
  amount: 1000,
  type: 'earned',
  description: '회원가입 보너스',
  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
}

export const mockCoupon = {
  _id: 'coupon_test123' as any,
  code: 'WELCOME20',
  name: '신규 가입 할인',
  description: '신규 가입자 20% 할인',
  type: 'percentage',
  value: 20,
  currency: 'USD',
  minAmount: 1000, // $10.00 minimum
  maxDiscount: 5000, // $50.00 maximum
  usageLimit: 1000,
  usageCount: 50,
  userLimit: 1,
  validFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockCouponUsage = {
  _id: 'coupon_usage_test123' as any,
  userId: 'user_test123' as any,
  couponId: 'coupon_test123' as any,
  orderId: 'ls_order_123',
  discountAmount: 580, // $5.80 discount
  currency: 'USD',
  usedAt: new Date().toISOString(),
}

export const mockPayment = {
  _id: 'payment_test123' as any,
  userId: 'user_test123' as any,
  lemonSqueezyOrderId: 'ls_order_123',
  lemonSqueezyCustomerId: 'ls_cust_123',
  lemonSqueezyProductId: 'ls_prod_123',
  lemonSqueezyVariantId: 'ls_var_123',
  identifier: 'ORD-2024-001',
  orderNumber: 1,
  productName: 'Pro Plan',
  variantName: 'Monthly',
  userEmail: 'test@example.com',
  userName: 'Test User',
  status: 'paid',
  statusFormatted: 'Paid',
  refunded: false,
  subtotal: 2900,
  discountTotal: 0,
  taxInclusiveTotal: 2900,
  total: 2900,
  subtotalUsd: 2900,
  discountTotalUsd: 0,
  taxInclusiveUsdTotal: 2900,
  totalUsd: 2900,
  currency: 'USD',
  currencyRate: '1.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockUsageStats = {
  totalUsage: 150000,
  totalRecords: 3500,
  activeUsers: 125,
  usageByType: {
    'api_requests': 100000,
    'storage': 25000,
    'bandwidth': 25000,
  },
  usageByDate: {
    '2024-01-01': 5000,
    '2024-01-02': 4800,
    '2024-01-03': 5200,
  },
  periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  periodEnd: new Date().toISOString(),
}

export const mockSubscriptionStats = {
  total: 1500,
  active: 1200,
  cancelled: 200,
  expired: 80,
  trialCount: 20,
}

// API 응답 모킹용
export const mockApiResponses = {
  checkout: {
    success: {
      checkoutUrl: 'https://checkout.lemonsqueezy.com/buy/test-checkout-url',
    },
    error: {
      error: 'Invalid variant ID',
    },
  },
  portal: {
    success: {
      portalUrl: 'https://billing.lemonsqueezy.com/customer-portal/test-url',
    },
    error: {
      error: 'Customer not found',
    },
  },
}

// 웹훅 페이로드 모킹
export const mockWebhookPayloads = {
  subscriptionCreated: {
    event_name: 'subscription_created',
    data: {
      id: '123456',
      type: 'subscriptions',
      attributes: {
        store_id: 123,
        customer_id: 456,
        product_id: 789,
        variant_id: 101112,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  },
  orderCreated: {
    event_name: 'order_created',
    data: {
      id: '654321',
      type: 'orders',
      attributes: {
        store_id: 123,
        customer_id: 456,
        identifier: 'ORD-2024-001',
        order_number: 1,
        status: 'paid',
        total: 2900,
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  },
}