/**
 * Utility to generate missing unique_user_id for existing users
 */

const User = require("../models/user");

/**
 * Sanitize text for user ID generation
 */
function sanitizeText(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate unique suffix (6 characters)
 */
function generateUniqueSuffix() {
  const timestamp = Date.now().toString(36).slice(-3);
  const random = Math.random().toString(36).slice(2, 5);
  return timestamp + random;
}

/**
 * Generate unique user ID
 */
async function generateUniqueUserId(firstName, lastName, email, phoneNumber) {
  let identifier = '';
  
  if (firstName && lastName) {
    identifier = `${sanitizeText(firstName)}-${sanitizeText(lastName)}`;
  } else if (firstName) {
    identifier = sanitizeText(firstName);
  } else if (lastName) {
    identifier = sanitizeText(lastName);
  } else if (email) {
    const emailPrefix = email.split('@')[0];
    identifier = sanitizeText(emailPrefix);
  } else if (phoneNumber) {
    const phoneDigits = phoneNumber.replace(/\D/g, '').slice(-10);
    identifier = phoneDigits;
  } else {
    identifier = 'user';
  }
  
  if (identifier.length > 30) {
    identifier = identifier.substring(0, 30);
  }
  
  let userId = '';
  let suffix = generateUniqueSuffix();
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    userId = `bso-${identifier}-${suffix}`;
    attempts++;
    
    const existingUser = await User.findOne({ unique_user_id: userId });
    if (!existingUser) {
      break;
  }
    
    suffix = generateUniqueSuffix();
  } while (attempts < maxAttempts);
  
  if (attempts >= maxAttempts) {
    userId = `bso-${identifier}-${Date.now()}`;
  }
  
  return userId;
}

/**
 * Generate missing user IDs for existing users
 */
async function generateMissingUserIds() {
  try {
    console.log('🔍 Checking for users without unique_user_id...');
    
    const usersWithoutId = await User.find({
      $or: [
        { unique_user_id: { $exists: false } },
        { unique_user_id: null },
        { unique_user_id: '' }
      ]
    });
    
    if (usersWithoutId.length === 0) {
      console.log('✅ All users have unique_user_id');
      return { updated: 0, total: 0 };
    }
    
    console.log(`📝 Found ${usersWithoutId.length} users without unique_user_id`);
    
    let updated = 0;
    
    for (const user of usersWithoutId) {
      try {
        const userId = await generateUniqueUserId(
          user.first_name,
          user.last_name,
          user.email,
          user.phone_number
        );
        
        user.unique_user_id = userId;
        await user.save();
        updated++;
        
        console.log(`✅ Updated user ${user.email || user._id}: ${userId}`);
      } catch (error) {
        console.error(`❌ Error updating user ${user.email || user._id}:`, error.message);
      }
    }
    
    console.log(`🎉 Successfully updated ${updated}/${usersWithoutId.length} users`);
    return { updated, total: usersWithoutId.length };
    
  } catch (error) {
    console.error('❌ Error in generateMissingUserIds:', error);
    throw error;
  }
}

/**
 * Validate all user IDs
 */
async function validateAllUserIds() {
  try {
    const totalUsers = await User.countDocuments();
    const usersWithId = await User.countDocuments({
      unique_user_id: { $exists: true, $ne: null, $ne: '' }
    });
    const usersWithoutId = totalUsers - usersWithId;
    
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users with ID: ${usersWithId}`);
    console.log(`Users without ID: ${usersWithoutId}`);
    
    return { totalUsers, usersWithId, usersWithoutId };
  } catch (error) {
    console.error('❌ Error in validateAllUserIds:', error);
    throw error;
  }
}

module.exports = {
  generateMissingUserIds,
  generateUniqueUserId,
  validateAllUserIds,
  sanitizeText,
  generateUniqueSuffix
};
