/**
 * Utility to generate missing user IDs for existing users
 * This function runs on server startup to ensure all users have unique_user_id
 */

const User = require('../models/user');

/**
 * Sanitizes text by removing special characters and converting to lowercase
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .substring(0, 15); // Limit length
}

/**
 * Generates a unique suffix for user IDs
 * @returns {string} - 6-character unique suffix
 */
function generateUniqueSuffix() {
  const timestamp = Date.now().toString(36).slice(-3); // 3 chars from timestamp
  const random = Math.random().toString(36).slice(2, 5); // 3 random chars
  return timestamp + random; // 6 chars total
}

/**
 * Checks if a user ID already exists in the database
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} - True if exists, false otherwise
 */
async function checkIfUserIdExists(userId) {
  const existingUser = await User.findOne({ unique_user_id: userId });
  return !!existingUser;
}

/**
 * Generates a unique user ID with pattern: bso-{identifier}-{unique-suffix}
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @param {string} email - User's email
 * @param {string} phone - User's phone number
 * @returns {Promise<string>} - Generated unique user ID
 */
async function generateUniqueUserId(firstName, lastName, email, phone) {
  let identifier = '';
  
  // Determine identifier based on priority: name > email > phone
  if (firstName && lastName) {
    const sanitizedFirst = sanitizeText(firstName);
    const sanitizedLast = sanitizeText(lastName);
    identifier = `${sanitizedFirst}-${sanitizedLast}`;
  } else if (firstName) {
    identifier = sanitizeText(firstName);
  } else if (lastName) {
    identifier = sanitizeText(lastName);
  } else if (email) {
    const emailPrefix = email.split('@')[0];
    identifier = sanitizeText(emailPrefix);
  } else if (phone) {
    // Extract last 10 digits from phone number
    const phoneDigits = phone.replace(/\D/g, '').slice(-10);
    identifier = phoneDigits;
  } else {
    identifier = 'user'; // fallback
  }
  
  // Truncate if too long (keep it under 30 chars for readability)
  if (identifier.length > 30) {
    identifier = identifier.substring(0, 30);
  }
  
  // Generate unique suffix and create user ID
  let uniqueSuffix = generateUniqueSuffix();
  let userId = `bso-${identifier}-${uniqueSuffix}`;
  
  // Check uniqueness in database and regenerate if needed
  let attempts = 0;
  const maxAttempts = 10; // Prevent infinite loop
  
  while (await checkIfUserIdExists(userId) && attempts < maxAttempts) {
    uniqueSuffix = generateUniqueSuffix();
    userId = `bso-${identifier}-${uniqueSuffix}`;
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    // If still not unique, add timestamp to ensure uniqueness
    const timestamp = Date.now().toString(36);
    userId = `bso-${identifier}-${timestamp}`;
  }
  
  return userId;
}

/**
 * Main function to generate missing user IDs for all users
 * This function should be called on server startup
 * @returns {Promise<Object>} - Summary of the operation
 */
async function generateMissingUserIds() {
  try {
    console.log('🔍 Starting user ID generation for users with missing IDs...');
    
    // Find all users without unique_user_id, with empty/null unique_user_id, or with 'NaN'
    const usersWithoutId = await User.find({
      $or: [
        { unique_user_id: { $exists: false } },
        { unique_user_id: null },
        { unique_user_id: '' },
        { unique_user_id: { $regex: /^\s*$/ } }, // Empty or whitespace only
        { unique_user_id: 'NaN' }, // Fix NaN values
        { unique_user_id: /^NaN$/i } // Case insensitive NaN
      ]
    }).select('_id first_name last_name email phone_number unique_user_id createdAt');
    
    console.log(`📊 Found ${usersWithoutId.length} users without unique_user_id`);
    
    if (usersWithoutId.length === 0) {
      console.log('✅ All users already have unique_user_id. No action needed.');
      return {
        success: true,
        message: 'All users already have unique_user_id',
        processed: 0,
        errors: 0
      };
    }
    
    let processed = 0;
    let errors = 0;
    const errorsList = [];
    
    // Process each user
    for (const user of usersWithoutId) {
      try {
        console.log(`🔄 Processing user: ${user.first_name} ${user.last_name} (${user.email || 'no email'})`);
        
        // Generate unique user ID
        const uniqueUserId = await generateUniqueUserId(
          user.first_name,
          user.last_name,
          user.email,
          user.phone_number
        );
        
        // Update user with new ID
        await User.findByIdAndUpdate(user._id, {
          unique_user_id: uniqueUserId
        });
        
        console.log(`✅ Generated ID: ${uniqueUserId} for user: ${user.first_name} ${user.last_name}`);
        processed++;
        
      } catch (error) {
        console.error(`❌ Error processing user ${user._id}:`, error.message);
        errors++;
        errorsList.push({
          userId: user._id,
          name: `${user.first_name} ${user.last_name}`,
          error: error.message
        });
      }
    }
    
    const summary = {
      success: true,
      message: `User ID generation completed. Processed: ${processed}, Errors: ${errors}`,
      processed,
      errors,
      totalFound: usersWithoutId.length,
      errorsList
    };
    
    console.log('📋 Summary:', summary);
    
    // Also check for users with numeric IDs and suggest migration
    const usersWithNumericId = await User.find({
      unique_user_id: { $regex: /^\d+$/ } // Only numeric IDs
    }).countDocuments();
    
    if (usersWithNumericId > 0) {
      console.log(`⚠️  Found ${usersWithNumericId} users with numeric IDs. Consider migrating to new format.`);
      summary.numericIdsFound = usersWithNumericId;
      summary.suggestion = 'Consider running migrateNumericUserIds() to update numeric IDs to new format';
    }
    
    return summary;
    
  } catch (error) {
    console.error('❌ Error in generateMissingUserIds:', error);
    return {
      success: false,
      message: 'Error generating missing user IDs',
      error: error.message,
      processed: 0,
      errors: 1
    };
  }
}

/**
 * Optional function to migrate numeric user IDs to new format
 * This is separate from the main function as it's more invasive
 * @returns {Promise<Object>} - Summary of the migration
 */
async function migrateNumericUserIds() {
  try {
    console.log('🔄 Starting migration of numeric user IDs to new format...');
    
    // Find users with numeric IDs
    const usersWithNumericId = await User.find({
      unique_user_id: { $regex: /^\d+$/ } // Only numeric IDs
    }).select('_id first_name last_name email phone_number unique_user_id');
    
    console.log(`📊 Found ${usersWithNumericId.length} users with numeric IDs`);
    
    if (usersWithNumericId.length === 0) {
      console.log('✅ No users with numeric IDs found.');
      return {
        success: true,
        message: 'No numeric IDs to migrate',
        processed: 0,
        errors: 0
      };
    }
    
    let processed = 0;
    let errors = 0;
    const errorsList = [];
    
    for (const user of usersWithNumericId) {
      try {
        console.log(`🔄 Migrating user: ${user.first_name} ${user.last_name} (old ID: ${user.unique_user_id})`);
        
        // Generate new format user ID
        const newUserId = await generateUniqueUserId(
          user.first_name,
          user.last_name,
          user.email,
          user.phone_number
        );
        
        // Update user with new ID
        await User.findByIdAndUpdate(user._id, {
          unique_user_id: newUserId
        });
        
        console.log(`✅ Migrated ID: ${user.unique_user_id} → ${newUserId}`);
        processed++;
        
      } catch (error) {
        console.error(`❌ Error migrating user ${user._id}:`, error.message);
        errors++;
        errorsList.push({
          userId: user._id,
          oldId: user.unique_user_id,
          name: `${user.first_name} ${user.last_name}`,
          error: error.message
        });
      }
    }
    
    const summary = {
      success: true,
      message: `Numeric ID migration completed. Processed: ${processed}, Errors: ${errors}`,
      processed,
      errors,
      totalFound: usersWithNumericId.length,
      errorsList
    };
    
    console.log('📋 Migration Summary:', summary);
    return summary;
    
  } catch (error) {
    console.error('❌ Error in migrateNumericUserIds:', error);
    return {
      success: false,
      message: 'Error migrating numeric user IDs',
      error: error.message,
      processed: 0,
      errors: 1
    };
  }
}

/**
 * Function to validate all user IDs in the database
 * Useful for debugging and verification
 * @returns {Promise<Object>} - Validation results
 */
async function validateAllUserIds() {
  try {
    console.log('🔍 Validating all user IDs...');
    
    const totalUsers = await User.countDocuments();
    const usersWithoutId = await User.countDocuments({
      $or: [
        { unique_user_id: { $exists: false } },
        { unique_user_id: null },
        { unique_user_id: '' },
        { unique_user_id: { $regex: /^\s*$/ } }
      ]
    });
    
    const usersWithNumericId = await User.countDocuments({
      unique_user_id: { $regex: /^\d+$/ }
    });
    
    const usersWithNewFormat = await User.countDocuments({
      unique_user_id: { $regex: /^bso-/ }
    });
    
    const duplicateIds = await User.aggregate([
      { $group: { _id: '$unique_user_id', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    const validation = {
      totalUsers,
      usersWithoutId,
      usersWithNumericId,
      usersWithNewFormat,
      duplicateCount: duplicateIds.length,
      duplicates: duplicateIds,
      isValid: usersWithoutId === 0 && duplicateIds.length === 0
    };
    
    console.log('📊 Validation Results:', validation);
    return validation;
    
  } catch (error) {
    console.error('❌ Error validating user IDs:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateMissingUserIds,
  migrateNumericUserIds,
  validateAllUserIds,
  generateUniqueUserId
};
