/**
 * Script to create or update a test user with all roles and subscriptions
 * This user can be used to test all features on the frontend
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');
const Subscription = require('../src/models/subscription');
const Plan = require('../src/models/plan');
const { generateUniqueUserId } = require('../src/utils/userIdGenerator');
const bcrypt = require('bcrypt');

const TEST_USER_EMAIL = 'testuser@bso.com';
const TEST_USER_PASSWORD = 'Test@123456';

async function connectDB() {
  try {
    await mongoose.connect(process.env.DB_URL || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function findOrCreatePlans() {
  console.log('\n📋 Finding or creating subscription plans...');
  
  const planTypes = ['buyer', 'supplier', 'logistics', 'recruiter'];
  const plans = {};
  
  for (const type of planTypes) {
    let plan = await Plan.findOne({ 
      type: type,
      status: 'active'
    }).sort({ createdAt: -1 });
    
    if (!plan) {
      // Create a basic plan if none exists
      plan = await Plan.create({
        plan_name: `${type.charAt(0).toUpperCase() + type.slice(1)} Plan`,
        type: type,
        price: 0, // Free for testing
        currency: 'USD',
        duration: 365, // 1 year
        status: 'active',
        features: [],
        is_active: true
      });
      console.log(`✅ Created ${type} plan: ${plan._id}`);
    } else {
      console.log(`✅ Found ${type} plan: ${plan._id}`);
    }
    
    plans[type] = plan;
  }
  
  return plans;
}

async function createOrUpdateTestUser() {
  console.log('\n👤 Creating/Updating test user...');
  
  // Check if user already exists
  let user = await User.findOne({ email: TEST_USER_EMAIL });
  
  const userData = {
    email: TEST_USER_EMAIL,
    full_name: 'Test User All Roles',
    first_name: 'Test',
    last_name: 'User',
    phone_number: '1234567890',
    phone_number_code: '+1',
    signup_by: 'email',
    user_type: ['buyer', 'supplier', 'logistics', 'recruiter'],
    current_user_type: 'buyer',
    buyer_type: 'direct-buyer',
    status: 'active',
    supplier_status: 'active',
    logistics_status: 'active',
    recruiter_status: 'active',
    is_user_approved_by_admin: true,
    is_company_approved: true,
    profile_completed: true,
    // Add basic company data
    company_data: {
      name: 'Test Company Ltd',
      registration_number: 'TEST123456',
      vat_number: 'VAT123456',
      incorporation_date: new Date(),
      phone_number: '1234567890',
      phone_number_code: '+1',
      email: TEST_USER_EMAIL,
      address: {
        line1: '123 Test Street',
        line2: 'Suite 100',
        city: 'Test City',
        state: 'Test State',
        zip_code: '12345',
        country: 'United States'
      }
    },
    // Add bank details for supplier
    bank_details: {
      account_holder_name: 'Test User',
      account_number: '1234567890',
      bank_name: 'Test Bank',
      swift_code: 'TESTUS33',
      iban_number: 'US1234567890',
      address: {
        line1: '123 Bank Street',
        city: 'Test City',
        state: 'Test State',
        zip_code: '12345',
        country: 'United States'
      }
    }
  };
  
  if (user) {
    // Update existing user
    console.log('📝 Updating existing user...');
    
    // Hash password if provided
    if (TEST_USER_PASSWORD) {
      const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
      userData.password = hashedPassword;
      userData.decoded_password = TEST_USER_PASSWORD;
    }
    
    // Update user with all roles
    user = await User.findByIdAndUpdate(
      user._id,
      { 
        ...userData,
        unique_user_id: user.unique_user_id || await generateUniqueUserId('Test', 'User', TEST_USER_EMAIL, '1234567890')
      },
      { new: true, runValidators: true }
    );
    console.log('✅ User updated successfully');
  } else {
    // Create new user
    console.log('➕ Creating new user...');
    
    // Generate unique user ID
    userData.unique_user_id = await generateUniqueUserId('Test', 'User', TEST_USER_EMAIL, '1234567890');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    userData.password = hashedPassword;
    userData.decoded_password = TEST_USER_PASSWORD;
    
    user = await User.create(userData);
    console.log('✅ User created successfully');
  }
  
  console.log(`\n📧 Email: ${user.email}`);
  console.log(`🔑 Password: ${TEST_USER_PASSWORD}`);
  console.log(`🆔 User ID: ${user._id}`);
  console.log(`👥 Roles: ${user.user_type.join(', ')}`);
  
  return user;
}

async function createSubscriptions(user, plans) {
  console.log('\n💳 Creating subscriptions...');
  
  const subscriptionTypes = ['buyer', 'supplier', 'logistics', 'recruiter'];
  const subscriptions = {};
  
  for (const type of subscriptionTypes) {
    // Check if subscription already exists
    let subscription = await Subscription.findOne({
      user_id: user._id,
      type: type,
      status: 'active'
    });
    
    if (!subscription && plans[type]) {
      // Create new subscription
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from now
      
      subscription = await Subscription.create({
        user_id: user._id,
        subscription_id: `SUB_${type}_${Date.now()}`,
        plan_id: plans[type]._id.toString(),
        type: type,
        buyer_type: type === 'buyer' ? 'direct-buyer' : null,
        status: 'active',
        subscription_type: 'paid',
        isPurchased: true,
        source: 'admin',
        payment_mode: 'admin_manual',
        start_at: new Date(),
        end_at: endDate,
        is_active: true
      });
      
      console.log(`✅ Created ${type} subscription: ${subscription._id}`);
    } else if (subscription) {
      // Update existing subscription to active
      subscription = await Subscription.findByIdAndUpdate(
        subscription._id,
        {
          status: 'active',
          is_active: true,
          end_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        },
        { new: true }
      );
      console.log(`✅ Updated ${type} subscription: ${subscription._id}`);
    }
    
    subscriptions[type] = subscription;
  }
  
  return subscriptions;
}

async function main() {
  try {
    console.log('🚀 Starting test user creation script...\n');
    
    await connectDB();
    
    // Find or create plans
    const plans = await findOrCreatePlans();
    
    // Create or update user
    const user = await createOrUpdateTestUser();
    
    // Create subscriptions
    const subscriptions = await createSubscriptions(user, plans);
    
    console.log('\n✅ Script completed successfully!');
    console.log('\n📋 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Login Email: ${TEST_USER_EMAIL}`);
    console.log(`🔑 Login Password: ${TEST_USER_PASSWORD}`);
    console.log(`🆔 User ID: ${user._id}`);
    console.log(`👥 User Roles: ${user.user_type.join(', ')}`);
    console.log(`💳 Active Subscriptions: ${Object.keys(subscriptions).filter(k => subscriptions[k]).length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ You can now login to the frontend with these credentials!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the script
main();

