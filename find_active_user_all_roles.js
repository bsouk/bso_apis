/**
 * Find Active User with All Roles
 * Searches for active (not deleted) users with multiple roles
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const bcrypt = require('bcrypt');

async function findActiveUserWithAllRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find active users (not deleted)
    console.log('🔍 Searching for active users with all roles...\n');

    const users = await User.find({
      is_deleted: { $ne: true },
      deleted_at: { $exists: false }
    }).limit(100);
    
    console.log(`📋 Found ${users.length} active users. Checking roles...\n`);

    const allRoleUsers = [];

    users.forEach(user => {
      if (user.user_type && Array.isArray(user.user_type)) {
        const roleCount = user.user_type.length;
        const roles = user.user_type;
        
        // Check if user has multiple roles (3+)
        if (roleCount >= 3) {
          allRoleUsers.push({
            _id: user._id,
            email: user.email,
            full_name: user.full_name,
            user_type: user.user_type,
            role_count: roleCount,
            phone_number: user.phone_number,
            has_password: !!user.password,
            is_deleted: user.is_deleted,
            deleted_at: user.deleted_at
          });
        }
      }
    });

    // Sort by role count (most roles first)
    allRoleUsers.sort((a, b) => b.role_count - a.role_count);

    if (allRoleUsers.length > 0) {
      console.log(`✅ Found ${allRoleUsers.length} active users with 3+ roles:\n`);
      
      allRoleUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name || 'No Name'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Phone: ${user.phone_number || 'N/A'}`);
        console.log(`   Roles (${user.role_count}): ${user.user_type.join(', ')}`);
        console.log(`   User ID: ${user._id}`);
        console.log(`   Has Password: ${user.has_password ? '✅ Yes' : '❌ No'}`);
        console.log(`   Status: ${user.is_deleted ? '❌ Deleted' : '✅ Active'}`);
        console.log('');
      });

      // Get the best user (most roles, active)
      const bestUser = allRoleUsers.find(u => !u.is_deleted) || allRoleUsers[0];
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('   RECOMMENDED USER');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('📧 Email:', bestUser.email);
      console.log('👤 Name:', bestUser.full_name || 'No Name');
      console.log('📱 Phone:', bestUser.phone_number || 'N/A');
      console.log('🆔 User ID:', bestUser._id);
      console.log('👥 Roles:', bestUser.user_type.join(', '));
      console.log('🔢 Role Count:', bestUser.role_count);
      console.log('');

      // Get full user details
      const fullUser = await User.findById(bestUser._id).select('+password +decoded_password');
      
      let password = null;
      if (fullUser.decoded_password) {
        password = fullUser.decoded_password;
      } else if (fullUser.password) {
        password = 'Password is set (but not readable)';
      }

      console.log('🔑 Password Status:');
      if (password && password !== 'Password is set (but not readable)') {
        console.log('   Password:', password);
      } else if (fullUser.password) {
        console.log('   Password: Set (use script to set readable password)');
      } else {
        console.log('   Password: Not set');
      }

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('   LOGIN CREDENTIALS');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('📧 Email/Phone:', bestUser.email);
      
      if (password && password !== 'Password is set (but not readable)') {
        console.log('🔑 Password:', password);
      } else {
        console.log('🔑 Password: Not set or not readable');
        console.log('');
        console.log('💡 To set password, run:');
        console.log(`   node scripts/loginAsUser.js ${bestUser.email} YOUR_PASSWORD`);
      }
      console.log('');
      console.log('🌐 Frontend Login URL:');
      console.log('   http://localhost:3000/sign-in');
      console.log('');

      // Try to set a simple password if not set
      if (!fullUser.password) {
        const newPassword = 'Test@123456';
        console.log('💡 Setting password to:', newPassword);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        fullUser.password = hashedPassword;
        fullUser.decoded_password = newPassword;
        await fullUser.save();
        console.log('✅ Password set successfully!');
        console.log('');
        console.log('📋 Updated Credentials:');
        console.log('   Email:', bestUser.email);
        console.log('   Password:', newPassword);
        console.log('');
      }

    } else {
      console.log('⚠️  No active users found with 3+ roles');
      console.log('\n💡 Checking ghufranjaleel@yopmail.com...\n');
      
      const ghufranUser = await User.findOne({ email: 'ghufranjaleel@yopmail.com' });
      if (ghufranUser) {
        console.log('✅ Found ghufranjaleel@yopmail.com:');
        console.log('   Roles:', ghufranUser.user_type?.join(', ') || 'N/A');
        console.log('   Status:', ghufranUser.is_deleted ? 'Deleted' : 'Active');
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await mongoose.connection.close();
  }
}

findActiveUserWithAllRoles();
