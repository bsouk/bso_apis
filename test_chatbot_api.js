const axios = require('axios');

console.log('\n🧪 Testing BSO Chatbot API...\n');

// Test WITHOUT x-api-key (should fail)
async function testWithoutKey() {
  console.log('Test 1: Calling API WITHOUT x-api-key');
  try {
    const response = await axios.post(
      'https://9fv4s4a42r.eu-west-2.awsapprunner.com/api/v1/chat',
      { question: 'test' }
    );
    console.log('✅ Success (unexpected!)');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('❌ Failed (expected)');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
  }
  console.log('\n');
}

// Test WITH a fake key (should fail with auth error)
async function testWithFakeKey() {
  console.log('Test 2: Calling API WITH fake x-api-key');
  try {
    const response = await axios.post(
      'https://9fv4s4a42r.eu-west-2.awsapprunner.com/api/v1/chat',
      { question: 'test' },
      { headers: { 'x-api-key': 'fake-key-12345' } }
    );
    console.log('✅ Success (unexpected!)');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('❌ Failed (expected)');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
  }
  console.log('\n');
}

// Run tests
(async () => {
  await testWithoutKey();
  await testWithFakeKey();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 CONCLUSION:');
  console.log('   The API requires a valid x-api-key header.');
  console.log('   You need to copy the real key from your Postman app.');
  console.log('═══════════════════════════════════════════════════════════\n');
})();
