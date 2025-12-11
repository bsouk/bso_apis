/**
 * Production IAP Test with Actual Payload
 * Tests with the exact payload provided by user
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const plan = require('./src/models/plan');
const jwt = require('jsonwebtoken');
const utils = require('./src/utils/utils');
const axios = require('axios');

const USER_EMAIL = process.argv[2] || 'ghufranjaleel@yopmail.com';

// Use the same token generation as auth controller
const generateToken = (_id) => {
  const expiration =
    Math.floor(Date.now() / 1000) +
    60 * 60 * 24 * (process.env.JWT_EXPIRATION_DAY || 30);
  return utils.encrypt(
    jwt.sign(
      {
        data: {
          _id,
          type: "user",
        },
      },
      process.env.JWT_SECRET
    )
  );
};

async function runProductionTest() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   PRODUCTION IAP VERIFICATION TEST');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: USER_EMAIL });
    
    if (!user) {
      console.error('❌ User not found:', USER_EMAIL);
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   ID:', user._id.toString());
    console.log('   Email:', user.email);
    console.log('   Full Name:', user.full_name);
    console.log('');

    // Verify plan exists (should be created by create_or_update_plan.js)
    const planData = await plan.findOne({ 
      plan_id: 'plan-1af67e74ed',
      status: 'active' 
    });

    if (!planData) {
      console.error('❌ Plan "plan-1af67e74ed" not found!');
      console.log('💡 Run: node create_or_update_plan.js first');
      process.exit(1);
    }

    console.log('✅ Plan found:');
    console.log('   Plan ID:', planData.plan_id);
    console.log('   Name:', planData.plan_name);
    console.log('   Type:', planData.type);
    console.log('   Interval:', planData.interval);
    console.log('   Price:', planData.price, planData.currency || 'USD');
    console.log('');

    // Generate JWT token
    const token = generateToken(user._id);
    console.log('✅ JWT Token generated\n');

    // Actual payload from user
    const testPayload = {
      plan_id: "plan-1af67e74ed",
      platform: "android",
      product_id: "com.bluesky.pro.supplier_monthly",
      purchase_token: "ojcmncmpppmafaphbepmoaib.AO-J1OxwuqRwMtMrFgKaGXI0vjMjMsxTxsybAR1wNgX2Awh8d9tFtFr_0iiC1OolJdjKM_v9HYiOhcpQN6tqLSrLMHuIlV2f_TZwu8EBTdHS-NehTJUeH94"
    };

    const API_BASE_URL = process.env.SERVER_URL?.replace(/\/$/, '') || 'http://localhost:7012';

    console.log('📋 Test Configuration:');
    console.log('   API URL:', API_BASE_URL);
    console.log('   Endpoint: POST /user/verifyIAPSubscription');
    console.log('   Platform: Android');
    console.log('   Plan ID:', testPayload.plan_id);
    console.log('   Product ID:', testPayload.product_id);
    console.log('   Package Name:', process.env.GOOGLE_PACKAGE_NAME || 'com.bluesky.pro');
    console.log('');

    // Check environment
    console.log('🔍 Environment Check:');
    console.log('   Service Account:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? '✅ Configured' : '❌ Missing');
    console.log('   Package Name:', process.env.GOOGLE_PACKAGE_NAME || '⚠️  Not set');
    console.log('   Apple Secret:', process.env.APPLE_SHARED_SECRET ? '✅ Configured' : '❌ Missing');
    console.log('');

    // Make API request
    console.log('📡 Sending API Request...\n');
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${API_BASE_URL}/user/verifyIAPSubscription`,
        testPayload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const duration = Date.now() - startTime;

      console.log('═══════════════════════════════════════════════════════════');
      console.log('   ✅✅✅ SUCCESS! ✅✅✅');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('Response Time:', duration + 'ms');
      console.log('Status Code:', response.status);
      console.log('');

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
        
        console.log('📄 Full Response:');
        console.log(JSON.stringify(response.data, null, 2));
        
      } else {
        console.log('⚠️  Unexpected response code:', response.data.code);
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('   TEST COMPLETE - SUCCESS ✅');
      console.log('═══════════════════════════════════════════════════════════\n');

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('═══════════════════════════════════════════════════════════');
      console.error('   ❌ ERROR: Request Failed');
      console.error('═══════════════════════════════════════════════════════════\n');
      console.log('Response Time:', duration + 'ms');
      
      if (error.response) {
        console.log('Status Code:', error.response.status);
        console.log('Error Response:');
        console.log(JSON.stringify(error.response.data, null, 2));
        console.log('');
        
        const errorData = error.response.data;
        
        if (error.response.status === 400) {
          if (errorData.message?.includes('Plan not found')) {
            console.log('💡 TIP: Plan not found. Run: node create_or_update_plan.js\n');
          } else if (errorData.message?.includes('Already have an active')) {
            console.log('💡 TIP: User already has an active subscription');
            console.log('   Existing subscription ID:', errorData.existing_subscription_id);
            console.log('   Cancel it first or use different user\n');
          } else if (errorData.message?.includes('Invalid Google Play receipt') || 
                     errorData.message?.includes('Google verification failed')) {
            console.log('💡 TIP: Google Play verification failed');
            console.log('   Possible causes:');
            console.log('   1. Package name mismatch');
            console.log('      Current:', process.env.GOOGLE_PACKAGE_NAME || 'com.bluesky.pro');
            console.log('      Check actual package name in Google Play Console');
            console.log('');
            console.log('   2. Service account not granted access');
            console.log('      Service account:', 'bso-iap-verification@blue-sky-organisation.iam.gserviceaccount.com');
            console.log('      Go to: Google Play Console > Setup > API access');
            console.log('      Grant access with: View financial data, View app information');
            console.log('');
            console.log('   3. Google Play Developer API not enabled');
            console.log('      Go to: Google Cloud Console > APIs & Services > Library');
            console.log('      Enable: "Google Play Android Developer API"');
            console.log('');
            console.log('   4. Purchase token expired or invalid');
            console.log('      Token should be from Google Play (sandbox or production)');
            console.log('      Token should match the product_id');
            console.log('');
            console.log('   5. App not published');
            console.log('      App should be published (at least internal testing)');
            console.log('      IAP products should be configured');
            console.log('');
          } else if (errorData.message?.includes('Transaction already processed')) {
            console.log('💡 TIP: This purchase token has already been used');
            console.log('   Transaction ID:', errorData.transaction_id);
            console.log('   Use a different purchase token\n');
          }
        }
      } else if (error.request) {
        console.log('No response received from server');
        console.log('Error:', error.message);
        console.log('\n💡 TIP: Check if API server is running on', API_BASE_URL);
      } else {
        console.log('Error:', error.message);
      }
      
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('   TEST COMPLETE - FAILED ❌');
      console.log('═══════════════════════════════════════════════════════════\n');
      
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runProductionTest();
