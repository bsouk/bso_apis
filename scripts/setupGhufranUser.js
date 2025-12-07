/**
 * Script to setup Ghufran user for login
 * Ensures company type is treated as buyer
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');
const bcrypt = require('bcrypt');

const USER_EMAIL = 'ghufranjaleel@yopmail.com';
const USER_PASSWORD = 'Ghufran@123456';

async function setupUser() {
  try {
    console.log('🔧 Setting up Ghufran user...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    const user = await User.findOne({ email: USER_EMAIL }).select('+password +decoded_password');
    
    if (!user) {
      console.error('❌ User not found!');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   ID:', user._id.toString());
    console.log('   Email:', user.email);
    console.log('   Full Name:', user.full_name);
    console.log('   Current User Type:', user.user_type);
    console.log('   Current User Type (single):', user.current_user_type);
    console.log('');

    // Ensure user_type includes 'buyer' if it has 'company'
    let userTypeUpdated = false;
    if (user.user_type.includes('company') && !user.user_type.includes('buyer')) {
      user.user_type.push('buyer');
      userTypeUpdated = true;
      console.log('✅ Added "buyer" to user_type');
    }

    // Set current_user_type to 'buyer' if it's 'company' or not set, or if user wants to login as buyer
    if (!user.current_user_type || user.current_user_type === 'company' || user.current_user_type === 'logistics') {
      user.current_user_type = 'buyer';
      console.log('✅ Set current_user_type to "buyer"');
    }

    // Set password
    const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
    user.password = hashedPassword;
    user.decoded_password = USER_PASSWORD;
    user.status = 'active';
    // Don't set member_status if it's not a valid enum value

    await user.save();
    console.log('✅ User updated successfully\n');

    console.log('📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${USER_EMAIL}`);
    console.log(`🔑 Password: ${USER_PASSWORD}`);
    console.log(`🆔 User ID: ${user._id.toString()}`);
    console.log(`👥 User Type: ${user.user_type.join(', ')}`);
    console.log(`💼 Current User Type: ${user.current_user_type}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ User is ready to login!');
    console.log(`   Frontend URL: http://localhost:3000/sign-in`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

setupUser();

