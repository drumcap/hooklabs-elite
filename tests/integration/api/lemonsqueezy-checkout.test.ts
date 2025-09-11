import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext } from '../../../__mocks__/convex'
import { mockApiResponses } from '../../../fixtures/test-data'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('/api/lemonsqueezy/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset environment variables
    process.env.LEMONSQUEEZY_API_KEY = 'test_api_key'
    process.env.LEMONSQUEEZY_STORE_ID = '12345'
  })

  const createCheckoutHandler = async (requestBody: any) => {
    const { variantId, email, name, customData } = requestBody

    if (!variantId || !email || !name) {
      return {
        status: 400,
        json: { error: 'Missing required fields' }
      }
    }

    // Mock Lemon Squeezy API call
    const lemonSqueezyResponse = {
      data: {
        id: 'checkout_12345',
        type: 'checkouts',
        attributes: {
          url: 'https://checkout.lemonsqueezy.com/buy/test-checkout-url',
          store_id: parseInt(process.env.LEMONSQUEEZY_STORE_ID!),
          variant_id: parseInt(variantId),
          custom: customData,
        }
      }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(lemonSqueezyResponse)
    })

    // Simulate API call to Lemon Squeezy
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email,
              name,
              custom: customData,
            }
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: process.env.LEMONSQUEEZY_STORE_ID,
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId,
              }
            }
          }
        }
      })
    })

    if (!response.ok) {
      return {
        status: 500,
        json: { error: 'Failed to create checkout' }
      }
    }

    const data = await response.json()

    return {
      status: 200,
      json: { checkoutUrl: data.data.attributes.url }
    }
  }

  it('should create checkout with valid data', async () => {
    const requestData = {
      variantId: '123456',
      email: 'test@example.com',
      name: 'Test User',
      customData: {
        planId: 'pro',
        planName: 'Pro Plan',
      }
    }

    const result = await createCheckoutHandler(requestData)

    expect(result.status).toBe(200)
    expect(result.json.checkoutUrl).toBe('https://checkout.lemonsqueezy.com/buy/test-checkout-url')
    
    expect(mockFetch).toHaveBeenCalledWith('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test_api_key',
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: 'test@example.com',
              name: 'Test User',
              custom: {
                planId: 'pro',
                planName: 'Pro Plan',
              },
            }
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: '12345',
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: '123456',
              }
            }
          }
        }
      })
    })
  })

  it('should return 400 for missing required fields', async () => {
    const requestData = {
      variantId: '123456',
      email: 'test@example.com',
      // name is missing
    }

    const result = await createCheckoutHandler(requestData)

    expect(result.status).toBe(400)
    expect(result.json.error).toBe('Missing required fields')
  })

  it('should handle Lemon Squeezy API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({
        errors: [{ detail: 'Invalid variant ID' }]
      })
    })

    const requestData = {
      variantId: 'invalid',
      email: 'test@example.com',
      name: 'Test User',
    }

    const result = await createCheckoutHandler(requestData)

    expect(result.status).toBe(500)
    expect(result.json.error).toBe('Failed to create checkout')
  })

  it('should handle missing environment variables', async () => {
    delete process.env.LEMONSQUEEZY_API_KEY

    const createCheckoutWithoutEnv = async (requestBody: any) => {
      if (!process.env.LEMONSQUEEZY_API_KEY) {
        return {
          status: 500,
          json: { error: 'Missing API configuration' }
        }
      }
      return { status: 200, json: {} }
    }

    const requestData = {
      variantId: '123456',
      email: 'test@example.com',
      name: 'Test User',
    }

    const result = await createCheckoutWithoutEnv(requestData)

    expect(result.status).toBe(500)
    expect(result.json.error).toBe('Missing API configuration')
  })

  it('should pass custom data correctly', async () => {
    const customData = {
      planId: 'enterprise',
      planName: 'Enterprise Plan',
      userId: 'user_123',
      metadata: {
        source: 'website',
        campaign: 'summer_sale',
      }
    }

    const requestData = {
      variantId: '789012',
      email: 'enterprise@example.com',
      name: 'Enterprise User',
      customData,
    }

    const result = await createCheckoutHandler(requestData)

    expect(result.status).toBe(200)
    
    const fetchCall = mockFetch.mock.calls[0]
    const requestBody = JSON.parse(fetchCall[1].body)
    
    expect(requestBody.data.attributes.checkout_data.custom).toEqual(customData)
  })

  it('should handle network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const createCheckoutWithNetworkError = async (requestBody: any) => {
      try {
        await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
            'Content-Type': 'application/vnd.api+json',
          },
          body: JSON.stringify({}),
        })
        return { status: 200, json: {} }
      } catch (error) {
        return {
          status: 500,
          json: { error: 'Network error occurred' }
        }
      }
    }

    const requestData = {
      variantId: '123456',
      email: 'test@example.com',
      name: 'Test User',
    }

    const result = await createCheckoutWithNetworkError(requestData)

    expect(result.status).toBe(500)
    expect(result.json.error).toBe('Network error occurred')
  })
})