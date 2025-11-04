#!/usr/bin/env node

/**
 * Chatbot Configuration Checker
 * This script verifies if chatbot environment variables are properly configured
 */

require('dotenv').config();

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🔍 CHECKING CHATBOT CONFIGURATION');
console.log('═══════════════════════════════════════════════════════════\n');

// Check CHATBOT_API_URL
const apiUrl = process.env.CHATBOT_API_URL;
console.log('1. CHATBOT_API_URL:');
if (apiUrl) {
  console.log('   ✅ FOUND:', apiUrl);
} else {
  console.log('   ❌ NOT FOUND - Please add to .env file:');
  console.log('      CHATBOT_API_URL=https://9fv4s4a42r.eu-west-2.awsapprunner.com/api/v1/chat');
}

console.log('\n');

// Check CHATBOT_X_API_KEY
const apiKey = process.env.CHATBOT_X_API_KEY;
console.log('2. CHATBOT_X_API_KEY:');
if (apiKey) {
  const maskedKey = apiKey.substring(0, 20) + '...' + apiKey.substring(apiKey.length - 5);
  console.log('   ✅ FOUND:', maskedKey);
  console.log('   Length:', apiKey.length, 'characters');
} else {
  console.log('   ❌ NOT FOUND - Please add to .env file:');
  console.log('      CHATBOT_X_API_KEY=<your-key-from-postman>');
  console.log('\n   📝 To get your key:');
  console.log('      1. Open Postman');
  console.log('      2. Click "Headers (8)" tab');
  console.log('      3. Find "x-api-key" row');
  console.log('      4. Copy the value');
  console.log('      5. Paste in .env file');
}

console.log('\n═══════════════════════════════════════════════════════════');

// Summary
if (apiUrl && apiKey) {
  console.log('✅ CHATBOT CONFIGURATION IS COMPLETE!');
  console.log('🚀 You can now use the chatbot.');
  console.log('\n💡 Next steps:');
  console.log('   1. Make sure backend is running: npm start');
  console.log('   2. Open frontend: http://localhost:3000');
  console.log('   3. Click chatbot icon and test it!');
} else {
  console.log('❌ CHATBOT CONFIGURATION IS INCOMPLETE!');
  console.log('\n📝 Action Required:');
  console.log('   1. Open: /Users/macbook/ProjectWork/Farukh Project/LiveProjects/bso_apis/.env');
  console.log('   2. Add the missing environment variables');
  console.log('   3. Save the file');
  console.log('   4. Restart backend: npm start');
  console.log('   5. Run this script again: node check_chatbot_config.js');
}

console.log('═══════════════════════════════════════════════════════════\n');

process.exit(apiUrl && apiKey ? 0 : 1);



