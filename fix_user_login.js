/**
 * Fix User Login - Properly set password and verify
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const bcrypt = require('bcrypt');

const USER_EMAIL = 'ghufranjaleel@yopmail.com';
const USER_PASSWORD = 'Ghufran@123456';

async function fixLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find user with password field
    const user = await User.findOne({ email: USER_EMAIL }).select('+password +decoded_password');
    
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   Email:', user.email);
    console.log('   Name:', user.full_name);
    console.log('   Roles:', user.user_type?.join(', '));
    console.log('   Status:', user.status);
    console.log('   Is Deleted:', user.is_deleted);
    console.log('   Member Status:', user.member_status);
    console.log('');

    // Check current password
    if (user.password) {
      const currentMatch = await bcrypt.compare(USER_PASSWORD, user.password);
      console.log('Current password match:', currentMatch ? '✅ Yes' : '❌ No');
    } else {
      console.log('Current password: Not set');
    }
    console.log('');

    // Set password properly
    console.log('🔑 Setting password...');
    const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
    user.password = hashedPassword;
    user.decoded_password = USER_PASSWORD;
    
    // Ensure user is active
    user.status = 'active';
    user.is_deleted = false;
    user.member_status = 'active';
    
    await user.save();

    console.log('✅ Password set and user activated');
    console.log('');

    // Verify password
    const savedUser = await User.findOne({ email: USER_EMAIL }).select('+password');
    const isMatch = await bcrypt.compare(USER_PASSWORD, savedUser.password);
    
    console.log('🔍 Verification:');
    console.log('   Password match:', isMatch ? '✅ Yes' : '❌ No');
    console.log('   User status:', savedUser.status);
    console.log('   Is deleted:', savedUser.is_deleted);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('   LOGIN CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📧 Email:', USER_EMAIL);
    console.log('🔑 Password:', USER_PASSWORD);
    console.log('');
    console.log('🌐 Frontend Login:');
    console.log('   URL: http://localhost:3000/sign-in');
    console.log('   Email:', USER_EMAIL);
    console.log('   Password:', USER_PASSWORD);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await mongoose.connection.close();
  }
}

fixLogin();
