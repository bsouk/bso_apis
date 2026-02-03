/**
 * Test script for Enquiry creation emails (frontend + admin)
 *
 * Sends:
 * 1. EnquirySubmission – email sent when buyer creates enquiry from frontend
 * 2. AdminCreatedEnquiry – email sent when admin creates enquiry on behalf of buyer
 *
 * Usage: node test-enquiry-emails.js [email]
 * Example: node test-enquiry-emails.js ghufranjaleel@yopmail.com
 */

require('dotenv').config();
const emailer = require('./src/utils/emailer');

const testEmail = process.argv[2] || 'ghufranjaleel@yopmail.com';
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(testEmail)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

// Minimal enquiry object for both templates (avoids DB)
const mockEnquiry = {
  enquiry_unique_id: '#TEST-' + Date.now(),
  enquiry_number: '#TEST-' + Date.now(),
  priority: 'High',
  createdAt: new Date(),
  expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  enquiry_items: [
    {
      brand: 'Test Brand',
      part_no: 'PART-001',
      description: 'Test item for email',
      notes: 'Test notes',
      quantity: { value: 10, unit: 'units' },
      condition: { new: true, reconditioned: false, used: false },
      manufacturer: { original: { selected: true }, oem: { selected: false }, aftermarket: { selected: false } },
      attachment: [],
    },
  ],
  shipping_address: null,
};

const appUrl = process.env.FRONTEND_PROD_URL || 'https://bsoservices.com/';
const storageUrl = process.env.STORAGE_BASE_URL || 'https://bso-content.s3.eu-west-2.amazonaws.com/public/';
const appName = process.env.APP_NAME || 'Blue Sky';

async function run() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 ENQUIRY EMAILS TEST');
  console.log('📧 To:', testEmail);
  console.log('='.repeat(60) + '\n');

  const results = [];

  // 1. EnquirySubmission (frontend – buyer created enquiry)
  try {
    console.log('1️⃣ EnquirySubmission (frontend – buyer created enquiry)...');
    await emailer.sendEmail(null, {
      to: testEmail,
      subject: `[TEST] Enquiry Submitted Successfully – Ref: ${mockEnquiry.enquiry_unique_id}`,
      app_name: appName,
      name: 'Test Buyer',
      app_url: appUrl,
      storage_url: storageUrl,
      enquiry: mockEnquiry,
    }, 'EnquirySubmission');
    console.log('   ✅ Sent\n');
    results.push({ name: 'EnquirySubmission (frontend)', status: 'ok' });
  } catch (err) {
    console.log('   ❌ Failed:', err?.message || err);
    results.push({ name: 'EnquirySubmission (frontend)', status: 'fail', error: err?.message });
  }

  // 2. AdminCreatedEnquiry (admin created on behalf of buyer)
  try {
    console.log('2️⃣ AdminCreatedEnquiry (admin created on behalf of buyer)...');
    const viewLink = appUrl.replace(/\/$/, '') + '/enquiry-review-page/' + 'test-id';
    await emailer.sendEmail(null, {
      to: testEmail,
      subject: `[TEST] Enquiry Created Successfully - Ref: ${mockEnquiry.enquiry_unique_id}`,
      app_name: appName,
      name: 'Test Buyer',
      app_url: appUrl,
      storage_url: storageUrl,
      enquiry: mockEnquiry,
      view_link: viewLink,
    }, 'AdminCreatedEnquiry');
    console.log('   ✅ Sent\n');
    results.push({ name: 'AdminCreatedEnquiry (admin)', status: 'ok' });
  } catch (err) {
    console.log('   ❌ Failed:', err?.message || err);
    results.push({ name: 'AdminCreatedEnquiry (admin)', status: 'fail', error: err?.message });
  }

  console.log('='.repeat(60));
  console.log('Summary:', results.filter(r => r.status === 'ok').length, '/', results.length, 'sent');
  results.forEach(r => console.log('  -', r.name, r.status === 'ok' ? '✅' : '❌', r.error || ''));
  console.log('='.repeat(60) + '\n');
  console.log('📧 Check inbox:', testEmail, '(and spam folder)\n');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
