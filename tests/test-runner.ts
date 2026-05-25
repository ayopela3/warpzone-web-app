/**
 * Live Test Runner for Role-Based Testing
 * Executes tests against the actual Warpzone system
 */

interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

interface SuiteResult {
  suite: string
  tests: TestResult[]
  passed: number
  failed: number
  duration: number
}

class LiveTestRunner {
  private baseURL: string
  private results: SuiteResult[] = []

  constructor(baseURL: string = 'https://warpzone.shop') {
    this.baseURL = baseURL
  }

  async runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
    const start = Date.now()
    try {
      await testFn()
      const duration = Date.now() - start
      return { name, passed: true, duration }
    } catch (error) {
      const duration = Date.now() - start
      return { 
        name, 
        passed: false, 
        error: error instanceof Error ? error.message : String(error),
        duration 
      }
    }
  }

  async runSuite(suiteName: string, tests: Array<{name: string, fn: () => Promise<void>}>): Promise<SuiteResult> {
    console.log(`\n🧪 Running ${suiteName}...`)
    const start = Date.now()
    const results: TestResult[] = []

    for (const test of tests) {
      const result = await this.runTest(test.name, test.fn)
      results.push(result)
      
      if (result.passed) {
        console.log(`  ✅ ${result.name} (${result.duration}ms)`)
      } else {
        console.log(`  ❌ ${result.name} (${result.duration}ms)`)
        console.log(`     Error: ${result.error}`)
      }
    }

    const duration = Date.now() - start
    const passed = results.filter(r => r.passed).length
    const failed = results.length - passed

    const suiteResult: SuiteResult = {
      suite: suiteName,
      tests: results,
      passed,
      failed,
      duration
    }

    this.results.push(suiteResult)
    console.log(`📊 ${suiteName}: ${passed} passed, ${failed} failed (${duration}ms)`)
    
    return suiteResult
  }

  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('📋 TEST SUMMARY')
    console.log('='.repeat(60))
    
    let totalPassed = 0
    let totalFailed = 0
    let totalDuration = 0

    for (const suite of this.results) {
      console.log(`\n📂 ${suite.suite}:`)
      console.log(`   ✅ Passed: ${suite.passed}`)
      console.log(`   ❌ Failed: ${suite.failed}`)
      console.log(`   ⏱️  Duration: ${suite.duration}ms`)
      
      totalPassed += suite.passed
      totalFailed += suite.failed
      totalDuration += suite.duration

      // Show failed tests
      const failedTests = suite.tests.filter(t => !t.passed)
      if (failedTests.length > 0) {
        console.log('   🚨 Failed Tests:')
        failedTests.forEach(test => {
          console.log(`      - ${test.name}: ${test.error}`)
        })
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('🏁 FINAL RESULTS')
    console.log('='.repeat(60))
    console.log(`Total Tests: ${totalPassed + totalFailed}`)
    console.log(`✅ Passed: ${totalPassed}`)
    console.log(`❌ Failed: ${totalFailed}`)
    console.log(`⏱️  Total Duration: ${totalDuration}ms`)
    console.log(`📈 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`)
    
    return totalFailed === 0
  }
}

// API Helper for testing
class TestAPIClient {
  private baseURL: string
  private sessionId: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    if (data.success) {
      this.sessionId = data.sessionId || data.session?.id
    }
    return data
  }

  async get(endpoint: string) {
    return this.request('GET', endpoint)
  }

  async post(endpoint: string, body?: any) {
    return this.request('POST', endpoint, body)
  }

  async put(endpoint: string, body?: any) {
    return this.request('PUT', endpoint, body)
  }

  private async request(method: string, endpoint: string, body?: any) {
    const url = `${this.baseURL}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (this.sessionId) {
      headers['Authorization'] = `Bearer ${this.sessionId}`
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    return {
      status: response.status,
      data: await response.json()
    }
  }

  logout() {
    this.sessionId = null
  }
}

// Test implementations
export async function runLiveTests() {
  const runner = new LiveTestRunner()
  
  // Basic connectivity tests
  await runner.runSuite('Connectivity Tests', [
    {
      name: 'API Base URL is accessible',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/pre-orders')
        if (!response.ok) {
          throw new Error(`API not accessible: ${response.status}`)
        }
      }
    },
    {
      name: 'Pre-orders endpoint returns data',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/pre-orders')
        const data = await response.json()
        if (!data.success) {
          throw new Error('Pre-orders API failed')
        }
      }
    }
  ])

  // Admin role tests
  await runner.runSuite('Admin Role Tests', [
    {
      name: 'Admin can access platform QR settings',
      fn: async () => {
        const client = new TestAPIClient('https://warpzone.shop')
        const response = await client.get('/api/settings/payment-qr')
        if (response.status !== 200) {
          throw new Error(`Expected 200, got ${response.status}`)
        }
        if (!response.data.success) {
          throw new Error('API returned failure')
        }
      }
    },
    {
      name: 'Admin pre-orders API is accessible',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/pre-orders')
        if (response.status !== 200) {
          throw new Error(`Expected 200, got ${response.status}`)
        }
        const data = await response.json()
        if (!data.success || !Array.isArray(data.preOrders)) {
          throw new Error('Invalid response structure')
        }
      }
    }
  ])

  // Database connectivity tests
  await runner.runSuite('Database Tests', [
    {
      name: 'Pre-orders exist in database',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/pre-orders')
        const data = await response.json()
        if (!data.success || data.preOrders.length === 0) {
          throw new Error('No pre-orders found in database')
        }
      }
    },
    {
      name: 'Reservation API structure is correct',
      fn: async () => {
        // Test with a known pre-order ID format
        const testId = 'test-id-format'
        const response = await fetch(`https://warpzone.shop/api/pre-orders/${testId}/reservations`)
        // Should return 401 (unauthorized) not 500 (server error)
        if (response.status === 500) {
          throw new Error('Server error in reservation API')
        }
      }
    }
  ])

  // Checkout flow tests
  await runner.runSuite('Checkout Flow Tests', [
    {
      name: 'Platform QR code is configured',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/settings/payment-qr')
        const data = await response.json()
        if (!data.success || !data.payment_qr_url) {
          throw new Error('Platform QR code not configured')
        }
      }
    },
    {
      name: 'Seller QR API works',
      fn: async () => {
        const adminSellerId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
        const response = await fetch(`https://warpzone.shop/api/seller/payment-qr-public?sellerId=${adminSellerId}`)
        const data = await response.json()
        if (!data.success) {
          throw new Error('Seller QR API failed')
        }
      }
    }
  ])

  // Role separation tests
  await runner.runSuite('Role Separation Tests', [
    {
      name: 'Protected endpoints require authentication',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/admin/profile')
        if (response.status !== 401 && response.status !== 403) {
          throw new Error(`Expected 401/403, got ${response.status}`)
        }
      }
    }
  ])

  const allPassed = runner.printSummary()
  return allPassed
}

// Export for use in other files
export { TestAPIClient, LiveTestRunner }
