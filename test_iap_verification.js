/**
 * IAP Verification Test Script
 * Tests Google Play IAP subscription verification with real purchase token
 * 
 * Usage: node test_iap_verification.js
 */

require('dotenv').config();
const axios = require('axios');

// Test Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || ''; // Add your JWT token here

// Test Payload (from user)
const testPayload = {
    plan_id: "plan-1af67e74ed",
    platform: "android",
    product_id: "com.bluesky.pro.supplier_monthly",
    purchase_token: "ojcmncmpppmafaphbepmoaib.AO-J1OxwuqRwMtMrFgKaGXI0vjMjMsxTxsybAR1wNgX2Awh8d9tFtFr_0iiC1OolJdjKM_v9HYiOhcpQN6tqLSrLMHuIlV2f_TZwu8EBTdHS-NehTJUeH94"
};

/**
 * Test IAP Verification
 */
async function testIAPVerification() {
    console.log('🧪 Testing IAP Verification...\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 Test Configuration:');
    console.log('   API URL:', API_BASE_URL);
    console.log('   Endpoint: POST /user/verifyIAPSubscription');
    console.log('   Platform: Android');
    console.log('   Plan ID:', testPayload.plan_id);
    console.log('   Product ID:', testPayload.product_id);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check JWT token
    if (!JWT_TOKEN) {
        console.error('❌ ERROR: JWT_TOKEN not set in environment variables');
        console.log('   Please set TEST_JWT_TOKEN in .env file or pass as environment variable');
        console.log('   Example: TEST_JWT_TOKEN=your_jwt_token node test_iap_verification.js\n');
        return;
    }

    // Check environment variables
    console.log('🔍 Checking Environment Configuration...\n');
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        console.warn('⚠️  WARNING: Google service account credentials not configured');
        console.log('   Please set one of the following in .env:');
        console.log('   - GOOGLE_SERVICE_ACCOUNT_KEY=./config/google-service-account.json');
        console.log('   - GOOGLE_SERVICE_ACCOUNT_JSON=\'{"type":"service_account",...}\'\n');
    } else {
        console.log('✅ Google service account credentials configured\n');
    }

    if (!process.env.GOOGLE_PACKAGE_NAME) {
        console.warn('⚠️  WARNING: GOOGLE_PACKAGE_NAME not set');
        console.log('   Using default: com.bso.app');
        console.log('   Recommended: GOOGLE_PACKAGE_NAME=com.bluesky.pro\n');
    } else {
        console.log('✅ GOOGLE_PACKAGE_NAME:', process.env.GOOGLE_PACKAGE_NAME, '\n');
    }

    // Make API request
    console.log('📡 Sending API Request...\n');
    console.log('   Payload:', JSON.stringify(testPayload, null, 2));
    console.log('');

    try {
        const response = await axios.post(
            `${API_BASE_URL}/user/verifyIAPSubscription`,
            testPayload,
            {
                headers: {
                    'Authorization': `Bearer ${JWT_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 seconds timeout
            }
        );

        console.log('✅ SUCCESS! API Response:\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Status Code:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        console.log('═══════════════════════════════════════════════════════════\n');

        if (response.data.code === 200) {
            console.log('🎉 Subscription activated successfully!');
            console.log('   Subscription ID:', response.data.data.subscription.subscription_id);
            console.log('   Type:', response.data.data.subscription.type);
            console.log('   Status:', response.data.data.subscription.status);
            console.log('   Payment Method:', response.data.data.subscription.payment_method);
            if (response.data.data.recruiter_subscription) {
                console.log('   Recruiter Subscription:', response.data.data.recruiter_subscription.subscription_id);
            }
        }

    } catch (error) {
        console.error('❌ ERROR: Request failed\n');
        console.log('═══════════════════════════════════════════════════════════');
        
        if (error.response) {
            // API returned error response
            console.log('Status Code:', error.response.status);
            console.log('Error Response:', JSON.stringify(error.response.data, null, 2));
            
            // Provide helpful error messages
            if (error.response.status === 401) {
                console.log('\n💡 TIP: Invalid or expired JWT token. Please update TEST_JWT_TOKEN');
            } else if (error.response.status === 400) {
                console.log('\n💡 TIP: Check the error message above for specific validation issues');
            } else if (error.response.status === 404) {
                if (error.response.data.message === 'Plan not found') {
                    console.log('\n💡 TIP: Plan with ID "plan-1af67e74ed" not found in database');
                } else if (error.response.data.message === 'User not found') {
                    console.log('\n💡 TIP: User from JWT token not found in database');
                }
            }
        } else if (error.request) {
            // Request made but no response
            console.log('No response received from server');
            console.log('Error:', error.message);
            console.log('\n💡 TIP: Check if API server is running on', API_BASE_URL);
        } else {
            // Error setting up request
            console.log('Error:', error.message);
        }
        
        console.log('═══════════════════════════════════════════════════════════\n');
    }
}

/**
 * Test Get IAP Subscriptions
 */
async function testGetIAPSubscriptions() {
    console.log('\n🧪 Testing Get IAP Subscriptions...\n');
    
    if (!JWT_TOKEN) {
        console.log('⏭️  Skipping (JWT token required)\n');
        return;
    }

    try {
        const response = await axios.get(
            `${API_BASE_URL}/user/getIAPSubscriptions`,
            {
                headers: {
                    'Authorization': `Bearer ${JWT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ SUCCESS!');
        console.log('   Subscriptions found:', response.data.count);
        if (response.data.data && response.data.data.length > 0) {
            response.data.data.forEach((sub, index) => {
                console.log(`\n   Subscription ${index + 1}:`);
                console.log('     ID:', sub.subscription_id);
                console.log('     Type:', sub.type);
                console.log('     Status:', sub.status);
                console.log('     Payment Method:', sub.payment_method_type);
            });
        }
        console.log('');

    } catch (error) {
        console.error('❌ ERROR:', error.response?.data?.message || error.message);
        console.log('');
    }
}

// Run tests
(async () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   IAP VERIFICATION TEST SUITE');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    await testIAPVerification();
    await testGetIAPSubscriptions();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════\n');
})();
