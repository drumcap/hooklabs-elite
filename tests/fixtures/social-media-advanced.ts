/**
 * 소셜 미디어 고급 기능 테스트용 Mock 데이터
 * - Token Expiry Management
 * - Post Variants A/B Testing  
 * - AI Generation History
 * - Advanced Analytics
 */

import { generateRandomString, generateRandomEmail, generateRandomDate } from '../utils/test-helpers';

/**
 * Mock Social Account 데이터 (토큰 만료 관리)
 */
export const createMockSocialAccount = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'acc'),
  userId: generateRandomString(16, 'user'),
  platform: 'twitter',
  accountId: generateRandomString(15, 'twitter'),
  username: `test_user_${generateRandomString(6)}`,
  displayName: 'Test User',
  profileImage: `https://example.com/profile/${generateRandomString(8)}.jpg`,
  accessToken: 'encrypted_access_token_' + generateRandomString(32),
  refreshToken: 'encrypted_refresh_token_' + generateRandomString(32),
  tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1시간 후
  followers: Math.floor(Math.random() * 10000) + 100,
  following: Math.floor(Math.random() * 1000) + 50,
  postsCount: Math.floor(Math.random() * 500) + 10,
  verificationStatus: 'verified',
  isActive: true,
  lastSyncedAt: new Date().toISOString(),
  createdAt: generateRandomDate().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * 만료되는 소셜 계정 Mock 데이터
 */
export const createExpiringToken = (hoursFromNow: number = 1) => {
  const expiresAt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  return createMockSocialAccount({
    tokenExpiresAt: expiresAt.toISOString(),
    platform: ['twitter', 'linkedin', 'facebook'][Math.floor(Math.random() * 3)],
  });
};

/**
 * Mock Post Variant 데이터 (A/B 테스트)
 */
export const createMockPostVariant = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'variant'),
  postId: generateRandomString(16, 'post'),
  content: `This is variant content for A/B testing! ${generateRandomString(8)} 🚀 #testing`,
  overallScore: Math.floor(Math.random() * 40) + 60, // 60-100 점수
  scoreBreakdown: {
    engagement: Math.floor(Math.random() * 30) + 70,
    virality: Math.floor(Math.random() * 40) + 60,
    personaMatch: Math.floor(Math.random() * 30) + 70,
    readability: Math.floor(Math.random() * 20) + 80,
    trending: Math.floor(Math.random() * 50) + 50,
  },
  isSelected: false,
  aiModel: 'gpt-4-turbo',
  promptUsed: 'Create an engaging social media post about productivity',
  generationMetadata: {
    temperature: 0.7,
    maxTokens: 280,
    platform: 'twitter',
  },
  creditsUsed: 2,
  generatedAt: generateRandomDate().toISOString(),
  ...overrides,
});

/**
 * 베스트 수행 Variant Mock 데이터
 */
export const createBestVariant = (postId: string) => 
  createMockPostVariant({
    postId,
    overallScore: 95,
    scoreBreakdown: {
      engagement: 92,
      virality: 88,
      personaMatch: 96,
      readability: 90,
      trending: 94,
    },
    content: 'This is the best performing variant! 🏆 High engagement and perfect tone.',
  });

/**
 * Mock AI Generation 데이터 (생성 이력)
 */
export const createMockAiGeneration = (overrides: Partial<any> = {}) => ({
  _id: generateRandomString(16, 'aigen'),
  userId: generateRandomString(16, 'user'),
  postId: generateRandomString(16, 'post'),
  personaId: generateRandomString(16, 'persona'),
  type: 'variant_creation',
  prompt: 'Create a social media post about productivity tips for remote workers',
  response: 'Here are 5 productivity tips that will transform your remote work experience! 🏠💼',
  model: 'gpt-4-turbo',
  creditsUsed: 2,
  generationTime: Math.floor(Math.random() * 5000) + 1000, // 1-6초
  inputTokens: Math.floor(Math.random() * 200) + 50,
  outputTokens: Math.floor(Math.random() * 150) + 30,
  temperature: 0.7,
  metadata: {
    platform: 'twitter',
    personaStyle: 'professional_friendly',
    targetAudience: 'remote_workers',
  },
  success: true,
  errorMessage: undefined,
  createdAt: generateRandomDate().toISOString(),
  ...overrides,
});

/**
 * 실패한 AI Generation Mock 데이터
 */
export const createFailedAiGeneration = () => 
  createMockAiGeneration({
    success: false,
    errorMessage: 'API rate limit exceeded',
    response: '',
    generationTime: 0,
    inputTokens: 0,
    outputTokens: 0,
  });

/**
 * Analytics Dashboard Mock 데이터
 */
export const createMockAnalyticsDashboard = (overrides: Partial<any> = {}) => ({
  totalPosts: Math.floor(Math.random() * 100) + 20,
  scheduledPosts: Math.floor(Math.random() * 30) + 5,
  totalViews: Math.floor(Math.random() * 50000) + 1000,
  totalLikes: Math.floor(Math.random() * 5000) + 100,
  totalEngagement: Math.floor(Math.random() * 1000) + 50,
  successRate: Math.floor(Math.random() * 30) + 70, // 70-100%
  platformStats: {
    twitter: Math.floor(Math.random() * 50) + 10,
    linkedin: Math.floor(Math.random() * 30) + 5,
    facebook: Math.floor(Math.random() * 20) + 3,
  },
  recentActivity: [
    {
      action: 'post_created',
      timestamp: new Date().toISOString(),
      count: Math.floor(Math.random() * 10) + 1,
    },
    {
      action: 'variant_generated',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      count: Math.floor(Math.random() * 5) + 1,
    },
  ],
  ...overrides,
});

/**
 * Analytics Overview Mock 데이터
 */
export const createMockAnalyticsOverview = (timeRange: string = '30d') => {
  const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;
  
  return {
    totalPosts: Math.floor(Math.random() * 50) + 10,
    publishedPosts: Math.floor(Math.random() * 40) + 8,
    totalImpressions: Math.floor(Math.random() * 100000) + 5000,
    totalEngagements: Math.floor(Math.random() * 5000) + 200,
    engagementRate: +(Math.random() * 8 + 2).toFixed(2), // 2-10%
    followerGrowth: Math.floor(Math.random() * 200) + 10,
    topPlatforms: [
      { name: 'twitter', count: 25, percentage: 50 },
      { name: 'linkedin', count: 15, percentage: 30 },
      { name: 'facebook', count: 10, percentage: 20 },
    ],
    dailyStats: Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        posts: Math.floor(Math.random() * 5),
        engagement: Math.floor(Math.random() * 500) + 50,
      };
    }),
    topPerformingPosts: Array.from({ length: 5 }, (_, i) => ({
      id: generateRandomString(16, 'post'),
      content: `Top performing post ${i + 1} content...`,
      platform: ['twitter', 'linkedin', 'facebook'][i % 3],
      engagement: Math.floor(Math.random() * 1000) + 100,
      impressions: Math.floor(Math.random() * 10000) + 500,
    })),
  };
};

/**
 * Monthly Trends Mock 데이터
 */
export const createMockMonthlyTrends = (months: number = 6) => {
  return Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (months - 1 - i));
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    return {
      month: monthKey,
      total: Math.floor(Math.random() * 50) + 10,
      successful: Math.floor(Math.random() * 45) + 8,
      creditsUsed: Math.floor(Math.random() * 100) + 20,
      averageTime: Math.floor(Math.random() * 3000) + 1000,
    };
  });
};

/**
 * Account Stats Mock 데이터
 */
export const createMockAccountStats = (accountId: string) => ({
  totalScheduled: Math.floor(Math.random() * 100) + 20,
  published: Math.floor(Math.random() * 80) + 15,
  failed: Math.floor(Math.random() * 5) + 1,
  pending: Math.floor(Math.random() * 10) + 2,
  successRate: Math.floor(Math.random() * 20) + 80, // 80-100%
  accountDetails: {
    platform: 'twitter',
    username: 'test_user',
    followers: Math.floor(Math.random() * 10000) + 500,
    following: Math.floor(Math.random() * 1000) + 100,
    lastActivity: new Date().toISOString(),
  },
});

/**
 * 사용자 AI 통계 Mock 데이터
 */
export const createMockUserAiStats = () => ({
  total: Math.floor(Math.random() * 200) + 50,
  successful: Math.floor(Math.random() * 180) + 45,
  failed: Math.floor(Math.random() * 20) + 5,
  totalCreditsUsed: Math.floor(Math.random() * 500) + 100,
  averageGenerationTime: Math.floor(Math.random() * 3000) + 1500,
  totalTokensUsed: {
    input: Math.floor(Math.random() * 50000) + 10000,
    output: Math.floor(Math.random() * 30000) + 5000,
  },
  typeBreakdown: {
    variant_creation: Math.floor(Math.random() * 100) + 30,
    content_optimization: Math.floor(Math.random() * 50) + 10,
    hashtag_suggestion: Math.floor(Math.random() * 30) + 5,
  },
  modelBreakdown: {
    'gpt-4-turbo': Math.floor(Math.random() * 80) + 40,
    'gpt-3.5-turbo': Math.floor(Math.random() * 60) + 20,
    'claude-3': Math.floor(Math.random() * 40) + 10,
  },
  successRate: Math.floor(Math.random() * 20) + 80,
});

/**
 * Engagement 데이터 Mock
 */
export const createMockEngagementData = (days: number = 30) => ({
  data: Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      date: date.toISOString().split('T')[0],
      likes: Math.floor(Math.random() * 500) + 50,
      comments: Math.floor(Math.random() * 100) + 10,
      shares: Math.floor(Math.random() * 50) + 5,
      impressions: Math.floor(Math.random() * 5000) + 500,
      engagementRate: +(Math.random() * 10 + 1).toFixed(1),
    };
  }),
  summary: {
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalImpressions: 0,
    averageEngagementRate: 0,
  },
});

/**
 * Quality Analysis Mock 데이터
 */
export const createMockQualityAnalysis = () => ({
  totalSamples: Math.floor(Math.random() * 100) + 20,
  averageScores: {
    overall: Math.floor(Math.random() * 30) + 70,
    engagement: Math.floor(Math.random() * 25) + 75,
    virality: Math.floor(Math.random() * 35) + 65,
    personaMatch: Math.floor(Math.random() * 20) + 80,
    readability: Math.floor(Math.random() * 15) + 85,
    trending: Math.floor(Math.random() * 40) + 60,
  },
  scoreDistribution: {
    excellent: Math.floor(Math.random() * 20) + 5, // 80-100점
    good: Math.floor(Math.random() * 30) + 10,     // 60-79점
    average: Math.floor(Math.random() * 15) + 3,   // 40-59점
    poor: Math.floor(Math.random() * 5) + 1,       // 0-39점
  },
  averageGenerationTime: Math.floor(Math.random() * 2000) + 1500,
  bestPerformingTemperature: +(Math.random() * 0.5 + 0.5).toFixed(1), // 0.5-1.0
});

/**
 * Live Activity Mock 데이터
 */
export const createMockLiveActivity = () => ({
  activeUsers: Math.floor(Math.random() * 50) + 10,
  postsBeingCreated: Math.floor(Math.random() * 20) + 2,
  variantsBeingGenerated: Math.floor(Math.random() * 10) + 1,
  recentActions: Array.from({ length: 10 }, (_, i) => ({
    id: generateRandomString(16, 'activity'),
    type: ['post_created', 'variant_generated', 'post_published', 'account_connected'][Math.floor(Math.random() * 4)],
    userId: generateRandomString(16, 'user'),
    timestamp: new Date(Date.now() - i * 60000).toISOString(), // 1분씩 간격
    metadata: {
      platform: ['twitter', 'linkedin', 'facebook'][Math.floor(Math.random() * 3)],
    },
  })),
  systemHealth: {
    aiApiStatus: 'healthy',
    databaseStatus: 'healthy',
    schedulerStatus: 'healthy',
    responseTime: Math.floor(Math.random() * 500) + 100,
  },
});

/**
 * 데이터 세트 생성 헬퍼들
 */
export const createSocialMediaDataSet = () => {
  const userId = generateRandomString(16, 'user');
  const postId = generateRandomString(16, 'post');
  
  const socialAccounts = Array.from({ length: 3 }, (_, i) =>
    createMockSocialAccount({
      userId,
      platform: ['twitter', 'linkedin', 'facebook'][i],
    })
  );
  
  const variants = Array.from({ length: 5 }, () =>
    createMockPostVariant({ postId })
  );
  
  const aiGenerations = Array.from({ length: 10 }, () =>
    createMockAiGeneration({ userId, postId })
  );
  
  return {
    userId,
    postId,
    socialAccounts,
    variants,
    aiGenerations,
    dashboard: createMockAnalyticsDashboard(),
    overview: createMockAnalyticsOverview(),
    monthlyTrends: createMockMonthlyTrends(),
    userStats: createMockUserAiStats(),
    engagement: createMockEngagementData(),
    qualityAnalysis: createMockQualityAnalysis(),
    liveActivity: createMockLiveActivity(),
  };
};

/**
 * 특정 시나리오별 데이터 생성
 */
export const createScenarioData = {
  /**
   * 토큰 만료 시나리오
   */
  tokenExpiry: () => ({
    expiringIn1Hour: createExpiringToken(1),
    expiringIn6Hours: createExpiringToken(6),
    expiringIn24Hours: createExpiringToken(24),
    alreadyExpired: createExpiringToken(-1), // 1시간 전 만료
  }),
  
  /**
   * A/B 테스트 시나리오
   */
  abTesting: (postId: string) => ({
    variants: Array.from({ length: 3 }, (_, i) =>
      createMockPostVariant({
        postId,
        overallScore: 70 + i * 10, // 70, 80, 90점
        isSelected: i === 2, // 마지막이 선택됨
      })
    ),
    bestVariant: createBestVariant(postId),
  }),
  
  /**
   * AI 생성 실패 시나리오
   */
  aiFailures: () => Array.from({ length: 5 }, () => createFailedAiGeneration()),
  
  /**
   * 높은 성능 시나리오
   */
  highPerformance: () => ({
    dashboard: createMockAnalyticsDashboard({
      successRate: 98,
      totalEngagement: 25000,
      platformStats: { twitter: 100, linkedin: 80, facebook: 60 },
    }),
    variants: Array.from({ length: 3 }, () =>
      createMockPostVariant({
        overallScore: Math.floor(Math.random() * 10) + 90, // 90-100점
      })
    ),
  }),
};