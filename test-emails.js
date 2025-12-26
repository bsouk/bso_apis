/**
 * Simple Test Script for Subscription Emails
 * 
 * This script can be run directly with Node.js to test email sending
 * without needing to start the full server.
 * 
 * Usage:
 *   node test-emails.js your-email@example.com
 * 
 * Make sure environment variables are set:
 *   - EMAIL_SMTP_API_MAILGUN
 *   - EMAIL_SMTP_DOMAIN_MAILGUN
 *   - APP_URL (optional)
 */

require('dotenv').config();
const emailer = require('./src/utils/emailer');
const urlHelper = require('./src/utils/urlHelper');
const moment = require('moment');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Error: Please provide an email address');
  console.log('Usage: node test-emails.js your-email@example.com');
            process.exit(1);
        }
        
// Validate email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(testEmail)) {
  console.error('❌ Error: Invalid email format');
            process.exit(1);
        }

console.log(`\n${'='.repeat(80)}`);
console.log(`🧪 TESTING SUBSCRIPTION EMAILS`);
console.log(`📧 Test Email: ${testEmail}`);
console.log(`${'='.repeat(80)}\n`);

const testData = {
  name: 'Test User',
  planName: 'Buyer Direct Plan',
  amount: 99.99,
  currency: 'USD',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@bsoservices.com'
};

async function testEmails() {
  const results = [];

  // Test 1: Payment Failed
  try {
    console.log('1️⃣ Testing Payment Failed Email...');
    await emailer.sendEmail(null, {
      to: testEmail,
      subject: '🧪 TEST - Payment Failed - Action Required',
      name: testData.name,
      planName: testData.planName,
      amount: testData.amount,
      currency: testData.currency,
      failureReason: 'Your card was declined.',
      nextRetryDate: moment().add(2, 'days').format('MMMM DD, YYYY'),
      paymentLink: urlHelper.frontendUrl('my-account'),
      updatePaymentLink: urlHelper.frontendUrl('my-account'),
      supportEmail: testData.supportEmail
    }, 'subscriptionPaymentFailed');
    console.log('   ✅ SUCCESS\n');
    results.push({ email: 'Payment Failed', status: 'success' });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}\n`);
    results.push({ email: 'Payment Failed', status: 'error', error: error.message });
  }

  // Test 2: Payment Retry Failed
  try {
    console.log('2️⃣ Testing Payment Retry Failed Email...');
    await emailer.sendEmail(null, {
      to: testEmail,
      subject: '🧪 TEST - Payment Retry Unsuccessful',
      name: testData.name,
      planName: testData.planName,
      amount: testData.amount,
      currency: testData.currency,
      attemptNumber: 1,
      maxAttempts: 3,
                nextRetryDate: moment().add(2, 'days').format('MMMM DD, YYYY'),
                daysUntilSuspension: 4,
      supportEmail: testData.supportEmail
    }, 'subscriptionRetryFailed');
    console.log('   ✅ SUCCESS\n');
    results.push({ email: 'Payment Retry Failed', status: 'success' });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}\n`);
    results.push({ email: 'Payment Retry Failed', status: 'error', error: error.message });
  }

  // Test 3: Payment Success
  try {
    console.log('3️⃣ Testing Payment Success Email...');
    await emailer.sendEmail(null, {
      to: testEmail,
      subject: '🧪 TEST - Payment Successful',
      name: testData.name,
      planName: testData.planName,
      amount: testData.amount,
      currency: testData.currency,
      attemptNumber: 2,
      nextBillingDate: moment().add(30, 'days').format('MMMM DD, YYYY'),
      supportEmail: testData.supportEmail
    }, 'subscriptionPaymentSuccess');
    console.log('   ✅ SUCCESS\n');
    results.push({ email: 'Payment Success', status: 'success' });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}\n`);
    results.push({ email: 'Payment Success', status: 'error', error: error.message });
  }

  // Test 4: Subscription Suspended
  try {
    console.log('4️⃣ Testing Subscription Suspended Email...');
    await emailer.sendEmail(null, {
      to: testEmail,
      subject: '🧪 TEST - Subscription Suspended',
      name: testData.name,
      planName: testData.planName,
      amount: testData.amount,
      currency: testData.currency,
                suspensionDate: moment().format('MMMM DD, YYYY'),
      supportEmail: testData.supportEmail
    }, 'subscriptionSuspended');
    console.log('   ✅ SUCCESS\n');
    results.push({ email: 'Subscription Suspended', status: 'success' });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}\n`);
    results.push({ email: 'Subscription Suspended', status: 'error', error: error.message });
  }

  // Test 5: Daily Reminder
  try {
    console.log('5️⃣ Testing Daily Reminder Email...');
    await emailer.sendEmail(null, {
      to: testEmail,
      subject: '🧪 TEST - Daily Reminder',
      name: testData.name,
      planName: testData.planName,
      amount: testData.amount,
      currency: testData.currency,
      dayNumber: 3,
      suspensionDate: moment().subtract(3, 'days').format('MMMM DD, YYYY'),
      reactivateLink: urlHelper.frontendUrl('my-account'),
                benefits: [
                    'Full access to all features',
        'Priority customer support'
      ],
      supportEmail: testData.supportEmail
    }, 'subscriptionDailyReminder');
    console.log('   ✅ SUCCESS\n');
    results.push({ email: 'Daily Reminder', status: 'success' });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}\n`);
    results.push({ email: 'Daily Reminder', status: 'error', error: error.message });
  }

  // Test 6: Renewal Reminder
  try {
    console.log('6️⃣ Testing Renewal Reminder Email...');
    await emailer.sendEmail(null, {
      to: testEmail,
      subject: '🧪 TEST - Renewal Reminder',
      name: testData.name,
      planName: testData.planName,
      amount: testData.amount,
      currency: testData.currency,
                renewalDate: moment().add(7, 'days').format('MMMM DD, YYYY'),
                daysUntilRenewal: 7,
      paymentMethod: '4242',
      updatePaymentLink: urlHelper.frontendUrl('my-account'),
      supportEmail: testData.supportEmail
    }, 'subscriptionRenewalReminder');
    console.log('   ✅ SUCCESS\n');
    results.push({ email: 'Renewal Reminder', status: 'success' });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}\n`);
    results.push({ email: 'Renewal Reminder', status: 'error', error: error.message });
  }

  // Test 7: Subscription Cancelled
  try {
    console.log('7️⃣ Testing Subscription Cancelled Email...');
    await emailer.sendEmail(null, {
      to: testEmail,
      subject: '🧪 TEST - Subscription Cancelled',
      name: testData.name,
      planName: testData.planName,
      cancellationDate: moment().format('MMMM DD, YYYY'),
      resubscribeLink: urlHelper.frontendUrl('subscription-plan'),
      plansLink: urlHelper.frontendUrl('subscription-plan'),
      feedbackLink: urlHelper.frontendUrl('contact-us'),
      supportEmail: testData.supportEmail
    }, 'subscriptionCancelled');
    console.log('   ✅ SUCCESS\n');
    results.push({ email: 'Subscription Cancelled', status: 'success' });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}\n`);
    results.push({ email: 'Subscription Cancelled', status: 'error', error: error.message });
  }

  // Test 8: Payment Action Required
  try {
    console.log('8️⃣ Testing Payment Action Required Email...');
    await emailer.sendEmail(null, {
      to: testEmail,
      subject: '🧪 TEST - Action Required',
      name: testData.name,
      planName: testData.planName,
      amount: testData.amount,
      currency: testData.currency,
      actionLink: urlHelper.frontendUrl('my-account'),
      supportEmail: testData.supportEmail
    }, 'subscriptionPaymentActionRequired');
    console.log('   ✅ SUCCESS\n');
    results.push({ email: 'Payment Action Required', status: 'success' });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}\n`);
    results.push({ email: 'Payment Action Required', status: 'error', error: error.message });
  }

        // Summary
  console.log(`${'='.repeat(80)}`);
  console.log('📊 SUMMARY');
  console.log(`${'='.repeat(80)}`);
  const successCount = results.filter(r => r.status === 'success').length;
  console.log(`Total: ${results.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${results.length - successCount}`);
  console.log(`${'='.repeat(80)}\n`);

  if (successCount === results.length) {
    console.log('🎉 All emails sent successfully!');
    console.log(`📧 Check your inbox: ${testEmail}`);
  } else {
    console.log('⚠️ Some emails failed. Check errors above.');
    process.exit(1);
  }
}

testEmails().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
