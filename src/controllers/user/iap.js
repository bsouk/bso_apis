/**
 * IAP (In-App Purchase) Controller
 * Handles subscription verification and creation from mobile app purchases
 * 
 * ⚠️ BYPASS MODE ENABLED - Payment verification is currently disabled
 * This is for testing/development purposes only
 * See: IAP_BYPASS_MODE.md for details
 */

const User = require("../../models/user");
const utils = require("../../utils/utils");
const crypto = require("crypto");
const plan = require("../../models/plan");
const Subscription = require("../../models/subscription");
const Admin = require("../../models/admin");
const Payment = require("../../models/payment");
const fcm_devices = require("../../models/fcm_devices");
const admin_received_notification = require("../../models/admin_received_notification");
const mongoose = require("mongoose");

const {
    verifyAppleReceipt,
    verifyGoogleReceipt,
    parseAppleReceipt,
    parseGoogleReceipt,
    validateProductPlanMapping,
    calculateEndDate
} = require("../../utils/iapVerification");

// ═══════════════════════════════════════════════════════════════════════
// 🚨 BYPASS MODE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════
// Set to TRUE to bypass payment verification (for testing/development)
// Set to FALSE to enable full Apple/Google payment verification (production)
const IAP_BYPASS_MODE = true;

// ⚠️ WARNING: When BYPASS_MODE is TRUE, all IAP subscriptions will be 
// automatically approved without verifying with Apple/Google servers.
// This should ONLY be used for development/testing purposes.
// For production, set IAP_BYPASS_MODE = false
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate unique subscription ID
 */
async function generateSubscriptionId() {
    const token = crypto.randomBytes(5).toString('hex');
    return `sub-${token}`;
}

/**
 * Generate unique payment ID
 */
async function generatePaymentId() {
    const token = crypto.randomBytes(5).toString('hex');
    return `pay-${token}`;
}

/**
 * Verify IAP Receipt and Create Subscription
 * POST /user/verifyIAPSubscription
 * 
 * This endpoint:
 * 1. Authenticates user (via JWT)
 * 2. Validates plan existence
 * 3. Verifies receipt with Apple/Google servers
 * 4. Creates subscription in database
 * 5. Records payment transaction
 * 6. Auto-creates recruiter plan if needed
 * 7. Notifies admin
 */
exports.verifyIAPSubscription = async (req, res) => {
    try {
        const {
            plan_id,
            receipt_data,
            platform,
            product_id,
            purchase_token // For Android (Google uses token instead of receipt_data)
        } = req.body;

        // ═══════════════════════════════════════════════════
        // STEP 1: VALIDATE INPUT
        // ═══════════════════════════════════════════════════
        if (!plan_id) {
            return res.status(400).json({
                message: "plan_id is required",
                code: 400
            });
        }

        if (!platform || !['ios', 'android'].includes(platform.toLowerCase())) {
            return res.status(400).json({
                message: "platform is required and must be 'ios' or 'android'",
                code: 400
            });
        }

        if (!product_id) {
            return res.status(400).json({
                message: "product_id is required",
                code: 400
            });
        }

        // Only require receipt/token in production mode
        if (!IAP_BYPASS_MODE) {
            if (platform.toLowerCase() === 'ios' && !receipt_data) {
                return res.status(400).json({
                    message: "receipt_data is required for iOS",
                    code: 400
                });
            }

            if (platform.toLowerCase() === 'android' && !purchase_token) {
                return res.status(400).json({
                    message: "purchase_token is required for Android",
                    code: 400
                });
            }
        } else {
            console.log('🚨 BYPASS MODE - Skipping receipt/token validation');
        }

        // ═══════════════════════════════════════════════════
        // STEP 2: USER VERIFICATION (from JWT)
        // ═══════════════════════════════════════════════════
        const userid = req.user._id;
        const userEmail = req.user.email;

        console.log('📱 IAP Verification Request:', {
            user_id: userid,
            email: userEmail,
            platform,
            product_id,
            plan_id
        });

        const user = await User.findById(userid);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                code: 404
            });
        }

        // ═══════════════════════════════════════════════════
        // STEP 3: PLAN VERIFICATION
        // ═══════════════════════════════════════════════════
        const plandata = await plan.findOne({ plan_id });
        if (!plandata) {
            return res.status(404).json({
                message: "Plan not found",
                code: 404
            });
        }

        if (plandata.status !== 'active') {
            return res.status(400).json({
                message: "Plan is not active",
                code: 400
            });
        }

        console.log('📋 Plan Details:', {
            type: plandata.type,
            interval: plandata.interval,
            price: plandata.price,
            name: plandata.plan_name
        });

        // ═══════════════════════════════════════════════════
        // STEP 4: CHECK FOR EXISTING ACTIVE SUBSCRIPTION
        // ═══════════════════════════════════════════════════
        const existingSub = await Subscription.findOne({
            user_id: userid,
            type: plandata.type,
            status: 'active'
        });

        if (existingSub) {
            return res.status(400).json({
                message: `Already have an active ${plandata.type} subscription. Please cancel it before purchasing a new one.`,
                code: 400,
                existing_subscription_id: existingSub.subscription_id
            });
        }

        // Check for lifetime subscription
        const lifetimeSub = await Subscription.aggregate([
            {
                $match: {
                    user_id: new mongoose.Types.ObjectId(userid),
                    type: plandata.type
                }
            },
            {
                $lookup: {
                    from: 'plans',
                    localField: 'plan_id',
                    foreignField: 'plan_id',
                    as: 'plan'
                }
            },
            {
                $unwind: { path: "$plan", preserveNullAndEmptyArrays: true }
            },
            {
                $match: { 'plan.interval': 'lifetime' }
            }
        ]);

        if (lifetimeSub.length > 0) {
            return res.status(400).json({
                message: `Already have lifetime access for ${plandata.type}`,
                code: 400
            });
        }

        // ═══════════════════════════════════════════════════
        // STEP 5: VERIFY RECEIPT WITH APPLE/GOOGLE
        // ═══════════════════════════════════════════════════
        let verificationResult;
        let parsedReceipt;

        // ✅✅✅ BYPASS MODE - SKIP VERIFICATION ✅✅✅
        if (IAP_BYPASS_MODE) {
            console.log('🚨 BYPASS MODE ENABLED - Skipping payment verification');
            console.log('⚠️ Assuming payment is successful for testing purposes');
            
            // Create mock receipt data
            const mockTransactionId = `mock_${platform}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const startDate = new Date();
            let endDate = calculateEndDate(startDate, plandata.interval);
            
            parsedReceipt = {
                isValid: true,
                transactionId: mockTransactionId,
                productId: product_id,
                purchaseDate: startDate,
                expiryDate: endDate,
                isTrialPeriod: false,
                cancellationDate: null,
                environment: 'bypass_mode',
                originalResponse: null
            };

            console.log('✅ Bypass mode - Mock receipt created:', {
                transaction_id: parsedReceipt.transactionId,
                product_id: parsedReceipt.productId,
                purchase_date: parsedReceipt.purchaseDate,
                expiry_date: parsedReceipt.expiryDate,
                mode: 'BYPASS'
            });
        } 
        // ❌❌❌ PRODUCTION MODE - FULL VERIFICATION ❌❌❌
        else {
            try {
                if (platform.toLowerCase() === 'ios') {
                    // Verify with Apple
                    console.log('🍎 Verifying Apple receipt...');
                    const appleResponse = await verifyAppleReceipt(receipt_data);
                    parsedReceipt = parseAppleReceipt(appleResponse);

                    if (!parsedReceipt.isValid) {
                        return res.status(400).json({
                            message: "Invalid Apple receipt",
                            code: 400,
                            apple_status: appleResponse.status,
                            apple_message: getAppleStatusMessage(appleResponse.status)
                        });
                    }

                } else if (platform.toLowerCase() === 'android') {
                    // Verify with Google
                    console.log('🤖 Verifying Google Play receipt...');
                    const packageName = process.env.GOOGLE_PACKAGE_NAME || 'com.bso.app';
                    const googleResponse = await verifyGoogleReceipt(packageName, product_id, purchase_token);
                    parsedReceipt = parseGoogleReceipt(googleResponse);

                    if (!parsedReceipt.isValid) {
                        return res.status(400).json({
                            message: "Invalid Google Play receipt",
                            code: 400,
                            google_purchase_state: googleResponse.purchaseState
                        });
                    }
                }

                console.log('✅ Receipt verified successfully:', {
                    transaction_id: parsedReceipt.transactionId,
                    product_id: parsedReceipt.productId,
                    purchase_date: parsedReceipt.purchaseDate,
                    expiry_date: parsedReceipt.expiryDate
                });

            } catch (error) {
                console.error('❌ Receipt verification failed:', error);
                return res.status(400).json({
                    message: "Receipt verification failed",
                    code: 400,
                    error: error.message
                });
            }

            // ═══════════════════════════════════════════════════
            // STEP 6: VALIDATE PRODUCT ID MATCHES PLAN
            // ═══════════════════════════════════════════════════
            if (parsedReceipt.productId !== product_id) {
                return res.status(400).json({
                    message: "Product ID mismatch between request and receipt",
                    code: 400
                });
            }

            // ═══════════════════════════════════════════════════
            // STEP 7: CHECK FOR DUPLICATE TRANSACTION
            // ═══════════════════════════════════════════════════
            const existingTransaction = await Payment.findOne({
                transaction_id: parsedReceipt.transactionId
            });

            if (existingTransaction) {
                return res.status(400).json({
                    message: "Transaction already processed",
                    code: 400,
                    transaction_id: parsedReceipt.transactionId
                });
            }
        }

        // ═══════════════════════════════════════════════════
        // STEP 8: CALCULATE SUBSCRIPTION DATES
        // ═══════════════════════════════════════════════════
        const startDate = parsedReceipt.purchaseDate;
        let endDate = parsedReceipt.expiryDate;

        // If no expiry date from receipt, calculate it
        if (!endDate) {
            endDate = calculateEndDate(startDate, plandata.interval);
        }

        console.log('📅 Subscription dates:', {
            start: startDate,
            end: endDate,
            interval: plandata.interval,
            mode: IAP_BYPASS_MODE ? 'BYPASS' : 'PRODUCTION'
        });

        // ═══════════════════════════════════════════════════
        // STEP 9: CREATE SUBSCRIPTION
        // ═══════════════════════════════════════════════════
        const newSubscription = await Subscription.create({
            user_id: userid,
            subscription_id: await generateSubscriptionId(),
            plan_id: plan_id,
            start_at: startDate,
            end_at: endDate,
            status: 'active',
            type: plandata.type,
            subscription_type: "paid",
            payment_method_type: platform.toLowerCase() === 'ios' ? 'apple_iap' : 'google_iap',
            stripe_subscription_id: null,
            stripe_customer_id: null,
            isPurchased: true
        });

        console.log('✅ Subscription created:', newSubscription.subscription_id);

        // ═══════════════════════════════════════════════════
        // STEP 10: RECORD PAYMENT TRANSACTION
        // ═══════════════════════════════════════════════════
        const paymentRecord = await Payment.create({
            user_id: userid,
            payment_id: await generatePaymentId(),
            subscription_id: newSubscription.subscription_id,
            amount: plandata.price,
            currency: plandata.currency || 'USD',
            payment_method: platform.toLowerCase() === 'ios' ? 'apple_iap' : 'google_iap',
            transaction_id: parsedReceipt.transactionId,
            receipt_data: platform.toLowerCase() === 'ios' ? receipt_data : purchase_token,
            status: 'completed',
            payment_date: startDate,
            metadata: {
                product_id: parsedReceipt.productId,
                platform: platform.toLowerCase(),
                environment: parsedReceipt.environment || 'production'
            }
        });

        console.log('✅ Payment recorded:', paymentRecord.payment_id);

        // ═══════════════════════════════════════════════════
        // STEP 11: AUTO-CREATE RECRUITER PLAN
        // ═══════════════════════════════════════════════════
        let recruiterSubscription = null;
        if (['supplier', 'logistics'].includes(plandata.type)) {
            const recruiterPlan = await plan.findOne({
                type: 'recruiter',
                interval: plandata.interval,
                status: 'active'
            });

            if (recruiterPlan) {
                recruiterSubscription = await Subscription.create({
                    user_id: userid,
                    subscription_id: await generateSubscriptionId(),
                    plan_id: recruiterPlan.plan_id,
                    start_at: startDate,
                    end_at: endDate,
                    status: 'active',
                    type: 'recruiter',
                    subscription_type: "paid",
                    payment_method_type: 'manual',
                    isPurchased: true
                });

                console.log('✅ Auto-created recruiter subscription:', recruiterSubscription.subscription_id);
            }
        }

        // ═══════════════════════════════════════════════════
        // STEP 12: NOTIFY ADMIN
        // ═══════════════════════════════════════════════════
        try {
            const admins = await Admin.findOne({ role: 'super_admin' });
            if (admins) {
                const notificationMessage = {
                    title: 'New IAP Subscription',
                    description: `${user.full_name} purchased ${plandata.plan_name} via ${platform} (${plandata.price} ${plandata.currency})`,
                    user_id: userid
                };

                const adminFcmDevices = await fcm_devices.find({ user_id: admins._id });
                if (adminFcmDevices && adminFcmDevices.length > 0) {
                    adminFcmDevices.forEach(async device => {
                        await utils.sendNotification(device.token, notificationMessage);
                    });

                    await admin_received_notification.create({
                        title: notificationMessage.title,
                        body: notificationMessage.description,
                        type: "iap_subscription",
                        receiver_id: admins._id,
                        related_to: userid,
                        related_to_type: "user",
                        user_type: plandata.type
                    });
                }
            }
        } catch (notifError) {
            console.error('⚠️ Admin notification failed:', notifError.message);
            // Don't fail the request if notification fails
        }

        // ═══════════════════════════════════════════════════
        // STEP 13: RETURN SUCCESS RESPONSE
        // ═══════════════════════════════════════════════════
        return res.status(200).json({
            message: IAP_BYPASS_MODE 
                ? "Subscription activated successfully (BYPASS MODE - No verification)" 
                : "Subscription activated successfully",
            bypass_mode: IAP_BYPASS_MODE,
            data: {
                subscription: {
                    subscription_id: newSubscription.subscription_id,
                    type: newSubscription.type,
                    plan_name: plandata.plan_name,
                    interval: plandata.interval,
                    status: newSubscription.status,
                    start_at: newSubscription.start_at,
                    end_at: newSubscription.end_at,
                    payment_method: newSubscription.payment_method_type
                },
                payment: {
                    payment_id: paymentRecord.payment_id,
                    transaction_id: parsedReceipt.transactionId,
                    amount: plandata.price,
                    currency: plandata.currency || 'USD',
                    verified: !IAP_BYPASS_MODE
                },
                recruiter_subscription: recruiterSubscription ? {
                    subscription_id: recruiterSubscription.subscription_id,
                    type: 'recruiter'
                } : null
            },
            code: 200
        });

    } catch (error) {
        console.error('❌ IAP Verification Error:', error);
        utils.handleError(res, error);
    }
};

/**
 * Get Apple status message from status code
 */
function getAppleStatusMessage(status) {
    const messages = {
        0: 'Valid receipt',
        21000: 'App Store could not read the receipt',
        21002: 'Receipt data malformed',
        21003: 'Receipt could not be authenticated',
        21004: 'Shared secret does not match',
        21005: 'Receipt server unavailable',
        21006: 'Receipt valid but subscription expired',
        21007: 'Receipt is from sandbox (test) environment',
        21008: 'Receipt is from production environment',
        21009: 'Internal data access error',
        21010: 'User account not found'
    };
    return messages[status] || `Unknown status code: ${status}`;
}

/**
 * Get User's Active IAP Subscriptions
 * GET /user/getIAPSubscriptions
 */
exports.getIAPSubscriptions = async (req, res) => {
    try {
        const userid = req.user._id;

        const subscriptions = await Subscription.find({
            user_id: userid,
            payment_method_type: { $in: ['apple_iap', 'google_iap'] }
        }).sort({ createdAt: -1 });

        // Fetch plan details for each subscription
        const subscriptionsWithPlans = await Promise.all(
            subscriptions.map(async (sub) => {
                const planDetails = await plan.findOne({ plan_id: sub.plan_id });
                return {
                    ...sub.toObject(),
                    plan_details: planDetails
                };
            })
        );

        return res.status(200).json({
            message: "IAP subscriptions fetched successfully",
            data: subscriptionsWithPlans,
            count: subscriptionsWithPlans.length,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
};

module.exports = exports;



