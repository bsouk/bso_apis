/**
 * Setup User Password Properly
 * Sets password and ensures it works with login
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const bcrypt = require('bcrypt');

const USER_EMAIL = process.argv[2] || 'ghufranjaleel@yopmail.com';
const USER_PASSWORD = process.argv[3] || 'Ghufran@123456';

async function setupPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: USER_EMAIL }).select('+password +decoded_password');
    
    if (!user) {
      console.error('❌ User not found:', USER_EMAIL);
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   Email:', user.email);
    console.log('   Name:', user.full_name);
    console.log('   Roles:', user.user_type?.join(', '));
    console.log('');

    // Hash password
    console.log('🔑 Setting password...');
    const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
    
    // Update user
    user.password = hashedPassword;
    user.decoded_password = USER_PASSWORD;
    await user.save();

    console.log('✅ Password set successfully!');
    console.log('');

    // Verify password
    const isMatch = await bcrypt.compare(USER_PASSWORD, user.password);
    if (isMatch) {
      console.log('✅ Password verification: SUCCESS');
    } else {
      console.log('❌ Password verification: FAILED');
    }

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

setupPassword();
