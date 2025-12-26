const emailer = require('../../utils/emailer');
const urlHelper = require('../../utils/urlHelper');
const stripeBillingPortal = require('../../services/stripeBillingPortalService');
const moment = require('moment');

/**
 * Test Subscription Emails
 * This endpoint tests all subscription-related email templates
 * 
 * Usage: POST /admin/test-subscription-emails
 * Body: { testEmail: "your-email@example.com" }
 */

exports.testAllSubscriptionEmails = async (req, res) => {
    try {
        const { testEmail } = req.body;

        if (!testEmail) {
            return res.status(400).json({
                success: false,
                message: 'testEmail is required in request body'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(testEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log(`🧪 TESTING ALL SUBSCRIPTION EMAILS`);
        console.log(`📧 Test Email: ${testEmail}`);
        console.log(`${'='.repeat(80)}\n`);

        const results = [];
        const baseUrl = urlHelper.getBaseUrl();

        // Test data
        const testData = {
            name: 'Test User',
            planName: 'Buyer Direct Plan',
            amount: 99.99,
            currency: 'USD',
            supportEmail: process.env.SUPPORT_EMAIL || 'support@bsoservices.com'
        };

        // ========================================
        // TEST 1: Payment Failed Email
        // ========================================
        try {
            console.log(`1️⃣ Testing: Payment Failed Email...`);
            
            // Get billing portal URL (using a test customer ID or fallback)
            let paymentLink = urlHelper.frontendUrl('my-account');
            try {
                // For testing, we'll use a mock URL structure
                paymentLink = `${baseUrl}/my-account`;
            } catch (error) {
                console.warn('   ⚠️ Could not create billing portal URL for test');
            }

            await emailer.sendEmail(
                null,
                {
                    to: testEmail,
                    subject: '🧪 TEST - Payment Failed - Action Required for Your Subscription',
                    name: testData.name,
                    planName: testData.planName,
                    amount: testData.amount,
                    currency: testData.currency,
                    failureReason: 'Your card was declined.',
                    nextRetryDate: moment().add(2, 'days').format('MMMM DD, YYYY'),
                    paymentLink: paymentLink,
                    updatePaymentLink: paymentLink
                },
                'subscriptionPaymentFailed'
            );

            results.push({
                email: 'subscriptionPaymentFailed',
                status: 'success',
                message: 'Payment failed email sent successfully'
            });
            console.log(`   ✅ Payment Failed Email: SUCCESS\n`);

        } catch (error) {
            results.push({
                email: 'subscriptionPaymentFailed',
                status: 'error',
                message: error.message
            });
            console.log(`   ❌ Payment Failed Email: FAILED - ${error.message}\n`);
        }

        // ========================================
        // TEST 2: Payment Retry Failed Email
        // ========================================
        try {
            console.log(`2️⃣ Testing: Payment Retry Failed Email...`);

            await emailer.sendEmail(
                null,
                {
                    to: testEmail,
                    subject: '🧪 TEST - Payment Retry Unsuccessful - Action Required',
                    name: testData.name,
                    planName: testData.planName,
                    amount: testData.amount,
                    currency: testData.currency,
                    attemptNumber: 1,
                    maxAttempts: 3,
                    nextRetryDate: moment().add(2, 'days').format('MMMM DD, YYYY'),
                    daysUntilSuspension: 4,
                    supportEmail: testData.supportEmail
                },
                'subscriptionRetryFailed'
            );

            results.push({
                email: 'subscriptionRetryFailed',
                status: 'success',
                message: 'Payment retry failed email sent successfully'
            });
            console.log(`   ✅ Payment Retry Failed Email: SUCCESS\n`);

        } catch (error) {
            results.push({
                email: 'subscriptionRetryFailed',
                status: 'error',
                message: error.message
            });
            console.log(`   ❌ Payment Retry Failed Email: FAILED - ${error.message}\n`);
        }

        // ========================================
        // TEST 3: Payment Success Email
        // ========================================
        try {
            console.log(`3️⃣ Testing: Payment Success Email...`);

            await emailer.sendEmail(
                null,
                {
                    to: testEmail,
                    subject: '🧪 TEST - Payment Successful - Your Subscription is Active!',
                    name: testData.name,
                    planName: testData.planName,
                    amount: testData.amount,
                    currency: testData.currency,
                    attemptNumber: 2,
                    nextBillingDate: moment().add(30, 'days').format('MMMM DD, YYYY'),
                    supportEmail: testData.supportEmail
                },
                'subscriptionPaymentSuccess'
            );

            results.push({
                email: 'subscriptionPaymentSuccess',
                status: 'success',
                message: 'Payment success email sent successfully'
            });
            console.log(`   ✅ Payment Success Email: SUCCESS\n`);

        } catch (error) {
            results.push({
                email: 'subscriptionPaymentSuccess',
                status: 'error',
                message: error.message
            });
            console.log(`   ❌ Payment Success Email: FAILED - ${error.message}\n`);
        }

        // ========================================
        // TEST 4: Subscription Suspended Email
        // ========================================
        try {
            console.log(`4️⃣ Testing: Subscription Suspended Email...`);

            let reactivateLink = urlHelper.frontendUrl('my-account');
            try {
                reactivateLink = urlHelper.frontendUrl('my-account');
            } catch (error) {
                console.warn('   ⚠️ Could not create billing portal URL for test');
            }

            await emailer.sendEmail(
                null,
                {
                    to: testEmail,
                    subject: '🧪 TEST - Your Subscription Has Been Suspended',
                    name: testData.name,
                    planName: testData.planName,
                    amount: testData.amount,
                    currency: testData.currency,
                    suspensionDate: moment().format('MMMM DD, YYYY'),
                    supportEmail: testData.supportEmail
                },
                'subscriptionSuspended'
            );

            results.push({
                email: 'subscriptionSuspended',
                status: 'success',
                message: 'Subscription suspended email sent successfully'
            });
            console.log(`   ✅ Subscription Suspended Email: SUCCESS\n`);

        } catch (error) {
            results.push({
                email: 'subscriptionSuspended',
                status: 'error',
                message: error.message
            });
            console.log(`   ❌ Subscription Suspended Email: FAILED - ${error.message}\n`);
        }

        // ========================================
        // TEST 5: Daily Reminder Email
        // ========================================
        try {
            console.log(`5️⃣ Testing: Daily Reminder Email...`);

            await emailer.sendEmail(
                null,
                {
                    to: testEmail,
                    subject: '🧪 TEST - Day 3/7 - Reactivate Your BSO Subscription',
                    name: testData.name,
                    planName: testData.planName,
                    amount: testData.amount,
                    currency: testData.currency,
                    dayNumber: 3,
                    suspensionDate: moment().subtract(3, 'days').format('MMMM DD, YYYY'),
                    reactivateLink: urlHelper.frontendUrl('my-account'),
                    benefits: [
                        'Full access to all features',
                        'Priority customer support',
                        'Continuous service without interruption',
                        'Access to latest updates and improvements'
                    ],
                    supportEmail: testData.supportEmail
                },
                'subscriptionDailyReminder'
            );

            results.push({
                email: 'subscriptionDailyReminder',
                status: 'success',
                message: 'Daily reminder email sent successfully'
            });
            console.log(`   ✅ Daily Reminder Email: SUCCESS\n`);

        } catch (error) {
            results.push({
                email: 'subscriptionDailyReminder',
                status: 'error',
                message: error.message
            });
            console.log(`   ❌ Daily Reminder Email: FAILED - ${error.message}\n`);
        }

        // ========================================
        // TEST 6: Renewal Reminder Email
        // ========================================
        try {
            console.log(`6️⃣ Testing: Renewal Reminder Email...`);

            let updatePaymentLink = urlHelper.frontendUrl('my-account');
            try {
                updatePaymentLink = urlHelper.frontendUrl('my-account');
            } catch (error) {
                console.warn('   ⚠️ Could not create billing portal URL for test');
            }

            await emailer.sendEmail(
                null,
                {
                    to: testEmail,
                    subject: '🧪 TEST - Your Subscription Renews in 7 Days',
                    name: testData.name,
                    planName: testData.planName,
                    amount: testData.amount,
                    currency: testData.currency,
                    renewalDate: moment().add(7, 'days').format('MMMM DD, YYYY'),
                    daysUntilRenewal: 7,
                    paymentMethod: '4242',
                    updatePaymentLink: updatePaymentLink,
                    supportEmail: testData.supportEmail
                },
                'subscriptionRenewalReminder'
            );

            results.push({
                email: 'subscriptionRenewalReminder',
                status: 'success',
                message: 'Renewal reminder email sent successfully'
            });
            console.log(`   ✅ Renewal Reminder Email: SUCCESS\n`);

        } catch (error) {
            results.push({
                email: 'subscriptionRenewalReminder',
                status: 'error',
                message: error.message
            });
            console.log(`   ❌ Renewal Reminder Email: FAILED - ${error.message}\n`);
        }

        // ========================================
        // TEST 7: Subscription Cancelled Email
        // ========================================
        try {
            console.log(`7️⃣ Testing: Subscription Cancelled Email...`);

            await emailer.sendEmail(
                null,
                {
                    to: testEmail,
                    subject: '🧪 TEST - We\'re Sorry to See You Go - Subscription Cancelled',
                    name: testData.name,
                    planName: testData.planName,
                    cancellationDate: moment().format('MMMM DD, YYYY'),
                    resubscribeLink: urlHelper.frontendUrl('subscription-plan'),
                    plansLink: urlHelper.frontendUrl('subscription-plan'),
                    feedbackLink: urlHelper.frontendUrl('contact-us'),
                    supportEmail: testData.supportEmail
                },
                'subscriptionCancelled'
            );

            results.push({
                email: 'subscriptionCancelled',
                status: 'success',
                message: 'Subscription cancelled email sent successfully'
            });
            console.log(`   ✅ Subscription Cancelled Email: SUCCESS\n`);

        } catch (error) {
            results.push({
                email: 'subscriptionCancelled',
                status: 'error',
                message: error.message
            });
            console.log(`   ❌ Subscription Cancelled Email: FAILED - ${error.message}\n`);
        }

        // ========================================
        // TEST 8: Payment Action Required Email
        // ========================================
        try {
            console.log(`8️⃣ Testing: Payment Action Required Email...`);

            // Use a test hosted invoice URL (Stripe format)
            const testActionLink = `${baseUrl}/my-account`;

            await emailer.sendEmail(
                null,
                {
                    to: testEmail,
                    subject: '🧪 TEST - Action Required - Complete Your Payment',
                    name: testData.name,
                    planName: testData.planName,
                    amount: testData.amount,
                    currency: testData.currency,
                    actionLink: testActionLink,
                    supportEmail: testData.supportEmail
                },
                'subscriptionPaymentActionRequired'
            );

            results.push({
                email: 'subscriptionPaymentActionRequired',
                status: 'success',
                message: 'Payment action required email sent successfully'
            });
            console.log(`   ✅ Payment Action Required Email: SUCCESS\n`);

        } catch (error) {
            results.push({
                email: 'subscriptionPaymentActionRequired',
                status: 'error',
                message: error.message
            });
            console.log(`   ❌ Payment Action Required Email: FAILED - ${error.message}\n`);
        }

        // ========================================
        // SUMMARY
        // ========================================
        console.log(`${'='.repeat(80)}`);
        console.log(`📊 TEST SUMMARY`);
        console.log(`${'='.repeat(80)}`);
        console.log(`Total Tests: ${results.length}`);
        console.log(`✅ Successful: ${results.filter(r => r.status === 'success').length}`);
        console.log(`❌ Failed: ${results.filter(r => r.status === 'error').length}`);
        console.log(`${'='.repeat(80)}\n`);

        const successCount = results.filter(r => r.status === 'success').length;
        const allSuccess = successCount === results.length;

        return res.status(allSuccess ? 200 : 207).json({
            success: allSuccess,
            message: `Test completed. ${successCount}/${results.length} emails sent successfully.`,
            results: results,
            testEmail: testEmail
        });

    } catch (error) {
        console.error('❌ Error in test subscription emails:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

