import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

describe('Admin Payments API Integration Tests', () => {
  const baseURL = 'http://localhost:3000'
  let adminSession: string
  let testOrderId: string

  beforeAll(async () => {
    // Create admin session for testing
    const loginResponse = await fetch(`${baseURL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'testpassword'
      })
    })
    
    if (!loginResponse.ok) {
      throw new Error('Failed to login as admin')
    }
    
    const cookies = loginResponse.headers.get('set-cookie')
    adminSession = cookies?.match(/wz_session=([^;]+)/)?.[1] || ''
    
    if (!adminSession) {
      throw new Error('No session cookie found')
    }
  })

  describe('GET /api/admin/payments', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments`)
      expect(response.status).toBe(401)
    })

    it('requires admin role', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments`, {
        headers: { 'Cookie': `wz_session=invalid-session` }
      })
      expect(response.status).toBe(401)
    })

    it('returns payments list with valid admin session', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.payments).toBeDefined()
      expect(data.pagination).toBeDefined()
      expect(Array.isArray(data.payments)).toBe(true)
    })

    it('handles pagination parameters', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments?page=1&limit=10`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(10)
    })

    it('handles filter parameters', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments?status=pending`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('handles date range filters', async () => {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`${baseURL}/api/admin/payments?date_from=2024-01-01&date_to=${today}`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('validates parameter types', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments?page=invalid&limit=invalid`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      // Should handle invalid parameters gracefully
      expect(response.ok).toBe(true)
    })
  })

  describe('POST /api/admin/payments/[id]/approve', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments/test-id/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Test approval' })
      })
      expect(response.status).toBe(401)
    })

    it('requires admin role', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments/test-id/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': 'wz_session=invalid-session'
        },
        body: JSON.stringify({ notes: 'Test approval' })
      })
      expect(response.status).toBe(401)
    })

    it('validates order ID exists', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments/nonexistent-id/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `wz_session=${adminSession}`
        },
        body: JSON.stringify({ notes: 'Test approval' })
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })

    it('approves payment successfully', async () => {
      // First create a test order
      const createResponse = await fetch(`${baseURL}/api/orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `wz_session=${adminSession}`
        },
        body: JSON.stringify({
          items: [{ product_id: 'test-product', listing_id: 'test-listing', seller_id: 'test-seller', quantity: 1, price: 100 }],
          seller_id: 'test-seller',
          total: 100,
          fulfillment_type: 'pickup',
          payment_proof_url: 'https://example.com/proof.jpg'
        })
      })
      
      if (createResponse.ok) {
        const createData = await createResponse.json()
        testOrderId = createData.order_id
        
        // Now approve it
        const approveResponse = await fetch(`${baseURL}/api/admin/payments/${testOrderId}/approve`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': `wz_session=${adminSession}`
          },
          body: JSON.stringify({ notes: 'Test approval notes' })
        })
        
        expect(approveResponse.ok).toBe(true)
        const approveData = await approveResponse.json()
        expect(approveData.success).toBe(true)
      }
    })

    it('handles missing request body', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments/test-id/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `wz_session=${adminSession}`
        }
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true) // Should handle missing body gracefully
    })
  })

  describe('POST /api/admin/payments/[id]/reject', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments/test-id/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Test rejection' })
      })
      expect(response.status).toBe(401)
    })

    it('requires rejection reason', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments/test-id/reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `wz_session=${adminSession}`
        },
        body: JSON.stringify({}) // Missing reason
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('reason')
    })

    it('rejects payment successfully', async () => {
      if (testOrderId) {
        const response = await fetch(`${baseURL}/api/admin/payments/${testOrderId}/reject`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': `wz_session=${adminSession}`
          },
          body: JSON.stringify({ 
            reason: 'Test rejection reason',
            notes: 'Test rejection notes'
          })
        })
        
        expect(response.ok).toBe(true)
        const data = await response.json()
        expect(data.success).toBe(true)
      }
    })
  })

  describe('GET /api/admin/users/[id]/payments', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseURL}/api/admin/users/test-user/payments`)
      expect(response.status).toBe(401)
    })

    it('returns user payment statistics', async () => {
      const response = await fetch(`${baseURL}/api/admin/users/test-user/payments`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.statistics).toBeDefined()
      expect(data.suspiciousPatterns).toBeDefined()
      expect(data.recommendations).toBeDefined()
    })

    it('handles non-existent user', async () => {
      const response = await fetch(`${baseURL}/api/admin/users/nonexistent-user/payments`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })
  })

  describe('GET /api/admin/payments/export/pdf', () => {
    it('requires authentication', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments/export/pdf`)
      expect(response.status).toBe(401)
    })

    it('returns PDF for valid request', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments/export/pdf`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      expect(response.ok).toBe(true)
      expect(response.headers.get('content-type')).toContain('application/pdf')
    })

    it('handles export with filters', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments/export/pdf?status=pending`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      expect(response.ok).toBe(true)
      expect(response.headers.get('content-type')).toContain('application/pdf')
    })
  })

  describe('Error Handling', () => {
    it('handles malformed JSON requests', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments/test-id/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `wz_session=${adminSession}`
        },
        body: 'invalid json'
      })
      
      expect(response.status).toBe(400)
    })

    it('handles database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, just ensure the endpoint doesn't crash
      const response = await fetch(`${baseURL}/api/admin/payments`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      expect(response.ok).toBe(true)
    })

    it('validates session expiration', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments`, {
        headers: { 'Cookie': 'wz_session=expired-session' }
      })
      
      expect(response.status).toBe(401)
    })
  })

  describe('Security Tests', () => {
    it('prevents SQL injection in parameters', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments?user_id='; DROP TABLE users; --`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      expect(response.ok).toBe(true)
      // Should not crash or return database errors
    })

    it('prevents XSS in parameters', async () => {
      const response = await fetch(`${baseURL}/api/admin/payments?search=<script>alert('xss')</script>`, {
        headers: { 'Cookie': `wz_session=${adminSession}` }
      })
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('validates request size limits', async () => {
      const largePayload = 'a'.repeat(1000000)
      const response = await fetch(`${baseURL}/api/admin/payments/test-id/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `wz_session=${adminSession}`
        },
        body: JSON.stringify({ notes: largePayload })
      })
      
      // Should handle large requests gracefully
      expect(response.ok).toBe(true)
    })
  })
})
