/**
 * Script to login as a specific user and get the token
 * This helps test the frontend with a specific user account
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const utils = require('../src/utils/utils');
const axios = require('axios');

const USER_EMAIL = process.argv[2] || 'ghufranjaleel@yopmail.com';
const USER_PASSWORD = process.argv[3] || 'Ghufran@123456';

async function loginAsUser() {
  try {
    console.log('🔐 Logging in as user...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: USER_EMAIL }).select('+password');
    
    if (!user) {
      console.error('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   ID:', user._id.toString());
    console.log('   Email:', user.email);
    console.log('   Full Name:', user.full_name);
    console.log('   User Type:', user.user_type);
    console.log('');

    // Verify or set password
    if (!user.password || !user.decoded_password) {
      console.log('🔑 Setting password...');
      const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
      user.password = hashedPassword;
      user.decoded_password = USER_PASSWORD;
      await user.save();
      console.log('✅ Password set\n');
    } else {
      const isMatch = await bcrypt.compare(USER_PASSWORD, user.password);
      if (!isMatch) {
        console.log('🔑 Updating password...');
        const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
        user.password = hashedPassword;
        user.decoded_password = USER_PASSWORD;
        await user.save();
        console.log('✅ Password updated\n');
      } else {
        console.log('✅ Password verified\n');
      }
    }

    // Test login via API
    console.log('🔐 Testing login via API...');
    const apiUrl = process.env.API_URL || 'http://localhost:7012';
    
    try {
      const loginResponse = await axios.post(`${apiUrl}/user/login`, {
        user_credentials: USER_EMAIL,
        password: USER_PASSWORD
      });

      if (loginResponse.data && loginResponse.data.data && loginResponse.data.data.token) {
        console.log('✅ Login successful via API!');
        console.log('\n📋 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📧 Email: ${USER_EMAIL}`);
        console.log(`🔑 Password: ${USER_PASSWORD}`);
        console.log(`🆔 User ID: ${user._id.toString()}`);
        console.log(`👥 User Type: ${user.user_type.join(', ')}`);
        console.log(`💼 Current User Type: ${user.current_user_type || user.user_type[0]}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n✨ You can now login to the frontend with these credentials!');
        console.log(`   Frontend URL: http://localhost:3000/sign-in`);
      } else {
        console.error('❌ Login failed - no token received');
      }
    } catch (error) {
      console.error('❌ API login error:', error.response?.data || error.message);
      console.log('\n📋 Manual Login Credentials:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 Email: ${USER_EMAIL}`);
      console.log(`🔑 Password: ${USER_PASSWORD}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

loginAsUser();











