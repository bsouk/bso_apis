/**
 * Script to verify test user exists and can login
 * This helps debug authentication issues
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const utils = require('../src/utils/utils');

const TEST_USER_EMAIL = 'testuser@bso.com';
const TEST_USER_PASSWORD = 'Test@123456';

async function verifyTestUser() {
  try {
    console.log('🔍 Verifying test user...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find test user
    const user = await User.findOne({ email: TEST_USER_EMAIL }).select('+password');
    
    if (!user) {
      console.error('❌ Test user not found!');
      console.log('Please run: node scripts/createTestUserWithAllRoles.js');
      process.exit(1);
    }

    console.log('✅ Test user found:');
    console.log('   ID:', user._id.toString());
    console.log('   Email:', user.email);
    console.log('   Full Name:', user.full_name);
    console.log('   User Type:', user.user_type);
    console.log('   Status:', user.status);
    console.log('   Member Status:', user.member_status);
    console.log('   Is Deleted:', user.is_deleted);
    console.log('   Profile Completed:', user.profile_completed);
    console.log('');

    // Verify password
    const isPasswordMatch = await bcrypt.compare(TEST_USER_PASSWORD, user.password);
    if (!isPasswordMatch) {
      console.error('❌ Password mismatch!');
      console.log('   Expected password:', TEST_USER_PASSWORD);
      console.log('   Updating password...');
      
      const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
      user.password = hashedPassword;
      user.decoded_password = TEST_USER_PASSWORD;
      await user.save();
      console.log('✅ Password updated successfully');
    } else {
      console.log('✅ Password verified');
    }

    // Generate a test token
    console.log('\n🔑 Generating test token...');
    const tokenPayload = {
      data: {
        _id: user._id.toString(),
        type: "user",
      }
    };
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);
    const encryptedToken = utils.encrypt(token);
    
    console.log('✅ Token generated');
    console.log('   Token (encrypted):', encryptedToken.substring(0, 50) + '...');
    console.log('');

    // Test user lookup with the ID from token
    console.log('🔍 Testing user lookup with token ID...');
    const testUserId = new mongoose.Types.ObjectId(user._id.toString());
    const foundUser = await User.findById(testUserId);
    
    if (foundUser) {
      console.log('✅ User lookup successful');
      console.log('   Found user:', foundUser.email);
    } else {
      console.error('❌ User lookup failed!');
    }

    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${TEST_USER_EMAIL}`);
    console.log(`🔑 Password: ${TEST_USER_PASSWORD}`);
    console.log(`🆔 User ID: ${user._id.toString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ Please login to the frontend with these credentials');
    console.log('   Then check the API server logs to see authentication debug messages\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

verifyTestUser();





