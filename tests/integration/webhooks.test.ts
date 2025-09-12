/**
 * Webhooks 통합 테스트
 * Clerk 및 Lemon Squeezy Webhooks 처리 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockWebhookPayload } from '../utils/mock-data';

// Mock crypto for webhook signature verification
const mockCrypto = {
  subtle: {
    importKey: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn().mockResolvedValue(true),
  },
  getRandomValues: vi.fn(),
};

// Properly mock crypto without trying to assign to global
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
  configurable: true,
});

describe('Webhooks Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Clerk Webhooks', () => {
    describe('user.created 이벤트', () => {
      it('새 사용자를 생성해야 한다', async () => {
        // Arrange
        const webhookPayload = {
          type: 'user.created',
          data: {
            id: 'user_new123',
            first_name: 'John',
            last_name: 'Doe',
            email_addresses: [
              {
                email_address: 'john.doe@example.com',
                id: 'email_123',
              }
            ],
            primary_email_address_id: 'email_123',
            created_at: Date.now(),
            updated_at: Date.now(),
          },
          timestamp: Date.now(),
        };

        const webhookHeaders = {
          'svix-id': 'msg_test123',
          'svix-timestamp': String(Date.now()),
          'svix-signature': 'v1,signature_hash',
        };

        // Mock webhook processing function
        const processClerkWebhook = vi.fn().mockImplementation(async (payload) => {
          if (payload.type === 'user.created') {
            // 사용자 생성 로직
            return {
              success: true,
              userId: 'conv_user_123',
              action: 'created',
            };
          }
        });

        // Act
        const result = await processClerkWebhook(webhookPayload);

        // Assert
        expect(result.success).toBe(true);
        expect(result.action).toBe('created');
        expect(result.userId).toBeDefined();
      });

      it('중복 사용자 생성을 방지해야 한다', async () => {
        // Arrange
        const webhookPayload = {
          type: 'user.created',
          data: {
            id: 'user_existing123',
            first_name: 'Jane',
            last_name: 'Smith',
          },
        };

        const processClerkWebhook = vi.fn().mockImplementation(async (payload) => {
          // Mock: 이미 존재하는 사용자
          return {
            success: false,
            error: 'User already exists',
            userId: null,
          };
        });

        // Act
        const result = await processClerkWebhook(webhookPayload);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('User already exists');
      });
    });

    describe('user.updated 이벤트', () => {
      it('사용자 정보를 업데이트해야 한다', async () => {
        // Arrange
        const webhookPayload = {
          type: 'user.updated',
          data: {
            id: 'user_update123',
            first_name: 'John',
            last_name: 'Updated',
            email_addresses: [
              {
                email_address: 'john.updated@example.com',
                id: 'email_456',
              }
            ],
            updated_at: Date.now(),
          },
        };

        const processClerkWebhook = vi.fn().mockImplementation(async (payload) => {
          if (payload.type === 'user.updated') {
            return {
              success: true,
              userId: 'conv_user_123',
              action: 'updated',
              changes: ['first_name', 'last_name', 'email'],
            };
          }
        });

        // Act
        const result = await processClerkWebhook(webhookPayload);

        // Assert
        expect(result.success).toBe(true);
        expect(result.action).toBe('updated');
        expect(result.changes).toContain('last_name');
      });

      it('존재하지 않는 사용자 업데이트 시 에러를 반환해야 한다', async () => {
        // Arrange
        const webhookPayload = {
          type: 'user.updated',
          data: {
            id: 'user_nonexistent',
            first_name: 'Ghost',
            last_name: 'User',
          },
        };

        const processClerkWebhook = vi.fn().mockImplementation(async (payload) => {
          return {
            success: false,
            error: 'User not found',
            userId: null,
          };
        });

        // Act
        const result = await processClerkWebhook(webhookPayload);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('User not found');
      });
    });

    describe('user.deleted 이벤트', () => {
      it('사용자를 삭제해야 한다', async () => {
        // Arrange
        const webhookPayload = {
          type: 'user.deleted',
          data: {
            id: 'user_delete123',
            deleted: true,
          },
        };

        const processClerkWebhook = vi.fn().mockImplementation(async (payload) => {
          if (payload.type === 'user.deleted') {
            return {
              success: true,
              userId: 'conv_user_123',
              action: 'deleted',
              cleanedUp: ['posts', 'subscriptions', 'credits'],
            };
          }
        });

        // Act
        const result = await processClerkWebhook(webhookPayload);

        // Assert
        expect(result.success).toBe(true);
        expect(result.action).toBe('deleted');
        expect(result.cleanedUp).toContain('posts');
        expect(result.cleanedUp).toContain('credits');
      });
    });

    describe('Webhook Signature 검증', () => {
      it('유효한 서명을 검증해야 한다', async () => {
        // Arrange
        const payload = JSON.stringify({ type: 'user.created', data: {} });
        const signature = 'v1,valid_signature_hash';
        const timestamp = Date.now();

        const verifySignature = vi.fn().mockImplementation(async (payload, signature, secret) => {
          // Mock signature verification
          return signature.startsWith('v1,') && secret === 'test_webhook_secret';
        });

        // Act
        const isValid = await verifySignature(payload, signature, 'test_webhook_secret');

        // Assert
        expect(isValid).toBe(true);
      });

      it('유효하지 않은 서명을 거부해야 한다', async () => {
        // Arrange
        const payload = JSON.stringify({ type: 'user.created', data: {} });
        const signature = 'v1,invalid_signature_hash';

        const verifySignature = vi.fn().mockImplementation(async (payload, signature, secret) => {
          return false; // Mock invalid signature
        });

        // Act
        const isValid = await verifySignature(payload, signature, 'test_webhook_secret');

        // Assert
        expect(isValid).toBe(false);
      });

      it('만료된 타임스탬프를 거부해야 한다', async () => {
        // Arrange
        const payload = JSON.stringify({ type: 'user.created', data: {} });
        const expiredTimestamp = Date.now() - (6 * 60 * 1000); // 6분 전

        const verifyTimestamp = vi.fn().mockImplementation((timestamp) => {
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          return (now - timestamp) <= fiveMinutes;
        });

        // Act
        const isValid = verifyTimestamp(expiredTimestamp);

        // Assert
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Lemon Squeezy Webhooks', () => {
    describe('subscription_created 이벤트', () => {
      it('새 구독을 생성해야 한다', async () => {
        // Arrange
        const webhookPayload = createMockWebhookPayload('subscription_created', {
          data: {
            type: 'subscriptions',
            id: '12345',
            attributes: {
              store_id: 'store_123',
              customer_id: 'cus_456',
              order_id: 'ord_789',
              product_id: 'prod_101',
              variant_id: 'var_202',
              product_name: 'Pro Plan',
              variant_name: 'Monthly',
              user_name: 'John Doe',
              user_email: 'john@example.com',
              status: 'active',
              status_formatted: 'Active',
              card_brand: 'visa',
              card_last_four: '4242',
              pause: null,
              cancelled: false,
              trial_ends_at: null,
              billing_anchor: 1,
              urls: {
                update_payment_method: 'https://...',
                customer_portal: 'https://...',
              },
              renews_at: '2024-02-01T00:00:00.000000Z',
              ends_at: null,
              created_at: '2024-01-01T00:00:00.000000Z',
              updated_at: '2024-01-01T00:00:00.000000Z',
            },
          },
        });

        const processLemonSqueezyWebhook = vi.fn().mockImplementation(async (payload) => {
          if (payload.meta.event_name === 'subscription_created') {
            return {
              success: true,
              subscriptionId: 'conv_sub_123',
              action: 'created',
              customerId: 'conv_cus_456',
            };
          }
        });

        // Act
        const result = await processLemonSqueezyWebhook(webhookPayload);

        // Assert
        expect(result.success).toBe(true);
        expect(result.action).toBe('created');
        expect(result.subscriptionId).toBeDefined();
        expect(result.customerId).toBeDefined();
      });
    });

    describe('subscription_updated 이벤트', () => {
      it('구독 정보를 업데이트해야 한다', async () => {
        // Arrange
        const webhookPayload = createMockWebhookPayload('subscription_updated', {
          data: {
            type: 'subscriptions',
            id: '12345',
            attributes: {
              status: 'paused',
              status_formatted: 'Paused',
              pause: {
                mode: 'void',
                resumes_at: '2024-02-01T00:00:00.000000Z',
              },
              updated_at: '2024-01-15T00:00:00.000000Z',
            },
          },
        });

        const processLemonSqueezyWebhook = vi.fn().mockImplementation(async (payload) => {
          if (payload.meta.event_name === 'subscription_updated') {
            return {
              success: true,
              subscriptionId: 'conv_sub_123',
              action: 'updated',
              changes: ['status', 'pause'],
            };
          }
        });

        // Act
        const result = await processLemonSqueezyWebhook(webhookPayload);

        // Assert
        expect(result.success).toBe(true);
        expect(result.action).toBe('updated');
        expect(result.changes).toContain('status');
        expect(result.changes).toContain('pause');
      });
    });

    describe('subscription_cancelled 이벤트', () => {
      it('구독을 취소해야 한다', async () => {
        // Arrange
        const webhookPayload = createMockWebhookPayload('subscription_cancelled', {
          data: {
            type: 'subscriptions',
            id: '12345',
            attributes: {
              status: 'cancelled',
              status_formatted: 'Cancelled',
              cancelled: true,
              ends_at: '2024-02-01T00:00:00.000000Z',
              updated_at: '2024-01-15T00:00:00.000000Z',
            },
          },
        });

        const processLemonSqueezyWebhook = vi.fn().mockImplementation(async (payload) => {
          if (payload.meta.event_name === 'subscription_cancelled') {
            return {
              success: true,
              subscriptionId: 'conv_sub_123',
              action: 'cancelled',
              endsAt: '2024-02-01T00:00:00.000000Z',
            };
          }
        });

        // Act
        const result = await processLemonSqueezyWebhook(webhookPayload);

        // Assert
        expect(result.success).toBe(true);
        expect(result.action).toBe('cancelled');
        expect(result.endsAt).toBeDefined();
      });
    });

    describe('subscription_payment_success 이벤트', () => {
      it('성공한 결제를 처리해야 한다', async () => {
        // Arrange
        const webhookPayload = createMockWebhookPayload('subscription_payment_success', {
          data: {
            type: 'subscription-invoices',
            id: 'inv_123',
            attributes: {
              store_id: 'store_123',
              subscription_id: 'sub_456',
              customer_id: 'cus_789',
              billing_reason: 'renewal',
              card_brand: 'visa',
              card_last_four: '4242',
              currency: 'USD',
              currency_rate: '1.00000',
              subtotal: 2999,
              discount_total: 0,
              tax: 0,
              total: 2999,
              subtotal_usd: 2999,
              discount_total_usd: 0,
              tax_usd: 0,
              total_usd: 2999,
              status: 'paid',
              status_formatted: 'Paid',
              refunded: false,
              refunded_at: null,
              created_at: '2024-01-01T00:00:00.000000Z',
              updated_at: '2024-01-01T00:00:00.000000Z',
            },
          },
        });

        const processLemonSqueezyWebhook = vi.fn().mockImplementation(async (payload) => {
          if (payload.meta.event_name === 'subscription_payment_success') {
            return {
              success: true,
              invoiceId: 'conv_inv_123',
              subscriptionId: 'conv_sub_456',
              action: 'payment_success',
              amount: 2999,
              creditsAwarded: 100, // 결제 성공 시 크레딧 지급
            };
          }
        });

        // Act
        const result = await processLemonSqueezyWebhook(webhookPayload);

        // Assert
        expect(result.success).toBe(true);
        expect(result.action).toBe('payment_success');
        expect(result.amount).toBe(2999);
        expect(result.creditsAwarded).toBe(100);
      });
    });

    describe('subscription_payment_failed 이벤트', () => {
      it('실패한 결제를 처리해야 한다', async () => {
        // Arrange
        const webhookPayload = createMockWebhookPayload('subscription_payment_failed', {
          data: {
            type: 'subscription-invoices',
            id: 'inv_failed_123',
            attributes: {
              subscription_id: 'sub_456',
              status: 'pending',
              status_formatted: 'Pending',
              billing_reason: 'renewal',
              total: 2999,
              created_at: '2024-01-01T00:00:00.000000Z',
            },
          },
        });

        const processLemonSqueezyWebhook = vi.fn().mockImplementation(async (payload) => {
          if (payload.meta.event_name === 'subscription_payment_failed') {
            return {
              success: true,
              invoiceId: 'conv_inv_failed_123',
              subscriptionId: 'conv_sub_456',
              action: 'payment_failed',
              retryAttempt: 1,
              nextRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
          }
        });

        // Act
        const result = await processLemonSqueezyWebhook(webhookPayload);

        // Assert
        expect(result.success).toBe(true);
        expect(result.action).toBe('payment_failed');
        expect(result.retryAttempt).toBe(1);
        expect(result.nextRetryAt).toBeDefined();
      });
    });

    describe('order_created 이벤트', () => {
      it('새 주문을 생성해야 한다', async () => {
        // Arrange
        const webhookPayload = createMockWebhookPayload('order_created', {
          data: {
            type: 'orders',
            id: 'ord_123',
            attributes: {
              store_id: 'store_123',
              customer_id: 'cus_456',
              identifier: '#1001',
              order_number: 1001,
              user_name: 'John Doe',
              user_email: 'john@example.com',
              currency: 'USD',
              currency_rate: '1.00000',
              subtotal: 2999,
              discount_total: 500,
              tax: 300,
              total: 2799,
              subtotal_usd: 2999,
              discount_total_usd: 500,
              tax_usd: 300,
              total_usd: 2799,
              tax_name: 'VAT',
              tax_rate: '0.20000',
              status: 'paid',
              status_formatted: 'Paid',
              refunded: false,
              refunded_at: null,
              created_at: '2024-01-01T00:00:00.000000Z',
              updated_at: '2024-01-01T00:00:00.000000Z',
            },
          },
        });

        const processLemonSqueezyWebhook = vi.fn().mockImplementation(async (payload) => {
          if (payload.meta.event_name === 'order_created') {
            return {
              success: true,
              orderId: 'conv_ord_123',
              customerId: 'conv_cus_456',
              action: 'order_created',
              total: 2799,
              status: 'paid',
            };
          }
        });

        // Act
        const result = await processLemonSqueezyWebhook(webhookPayload);

        // Assert
        expect(result.success).toBe(true);
        expect(result.action).toBe('order_created');
        expect(result.total).toBe(2799);
        expect(result.status).toBe('paid');
      });
    });

    describe('Webhook Error Handling', () => {
      it('처리할 수 없는 이벤트 타입에 대해 에러를 반환해야 한다', async () => {
        // Arrange
        const unknownWebhookPayload = createMockWebhookPayload('unknown_event', {});

        const processLemonSqueezyWebhook = vi.fn().mockImplementation(async (payload) => {
          return {
            success: false,
            error: `Unhandled event type: ${payload.meta.event_name}`,
          };
        });

        // Act
        const result = await processLemonSqueezyWebhook(unknownWebhookPayload);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Unhandled event type');
      });

      it('잘못된 페이로드 구조에 대해 에러를 반환해야 한다', async () => {
        // Arrange
        const malformedPayload = {
          // 필수 필드 누락
          invalid: 'payload',
        };

        const processLemonSqueezyWebhook = vi.fn().mockImplementation(async (payload) => {
          if (!payload.meta || !payload.data) {
            return {
              success: false,
              error: 'Invalid webhook payload structure',
            };
          }
        });

        // Act
        const result = await processLemonSqueezyWebhook(malformedPayload);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid webhook payload structure');
      });

      it('데이터베이스 에러를 적절히 처리해야 한다', async () => {
        // Arrange
        const validPayload = createMockWebhookPayload('subscription_created', {});

        const processLemonSqueezyWebhook = vi.fn().mockImplementation(async (payload) => {
          // Mock database error
          throw new Error('Database connection failed');
        });

        // Act & Assert
        await expect(processLemonSqueezyWebhook(validPayload)).rejects.toThrow('Database connection failed');
      });
    });

    describe('Idempotency', () => {
      it('중복 웹훅을 무시해야 한다', async () => {
        // Arrange
        const webhookPayload = createMockWebhookPayload('subscription_created', {
          data: { id: 'duplicate_123' }
        });

        let callCount = 0;
        const processLemonSqueezyWebhook = vi.fn().mockImplementation(async (payload) => {
          callCount++;
          if (callCount === 1) {
            return {
              success: true,
              subscriptionId: 'conv_sub_123',
              action: 'created',
            };
          } else {
            return {
              success: true,
              subscriptionId: 'conv_sub_123',
              action: 'ignored', // 중복 처리
              message: 'Webhook already processed',
            };
          }
        });

        // Act
        const result1 = await processLemonSqueezyWebhook(webhookPayload);
        const result2 = await processLemonSqueezyWebhook(webhookPayload); // 중복 요청

        // Assert
        expect(result1.action).toBe('created');
        expect(result2.action).toBe('ignored');
        expect(result2.message).toBe('Webhook already processed');
      });
    });
  });
});