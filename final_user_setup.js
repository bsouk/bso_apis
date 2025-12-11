/**
 * Final User Setup - Properly configure user for login
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const bcrypt = require('bcrypt');

const USER_EMAIL = 'ghufranjaleel@yopmail.com';
const USER_PASSWORD = 'Ghufran@123456';

async function finalSetup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    let user = await User.findOne({ email: USER_EMAIL }).select('+password');
    
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   Email:', user.email);
    console.log('   Name:', user.full_name);
    console.log('   Roles:', user.user_type?.join(', '));
    console.log('');

    // Hash and set password
    console.log('🔑 Setting password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(USER_PASSWORD, saltRounds);
    
    // Update user directly
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          decoded_password: USER_PASSWORD,
          status: 'active',
          is_deleted: false
        }
      }
    );

    console.log('✅ Password updated in database');
    console.log('');

    // Reload user to verify
    const updatedUser = await User.findOne({ email: USER_EMAIL }).select('+password');
    
    // Test password
    const isMatch = await bcrypt.compare(USER_PASSWORD, updatedUser.password);
    console.log('🔍 Password verification:', isMatch ? '✅ SUCCESS' : '❌ FAILED');
    console.log('');

    // Test with comparePassword method
    console.log('🔍 Testing with User.comparePassword method...');
    updatedUser.comparePassword(USER_PASSWORD, (err, match) => {
      if (err) {
        console.log('❌ Error:', err.message);
      } else {
        console.log('comparePassword result:', match ? '✅ SUCCESS' : '❌ FAILED');
      }
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('   ✅ USER SETUP COMPLETE');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('📧 Email:', USER_EMAIL);
      console.log('🔑 Password:', USER_PASSWORD);
      console.log('');
      console.log('👥 Roles (6):');
      updatedUser.user_type.forEach(role => {
        console.log('   ✅', role);
      });
      console.log('');
      console.log('🌐 Frontend Login:');
      console.log('   URL: http://localhost:3000/sign-in');
      console.log('   Email:', USER_EMAIL);
      console.log('   Password:', USER_PASSWORD);
      console.log('');
      console.log('💡 You can now login to the frontend!');
      console.log('');
      
      mongoose.connection.close();
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

finalSetup();
