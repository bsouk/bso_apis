const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PaymentRetryLog = require('../models/paymentRetryLog');
const Subscription = require('../models/subscription');
const User = require('../models/user');
const Payment = require('../models/payment');
const emailer = require('../utils/emailer');
const moment = require('moment');

/**
 * Payment Retry Service
 * Handles automatic payment retry for failed subscription payments
 */
class PaymentRetryService {
    
    /**
     * Create retry schedule when payment fails
     * Retry Schedule: Day 2, 4, 6 after failure
     * 
     * @param {String} subscriptionId - MongoDB subscription ID
     * @param {String} userId - User ID
     * @param {String} stripeInvoiceId - Stripe invoice ID
     * @param {String} stripeSubscriptionId - Stripe subscription ID
     * @param {Number} amount - Amount to charge
     * @param {String} currency - Currency code
     * @param {String} failureReason - Reason for failure
     * @returns {Object} Created PaymentRetryLog
     */
    async createRetrySchedule(subscriptionId, userId, stripeInvoiceId, stripeSubscriptionId, amount, currency = 'USD', failureReason = '') {
        try {
            console.log(`📝 Creating retry schedule for subscription: ${subscriptionId}`);
            
            // Check if retry log already exists for this subscription
            const existingLog = await PaymentRetryLog.findOne({
                subscription_id: subscriptionId,
                status: { $in: ['active', 'retrying'] }
            });
            
            if (existingLog) {
                console.log(`⚠️ Retry log already exists for subscription: ${subscriptionId}`);
                return existingLog;
            }
            
            // Define retry schedule: Day 2, 4, 6
            const now = new Date();
            const retrySchedule = [
                { attempt: 1, days: 2 },  // Day 2
                { attempt: 2, days: 4 },  // Day 4
                { attempt: 3, days: 6 }   // Day 6
            ];
            
            const retries = retrySchedule.map(r => ({
                attempt: r.attempt,
                scheduled_at: new Date(now.getTime() + r.days * 24 * 60 * 60 * 1000),
                status: 'pending',
                result: 'pending',
                amount: amount,
                currency: currency
            }));
            
            // Create retry log
            const retryLog = await PaymentRetryLog.create({
                subscription_id: subscriptionId,
                user_id: userId,
                stripe_invoice_id: stripeInvoiceId,
                stripe_subscription_id: stripeSubscriptionId,
                payment_source: 'stripe',
                max_attempts: 3,
                retry_schedule: retries,
                next_retry_at: retries[0].scheduled_at,
                status: 'retrying',
                original_failure_date: now,
                original_failure_reason: failureReason
            });
            
            // Update subscription with dunning info
            await Subscription.updateOne(
                { _id: subscriptionId },
                {
                    dunning_status: 'grace_period',
                    grace_period_start: now,
                    grace_period_end: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days
                    last_payment_attempt: now,
                    failed_payment_count: 1,
                    payment_retry_log_id: retryLog._id
                }
            );
            
            console.log(`✅ Retry schedule created successfully`);
            console.log(`📅 Retry dates: Day 2 (${moment(retries[0].scheduled_at).format('MMM DD')}), Day 4 (${moment(retries[1].scheduled_at).format('MMM DD')}), Day 6 (${moment(retries[2].scheduled_at).format('MMM DD')})`);
            
            return retryLog;
            
        } catch (error) {
            console.error(`❌ Error creating retry schedule:`, error);
            throw error;
        }
    }
    
    /**
     * Execute a retry attempt
     * 
     * @param {String} retryLogId - PaymentRetryLog ID
     * @returns {Object} Result of retry attempt
     */
    async executeRetryAttempt(retryLogId) {
        try {
            console.log(`🔄 Executing retry attempt for log: ${retryLogId}`);
            
            // Get retry log with populated data
            const retryLog = await PaymentRetryLog.findById(retryLogId)
                .populate('subscription_id')
                .populate('user_id');
            
            if (!retryLog) {
                console.error(`❌ Retry log not found: ${retryLogId}`);
                return { success: false, error: 'Retry log not found' };
            }
            
            if (retryLog.status !== 'retrying') {
                console.log(`⚠️ Retry log status is not "retrying": ${retryLog.status}`);
                return { success: false, error: 'Invalid retry log status' };
            }
            
            // Find the next pending retry
            const pendingRetry = retryLog.retry_schedule.find(r => r.status === 'pending');
            
            if (!pendingRetry) {
                console.log(`⚠️ No pending retries found`);
                return { success: false, error: 'No pending retries' };
            }
            
            console.log(`💳 Attempting retry #${pendingRetry.attempt} for user: ${retryLog.user_id.email}`);
            
            // Update retry attempt as being executed
            pendingRetry.status = 'executed';
            pendingRetry.executed_at = new Date();
            
            try {
                // Attempt to charge the invoice using Stripe
                console.log(`📤 Calling Stripe API to pay invoice: ${retryLog.stripe_invoice_id}`);
                
                const invoice = await stripe.invoices.pay(retryLog.stripe_invoice_id, {
                    paid_out_of_band: false
                });
                
                console.log(`✅ Stripe payment successful! Invoice status: ${invoice.status}`);
                
                // Payment successful!
                pendingRetry.result = 'success';
                pendingRetry.stripe_payment_intent_id = invoice.payment_intent;
                
                // Update retry log
                retryLog.status = 'succeeded';
                retryLog.final_result = 'recovered';
                retryLog.recovery_date = new Date();
                retryLog.attempt_number = pendingRetry.attempt;
                
                await retryLog.save();
                
                // Update subscription status
                await Subscription.updateOne(
                    { _id: retryLog.subscription_id._id },
                    {
                        status: 'active',
                        dunning_status: 'none',
                        grace_period_start: null,
                        grace_period_end: null,
                        failed_payment_count: 0,
                        last_payment_attempt: new Date()
                    }
                );
                
                // Create payment record
                await this.createPaymentRecord(retryLog, invoice, 'completed');
                
                // Send success email
                await this.sendPaymentSuccessEmail(retryLog, pendingRetry.attempt);
                
                console.log(`🎉 Payment retry successful on attempt #${pendingRetry.attempt}`);
                
                return {
                    success: true,
                    attempt: pendingRetry.attempt,
                    message: 'Payment recovered successfully'
                };
                
            } catch (stripeError) {
                // Payment failed
                console.error(`❌ Stripe payment failed:`, stripeError.message);
                
                pendingRetry.result = 'failed';
                pendingRetry.error_code = stripeError.code || 'unknown';
                pendingRetry.error_message = stripeError.message;
                
                // Check if more retries are available
                const nextPendingRetry = retryLog.retry_schedule.find(
                    r => r.status === 'pending' && r.attempt > pendingRetry.attempt
                );
                
                if (nextPendingRetry) {
                    // More retries available
                    console.log(`📅 Next retry scheduled for: ${moment(nextPendingRetry.scheduled_at).format('MMM DD, YYYY')}`);
                    
                    retryLog.next_retry_at = nextPendingRetry.scheduled_at;
                    retryLog.attempt_number = pendingRetry.attempt;
                    await retryLog.save();
                    
                    // Update subscription
                    await Subscription.updateOne(
                        { _id: retryLog.subscription_id._id },
                        {
                            last_payment_attempt: new Date(),
                            $inc: { failed_payment_count: 1 }
                        }
                    );
                    
                    // Send retry failed email
                    await this.sendRetryFailedEmail(retryLog, pendingRetry.attempt, nextPendingRetry);
                    
                    return {
                        success: false,
                        attempt: pendingRetry.attempt,
                        nextRetryDate: nextPendingRetry.scheduled_at,
                        message: `Retry attempt ${pendingRetry.attempt} failed, next retry on ${moment(nextPendingRetry.scheduled_at).format('MMM DD, YYYY')}`
                    };
                    
                } else {
                    // All retries exhausted
                    console.log(`🚫 All retry attempts exhausted`);
                    
                    retryLog.status = 'exhausted';
                    retryLog.final_result = 'failed';
                    retryLog.attempt_number = pendingRetry.attempt;
                    await retryLog.save();
                    
                    // Suspend subscription
                    await this.suspendSubscription(retryLog.subscription_id._id);
                    
                    // Send suspension email
                    await this.sendSuspensionEmail(retryLog);
                    
                    return {
                        success: false,
                        attempt: pendingRetry.attempt,
                        allRetriesExhausted: true,
                        message: 'All retry attempts exhausted, subscription suspended'
                    };
                }
            }
            
        } catch (error) {
            console.error(`❌ Error executing retry attempt:`, error);
            throw error;
        }
    }
    
    /**
     * Suspend subscription after all retries fail
     * 
     * @param {String} subscriptionId - Subscription ID
     */
    async suspendSubscription(subscriptionId) {
        try {
            console.log(`⏸️ Suspending subscription: ${subscriptionId}`);
            
            const now = new Date();
            
            await Subscription.updateOne(
                { _id: subscriptionId },
                {
                    status: 'suspended',
                    dunning_status: 'suspended',
                    suspension_date: now,
                    is_active: false,
                    grace_period_end: now
                }
            );
            
            console.log(`✅ Subscription suspended successfully`);
            
        } catch (error) {
            console.error(`❌ Error suspending subscription:`, error);
            throw error;
        }
    }
    
    /**
     * Cancel subscription after extended suspension
     * 
     * @param {String} subscriptionId - Subscription ID
     */
    async cancelSubscription(subscriptionId) {
        try {
            console.log(`🚫 Cancelling subscription: ${subscriptionId}`);
            
            const subscription = await Subscription.findById(subscriptionId);
            
            if (!subscription) {
                console.error(`❌ Subscription not found: ${subscriptionId}`);
                return;
            }
            
            const now = new Date();
            
            // Update local subscription
            await Subscription.updateOne(
                { _id: subscriptionId },
                {
                    status: 'cancelled',
                    dunning_status: 'cancelled',
                    cancellation_date: now,
                    is_active: false
                }
            );
            
            // Cancel in Stripe if it's a Stripe subscription
            if (subscription.stripe_subscription_id && subscription.source === 'stripe') {
                try {
                    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
                    console.log(`✅ Stripe subscription cancelled: ${subscription.stripe_subscription_id}`);
                } catch (stripeError) {
                    console.error(`⚠️ Error cancelling Stripe subscription:`, stripeError.message);
                    // Continue even if Stripe cancellation fails
                }
            }
            
            console.log(`✅ Subscription cancelled successfully`);
            
        } catch (error) {
            console.error(`❌ Error cancelling subscription:`, error);
            throw error;
        }
    }
    
    /**
     * Create payment record for successful retry
     */
    async createPaymentRecord(retryLog, invoice, status) {
        try {
            const payment = await Payment.create({
                subscription_id: retryLog.subscription_id._id,
                buyer_id: retryLog.user_id._id,
                total_amount: invoice.amount_paid / 100,
                currency: invoice.currency.toUpperCase(),
                payment_status: status,
                stripe_customer_id: invoice.customer,
                stripe_subscription_id: retryLog.stripe_subscription_id,
                stripe_payment_intent: invoice.payment_intent,
                receipt: invoice.hosted_invoice_url || invoice.invoice_pdf,
                payment_method: 'stripe',
                payment_purpose: 'subscription_renewal',
                payment_feature: 'subscription'
            });
            
            console.log(`✅ Payment record created: ${payment._id}`);
            return payment;
            
        } catch (error) {
            console.error(`⚠️ Error creating payment record:`, error);
            // Don't throw, just log
        }
    }
    
    /**
     * Send payment success email
     */
    async sendPaymentSuccessEmail(retryLog, attemptNumber) {
        try {
            console.log(`📧 Sending payment success email to: ${retryLog.user_id.email}`);
            
            const user = retryLog.user_id;
            const subscription = retryLog.subscription_id;
            
            // Get plan details
            const Plan = require('../models/plan');
            const plan = await Plan.findOne({ plan_id: subscription.plan_id });
            
            const emailData = {
                name: user.name || user.email,
                planName: plan?.plan_name || subscription.type,
                amount: retryLog.retry_schedule[attemptNumber - 1]?.amount || 0,
                currency: retryLog.retry_schedule[attemptNumber - 1]?.currency || 'USD',
                attemptNumber: attemptNumber,
                nextBillingDate: subscription.end_at ? moment(subscription.end_at).format('MMMM DD, YYYY') : 'N/A',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@blueskyoutsourcing.com'
            };
            
            await emailer.sendEmail(
                user.email,
                'Payment Successful - Your Subscription is Active!',
                'subscriptionPaymentSuccess',
                emailData
            );
            
            // Log email sent
            retryLog.email_notifications_sent.push({
                type: 'payment_success',
                sent_at: new Date(),
                template: 'subscriptionPaymentSuccess',
                success: true
            });
            await retryLog.save();
            
            console.log(`✅ Payment success email sent`);
            
        } catch (error) {
            console.error(`❌ Error sending payment success email:`, error);
        }
    }
    
    /**
     * Send retry failed email
     */
    async sendRetryFailedEmail(retryLog, attemptNumber, nextRetry) {
        try {
            console.log(`📧 Sending retry failed email to: ${retryLog.user_id.email}`);
            
            const user = retryLog.user_id;
            const subscription = retryLog.subscription_id;
            
            // Get plan details
            const Plan = require('../models/plan');
            const plan = await Plan.findOne({ plan_id: subscription.plan_id });
            
            const daysUntilSuspension = Math.ceil((new Date(retryLog.grace_period_end) - new Date()) / (1000 * 60 * 60 * 24));
            
            const emailData = {
                name: user.name || user.email,
                planName: plan?.plan_name || subscription.type,
                amount: retryLog.retry_schedule[attemptNumber - 1]?.amount || 0,
                currency: retryLog.retry_schedule[attemptNumber - 1]?.currency || 'USD',
                attemptNumber: attemptNumber,
                maxAttempts: retryLog.max_attempts,
                nextRetryDate: moment(nextRetry.scheduled_at).format('MMMM DD, YYYY'),
                daysUntilSuspension: daysUntilSuspension,
                paymentLink: `${process.env.APP_URL}/subscription/pay/${subscription._id}`,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@blueskyoutsourcing.com'
            };
            
            await emailer.sendEmail(
                user.email,
                `Payment Retry ${attemptNumber}/${retryLog.max_attempts} Failed - ${daysUntilSuspension} Days Left`,
                'subscriptionRetryFailed',
                emailData
            );
            
            // Log email sent
            retryLog.email_notifications_sent.push({
                type: 'retry_failed',
                sent_at: new Date(),
                template: 'subscriptionRetryFailed',
                success: true
            });
            await retryLog.save();
            
            console.log(`✅ Retry failed email sent`);
            
        } catch (error) {
            console.error(`❌ Error sending retry failed email:`, error);
        }
    }
    
    /**
     * Send subscription suspended email
     */
    async sendSuspensionEmail(retryLog) {
        try {
            console.log(`📧 Sending suspension email to: ${retryLog.user_id.email}`);
            
            const user = retryLog.user_id;
            const subscription = retryLog.subscription_id;
            
            // Get plan details
            const Plan = require('../models/plan');
            const plan = await Plan.findOne({ plan_id: subscription.plan_id });
            
            const emailData = {
                name: user.name || user.email,
                planName: plan?.plan_name || subscription.type,
                amount: retryLog.retry_schedule[0]?.amount || 0,
                currency: retryLog.retry_schedule[0]?.currency || 'USD',
                suspensionDate: moment(subscription.suspension_date).format('MMMM DD, YYYY'),
                reactivateLink: `${process.env.APP_URL}/subscription/reactivate/${subscription._id}`,
                supportEmail: process.env.SUPPORT_EMAIL || 'support@blueskyoutsourcing.com'
            };
            
            await emailer.sendEmail(
                user.email,
                '🔒 Your Subscription Has Been Suspended',
                'subscriptionSuspended',
                emailData
            );
            
            // Log email sent
            retryLog.email_notifications_sent.push({
                type: 'subscription_suspended',
                sent_at: new Date(),
                template: 'subscriptionSuspended',
                success: true
            });
            await retryLog.save();
            
            console.log(`✅ Suspension email sent`);
            
        } catch (error) {
            console.error(`❌ Error sending suspension email:`, error);
        }
    }
    
    /**
     * Find and process all due retries
     * Called by cron job
     */
    async processDueRetries() {
        try {
            const now = new Date();
            console.log(`🔍 Looking for due retries at ${moment(now).format('YYYY-MM-DD HH:mm:ss')}`);
            
            // Find all retry logs that are due
            const dueRetries = await PaymentRetryLog.find({
                status: 'retrying',
                next_retry_at: { $lte: now },
                auto_retry_enabled: { $ne: false }
            });
            
            console.log(`📋 Found ${dueRetries.length} due retries to process`);
            
            const results = [];
            
            for (const retryLog of dueRetries) {
                console.log(`\n💳 Processing retry for subscription: ${retryLog.subscription_id}`);
                
                try {
                    const result = await this.executeRetryAttempt(retryLog._id);
                    results.push({
                        retryLogId: retryLog._id,
                        subscriptionId: retryLog.subscription_id,
                        ...result
                    });
                } catch (error) {
                    console.error(`❌ Error processing retry for ${retryLog._id}:`, error);
                    results.push({
                        retryLogId: retryLog._id,
                        subscriptionId: retryLog.subscription_id,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            console.log(`\n✅ Processed ${results.length} retries`);
            console.log(`   - Successful: ${results.filter(r => r.success).length}`);
            console.log(`   - Failed: ${results.filter(r => !r.success).length}`);
            
            return results;
            
        } catch (error) {
            console.error(`❌ Error processing due retries:`, error);
            throw error;
        }
    }
}

module.exports = new PaymentRetryService();

