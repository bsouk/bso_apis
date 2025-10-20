const User = require('../models/user');

/**
 * Sanitizes text by removing special characters and normalizing
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
function sanitizeText(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')                    // Decompose accents
    .replace(/[\u0300-\u036f]/g, '')    // Remove accents
    .replace(/[^a-z0-9]/g, '')          // Keep only alphanumeric
    .trim();
}

/**
 * Generates a unique suffix using timestamp + random
 * @returns {string} - 6 character unique suffix
 */
function generateUniqueSuffix() {
  const timestamp = Date.now().toString(36).slice(-3); // 3 chars
  const random = Math.random().toString(36).slice(2, 5); // 3 chars
  return timestamp + random; // 6 chars total
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
    throw new Error('Unable to generate unique user ID after multiple attempts');
  }
  
  return userId;
}

/**
 * Checks if a user ID already exists in the database
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} - True if exists, false otherwise
 */
async function checkIfUserIdExists(userId) {
  try {
    const existingUser = await User.findOne({ unique_user_id: userId });
    return !!existingUser;
  } catch (error) {
    console.error('Error checking user ID uniqueness:', error);
    return false; // Assume it doesn't exist if there's an error
  }
}

/**
 * Test function to generate sample user IDs
 * @returns {Array} - Array of test user IDs
 */
function generateTestUserIds() {
  const testCases = [
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+919876543210'
    },
    {
      firstName: 'María José',
      lastName: 'O\'Connor-Smith',
      email: 'maria@example.com',
      phone: '+447123456789'
    },
    {
      firstName: '',
      lastName: '',
      email: 'sarah.williams@gmail.com',
      phone: ''
    },
    {
      firstName: '',
      lastName: '',
      email: '',
      phone: '+919876543210'
    },
    {
      firstName: 'Christopher',
      lastName: 'Montgomery-Wellington',
      email: 'chris@example.com',
      phone: '+44123456789'
    },
    {
      firstName: '李明',
      lastName: 'Wang',
      email: 'liming.wang@example.com',
      phone: '+86123456789'
    }
  ];
  
  return testCases.map(testCase => {
    let identifier = '';
    
    if (testCase.firstName && testCase.lastName) {
      const sanitizedFirst = sanitizeText(testCase.firstName);
      const sanitizedLast = sanitizeText(testCase.lastName);
      identifier = `${sanitizedFirst}-${sanitizedLast}`;
    } else if (testCase.firstName) {
      identifier = sanitizeText(testCase.firstName);
    } else if (testCase.lastName) {
      identifier = sanitizeText(testCase.lastName);
    } else if (testCase.email) {
      const emailPrefix = testCase.email.split('@')[0];
      identifier = sanitizeText(emailPrefix);
    } else if (testCase.phone) {
      const phoneDigits = testCase.phone.replace(/\D/g, '').slice(-10);
      identifier = phoneDigits;
    } else {
      identifier = 'user';
    }
    
    const uniqueSuffix = generateUniqueSuffix();
    return `bso-${identifier}-${uniqueSuffix}`;
  });
}

module.exports = {
  generateUniqueUserId,
  checkIfUserIdExists,
  sanitizeText,
  generateUniqueSuffix,
  generateTestUserIds
};