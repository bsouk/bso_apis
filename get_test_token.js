/**
 * Get Test JWT Token
 * Generates a JWT token for a user for testing purposes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/user');
const jwt = require('jsonwebtoken');

const USER_EMAIL = process.argv[2] || 'ghufranjaleel@yopmail.com';

async function getTestToken() {
  try {
    console.log('🔐 Getting test JWT token...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: USER_EMAIL });
    
    if (!user) {
      console.error('❌ User not found:', USER_EMAIL);
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log('   ID:', user._id.toString());
    console.log('   Email:', user.email);
    console.log('   Full Name:', user.full_name);
    console.log('');

    // Generate JWT token
    const payload = {
      _id: user._id,
      email: user.email,
      user_type: user.user_type,
      current_user_type: user.current_user_type || user.user_type[0]
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h'
    });

    console.log('✅ JWT Token generated!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Token:', token);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Export token for use in test
    process.env.TEST_JWT_TOKEN = token;
    console.log('✅ Token exported as TEST_JWT_TOKEN');
    console.log('');

    // Run IAP test
    console.log('🧪 Running IAP test...\n');
    require('./test_iap_with_payload.js');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

getTestToken();
