/**
 * Find User with All Roles
 * Searches for users with multiple roles (buyer, supplier, logistics, recruiter, resource)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const bcrypt = require('bcrypt');

async function findUserWithAllRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find users with multiple roles
    console.log('🔍 Searching for users with all roles...\n');

    // Find users with at least 4+ roles
    const users = await User.find({}).limit(50);
    
    console.log(`📋 Found ${users.length} users. Checking roles...\n`);

    const allRoleUsers = [];
    const roleCounts = {
      'buyer': 0,
      'supplier': 0,
      'logistics': 0,
      'recruiter': 0,
      'resource': 0,
      'company': 0
    };

    users.forEach(user => {
      if (user.user_type && Array.isArray(user.user_type)) {
        const roleCount = user.user_type.length;
        const roles = user.user_type;
        
        // Count roles
        roles.forEach(role => {
          if (roleCounts.hasOwnProperty(role)) {
            roleCounts[role]++;
          }
        });

        // Check if user has multiple roles
        if (roleCount >= 4) {
          allRoleUsers.push({
            _id: user._id,
            email: user.email,
            full_name: user.full_name,
            user_type: user.user_type,
            role_count: roleCount,
            phone_number: user.phone_number,
            has_password: !!user.password
          });
        }
      }
    });

    // Sort by role count (most roles first)
    allRoleUsers.sort((a, b) => b.role_count - a.role_count);

    console.log('📊 Role Distribution:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} users`);
    });
    console.log('');

    if (allRoleUsers.length > 0) {
      console.log(`✅ Found ${allRoleUsers.length} users with 4+ roles:\n`);
      
      allRoleUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name || 'No Name'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Phone: ${user.phone_number || 'N/A'}`);
        console.log(`   Roles (${user.role_count}): ${user.user_type.join(', ')}`);
        console.log(`   User ID: ${user._id}`);
        console.log(`   Has Password: ${user.has_password ? '✅ Yes' : '❌ No'}`);
        console.log('');
      });

      // Get the user with most roles
      const bestUser = allRoleUsers[0];
      console.log('═══════════════════════════════════════════════════════════');
      console.log('   RECOMMENDED USER (Most Roles)');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('📧 Email:', bestUser.email);
      console.log('👤 Name:', bestUser.full_name || 'No Name');
      console.log('📱 Phone:', bestUser.phone_number || 'N/A');
      console.log('🆔 User ID:', bestUser._id);
      console.log('👥 Roles:', bestUser.user_type.join(', '));
      console.log('🔢 Role Count:', bestUser.role_count);
      console.log('');

      // Check if password exists
      const fullUser = await User.findById(bestUser._id).select('+password +decoded_password');
      
      if (fullUser.password || fullUser.decoded_password) {
        const password = fullUser.decoded_password || 'Password is hashed (not readable)';
        console.log('🔑 Password Status:');
        if (fullUser.decoded_password) {
          console.log('   Password:', fullUser.decoded_password);
        } else {
          console.log('   Password: Set (but not in decoded_password field)');
          console.log('   💡 You can set a password using the login script');
        }
      } else {
        console.log('🔑 Password: Not set');
        console.log('   💡 You can set a password using the login script');
      }

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('   LOGIN CREDENTIALS');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('📧 Email/Phone:', bestUser.email);
      if (fullUser.decoded_password) {
        console.log('🔑 Password:', fullUser.decoded_password);
      } else {
        console.log('🔑 Password: Not set - use script to set password');
      }
      console.log('');
      console.log('💡 To set password, run:');
      console.log(`   node scripts/loginAsUser.js ${bestUser.email} YOUR_PASSWORD`);
      console.log('');

    } else {
      console.log('⚠️  No users found with 4+ roles');
      console.log('\n💡 Searching for users with 3+ roles...\n');
      
      // Find users with 3+ roles
      const threeRoleUsers = users.filter(user => 
        user.user_type && Array.isArray(user.user_type) && user.user_type.length >= 3
      );

      if (threeRoleUsers.length > 0) {
        console.log(`✅ Found ${threeRoleUsers.length} users with 3+ roles:\n`);
        threeRoleUsers.slice(0, 5).forEach((user, index) => {
          console.log(`${index + 1}. ${user.full_name || 'No Name'}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Roles: ${user.user_type.join(', ')}`);
          console.log('');
        });
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

findUserWithAllRoles();
