/**
 * IAP Verification Test Script with Real Payload
 * Tests Google Play IAP subscription verification
 * 
 * Usage: 
 *   TEST_JWT_TOKEN=your_jwt_token node test_iap_with_payload.js
 * 
 * OR set in .env:
 *   TEST_JWT_TOKEN=your_jwt_token
 */

require('dotenv').config();
const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || process.env.SERVER_URL?.replace(/\/$/, '') || 'http://localhost:7012';
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || '';

// Test Payload (from user)
const testPayload = {
    plan_id: "plan-1af67e74ed",
    platform: "android",
    product_id: "com.bluesky.pro.supplier_monthly",
    purchase_token: "ojcmncmpppmafaphbepmoaib.AO-J1OxwuqRwMtMrFgKaGXI0vjMjMsxTxsybAR1wNgX2Awh8d9tFtFr_0iiC1OolJdjKM_v9HYiOhcpQN6tqLSrLMHuIlV2f_TZwu8EBTdHS-NehTJUeH94"
};

console.log('═══════════════════════════════════════════════════════════');
console.log('   IAP VERIFICATION TEST - GOOGLE PLAY');
console.log('═══════════════════════════════════════════════════════════\n');

// Check JWT token
if (!JWT_TOKEN) {
    console.error('❌ ERROR: JWT_TOKEN not set');
    console.log('\n💡 Please set TEST_JWT_TOKEN in .env or as environment variable:');
    console.log('   export TEST_JWT_TOKEN=your_jwt_token');
    console.log('   node test_iap_with_payload.js\n');
    process.exit(1);
}

// Check environment configuration
console.log('🔍 Environment Configuration:\n');
console.log('   API URL:', API_BASE_URL);
console.log('   Package Name:', process.env.GOOGLE_PACKAGE_NAME || 'com.bluesky.pro (default)');
console.log('   Service Account:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? '✅ Configured' : '❌ Not configured');
console.log('');

// Verify service account file exists
const fs = require('fs');
const path = require('path');
const serviceAccountPath = path.join(__dirname, 'config', 'google-service-account.json');

if (fs.existsSync(serviceAccountPath)) {
    try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        console.log('✅ Service Account JSON File Found:');
        console.log('   Project ID:', serviceAccount.project_id);
        console.log('   Client Email:', serviceAccount.client_email);
        console.log('');
    } catch (error) {
        console.error('⚠️  Service account file exists but has invalid JSON');
        console.log('');
    }
} else {
    console.warn('⚠️  Service account file not found at:', serviceAccountPath);
    console.log('');
}

// Display test payload
console.log('📋 Test Payload:');
console.log(JSON.stringify(testPayload, null, 2));
console.log('');

// Make API request
console.log('📡 Sending API Request...\n');
console.log('   Endpoint: POST /user/verifyIAPSubscription');
console.log('   Headers: Authorization: Bearer [JWT_TOKEN]');
console.log('');

const startTime = Date.now();

axios.post(
    `${API_BASE_URL}/user/verifyIAPSubscription`,
    testPayload,
    {
        headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`,
            'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
    }
)
.then(response => {
    const duration = Date.now() - startTime;
    
    console.log('✅ SUCCESS! API Response Received\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Response Time:', duration + 'ms');
    console.log('Status Code:', response.status);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (response.data.code === 200) {
        console.log('🎉 SUBSCRIPTION ACTIVATED SUCCESSFULLY!\n');
        
        const sub = response.data.data.subscription;
        const payment = response.data.data.payment;
        
        console.log('📦 Subscription Details:');
        console.log('   Subscription ID:', sub.subscription_id);
        console.log('   Type:', sub.type);
        console.log('   Plan Name:', sub.plan_name);
        console.log('   Interval:', sub.interval);
        console.log('   Status:', sub.status);
        console.log('   Start Date:', new Date(sub.start_at).toLocaleString());
        console.log('   End Date:', sub.end_at ? new Date(sub.end_at).toLocaleString() : 'Lifetime');
        console.log('   Payment Method:', sub.payment_method);
        console.log('');
        
        console.log('💳 Payment Details:');
        console.log('   Payment ID:', payment.payment_id);
        console.log('   Transaction ID:', payment.transaction_id);
        console.log('   Amount:', payment.amount, payment.currency);
        console.log('   Verified:', payment.verified ? '✅ Yes' : '❌ No');
        console.log('');
        
        if (response.data.data.recruiter_subscription) {
            console.log('👥 Recruiter Subscription (Auto-created):');
            console.log('   Subscription ID:', response.data.data.recruiter_subscription.subscription_id);
            console.log('   Type:', response.data.data.recruiter_subscription.type);
            console.log('');
        }
        
        console.log('✅ Verification Mode:', response.data.bypass_mode ? 'BYPASS MODE' : 'PRODUCTION MODE');
        console.log('');
        
    } else {
        console.log('⚠️  Unexpected response code:', response.data.code);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   TEST COMPLETE - SUCCESS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
})
.catch(error => {
    const duration = Date.now() - startTime;
    
    console.error('❌ ERROR: Request Failed\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Response Time:', duration + 'ms');
    
    if (error.response) {
        // API returned error response
        console.log('Status Code:', error.response.status);
        console.log('Error Response:');
        console.log(JSON.stringify(error.response.data, null, 2));
        console.log('');
        
        // Provide helpful error messages
        const errorData = error.response.data;
        
        if (error.response.status === 401) {
            console.log('💡 TIP: Invalid or expired JWT token');
            console.log('   Please update TEST_JWT_TOKEN with a valid token\n');
        } else if (error.response.status === 400) {
            if (errorData.message?.includes('Plan not found')) {
                console.log('💡 TIP: Plan with ID "plan-1af67e74ed" not found in database');
                console.log('   Please verify the plan exists and is active\n');
            } else if (errorData.message?.includes('Already have an active')) {
                console.log('💡 TIP: User already has an active subscription');
                console.log('   Cancel existing subscription or use a different user\n');
            } else if (errorData.message?.includes('Invalid Google Play receipt')) {
                console.log('💡 TIP: Purchase token verification failed');
                console.log('   Possible causes:');
                console.log('   - Token expired or invalid');
                console.log('   - Service account not granted access in Play Console');
                console.log('   - Google Play Developer API not enabled');
                console.log('   - Package name mismatch\n');
            } else if (errorData.message?.includes('Google service account')) {
                console.log('💡 TIP: Service account credentials not configured');
                console.log('   Check GOOGLE_SERVICE_ACCOUNT_KEY in .env\n');
            }
        } else if (error.response.status === 404) {
            if (errorData.message === 'User not found') {
                console.log('💡 TIP: User from JWT token not found in database\n');
            } else if (errorData.message === 'Plan not found') {
                console.log('💡 TIP: Plan not found in database\n');
            }
        }
        
    } else if (error.request) {
        // Request made but no response
        console.log('No response received from server');
        console.log('Error:', error.message);
        console.log('\n💡 TIP: Check if API server is running on', API_BASE_URL);
        console.log('   Start server with: npm start or node server.js\n');
    } else {
        // Error setting up request
        console.log('Error:', error.message);
        console.log('\n💡 TIP: Check your network connection and API URL\n');
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   TEST COMPLETE - FAILED');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    process.exit(1);
});
