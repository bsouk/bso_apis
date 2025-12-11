/**
 * Setup User for Login - Uses User model's comparePassword method
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const bcrypt = require('bcrypt');

const USER_EMAIL = 'ghufranjaleel@yopmail.com';
const USER_PASSWORD = 'Ghufran@123456';

async function setupUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: USER_EMAIL }).select('+password');
    
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
    console.log('');

    // Set password using bcrypt
    console.log('🔑 Setting password...');
    const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
    user.password = hashedPassword;
    user.decoded_password = USER_PASSWORD;
    
    // Don't change member_status (keep existing value)
    // Just ensure user is active
    if (user.status !== 'active') {
      user.status = 'active';
    }
    
    if (user.is_deleted === true) {
      user.is_deleted = false;
      user.deleted_at = null;
    }
    
    await user.save();

    console.log('✅ Password set successfully');
    console.log('');

    // Test password using User model's comparePassword
    console.log('🔍 Testing password with User.comparePassword...');
    user.comparePassword(USER_PASSWORD, async (err, isMatch) => {
      if (err) {
        console.log('❌ Error:', err.message);
      } else {
        console.log('Password match:', isMatch ? '✅ Yes' : '❌ No');
      }
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('   LOGIN CREDENTIALS');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('📧 Email:', USER_EMAIL);
      console.log('🔑 Password:', USER_PASSWORD);
      console.log('');
      console.log('👥 Roles:', user.user_type?.join(', '));
      console.log('');
      console.log('🌐 Frontend Login:');
      console.log('   URL: http://localhost:3000/sign-in');
      console.log('   Email:', USER_EMAIL);
      console.log('   Password:', USER_PASSWORD);
      console.log('');
      
      await mongoose.connection.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    await mongoose.connection.close();
    process.exit(1);
  }
}

setupUser();
