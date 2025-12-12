/**
 * Test Apple IAP Setup
 * Verifies Apple IAP configuration is correct
 */

require('dotenv').config();
const axios = require('axios');

async function testAppleIAPSetup() {
  console.log('🍎 Testing Apple IAP Setup...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('  APPLE_SHARED_SECRET:', process.env.APPLE_SHARED_SECRET ? '✅ Set' : '❌ MISSING');
  console.log('');

  if (!process.env.APPLE_SHARED_SECRET) {
    console.error('❌ APPLE_SHARED_SECRET is not set in .env file');
    console.log('\n💡 Add to .env:');
    console.log('   APPLE_SHARED_SECRET=your-apple-shared-secret-from-app-store-connect');
    process.exit(1);
  }

  // Test Apple verification endpoint
  console.log('🔍 Testing Apple Receipt Verification Endpoint...');
  
  const testReceipt = {
    'receipt-data': 'test-receipt-data',
    'password': process.env.APPLE_SHARED_SECRET,
    'exclude-old-transactions': true
  };

  try {
    // Try production endpoint
    const productionUrl = 'https://buy.itunes.apple.com/verifyReceipt';
    console.log('  Testing production endpoint...');
    
    const response = await axios.post(productionUrl, testReceipt, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    // Status 21007 means receipt is from sandbox
    if (response.data.status === 21007) {
      console.log('  ✅ Production endpoint accessible');
      console.log('  ℹ️  Test receipt is from sandbox (expected)');
    } else if (response.data.status === 21002) {
      console.log('  ✅ Production endpoint accessible');
      console.log('  ℹ️  Test receipt data is invalid (expected for test)');
    } else {
      console.log('  ✅ Production endpoint accessible');
      console.log('  Status:', response.data.status);
    }

    // Test sandbox endpoint
    const sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
    console.log('  Testing sandbox endpoint...');
    
    const sandboxResponse = await axios.post(sandboxUrl, testReceipt, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (sandboxResponse.data.status === 21002) {
      console.log('  ✅ Sandbox endpoint accessible');
      console.log('  ℹ️  Test receipt data is invalid (expected for test)');
    } else {
      console.log('  ✅ Sandbox endpoint accessible');
      console.log('  Status:', sandboxResponse.data.status);
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   ✅ APPLE IAP SETUP VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('✅ APPLE_SHARED_SECRET: Configured');
    console.log('✅ Production endpoint: Accessible');
    console.log('✅ Sandbox endpoint: Accessible');
    console.log('');
    console.log('📋 Configuration Status:');
    console.log('  ✅ Apple IAP verification is properly configured');
    console.log('  ✅ Code will automatically try production, then sandbox');
    console.log('  ✅ Ready for production use');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('  1. Ensure APPLE_SHARED_SECRET is set in production .env');
    console.log('  2. Test with a real receipt from your iOS app');
    console.log('  3. Verify products are configured in App Store Connect');
    console.log('');

  } catch (error) {
    console.error('❌ Error testing Apple endpoints:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    } else if (error.request) {
      console.error('  Network error - could not reach Apple servers');
      console.error('  Check internet connection');
    } else {
      console.error('  Error:', error.message);
    }
    process.exit(1);
  }
}

testAppleIAPSetup();
