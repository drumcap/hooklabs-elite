/**
 * 인증 관련 테스트 설정
 * Clerk 인증 시스템 모킹 및 테스트 유틸리티
 */

import React from 'react';
import { vi } from 'vitest';
import type { User, Session } from '@clerk/nextjs/server';

// 테스트용 사용자 데이터
export const mockUser: User = {
  id: 'user_test_123',
  passwordEnabled: true,
  totpEnabled: false,
  backupCodeEnabled: false,
  twoFactorEnabled: false,
  banned: false,
  locked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  imageUrl: 'https://example.com/avatar.jpg',
  hasImage: true,
  primaryEmailAddressId: 'email_123',
  primaryPhoneNumberId: null,
  primaryWeb3WalletId: null,
  lastSignInAt: new Date(),
  externalId: 'external_123',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  publicMetadata: {},
  privateMetadata: {},
  unsafeMetadata: {},
  emailAddresses: [
    {
      id: 'email_123',
      emailAddress: 'test@example.com',
      verification: {
        status: 'verified',
        strategy: 'email_code',
        attempts: 1,
        expireAt: new Date(Date.now() + 86400000),
      },
      linkedTo: [],
    },
  ],
  phoneNumbers: [],
  web3Wallets: [],
  externalAccounts: [],
  samlAccounts: [],
  organizationMemberships: [],
  fullName: 'Test User',
  primaryEmailAddress: {
    id: 'email_123',
    emailAddress: 'test@example.com',
    verification: {
      status: 'verified',
      strategy: 'email_code',
      attempts: 1,
      expireAt: new Date(Date.now() + 86400000),
    },
    linkedTo: [],
  },
  primaryPhoneNumber: null,
  primaryWeb3Wallet: null,
} as any;

export const mockSession: Session = {
  id: 'sess_test_123',
  userId: 'user_test_123',
  status: 'active',
  lastActiveAt: new Date(),
  expireAt: new Date(Date.now() + 86400000),
  abandonAt: new Date(Date.now() + 86400000 * 7),
  createdAt: new Date(),
  updatedAt: new Date(),
  actor: null,
} as any;

// Clerk 훅 모킹
export const mockClerkHooks = {
  useAuth: vi.fn(() => ({
    isSignedIn: true,
    isLoaded: true,
    userId: 'user_test_123',
    sessionId: 'sess_test_123',
    actor: null,
    orgId: null,
    orgRole: null,
    orgSlug: null,
    has: vi.fn(),
    signOut: vi.fn(),
    getToken: vi.fn().mockResolvedValue('mock_jwt_token'),
  })),

  useUser: vi.fn(() => ({
    isSignedIn: true,
    isLoaded: true,
    user: mockUser,
  })),

  useSession: vi.fn(() => ({
    isLoaded: true,
    session: mockSession,
  })),

  useSignIn: vi.fn(() => ({
    isLoaded: true,
    signIn: {
      create: vi.fn(),
      prepareFirstFactor: vi.fn(),
      attemptFirstFactor: vi.fn(),
    },
    setActive: vi.fn(),
  })),

  useSignUp: vi.fn(() => ({
    isLoaded: true,
    signUp: {
      create: vi.fn(),
      prepareEmailAddressVerification: vi.fn(),
      attemptEmailAddressVerification: vi.fn(),
    },
    setActive: vi.fn(),
  })),

  useOrganization: vi.fn(() => ({
    isLoaded: true,
    organization: null,
    membership: null,
  })),

  useOrganizationList: vi.fn(() => ({
    isLoaded: true,
    organizationList: [],
    userMemberships: [],
    setActive: vi.fn(),
  })),
};

// 인증 상태 모킹 유틸리티
export class AuthTestUtils {
  static mockSignedInUser(userOverrides?: Partial<User>) {
    const user = userOverrides ? { ...mockUser, ...userOverrides } : mockUser;

    mockClerkHooks.useAuth.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      userId: user.id,
      sessionId: 'sess_test_123',
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      has: vi.fn(),
      signOut: vi.fn(),
      getToken: vi.fn().mockResolvedValue('mock_jwt_token'),
    });

    mockClerkHooks.useUser.mockReturnValue({
      isSignedIn: true,
      isLoaded: true,
      user,
    });

    return user;
  }

  static mockSignedOutUser() {
    mockClerkHooks.useAuth.mockReturnValue({
      isSignedIn: false,
      isLoaded: true,
      userId: null,
      sessionId: null,
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      has: vi.fn(),
      signOut: vi.fn(),
      getToken: vi.fn().mockResolvedValue(null),
    });

    mockClerkHooks.useUser.mockReturnValue({
      isSignedIn: false,
      isLoaded: true,
      user: null,
    });
  }

  static mockLoadingAuth() {
    mockClerkHooks.useAuth.mockReturnValue({
      isSignedIn: false,
      isLoaded: false,
      userId: null,
      sessionId: null,
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      has: vi.fn(),
      signOut: vi.fn(),
      getToken: vi.fn().mockResolvedValue(null),
    });

    mockClerkHooks.useUser.mockReturnValue({
      isSignedIn: false,
      isLoaded: false,
      user: null,
    });
  }

  static mockAuthError(error: Error) {
    mockClerkHooks.useAuth.mockImplementation(() => {
      throw error;
    });

    mockClerkHooks.useUser.mockImplementation(() => {
      throw error;
    });
  }

  // JWT 토큰 모킹
  static mockJWTToken(payload?: Record<string, any>) {
    const defaultPayload = {
      sub: 'user_test_123',
      iss: 'https://clerk.test.com',
      aud: 'convex',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      ...payload,
    };

    const token = `mock.jwt.${btoa(JSON.stringify(defaultPayload))}`;

    mockClerkHooks.useAuth().getToken.mockResolvedValue(token);
    return token;
  }

  // 권한 테스트 유틸리티
  static mockUserPermissions(permissions: string[]) {
    const hasPermission = vi.fn((permission: string) =>
      permissions.includes(permission)
    );

    mockClerkHooks.useAuth().has = hasPermission;
    return hasPermission;
  }

  // 조직 모킹
  static mockOrganization(orgData?: any) {
    const organization = {
      id: 'org_test_123',
      name: 'Test Organization',
      slug: 'test-org',
      imageUrl: 'https://example.com/org-logo.jpg',
      hasImage: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      publicMetadata: {},
      privateMetadata: {},
      ...orgData,
    };

    mockClerkHooks.useOrganization.mockReturnValue({
      isLoaded: true,
      organization,
      membership: {
        id: 'mem_test_123',
        organization,
        publicUserData: mockUser,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return organization;
  }

  // 다중 조직 모킹
  static mockOrganizationList(organizations: any[] = []) {
    mockClerkHooks.useOrganizationList.mockReturnValue({
      isLoaded: true,
      organizationList: organizations,
      userMemberships: organizations.map(org => ({
        id: `mem_${org.id}`,
        organization: org,
        publicUserData: mockUser,
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      setActive: vi.fn(),
    });

    return organizations;
  }
}

// Clerk 전역 모킹
vi.mock('@clerk/nextjs', () => ({
  useAuth: mockClerkHooks.useAuth,
  useUser: mockClerkHooks.useUser,
  useSession: mockClerkHooks.useSession,
  useSignIn: mockClerkHooks.useSignIn,
  useSignUp: mockClerkHooks.useSignUp,
  useOrganization: mockClerkHooks.useOrganization,
  useOrganizationList: mockClerkHooks.useOrganizationList,

  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => <div data-testid="sign-in-component">Sign In</div>,
  SignUp: () => <div data-testid="sign-up-component">Sign Up</div>,
  UserButton: () => <div data-testid="user-button">User Button</div>,
  OrganizationSwitcher: () => <div data-testid="org-switcher">Org Switcher</div>,

  SignInButton: ({ children }: { children?: React.ReactNode }) =>
    <button data-testid="sign-in-button">{children || 'Sign In'}</button>,
  SignUpButton: ({ children }: { children?: React.ReactNode }) =>
    <button data-testid="sign-up-button">{children || 'Sign Up'}</button>,
  SignOutButton: ({ children }: { children?: React.ReactNode }) =>
    <button data-testid="sign-out-button">{children || 'Sign Out'}</button>,
}));

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({
    userId: 'user_test_123',
    sessionId: 'sess_test_123',
    getToken: vi.fn().mockResolvedValue('mock_jwt_token'),
    has: vi.fn(),
    redirectToSignIn: vi.fn(),
  })),
  currentUser: vi.fn(() => Promise.resolve(mockUser)),
  redirectToSignIn: vi.fn(),
  clerkClient: {
    users: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    },
    sessions: {
      getSession: vi.fn(),
      revokeSession: vi.fn(),
    },
  },
}));

// 테스트 시작 전 기본 인증 상태 설정
beforeEach(() => {
  AuthTestUtils.mockSignedInUser();
});

// 테스트 후 모킹 정리
afterEach(() => {
  vi.clearAllMocks();
});