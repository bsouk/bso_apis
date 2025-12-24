const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const path = require('path');

const User = require("../../models/user");
const Address = require("../../models/address");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');
const Brand = require("../../models/brand");
const crypto = require("crypto");
const Plan = require("../../models/plan");
const Subscription = require("../../models/subscription");
const Admin = require("../../models/admin");
const fcm_devices = require("../../models/fcm_devices");
const admin_notification = require("../../models/admin_notification");
const admin_received_notification = require("../../models/admin_received_notification");

// ========================================
// AUTOMATIC PAYMENT RETRY INTEGRATION
// ========================================
const PaymentRetryService = require("../../services/paymentRetryService");
const PaymentRetryLog = require("../../models/paymentRetryLog");
const moment = require('moment');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ✅ Log file path
const LOG_FILE = path.join(__dirname, '../../logs/stripe_webhook_logs.txt');


// create log directory if not exist
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// ✅ Logging function
function logStripeEvent(event) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${event.type}\n${JSON.stringify(event.data, null, 2)}\n\n`;

    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) {
            console.error("❌ Failed to write log:", err);
        }
    });
}

// ✅ Webhook Handler
exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        // Stripe requires the raw body for signature verification
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.warn("⚠️ Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ Log the event
    logStripeEvent(event);

    try {
        switch (event.type) {
            // ========================================
            // EXISTING HANDLERS (Enhanced)
            // ========================================
            
            case 'invoice.payment_succeeded': {
                console.log(`✅ Invoice payment succeeded: ${event.data.object.id}`);
                const invoice = event.data.object;
                
                // Update subscription status
                const subscription = await Subscription.findOne({ 
                    stripe_subscription_id: invoice.subscription 
                });
                
                if (subscription) {
                    await Subscription.updateOne(
                        { _id: subscription._id },
                        {
                            status: 'active',
                            end_at: new Date(invoice.lines.data[0].period.end * 1000),
                            dunning_status: 'none',
                            failed_payment_count: 0,
                            grace_period_start: null,
                            grace_period_end: null
                        }
                    );
                    
                    // If there's an active retry log, mark it as succeeded
                    const retryLog = await PaymentRetryLog.findOne({
                        subscription_id: subscription._id,
                        status: { $in: ['active', 'retrying'] }
                    });
                    
                    if (retryLog) {
                        console.log(`✅ Payment recovered! Marking retry log as succeeded`);
                        retryLog.status = 'succeeded';
                        retryLog.final_result = 'recovered';
                        retryLog.recovery_date = new Date();
                        await retryLog.save();
                    }
                    
                    console.log(`✅ Subscription ${subscription._id} updated to active`);
                }
                break;
            }

            // ========================================
            // NEW HANDLER: invoice.payment_failed
            // Triggers automatic payment retry system
            // ========================================
            case 'invoice.payment_failed': {
                console.log(`❌ Invoice payment failed: ${event.data.object.id}`);
                const failedInvoice = event.data.object;
                
                // Find subscription
                const subscription = await Subscription.findOne({ 
                    stripe_subscription_id: failedInvoice.subscription 
                }).populate('user_id');
                
                if (subscription) {
                    console.log(`📋 Processing payment failure for subscription: ${subscription._id}`);
                    
                    // Update subscription status
                    await Subscription.updateOne(
                        { _id: subscription._id },
                        { 
                            status: 'payment_failed',
                            last_payment_attempt: new Date()
                        }
                    );
                    
                    // Check if retry log already exists
                    const existingRetryLog = await PaymentRetryLog.findOne({
                        subscription_id: subscription._id,
                        status: { $in: ['active', 'retrying'] }
                    });
                    
                    if (!existingRetryLog && subscription.auto_retry_enabled !== false) {
                        console.log(`🔄 Creating automatic retry schedule...`);
                        
                        // Create retry schedule (Day 2, 4, 6)
                        const retryLog = await PaymentRetryService.createRetrySchedule(
                            subscription._id,
                            subscription.user_id._id || subscription.user_id,
                            failedInvoice.id,
                            failedInvoice.subscription,
                            failedInvoice.amount_due / 100,
                            failedInvoice.currency.toUpperCase(),
                            failedInvoice.last_payment_error?.message || 'Payment failed'
                        );
                        
                        console.log(`✅ Retry schedule created successfully`);
                        
                        // Send initial payment failed email
                        try {
                            const user = subscription.user_id.email ? subscription.user_id : await User.findById(subscription.user_id);
                            const plan = await Plan.findOne({ plan_id: subscription.plan_id });
                            
                            const emailData = {
                                name: user.name || user.email,
                                planName: plan?.plan_name || subscription.type,
                                amount: failedInvoice.amount_due / 100,
                                currency: failedInvoice.currency.toUpperCase(),
                                failureReason: failedInvoice.last_payment_error?.message || 'Payment declined',
                                nextRetryDate: moment(retryLog.retry_schedule[0].scheduled_at).format('MMMM DD, YYYY'),
                                paymentLink: `${process.env.APP_URL}/subscription/pay/${subscription._id}`,
                                supportEmail: process.env.SUPPORT_EMAIL || 'support@blueskyoutsourcing.com'
                            };
                            
                            await emailer.sendEmail(
                                user.email,
                                '⚠️ Payment Failed - Action Required for Your Subscription',
                                'subscriptionPaymentFailed',
                                emailData
                            );
                            
                            console.log(`📧 Payment failed email sent to: ${user.email}`);
                            
                            // Log email sent
                            retryLog.email_notifications_sent.push({
                                type: 'payment_failed',
                                sent_at: new Date(),
                                template: 'subscriptionPaymentFailed',
                                success: true
                            });
                            await retryLog.save();
                            
                        } catch (emailError) {
                            console.error(`⚠️ Error sending payment failed email:`, emailError);
                        }
                    } else if (existingRetryLog) {
                        console.log(`⚠️ Retry log already exists for subscription ${subscription._id}`);
                    } else {
                        console.log(`⚠️ Auto-retry disabled for subscription ${subscription._id}`);
                    }
                }
                break;
            }

            // ========================================
            // NEW HANDLER: customer.subscription.past_due
            // Subscription is past due after failed payment
            // ========================================
            case 'customer.subscription.past_due': {
                console.log(`⏰ Subscription past due: ${event.data.object.id}`);
                const pastDueSubscription = event.data.object;
                
                await Subscription.updateOne(
                    { stripe_subscription_id: pastDueSubscription.id },
                    { 
                        status: 'past_due',
                        last_payment_attempt: new Date()
                    }
                );
                
                console.log(`✅ Subscription marked as past_due`);
                break;
            }

            // ========================================
            // NEW HANDLER: invoice.payment_action_required
            // 3D Secure or other authentication required
            // ========================================
            case 'invoice.payment_action_required': {
                console.log(`🔐 Payment action required: ${event.data.object.id}`);
                const actionRequiredInvoice = event.data.object;
                
                const subscription = await Subscription.findOne({ 
                    stripe_subscription_id: actionRequiredInvoice.subscription 
                }).populate('user_id');
                
                if (subscription) {
                    const user = subscription.user_id.email ? subscription.user_id : await User.findById(subscription.user_id);
                    const plan = await Plan.findOne({ plan_id: subscription.plan_id });
                    
                    // Send email with payment action link
                    try {
                        const emailData = {
                            name: user.name || user.email,
                            planName: plan?.plan_name || subscription.type,
                            amount: actionRequiredInvoice.amount_due / 100,
                            currency: actionRequiredInvoice.currency.toUpperCase(),
                            actionLink: actionRequiredInvoice.hosted_invoice_url,
                            supportEmail: process.env.SUPPORT_EMAIL || 'support@blueskyoutsourcing.com'
                        };
                        
                        await emailer.sendEmail(
                            user.email,
                            '🔐 Action Required - Complete Your Payment',
                            'subscriptionPaymentActionRequired',
                            emailData
                        );
                        
                        console.log(`📧 Payment action required email sent to: ${user.email}`);
                        
                    } catch (emailError) {
                        console.error(`⚠️ Error sending action required email:`, emailError);
                    }
                }
                break;
            }

            // ========================================
            // NEW HANDLER: invoice.upcoming
            // Renewal reminder (7 days before)
            // ========================================
            case 'invoice.upcoming': {
                console.log(`🔔 Upcoming invoice: ${event.data.object.id}`);
                const upcomingInvoice = event.data.object;
                
                const subscription = await Subscription.findOne({ 
                    stripe_subscription_id: upcomingInvoice.subscription 
                }).populate('user_id');
                
                if (subscription) {
                    const user = subscription.user_id.email ? subscription.user_id : await User.findById(subscription.user_id);
                    const plan = await Plan.findOne({ plan_id: subscription.plan_id });
                    
                    const daysUntilRenewal = Math.ceil((upcomingInvoice.period_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24));
                    
                    // Send renewal reminder email
                    try {
                        const emailData = {
                            name: user.name || user.email,
                            planName: plan?.plan_name || subscription.type,
                            amount: upcomingInvoice.amount_due / 100,
                            currency: upcomingInvoice.currency.toUpperCase(),
                            renewalDate: moment(upcomingInvoice.period_end * 1000).format('MMMM DD, YYYY'),
                            daysUntilRenewal: daysUntilRenewal,
                            paymentMethod: '****' + (subscription.stripe_payment_method_id ? subscription.stripe_payment_method_id.slice(-4) : ''),
                            updatePaymentLink: `${process.env.APP_URL}/my-account/payment-methods`,
                            supportEmail: process.env.SUPPORT_EMAIL || 'support@blueskyoutsourcing.com'
                        };
                        
                        await emailer.sendEmail(
                            user.email,
                            `🔔 Your Subscription Renews in ${daysUntilRenewal} Days`,
                            'subscriptionRenewalReminder',
                            emailData
                        );
                        
                        console.log(`📧 Renewal reminder email sent to: ${user.email}`);
                        
                    } catch (emailError) {
                        console.error(`⚠️ Error sending renewal reminder email:`, emailError);
                    }
                }
                break;
            }

            // ========================================
            // EXISTING HANDLER: customer.subscription.deleted
            // ========================================
            case 'customer.subscription.deleted': {
                console.log(`🚫 Subscription deleted: ${event.data.object.id}`);
                const deletedSubscription = event.data.object;
                await Subscription.updateOne(
                    { stripe_subscription_id: deletedSubscription.id },
                    {
                        status: 'terminated',
                        end_at: new Date(deletedSubscription.current_period_end * 1000),
                        dunning_status: 'cancelled',
                        cancellation_date: new Date()
                    }
                );
                console.log(`✅ Subscription marked as terminated`);
                break;
            }

            // ========================================
            // NEW HANDLER: customer.subscription.updated
            // Track subscription changes
            // ========================================
            case 'customer.subscription.updated': {
                console.log(`🔄 Subscription updated: ${event.data.object.id}`);
                const updatedSubscription = event.data.object;
                
                await Subscription.updateOne(
                    { stripe_subscription_id: updatedSubscription.id },
                    {
                        status: updatedSubscription.status,
                        end_at: new Date(updatedSubscription.current_period_end * 1000)
                    }
                );
                
                console.log(`✅ Subscription synced with Stripe status: ${updatedSubscription.status}`);
                break;
            }

            default:
                console.log(`ℹ️ Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error("❌ Error processing webhook event:", error);
        res.status(500).send("Webhook handler failed.");
    }
};
