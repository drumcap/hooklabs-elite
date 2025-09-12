/**
 * Mock 데이터 생성기
 * 테스트에서 사용할 가짜 데이터를 생성하는 유틸리티
 */

import { generateRandomString, generateRandomEmail, generateRandomDate } from './test-helpers';

/**
 * Mock User 데이터 생성
 */
export const createMockUser = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'user'),
  externalId: generateRandomString(20, 'ext'),
  email: generateRandomEmail(),
  firstName: 'Test',
  lastName: 'User',
  imageUrl: `https://example.com/avatar/${generateRandomString(8)}.jpg`,
  primaryEmailAddressId: generateRandomString(16, 'email'),
  lemonSqueezyCustomerId: generateRandomString(10, 'cus'),
  credits: 100,
  _creationTime: generateRandomDate().getTime(),
  ...overrides,
});

/**
 * Mock Subscription 데이터 생성
 */
export const createMockSubscription = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'sub'),
  lemonSqueezyId: generateRandomString(10, 'sub'),
  orderId: generateRandomString(10, 'ord'),
  name: 'Pro Plan',
  email: generateRandomEmail(),
  status: 'active',
  statusFormatted: 'Active',
  renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  endsAt: null,
  trialEndsAt: null,
  price: '2999',
  interval: 'month',
  intervalCount: 1,
  isPaused: false,
  subscriptionItemId: generateRandomString(10, 'si'),
  userId: generateRandomString(16, 'user'),
  productId: generateRandomString(10, 'prod'),
  variantId: generateRandomString(10, 'var'),
  customerId: generateRandomString(10, 'cus'),
  _creationTime: generateRandomDate().getTime(),
  ...overrides,
});

/**
 * Mock Social Post 데이터 생성
 */
export const createMockSocialPost = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'post'),
  userId: generateRandomString(16, 'user'),
  content: 'This is a test social media post! 🚀 #testing',
  platforms: ['twitter', 'linkedin'],
  status: 'draft',
  scheduledFor: generateRandomDate(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).getTime(),
  mediaUrls: [],
  hashtags: ['#testing', '#socialmedia'],
  mentions: [],
  analytics: {
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
  },
  aiGenerated: false,
  personaId: null,
  _creationTime: generateRandomDate().getTime(),
  ...overrides,
});

/**
 * Mock Credit Transaction 데이터 생성
 */
export const createMockCreditTransaction = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'credit'),
  userId: generateRandomString(16, 'user'),
  amount: 10,
  type: 'deduction',
  reason: 'post_generation',
  description: 'AI 포스트 생성',
  balance: 90,
  metadata: {
    postId: generateRandomString(16, 'post'),
    feature: 'ai_generation',
  },
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime(),
  _creationTime: generateRandomDate().getTime(),
  ...overrides,
});

/**
 * Mock Coupon 데이터 생성
 */
export const createMockCoupon = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'coupon'),
  code: generateRandomString(8, 'TEST').toUpperCase(),
  discountType: 'percentage',
  discountValue: 20,
  isActive: true,
  usageLimit: 100,
  usageCount: 5,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime(),
  validFor: ['pro_monthly', 'pro_yearly'],
  metadata: {
    campaign: 'launch_promotion',
    description: '출시 기념 20% 할인',
  },
  _creationTime: generateRandomDate().getTime(),
  ...overrides,
});

/**
 * Mock Usage Record 데이터 생성
 */
export const createMockUsageRecord = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'usage'),
  userId: generateRandomString(16, 'user'),
  feature: 'ai_generation',
  action: 'generate_post',
  timestamp: generateRandomDate().getTime(),
  metadata: {
    platform: 'twitter',
    length: 120,
    hasImage: false,
  },
  creditsCost: 1,
  _creationTime: generateRandomDate().getTime(),
  ...overrides,
});

/**
 * Mock AI Generation 데이터 생성
 */
export const createMockAiGeneration = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'ai'),
  userId: generateRandomString(16, 'user'),
  prompt: 'Create a social media post about productivity tips',
  generatedContent: 'Here are 5 productivity tips that will transform your workday! 🚀',
  platform: 'twitter',
  personaId: generateRandomString(16, 'persona'),
  status: 'completed',
  tokensUsed: 150,
  model: 'gpt-4',
  metadata: {
    temperature: 0.7,
    maxTokens: 280,
  },
  _creationTime: generateRandomDate().getTime(),
  ...overrides,
});

/**
 * Mock Social Account 데이터 생성
 */
export const createMockSocialAccount = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'account'),
  userId: generateRandomString(16, 'user'),
  platform: 'twitter',
  accountId: generateRandomString(15, 'twitter'),
  username: `test_user_${generateRandomString(6)}`,
  displayName: 'Test User',
  isActive: true,
  accessToken: generateRandomString(50, 'token'),
  refreshToken: generateRandomString(50, 'refresh'),
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).getTime(), // 1시간 후
  lastSyncAt: generateRandomDate().getTime(),
  followerCount: 1250,
  followingCount: 350,
  _creationTime: generateRandomDate().getTime(),
  ...overrides,
});

/**
 * Mock Persona 데이터 생성
 */
export const createMockPersona = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'persona'),
  userId: generateRandomString(16, 'user'),
  name: 'Professional Marketer',
  description: '전문적이고 친근한 마케팅 전문가 톤',
  tone: 'professional',
  style: 'engaging',
  targetAudience: '중소기업 마케터들',
  keywords: ['마케팅', '성장', '브랜딩', '디지털'],
  platforms: ['linkedin', 'twitter'],
  isDefault: false,
  usageCount: 25,
  _creationTime: generateRandomDate().getTime(),
  ...overrides,
});

/**
 * Mock Analytics 데이터 생성
 */
export const createMockAnalytics = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'analytics'),
  userId: generateRandomString(16, 'user'),
  postId: generateRandomString(16, 'post'),
  platform: 'twitter',
  date: generateRandomDate().toISOString().split('T')[0], // YYYY-MM-DD 형식
  metrics: {
    impressions: Math.floor(Math.random() * 10000) + 100,
    likes: Math.floor(Math.random() * 500) + 10,
    comments: Math.floor(Math.random() * 100) + 2,
    shares: Math.floor(Math.random() * 50) + 1,
    clicks: Math.floor(Math.random() * 200) + 5,
    engagement: Math.random() * 0.1 + 0.01, // 1-11%
  },
  _creationTime: generateRandomDate().getTime(),
  ...overrides,
});

/**
 * 다중 Mock 데이터 생성 헬퍼
 */
export const createMockDataArray = <T>(
  createFn: (overrides?: any) => T,
  count: number,
  overrides: Partial<T>[] = []
): T[] => {
  return Array.from({ length: count }, (_, index) =>
    createFn(overrides[index] || {})
  );
};

/**
 * 관련된 Mock 데이터 세트 생성
 */
export const createMockDataSet = () => {
  const user = createMockUser();
  const subscription = createMockSubscription({ userId: user._id });
  const socialAccount = createMockSocialAccount({ userId: user._id });
  const persona = createMockPersona({ userId: user._id });
  
  const posts = createMockDataArray(
    (overrides) => createMockSocialPost({
      userId: user._id,
      personaId: persona._id,
      ...overrides
    }),
    3
  );
  
  const credits = createMockDataArray(
    (overrides) => createMockCreditTransaction({
      userId: user._id,
      ...overrides
    }),
    5
  );
  
  return {
    user,
    subscription,
    socialAccount,
    persona,
    posts,
    credits,
  };
};

/**
 * Webhook 페이로드 Mock 데이터
 */
export const createMockWebhookPayload = (eventType: string, overrides: any = {}) => {
  const basePayload = {
    meta: {
      event_name: eventType,
      webhook_id: generateRandomString(10, 'wh'),
      timestamp: new Date().toISOString(),
    },
    data: {
      type: eventType.split('_')[0], // subscription, order, etc.
      id: generateRandomString(10, 'obj'),
      attributes: {},
    },
  };
  
  return {
    ...basePayload,
    ...overrides,
  };
};