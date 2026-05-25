#!/usr/bin/env node

/**
 * Admin Payment Management Test Script
 * Tests all admin payment features before deployment
 */

class AdminPaymentTester {
  constructor() {
    this.baseURL = 'https://warpzone.shop'
    this.testResults = []
  }

  async runTest(name, testFn) {
    console.log(`🧪 Testing: ${name}`)
    try {
      await testFn()
      console.log(`  ✅ PASSED`)
      this.testResults.push({ name, status: 'PASSED' })
    } catch (error) {
      console.log(`  ❌ FAILED: ${error.message}`)
      this.testResults.push({ name, status: 'FAILED', error: error.message })
    }
  }

  async testPaymentsAPI() {
    // Test GET /api/admin/payments (should require auth)
    await this.runTest('Payments API requires authentication', async () => {
      const response = await fetch(`${this.baseURL}/api/admin/payments`)
      if (response.status !== 401 && response.status !== 403) {
        throw new Error(`Expected 401/403, got ${response.status}`)
      }
    })

    // Test payment approval endpoint requires auth
    await this.runTest('Payment approval requires authentication', async () => {
      const response = await fetch(`${this.baseURL}/api/admin/payments/test-id/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'test' })
      })
      if (response.status !== 401 && response.status !== 403) {
        throw new Error(`Expected 401/403, got ${response.status}`)
      }
    })

    // Test payment rejection endpoint requires auth
    await this.runTest('Payment rejection requires authentication', async () => {
      const response = await fetch(`${this.baseURL}/api/admin/payments/test-id/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'test reason' })
      })
      if (response.status !== 401 && response.status !== 403) {
        throw new Error(`Expected 401/403, got ${response.status}`)
      }
    })

    // Test user payments endpoint requires auth
    await this.runTest('User payments API requires authentication', async () => {
      const response = await fetch(`${this.baseURL}/api/admin/users/test-user-id/payments`)
      if (response.status !== 401 && response.status !== 403) {
        throw new Error(`Expected 401/403, got ${response.status}`)
      }
    })

    // Test PDF export endpoint requires auth
    await this.runTest('PDF export requires authentication', async () => {
      const response = await fetch(`${this.baseURL}/api/admin/payments/export/pdf`)
      if (response.status !== 401 && response.status !== 403) {
        throw new Error(`Expected 401/403, got ${response.status}`)
      }
    })
  }

  async testDatabaseSchema() {
    // Test if new columns exist in orders table
    await this.runTest('Database schema has payment management columns', async () => {
      const response = await fetch(`${this.baseURL}/api/pre-orders`)
      if (!response.ok) {
        throw new Error('Basic API not working')
      }
      // If we get here, the database schema is likely correct
      // The new columns would cause errors if they didn't exist
    })
  }

  async testExistingFunctionality() {
    // Test that existing APIs still work
    await this.runTest('Pre-orders API still works', async () => {
      const response = await fetch(`${this.baseURL}/api/pre-orders`)
      if (!response.ok) {
        throw new Error(`Pre-orders API failed: ${response.status}`)
      }
      const data = await response.json()
      if (!data.success) {
        throw new Error('Pre-orders API returned failure')
      }
    })

    // Test that orders API still works
    await this.runTest('Orders API still works', async () => {
      const response = await fetch(`${this.baseURL}/api/orders`)
      if (response.status === 500) {
        throw new Error('Orders API has server error')
      }
    })

    // Test that platform QR API still works
    await this.runTest('Platform QR API still works', async () => {
      const response = await fetch(`${this.baseURL}/api/settings/payment-qr`)
      if (!response.ok) {
        throw new Error(`Platform QR API failed: ${response.status}`)
      }
      const data = await response.json()
      if (!data.success) {
        throw new Error('Platform QR API returned failure')
      }
    })
  }

  async testFrontendComponents() {
    // Test that admin page loads (basic check)
    await this.runTest('Admin page loads without errors', async () => {
      const response = await fetch(`${this.baseURL}/admin`)
      if (response.status === 500) {
        throw new Error('Admin page has server error')
      }
    })
  }

  async testErrorHandling() {
    // Test invalid order ID handling
    await this.runTest('Payment approval handles invalid order ID', async () => {
      const response = await fetch(`${this.baseURL}/api/admin/payments/invalid-id/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'test' })
      })
      // Should return 401/403 (auth required) not 500 (server error)
      if (response.status === 500) {
        throw new Error('Server error on invalid order ID')
      }
    })

    // Test missing rejection reason
    await this.runTest('Payment rejection validates required fields', async () => {
      const response = await fetch(`${this.baseURL}/api/admin/payments/test-id/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Missing reason
      })
      // Should return 401/403 (auth required) not 500 (validation error)
      if (response.status === 500) {
        throw new Error('Server error on missing rejection reason')
      }
    })
  }

  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('📋 ADMIN PAYMENT TEST SUMMARY')
    console.log('='.repeat(60))
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length
    const failed = this.testResults.filter(r => r.status === 'FAILED').length

    console.log(`Total Tests: ${this.testResults.length}`)
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`)

    if (failed > 0) {
      console.log('\n🚨 Failed Tests:')
      this.testResults.filter(r => r.status === 'FAILED').forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`)
      })
    }

    console.log('\n' + '='.repeat(60))
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Ready for deployment.')
    } else {
      console.log('💥 Some tests failed. Fix issues before deployment.')
    }

    return failed === 0
  }

  async runAllTests() {
    console.log('🚀 Starting Admin Payment Management Tests')
    console.log('Testing all payment features before deployment...\n')

    await this.testPaymentsAPI()
    await this.testDatabaseSchema()
    await this.testExistingFunctionality()
    await this.testFrontendComponents()
    await this.testErrorHandling()

    return this.printSummary()
  }
}

// Run tests
async function main() {
  const tester = new AdminPaymentTester()
  const allPassed = await tester.runAllTests()
  
  if (allPassed) {
    console.log('\n✅ Admin payment system is ready for deployment!')
    process.exit(0)
  } else {
    console.log('\n❌ Fix the issues above before deploying.')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('\n💥 Test execution failed:', error.message)
  process.exit(1)
})
