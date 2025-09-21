/**
 * Convex 테스트 환경 설정
 * Convex 함수와 데이터베이스 모킹을 위한 설정
 */

import { vi } from 'vitest';
import type { ConvexReactClient } from 'convex/react';
import type { Id, Doc } from '@/convex/_generated/dataModel';

// Convex 클라이언트 모킹
export const mockConvexClient = {
  query: vi.fn(),
  mutation: vi.fn(),
  action: vi.fn(),
  subscribe: vi.fn(),
  onUpdate: vi.fn(),
  close: vi.fn(),
} as unknown as ConvexReactClient;

// 테스트용 데이터 팩토리
export class TestDataFactory {
  static createUser(overrides: Partial<Doc<'users'>> = {}): Doc<'users'> {
    return {
      _id: 'user_test_id' as Id<'users'>,
      _creationTime: Date.now(),
      externalId: 'test_external_id',
      name: 'Test User',
      lemonSqueezyCustomerId: 'cust_test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static createPersona(overrides: Partial<Doc<'personas'>> = {}): Doc<'personas'> {
    return {
      _id: 'persona_test_id' as Id<'personas'>,
      _creationTime: Date.now(),
      userId: 'user_test_id' as Id<'users'>,
      name: 'Test Persona',
      role: 'Developer',
      tone: 'Professional',
      interests: ['Technology', 'Programming'],
      expertise: ['React', 'TypeScript'],
      description: 'Test persona for development',
      avatar: 'https://example.com/avatar.jpg',
      isActive: true,
      settings: {
        defaultPlatforms: ['twitter', 'linkedin'],
        contentStyle: 'informative',
        hashtagStrategy: 'moderate',
      },
      promptTemplates: {
        system: 'You are a helpful assistant',
        intro: 'Hello, I am',
        hook: 'Did you know that',
        body: 'In this post, I will share',
        callToAction: 'What do you think?',
        content: 'Share valuable insights',
        tone: 'professional',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static createSocialPost(overrides: Partial<Doc<'socialPosts'>> = {}): Doc<'socialPosts'> {
    return {
      _id: 'post_test_id' as Id<'socialPosts'>,
      _creationTime: Date.now(),
      userId: 'user_test_id' as Id<'users'>,
      personaId: 'persona_test_id' as Id<'personas'>,
      originalContent: 'This is a test post content',
      finalContent: 'This is a test post content with AI enhancements',
      platforms: ['twitter', 'linkedin'],
      status: 'draft',
      hashtags: ['#test', '#automation'],
      mediaUrls: [],
      threadCount: 1,
      scheduledFor: new Date().toISOString(),
      publishedAt: undefined,
      metrics: {
        impressions: 0,
        reach: 0,
        engagement: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0,
        saves: 0,
        profileVisits: 0,
        follows: 0,
        lastUpdated: new Date().toISOString(),
      },
      creditsUsed: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static createPostVariant(overrides: Partial<Doc<'postVariants'>> = {}): Doc<'postVariants'> {
    return {
      _id: 'variant_test_id' as Id<'postVariants'>,
      _creationTime: Date.now(),
      postId: 'post_test_id' as Id<'socialPosts'>,
      content: 'This is a test variant content',
      overallScore: 85,
      scoreBreakdown: {
        engagement: 80,
        virality: 85,
        personaMatch: 90,
        readability: 85,
        trending: 80,
      },
      isSelected: false,
      aiModel: 'gpt-4',
      promptUsed: 'Create an engaging social media post about technology',
      generationMetadata: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 500,
        processingTime: 1200,
        inputTokens: 100,
        outputTokens: 50,
        requestId: 'req_test_123',
        version: '1.0.0',
      },
      creditsUsed: 3,
      generatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static createSocialAccount(overrides: Partial<Doc<'socialAccounts'>> = {}): Doc<'socialAccounts'> {
    return {
      _id: 'account_test_id' as Id<'socialAccounts'>,
      _creationTime: Date.now(),
      userId: 'user_test_id' as Id<'users'>,
      platform: 'twitter',
      accountId: 'twitter_123456',
      username: 'testuser',
      displayName: 'Test User',
      profileImage: 'https://example.com/profile.jpg',
      accessToken: 'encrypted_access_token',
      refreshToken: 'encrypted_refresh_token',
      tokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      followers: 1000,
      following: 500,
      postsCount: 100,
      verificationStatus: 'verified',
      isActive: true,
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static createSubscription(overrides: Partial<Doc<'subscriptions'>> = {}): Doc<'subscriptions'> {
    return {
      _id: 'sub_test_id' as Id<'subscriptions'>,
      _creationTime: Date.now(),
      userId: 'user_test_id' as Id<'users'>,
      lemonSqueezyId: 'ls_sub_123',
      orderId: 'order_123',
      name: 'Pro Plan',
      email: 'test@example.com',
      status: 'active',
      renewsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      endsAt: null,
      trialEndsAt: null,
      price: '29.00',
      currency: 'USD',
      isUsageBased: false,
      isPaused: false,
      subscriptionItemId: 'item_123',
      isActive: true,
      planName: 'Pro',
      credits: 1000,
      creditsUsed: 100,
      creditsRemaining: 900,
      creditsResetAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      billingCycle: 'monthly',
      maxUsers: 5,
      features: ['unlimited_posts', 'ai_generation', 'analytics'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }
}

// Convex 훅 모킹 유틸리티
export class ConvexTestUtils {
  static mockQuery<T>(returnValue: T) {
    return vi.fn().mockReturnValue(returnValue);
  }

  static mockMutation<T>(returnValue: Promise<T>) {
    return vi.fn().mockResolvedValue(returnValue);
  }

  static mockAction<T>(returnValue: Promise<T>) {
    return vi.fn().mockResolvedValue(returnValue);
  }

  static mockAuthenticatedUser(user?: Partial<Doc<'users'>>) {
    const mockUser = user ? TestDataFactory.createUser(user) : null;
    return this.mockQuery(mockUser);
  }

  static mockLoadingQuery() {
    return this.mockQuery(undefined);
  }

  static mockErrorQuery(error: Error) {
    return vi.fn().mockImplementation(() => {
      throw error;
    });
  }

  static mockPaginatedQuery<T>(items: T[], hasMore = false) {
    return this.mockQuery({
      page: items,
      isDone: !hasMore,
      loadMore: vi.fn(),
    });
  }
}

// 전역 Convex 모킹 설정
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useAction: vi.fn(),
  useConvexAuth: vi.fn(() => ({
    isAuthenticated: true,
    isLoading: false,
  })),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
  ConvexReactClient: vi.fn(() => mockConvexClient),
}));

vi.mock('@/convex/_generated/api', () => ({
  api: {
    users: {
      current: 'users:current',
      getById: 'users:getById',
      create: 'users:create',
      update: 'users:update',
    },
    personas: {
      list: 'personas:list',
      getById: 'personas:getById',
      create: 'personas:create',
      update: 'personas:update',
      delete: 'personas:delete',
    },
    socialPosts: {
      list: 'socialPosts:list',
      getById: 'socialPosts:getById',
      create: 'socialPosts:create',
      update: 'socialPosts:update',
      delete: 'socialPosts:delete',
    },
    postVariants: {
      getByPostId: 'postVariants:getByPostId',
      getBestVariant: 'postVariants:getBestVariant',
      getSelectedVariant: 'postVariants:getSelectedVariant',
      selectVariant: 'postVariants:selectVariant',
      deselectVariant: 'postVariants:deselectVariant',
      remove: 'postVariants:remove',
    },
    socialAccounts: {
      list: 'socialAccounts:list',
      getById: 'socialAccounts:getById',
      create: 'socialAccounts:create',
      update: 'socialAccounts:update',
      delete: 'socialAccounts:delete',
    },
    actions: {
      contentGeneration: {
        generateVariants: 'actions:contentGeneration:generateVariants',
      },
      socialPublishing: {
        publishPost: 'actions:socialPublishing:publishPost',
      },
    },
  },
}));

// 테스트 후 정리
afterEach(() => {
  vi.clearAllMocks();
});