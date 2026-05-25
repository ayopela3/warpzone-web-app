#!/usr/bin/env node

/**
 * Role-Based Testing Script
 * Tests all three roles: Admin, Seller, Buyer
 * Usage: node scripts/role-tests.mjs
 */

import { runLiveTests } from '../tests/test-runner.js'

console.log('🚀 Starting Warpzone Role-Based Tests')
console.log('Testing Admin, Seller, and Buyer functionality...\n')

async function main() {
  try {
    const allPassed = await runLiveTests()
    
    if (allPassed) {
      console.log('\n🎉 All tests passed! System is working correctly.')
      process.exit(0)
    } else {
      console.log('\n💥 Some tests failed. Please check the issues above.')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message)
    process.exit(1)
  }
}

main()
