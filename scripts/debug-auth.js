// Debug authentication for admin payment approval
// This script helps identify authentication issues

async function testAuthFlow() {
  console.log('🔍 Debugging Admin Authentication Flow');
  console.log('=====================================');
  
  // Test 1: Check if admin login works
  console.log('\n📋 Step 1: Testing admin login...');
  try {
    const loginResponse = await fetch('https://warpzone.shop/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@warpzone.com',
        password: 'testpassword'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('Session cookies received:', cookies);
      
      // Extract session ID
      const sessionId = cookies?.match(/wz_session=([^;]+)/)?.[1];
      console.log('Session ID extracted:', sessionId ? 'Found' : 'Not found');
      
      if (sessionId) {
        // Test 2: Check if session works for admin API
        console.log('\n📋 Step 2: Testing admin API access...');
        const apiResponse = await fetch('https://warpzone.shop/api/admin/payments', {
          headers: { 'Cookie': `wz_session=${sessionId}` }
        });
        
        console.log('API response status:', apiResponse.status);
        const apiData = await apiResponse.json();
        console.log('API response:', apiData);
        
        if (apiData.success) {
          console.log('\n📋 Step 3: Testing payment approval...');
          
          // Test with the actual order ID we found
          const orderId = '4fe81b0b-cf6b-4d80-97d0-1725ebcad942';
          
          const approvalResponse = await fetch(`https://warpzone.shop/api/admin/payments/${orderId}/approve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': `wz_session=${sessionId}`
            },
            body: JSON.stringify({ notes: 'Debug test approval' })
          });
          
          console.log('Approval response status:', approvalResponse.status);
          const approvalData = await approvalResponse.json();
          console.log('Approval response:', approvalData);
          
          if (approvalData.success) {
            console.log('✅ Payment approval working correctly!');
          } else {
            console.log('❌ Payment approval failed:', approvalData.error);
          }
        } else {
          console.log('❌ Admin API access failed:', apiData.error);
        }
      }
    } else {
      const loginError = await loginResponse.json();
      console.log('❌ Login failed:', loginError);
    }
  } catch (error) {
    console.error('❌ Error during auth test:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  console.log('\n🔧 Browser Debug Instructions:');
  console.log('1. Open browser dev tools (F12)');
  console.log('2. Go to Network tab');
  console.log('3. Try to approve a payment in admin dashboard');
  console.log('4. Check the approval request in Network tab');
  console.log('5. Look for:');
  console.log('   - Request URL: /api/admin/payments/[id]/approve');
  console.log('   - Request headers: Should include Cookie or Authorization');
  console.log('   - Response status: Should be 200, not 401 or 403');
  console.log('   - Response body: Should show specific error message');
  
  console.log('\n🔍 Common Issues:');
  console.log('- Session expired: Need to re-login as admin');
  console.log('- Cookie not sent: Check browser cookie settings');
  console.log('- Wrong session format: Should be wz_session=value');
  console.log('- Admin role missing: Check user role in database');
}

// Run the debug test
testAuthFlow();
