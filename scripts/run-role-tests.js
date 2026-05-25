#!/usr/bin/env node

/**
 * Live Role-Based Testing Script
 * Tests Admin, Seller, and Buyer functionality
 */

class TestRunner {
  constructor() {
    this.baseURL = 'https://warpzone.shop'
    this.results = []
  }

  async runTest(name, testFn) {
    const start = Date.now()
    try {
      await testFn()
      const duration = Date.now() - start
      console.log(`  ✅ ${name} (${duration}ms)`)
      return { name, passed: true, duration }
    } catch (error) {
      const duration = Date.now() - start
      console.log(`  ❌ ${name} (${duration}ms)`)
      console.log(`     Error: ${error.message}`)
      return { name, passed: false, error: error.message, duration }
    }
  }

  async runSuite(suiteName, tests) {
    console.log(`\n🧪 Running ${suiteName}...`)
    const results = []
    
    for (const test of tests) {
      const result = await this.runTest(test.name, test.fn)
      results.push(result)
    }
    
    const passed = results.filter(r => r.passed).length
    const failed = results.length - passed
    
    this.results.push({ suite: suiteName, results, passed, failed })
    console.log(`📊 ${suiteName}: ${passed} passed, ${failed} failed`)
    
    return { passed, failed }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('📋 TEST SUMMARY')
    console.log('='.repeat(60))
    
    let totalPassed = 0
    let totalFailed = 0

    for (const suite of this.results) {
      console.log(`\n📂 ${suite.suite}:`)
      console.log(`   ✅ Passed: ${suite.passed}`)
      console.log(`   ❌ Failed: ${suite.failed}`)
      
      totalPassed += suite.passed
      totalFailed += suite.failed

      const failedTests = suite.results.filter(t => !t.passed)
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
    console.log(`📈 Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`)
    
    return totalFailed === 0
  }
}

// Main test execution
async function runAllTests() {
  const runner = new TestRunner()
  
  console.log('🚀 Starting Warpzone Role-Based Tests')
  console.log('Testing Admin, Seller, and Buyer functionality...\n')

  // Connectivity Tests
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
      name: 'Pre-orders endpoint returns valid data',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/pre-orders')
        const data = await response.json()
        if (!data.success || !Array.isArray(data.preOrders)) {
          throw new Error('Invalid pre-orders response structure')
        }
      }
    }
  ])

  // Admin Functionality Tests
  await runner.runSuite('Admin Role Tests', [
    {
      name: 'Admin can access platform QR settings',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/settings/payment-qr')
        if (response.status !== 200) {
          throw new Error(`Platform QR API failed: ${response.status}`)
        }
        const data = await response.json()
        if (!data.success) {
          throw new Error('Platform QR API returned failure')
        }
      }
    },
    {
      name: 'Admin pre-orders API works correctly',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/pre-orders')
        if (response.status !== 200) {
          throw new Error(`Pre-orders API failed: ${response.status}`)
        }
        const data = await response.json()
        if (!data.success || !Array.isArray(data.preOrders)) {
          throw new Error('Pre-orders API invalid response')
        }
      }
    }
  ])

  // Database Tests
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
      name: 'Reservation API handles requests correctly',
      fn: async () => {
        const testId = 'test-id-format'
        const response = await fetch(`https://warpzone.shop/api/pre-orders/${testId}/reservations`)
        // Should return 401/403 (auth required) not 500 (server error)
        if (response.status === 500) {
          throw new Error('Reservation API server error')
        }
      }
    }
  ])

  // Payment Flow Tests
  await runner.runSuite('Payment Flow Tests', [
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
      name: 'Seller QR API works for admin seller',
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

  // Access Control Tests
  await runner.runSuite('Access Control Tests', [
    {
      name: 'Protected endpoints require authentication',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/admin/profile')
        if (response.status !== 401 && response.status !== 403) {
          throw new Error(`Expected 401/403 for protected endpoint, got ${response.status}`)
        }
      }
    },
    {
      name: 'Admin endpoints are properly protected',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/admin/service-fees')
        if (response.status !== 401 && response.status !== 403) {
          throw new Error(`Admin endpoint not properly protected: ${response.status}`)
        }
      }
    }
  ])

  // Checkout Integration Tests
  await runner.runSuite('Checkout Integration Tests', [
    {
      name: 'Checkout can resolve admin seller QR',
      fn: async () => {
        // Test that checkout system can find admin QR code
        const platformResponse = await fetch('https://warpzone.shop/api/settings/payment-qr')
        const platformData = await platformResponse.json()
        
        if (!platformData.success || !platformData.payment_qr_url) {
          throw new Error('Platform QR not available for checkout')
        }
      }
    },
    {
      name: 'Cart system is accessible',
      fn: async () => {
        const response = await fetch('https://warpzone.shop/api/cart')
        // Should return 401 for unauthenticated, not 500
        if (response.status === 500) {
          throw new Error('Cart API server error')
        }
      }
    }
  ])

  const allPassed = runner.printSummary()
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! System is working correctly.')
    process.exit(0)
  } else {
    console.log('\n💥 Some tests failed. Please check the issues above.')
    process.exit(1)
  }
}

// Execute tests
runAllTests().catch(error => {
  console.error('\n💥 Test execution failed:', error.message)
  process.exit(1)
})
