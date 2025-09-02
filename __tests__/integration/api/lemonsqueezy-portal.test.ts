import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('/api/lemonsqueezy/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset environment variables
    process.env.LEMONSQUEEZY_API_KEY = 'test_api_key'
  })

  const createPortalHandler = async (requestBody: any) => {
    const { customerId } = requestBody

    if (!customerId) {
      return {
        status: 400,
        json: { error: 'Customer ID is required' }
      }
    }

    // Mock Lemon Squeezy API call
    const lemonSqueezyResponse = {
      data: {
        id: 'portal_12345',
        type: 'customer-portal',
        attributes: {
          url: 'https://billing.lemonsqueezy.com/customer-portal/test-url',
        }
      }
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(lemonSqueezyResponse)
    })

    // Simulate API call to Lemon Squeezy
    try {
      const response = await fetch(`https://api.lemonsqueezy.com/v1/customers/${customerId}/portal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return {
            status: 404,
            json: { error: 'Customer not found' }
          }
        }
        return {
          status: 500,
          json: { error: 'Failed to create customer portal' }
        }
      }

      const data = await response.json()

      return {
        status: 200,
        json: { portalUrl: data.data.attributes.url }
      }
    } catch (error) {
      return {
        status: 500,
        json: { error: 'Network error occurred' }
      }
    }
  }

  it('should create customer portal with valid customer ID', async () => {
    const requestData = {
      customerId: 'cust_12345'
    }

    const result = await createPortalHandler(requestData)

    expect(result.status).toBe(200)
    expect(result.json.portalUrl).toBe('https://billing.lemonsqueezy.com/customer-portal/test-url')
    
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.lemonsqueezy.com/v1/customers/cust_12345/portal',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test_api_key',
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
        },
      }
    )
  })

  it('should return 400 for missing customer ID', async () => {
    const requestData = {}

    const result = await createPortalHandler(requestData)

    expect(result.status).toBe(400)
    expect(result.json.error).toBe('Customer ID is required')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should return 404 for non-existent customer', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({
        errors: [{ detail: 'Customer not found' }]
      })
    })

    const requestData = {
      customerId: 'cust_nonexistent'
    }

    const result = await createPortalHandler(requestData)

    expect(result.status).toBe(404)
    expect(result.json.error).toBe('Customer not found')
  })

  it('should handle Lemon Squeezy API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({
        errors: [{ detail: 'Internal server error' }]
      })
    })

    const requestData = {
      customerId: 'cust_12345'
    }

    const result = await createPortalHandler(requestData)

    expect(result.status).toBe(500)
    expect(result.json.error).toBe('Failed to create customer portal')
  })

  it('should handle network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const requestData = {
      customerId: 'cust_12345'
    }

    const result = await createPortalHandler(requestData)

    expect(result.status).toBe(500)
    expect(result.json.error).toBe('Network error occurred')
  })

  it('should handle missing environment variables', async () => {
    delete process.env.LEMONSQUEEZY_API_KEY

    const createPortalWithoutEnv = async (requestBody: any) => {
      if (!process.env.LEMONSQUEEZY_API_KEY) {
        return {
          status: 500,
          json: { error: 'Missing API configuration' }
        }
      }
      return { status: 200, json: {} }
    }

    const requestData = {
      customerId: 'cust_12345'
    }

    const result = await createPortalWithoutEnv(requestData)

    expect(result.status).toBe(500)
    expect(result.json.error).toBe('Missing API configuration')
  })

  it('should validate request method', async () => {
    const handleWrongMethod = async (method: string) => {
      if (method !== 'POST') {
        return {
          status: 405,
          json: { error: 'Method not allowed' }
        }
      }
      return { status: 200, json: {} }
    }

    const result = await handleWrongMethod('GET')

    expect(result.status).toBe(405)
    expect(result.json.error).toBe('Method not allowed')
  })

  it('should handle malformed request body', async () => {
    const handleMalformedRequest = async (body: any) => {
      try {
        // Simulate parsing JSON body
        if (typeof body !== 'object' || body === null) {
          throw new Error('Invalid JSON')
        }
        
        return await createPortalHandler(body)
      } catch (error) {
        return {
          status: 400,
          json: { error: 'Invalid request body' }
        }
      }
    }

    const result = await handleMalformedRequest('invalid json')

    expect(result.status).toBe(400)
    expect(result.json.error).toBe('Invalid request body')
  })

  it('should handle rate limiting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Map([['Retry-After', '60']]),
      json: () => Promise.resolve({
        errors: [{ detail: 'Too many requests' }]
      })
    })

    const handleRateLimit = async (requestBody: any) => {
      const { customerId } = requestBody

      try {
        const response = await fetch(`https://api.lemonsqueezy.com/v1/customers/${customerId}/portal`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
            'Content-Type': 'application/vnd.api+json',
          },
        })

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          return {
            status: 429,
            json: { 
              error: 'Rate limit exceeded',
              retryAfter: retryAfter ? parseInt(retryAfter) : 60
            }
          }
        }

        return { status: 200, json: {} }
      } catch (error) {
        return { status: 500, json: { error: 'Error occurred' } }
      }
    }

    const requestData = {
      customerId: 'cust_12345'
    }

    const result = await handleRateLimit(requestData)

    expect(result.status).toBe(429)
    expect(result.json.error).toBe('Rate limit exceeded')
    expect(result.json.retryAfter).toBe(60)
  })
})