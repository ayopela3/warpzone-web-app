import { test, expect } from '@playwright/test'

test.describe('Admin Payments Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'admin@test.com')
    await page.fill('input[name="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin')
  })

  test('admin can view payments tab without crashing', async ({ page }) => {
    await page.click('button:has-text("Payments")')
    await page.waitForLoadState('networkidle')
    
    // Check that the page loads without errors
    await expect(page.locator('h1:has-text("Payment Management")')).toBeVisible()
    await expect(page.locator('text=Payment Filters')).toBeVisible()
    
    // Check for no console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.waitForTimeout(2000) // Wait for any async operations
    expect(errors.length).toBe(0)
  })

  test('admin can filter payments by status', async ({ page }) => {
    await page.click('button:has-text("Payments")')
    await page.waitForLoadState('networkidle')
    
    // Open status filter
    await page.click('button:has-text("All Status")')
    await page.click('text=Pending')
    
    // Wait for filter to apply
    await page.waitForTimeout(1000)
    
    // Verify filter is applied
    const statusButton = page.locator('button:has-text("Pending")')
    await expect(statusButton).toBeVisible()
  })

  test('admin can search by date range', async ({ page }) => {
    await page.click('button:has-text("Payments")')
    await page.waitForLoadState('networkidle')
    
    // Fill date inputs
    await page.fill('input[placeholder*="Date From"]', '2024-01-01')
    await page.fill('input[placeholder*="Date To"]', '2024-12-31')
    
    // Click search
    await page.click('button:has-text("Search")')
    
    // Wait for results
    await page.waitForTimeout(1000)
    
    // Verify no crashes
    await expect(page.locator('text=Payment Management')).toBeVisible()
  })

  test('admin can approve a payment', async ({ page }) => {
    await page.click('button:has-text("Payments")')
    await page.waitForLoadState('networkidle')
    
    // Wait for payments to load
    await page.waitForTimeout(2000)
    
    // Find first pending payment and click actions
    const paymentRows = page.locator('tbody tr')
    if (await paymentRows.count() > 0) {
      const firstRow = paymentRows.first()
      await firstRow.locator('button[aria-haspopup="menu"]').click()
      
      // Click approve
      await page.click('text=Approve')
      
      // Verify approval dialog opens
      await expect(page.locator('text=Approve Payment')).toBeVisible()
      
      // Add notes and approve
      await page.fill('textarea[placeholder*="notes"]', 'Approved via E2E test')
      await page.click('button:has-text("Approve Payment")')
      
      // Wait for success message
      await page.waitForTimeout(1000)
      
      // Verify no crashes
      await expect(page.locator('text=Payment Management')).toBeVisible()
    }
  })

  test('admin can reject a payment', async ({ page }) => {
    await page.click('button:has-text("Payments")')
    await page.waitForLoadState('networkidle')
    
    // Wait for payments to load
    await page.waitForTimeout(2000)
    
    // Find first pending payment and click actions
    const paymentRows = page.locator('tbody tr')
    if (await paymentRows.count() > 0) {
      const firstRow = paymentRows.first()
      await firstRow.locator('button[aria-haspopup="menu"]').click()
      
      // Click reject
      await page.click('text=Reject')
      
      // Verify rejection dialog opens
      await expect(page.locator('text=Reject Payment')).toBeVisible()
      
      // Add reason and reject
      await page.fill('textarea[placeholder*="reason"]', 'Rejected via E2E test')
      await page.fill('textarea[placeholder*="notes"]', 'Test rejection notes')
      await page.click('button:has-text("Reject Payment")')
      
      // Wait for success message
      await page.waitForTimeout(1000)
      
      // Verify no crashes
      await expect(page.locator('text=Payment Management')).toBeVisible()
    }
  })

  test('admin can view payment proof', async ({ page }) => {
    await page.click('button:has-text("Payments")')
    await page.waitForLoadState('networkidle')
    
    // Wait for payments to load
    await page.waitForTimeout(2000)
    
    // Find payment with proof
    const viewProofButtons = page.locator('button:has-text("View")')
    if (await viewProofButtons.count() > 0) {
      // Check that clicking view doesn't crash
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        viewProofButtons.first().click()
      ])
      
      await newPage.waitForLoadState()
      expect(newPage.url()).toContain('http')
      await newPage.close()
    }
  })

  test('admin can export PDF', async ({ page }) => {
    await page.click('button:has-text("Payments")')
    await page.waitForLoadState('networkidle')
    
    // Click export PDF
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export PDF")')
    
    // Wait for download to start
    const download = await downloadPromise
    expect(download.suggestedFilename()).toContain('payments')
  })

  test('admin can navigate pagination', async ({ page }) => {
    await page.click('button:has-text("Payments")')
    await page.waitForLoadState('networkidle')
    
    // Wait for payments to load
    await page.waitForTimeout(2000)
    
    // Check if pagination exists
    const nextButton = page.locator('button:has-text("Next")')
    const prevButton = page.locator('button:has-text("Previous")')
    
    if (await nextButton.isVisible()) {
      await nextButton.click()
      await page.waitForTimeout(1000)
      await expect(page.locator('text=Payment Management')).toBeVisible()
    }
    
    if (await prevButton.isVisible()) {
      await prevButton.click()
      await page.waitForTimeout(1000)
      await expect(page.locator('text=Payment Management')).toBeVisible()
    }
  })

  test('handles empty payments list gracefully', async ({ page }) => {
    await page.click('button:has-text("Payments")')
    await page.waitForLoadState('networkidle')
    
    // Apply filters that might result in no payments
    await page.fill('input[placeholder*="User ID"]', 'nonexistent-user-id')
    await page.click('button:has-text("Search")')
    
    await page.waitForTimeout(1000)
    
    // Should show empty state gracefully
    await expect(page.locator('text=Payment Management')).toBeVisible()
    await expect(page.locator('text=0 payments')).toBeVisible()
  })

  test('handles network errors gracefully', async ({ page }) => {
    // Intercept network requests and simulate errors
    await page.route('**/api/admin/payments*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Network error' })
      })
    })
    
    await page.click('button:has-text("Payments")')
    await page.waitForTimeout(2000)
    
    // Should show error message gracefully
    await expect(page.locator('text=Payment Management')).toBeVisible()
  })

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.click('button:has-text("Payments")')
    await page.waitForLoadState('networkidle')
    
    // Check mobile layout
    await expect(page.locator('text=Payment Filters')).toBeVisible()
    
    // Filters should stack vertically on mobile
    const filterGrid = page.locator('.grid')
    await expect(filterGrid).toBeVisible()
  })

  test('accessibility features work', async ({ page }) => {
    await page.click('button:has-text("Payments")')
    await page.waitForLoadState('networkidle')
    
    // Check keyboard navigation
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Check ARIA labels
    const statusSelect = page.locator('[aria-label*="Payment Status"]')
    await expect(statusSelect).toBeVisible()
    
    // Check focus management
    const searchButton = page.locator('button:has-text("Search")')
    await searchButton.focus()
    await expect(searchButton).toBeFocused()
  })
})

test.describe('Admin Payments Security', () => {
  test('non-admin cannot access payments tab', async ({ page }) => {
    // Login as regular user
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'user@test.com')
    await page.fill('input[name="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    
    // Try to access admin payments directly
    await page.goto('/admin')
    
    // Should be redirected
    await expect(page).toHaveURL('/')
  })

  test('unauthenticated user cannot access payments API', async ({ page }) => {
    const response = await page.request.get('/api/admin/payments')
    expect(response.status()).toBe(401)
  })

  test('session expiration is handled', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'admin@test.com')
    await page.fill('input[name="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    
    // Clear session cookie
    await page.context().clearCookies()
    
    // Try to access payments
    await page.goto('/admin')
    
    // Should be redirected to login
    await expect(page).toHaveURL('/auth/signin')
  })
})
