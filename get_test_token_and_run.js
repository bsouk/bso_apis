/**
 * Get Test JWT Token and Run IAP Test
 * Generates a JWT token using the same method as the auth controller
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
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

async function getTokenAndTest() {
  try {
    console.log('🔐 Getting test JWT token...\n');
    
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

    // Generate JWT token using same method as auth
    const token = generateToken(user._id);

    console.log('✅ JWT Token generated!');
    console.log('   Token:', token.substring(0, 50) + '...');
    console.log('');

    // Test payload
    const testPayload = {
      plan_id: "plan-1af67e74ed",
      platform: "android",
      product_id: "com.bluesky.pro.supplier_monthly",
      purchase_token: "ojcmncmpppmafaphbepmoaib.AO-J1OxwuqRwMtMrFgKaGXI0vjMjMsxTxsybAR1wNgX2Awh8d9tFtFr_0iiC1OolJdjKM_v9HYiOhcpQN6tqLSrLMHuIlV2f_TZwu8EBTdHS-NehTJUeH94"
    };

    const API_BASE_URL = process.env.SERVER_URL?.replace(/\/$/, '') || 'http://localhost:7012';

    console.log('🧪 Running IAP Verification Test...\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   IAP VERIFICATION TEST');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 Test Configuration:');
    console.log('   API URL:', API_BASE_URL);
    console.log('   Endpoint: POST /user/verifyIAPSubscription');
    console.log('   Platform: Android');
    console.log('   Plan ID:', testPayload.plan_id);
    console.log('   Product ID:', testPayload.product_id);
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
        
        console.log('📄 Full Response:');
        console.log(JSON.stringify(response.data, null, 2));
        
      } else {
        console.log('⚠️  Unexpected response code:', response.data.code);
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('   TEST COMPLETE - SUCCESS');
      console.log('═══════════════════════════════════════════════════════════\n');

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('❌ ERROR: Request Failed\n');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('Response Time:', duration + 'ms');
      
      if (error.response) {
        console.log('Status Code:', error.response.status);
        console.log('Error Response:');
        console.log(JSON.stringify(error.response.data, null, 2));
        console.log('');
        
        const errorData = error.response.data;
        
        if (error.response.status === 401) {
          console.log('💡 TIP: Invalid or expired JWT token\n');
        } else if (error.response.status === 400) {
          if (errorData.message?.includes('Plan not found')) {
            console.log('💡 TIP: Plan with ID "plan-1af67e74ed" not found in database\n');
          } else if (errorData.message?.includes('Already have an active')) {
            console.log('💡 TIP: User already has an active subscription\n');
          } else if (errorData.message?.includes('Invalid Google Play receipt')) {
            console.log('💡 TIP: Purchase token verification failed');
            console.log('   Possible causes:');
            console.log('   - Token expired or invalid');
            console.log('   - Service account not granted access in Play Console');
            console.log('   - Google Play Developer API not enabled');
            console.log('   - Package name mismatch\n');
          }
        }
      } else if (error.request) {
        console.log('No response received from server');
        console.log('Error:', error.message);
        console.log('\n💡 TIP: Check if API server is running on', API_BASE_URL);
      } else {
        console.log('Error:', error.message);
      }
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('   TEST COMPLETE - FAILED');
      console.log('═══════════════════════════════════════════════════════════\n');
      
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

getTokenAndTest();
