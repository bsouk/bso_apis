/**
 * Verify Service Account JSON is Valid
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const serviceAccountPath = path.join(__dirname, 'config', 'google-service-account.json');

console.log('🔍 Verifying Service Account JSON...\n');

// Check if file exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found at:', serviceAccountPath);
  process.exit(1);
}

// Read and parse JSON
let serviceAccount;
try {
  const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(fileContent);
  console.log('✅ Service Account JSON file is valid\n');
} catch (error) {
  console.error('❌ Invalid JSON file:', error.message);
  process.exit(1);
}

// Verify required fields
console.log('📋 Service Account Details:');
console.log('   Type:', serviceAccount.type);
console.log('   Project ID:', serviceAccount.project_id);
console.log('   Client Email:', serviceAccount.client_email);
console.log('   Client ID:', serviceAccount.client_id);
console.log('   Private Key ID:', serviceAccount.private_key_id);
console.log('   Has Private Key:', serviceAccount.private_key ? '✅ Yes' : '❌ No');
console.log('');

// Verify private key format
if (serviceAccount.private_key) {
  if (serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
    console.log('✅ Private key format is correct');
  } else {
    console.warn('⚠️  Private key might be missing BEGIN/END markers');
  }
} else {
  console.error('❌ Private key is missing!');
  process.exit(1);
}

// Test Google Auth initialization
try {
  console.log('\n🧪 Testing Google Auth initialization...');
  
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  console.log('✅ Google Auth initialized successfully');
  console.log('✅ Service account is ready for Google Play API\n');

  // Try to get access token (this will verify credentials)
  console.log('🔐 Testing credential verification...');
  auth.getAccessToken()
    .then(token => {
      if (token) {
        console.log('✅ Credentials verified! Access token obtained');
        console.log('   Token:', token.substring(0, 30) + '...');
        console.log('\n✅✅✅ SERVICE ACCOUNT IS PRODUCTION READY! ✅✅✅\n');
      } else {
        console.warn('⚠️  No access token received');
      }
    })
    .catch(error => {
      console.error('❌ Credential verification failed:', error.message);
      console.log('\n💡 Possible issues:');
      console.log('   - Service account might not have required permissions');
      console.log('   - Google Play Developer API might not be enabled');
      console.log('   - Service account might not be linked to correct project');
    });

} catch (error) {
  console.error('❌ Google Auth initialization failed:', error.message);
  process.exit(1);
}
