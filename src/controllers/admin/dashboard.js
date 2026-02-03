const cron = require("node-cron");
const User = require("../../models/user");
const Address = require("../../models/address");
const Order = require("../../models/order")
const Payment = require("../../models/payment")

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

const Ads = require("../../models/ads");

const fcm_devices = require("../../models/fcm_devices");
const Enquiry = require("../../models/Enquiry");
const EnquiryQuotes = require("../../models/EnquiryQuotes");
const Notification = require("../../models/notification")
const Subscription = require("../../models/subscription")
const moment = require("moment");
const appurl = process.env.APP_URL;

// ========================================
// AUTOMATIC PAYMENT RETRY INTEGRATION
// ========================================
const PaymentRetryService = require("../../services/paymentRetryService");
const PaymentRetryLog = require("../../models/paymentRetryLog");
const stripeBillingPortal = require("../../services/stripeBillingPortalService");
const urlHelper = require("../../utils/urlHelper");
const Plan = require("../../models/plan");



cron.schedule("30 3 * * * ", async () => {
    try {
        const one_day = moment().add(1, "days").endOf("day").format("dddd, MMMM D, YYYY h:mm A");
        // console.log("one_day : ", one_day)
        const data = await Enquiry.aggregate(
            [
                {
                    $match: { expiry_date: one_day, status: "pending" }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "user",
                        pipeline: [
                            {
                                $match: {
                                    user_type: { $in: ["buyer"] }
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$user",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "subscriptions",
                        localField: "user_id",
                        foreignField: "user_id",
                        as: "subscription",
                        pipeline: [
                            {
                                $match: {
                                    status: "active",
                                    type: "buyer"
                                }
                            },
                            {
                                $lookup: {
                                    from: "plans",
                                    localField: "plan_id",
                                    foreignField: "plan_id",
                                    as: "plan",
                                    pipeline: [
                                        {
                                            $match: {
                                                plan_step: "direct"
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                $unwind: {
                                    path: "$plan",
                                    preserveNullAndEmptyArrays: true
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$subscription",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        planstage: "$subscription.plan.plan_step"
                    }
                },
                {
                    $match: { planstage: { $exists: true } }
                },
                {
                    $project: {
                        planstage: 1,
                        user_id: 1,
                        enquiry_unique_id: 1,
                        expiry_date: 1,
                        user: 1
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                }
            ]
        )

        for (let index = 0; index < data.length; index++) {
            const i = data[index];

            const mailOptions = {
                to: data?.user?.email,
                subject: `Plan Change Request`,
                buyer_name: data?.user?.full_name || data?.user?.first_name,
                enquiry_id: data?.enquiry_unique_id,
                expiry_date: data?.expiry_date,
                plan_change_url: ''
            };

            emailer.sendEmail(null, mailOptions, "planbso");

            //user notification
            const userFcmDevices = await fcm_devices.find({ user_id: i.user_id });
            // console.log("userFcmDevices : ", userFcmDevices)
            let notificationbody = {
                title: 'Plan Change Request',
                description: `As we can see on your enquiry number ${data?.enquiry_unique_id}, no supplier has quoted yet. We request you to change your current plan to BSO Admin.`
            }
            if (userFcmDevices && userFcmDevices.length > 0) {
                userFcmDevices.forEach(async i => {
                    const token = i.token
                    // console.log("token : ", token)
                    await utils.sendNotification(token, notificationbody);
                })
                let dbnotificationbody = {
                    title: notificationbody.title,
                    description: notificationbody.description,
                    type: "bso",
                    receiver_id: data?.user_id,
                    related_to: data?.user_id,
                    related_to_type: "user",
                }
                const newuserNotification = new Notification(dbnotificationbody);
                // console.log("newuserNotification : ", newuserNotification)
                await newuserNotification.save();
            } 
            // else {
            //     console.log(`No active FCM tokens found for user ${trail.user_id}.`);
            // }
        }
    } catch (error) {
        console.log("error", error)
    }
});


// cron for reminder for within payment terms
cron.schedule("0 10 * * *", async () => {
    try {
        const today = moment().startOf("day");
        // console.log("today : ", today)

        const enquiries = await Enquiry.aggregate([
            {
                $match: {
                    status: "pending",
                    selected_payment_terms: { $ne: null }
                }
            },
            {
                $lookup: {
                    from: "payment_terms",
                    localField: "selected_payment_terms",
                    foreignField: "_id",
                    as: "payment_terms",
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [{ $size: "$schedule" }, 1]
                                }
                            }
                        }
                    ]
                }
            },
            { $unwind: "$payment_terms" },
            { $unwind: "$payment_terms.schedule" },
            {
                $addFields: {
                    due_date: {
                        $add: ["$createdAt", { $multiply: ["$payment_terms.schedule.days", 24 * 60 * 60 * 1000] }]
                    }
                }
            },
            // {
            //     $match: {
            //         $expr: {
            //             $eq: [
            //                 { $dateToString: { format: "%Y-%m-%d", date: "$due_date" } },
            //                 today.format("YYYY-MM-DD")
            //             ]
            //         }
            //     }
            // },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" }
        ]);
        // console.log("enquiries : ", enquiries)

        // for (let i = 0; i < enquiries.length; i++) {
        //     const enquiry = enquiries[i];
        //     const mailOptions = {
        //         to: enquiry.user.email,
        //         subject: "Payment Reminder",
        //         buyer_name: enquiry.user.full_name || enquiry.user.first_name,
        //         enquiry_id: enquiry.enquiry_unique_id,
        //         payment_due_date: moment(enquiry.due_date).format("dddd, MMMM D, YYYY"),
        //         portal_url: ''
        //     };

        //     await emailer.sendEmail(null, mailOptions, "paymentReminder");

        //     // Notification
        //     const fcmTokens = await fcm_devices.find({ user_id: enquiry.user_id });
        //     const notificationbody = {
        //         title: "Payment Reminder",
        //         // description: `Your payment for enquiry ${enquiry.enquiry_unique_id} is due today.`,
        //         description: `Your payment for enquiry ${enquiry.enquiry_unique_id} is due on ${moment(enquiry.due_date).format("dddd, MMMM D, YYYY")}, based on your selected payment terms (within ${enquiry.payment_terms.schedule.days} days of enquiry creation).`,
        //     };

        //     for (const device of fcmTokens) {
        //         await utils.sendNotification(device.token, notificationbody);
        //     }

        //     const dbnotificationbody = {
        //         title: notificationbody.title,
        //         description: notificationbody.description,
        //         type: "payment_reminder",
        //         receiver_id: enquiry.user_id,
        //         related_to: enquiry._id,
        //         related_to_type: "enquiry",
        //     };
        //     await new Notification(dbnotificationbody).save();
        // }

        for (const enquiry of enquiries) {
            const paydata = await Payment.findOne({
                enquiry_id: enquiry._id,
                buyer_id: enquiry.user_id
            });

            let shouldSendReminder = false;

            if (paydata) {
                const paidScheduleIds = paydata.payment_stage.map(p => p.schedule_id.toString());
                if (!paidScheduleIds.includes(enquiry.payment_terms.schedule._id.toString())) {
                    shouldSendReminder = true;
                }
            } else {
                shouldSendReminder = true;
            }

            if (shouldSendReminder) {
                const formattedDueDate = moment(enquiry.due_date).format("dddd, MMMM D, YYYY");

                const mailOptions = {
                    to: enquiry.user.email,
                    subject: "Payment Reminder",
                    buyer_name: enquiry.user.full_name || enquiry.user.first_name,
                    enquiry_id: enquiry.enquiry_unique_id,
                    payment_due_date: formattedDueDate,
                    portal_url: `${appurl}/enquiry-review-page/${enquiry._id}`
                };

                await emailer.sendEmail(null, mailOptions, "paymentReminder");

                const fcmTokens = await fcm_devices.find({ user_id: enquiry.user_id });

                const notificationBody = {
                    title: "Payment Reminder",
                    description: `Your payment for enquiry ${enquiry.enquiry_unique_id} is due on ${formattedDueDate}, based on your selected payment terms (within ${enquiry.payment_terms.schedule.days} days of enquiry creation).`,
                };

                for (const device of fcmTokens) {
                    await utils.sendNotification(device.token, notificationBody);
                }

                const dbNotification = {
                    title: notificationBody.title,
                    description: notificationBody.description,
                    type: "payment_reminder",
                    receiver_id: enquiry.user_id,
                    related_to: enquiry._id,
                    related_to_type: "enquiry"
                };

                await new Notification(dbNotification).save();
            }
        }
        // console.log(`✅ Payment reminders sent for ${enquiries.length} enquiries on ${today.format("YYYY-MM-DD")}`);
    } catch (err) {
        console.error("❌ Error in payment reminder cron:", err);
    }
});

cron.schedule("0 11 * * *", async () => {
    try {
        const enquiries = await Enquiry.aggregate([
            {
                $match: {
                    status: "pending",
                    selected_payment_terms: { $ne: null }
                }
            },
            {
                $lookup: {
                    from: "payment_terms",
                    localField: "selected_payment_terms",
                    foreignField: "_id",
                    as: "payment_terms"
                }
            },
            { $unwind: "$payment_terms" },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ]);

        // console.log("enquiries : ", enquiries)

        for (const enquiry of enquiries) {
            const schedules = enquiry.payment_terms.schedule || [];
            const grandTotal = enquiry.grand_total || 0;

            const paydata = await Payment.findOne({
                enquiry_id: enquiry._id,
                buyer_id: enquiry.user_id
            });

            const paidScheduleIds = paydata?.payment_stage.map(p => p.schedule_id.toString()) || [];

            for (const schedule of schedules) {
                const scheduleIdStr = schedule._id.toString();

                if (!paidScheduleIds.includes(scheduleIdStr)) {
                    const payamt = schedule.value_type === "percentage"
                        ? ((grandTotal * schedule.value) / 100).toFixed(2)
                        : schedule.value;

                    const mailOptions = {
                        to: enquiry.user.email,
                        subject: "Payment Pending - Blue Sky",
                        enquiry_id: enquiry.enquiry_unique_id,
                        buyer_name: enquiry.user.full_name,
                        portal_url: `${process.env.APP_URL}/enquiry-review-page/${enquiry._id}` || "",
                        pay_type: "schedule",
                        amount: payamt,
                        schedule: schedule?.schedule_id
                    };

                    // Send email
                    emailer.sendEmail(null, mailOptions, "advancePaymentReminder");

                    // Send push notification
                    const fcmTokens = await fcm_devices.find({ user_id: enquiry.user_id });
                    const notificationBody = {
                        title: 'Schedule payment is pending',
                        description: `A payment schedule is pending for amount ${payamt}.Enquiry ID: ${enquiry?.enquiry_unique_id}`,
                        enquiry: enquiry?._id
                    };

                    for (const device of fcmTokens) {
                        await utils.sendNotification(device.token, notificationBody);
                    }

                    // DB Notification
                    const dbNotification = {
                        title: notificationBody.title,
                        description: notificationBody.description,
                        type: "payment_reminder",
                        receiver_id: enquiry.user_id,
                        related_to: enquiry._id,
                        related_to_type: "enquiry"
                    };

                    await new Notification(dbNotification).save();
                }
            }
        }

        // console.log("✅ Payment reminders sent successfully.");
    } catch (err) {
        console.error("❌ Error in payment reminder cron:", err);
    }
});

cron.schedule("0 12 * * *", async () => {
    try {
        const today = moment().startOf("day");
        // console.log("today : ", today.format("YYYY-MM-DD"));

        const quotations = await EnquiryQuotes.aggregate([
            {
                $match: {
                    status: { $ne: "delivered" },
                },
            },

            // Extract number and unit from delivery_time
            {
                $addFields: {
                    delivery_number_str: {
                        $let: {
                            vars: {
                                regexResult: {
                                    $regexFind: {
                                        input: "$delivery_time",
                                        regex: /^[0-9]+/,
                                    },
                                },
                            },
                            in: "$$regexResult.match",
                        },
                    },
                },
            },
            {
                $addFields: {
                    delivery_number: {
                        $cond: [
                            { $ifNull: ["$delivery_number_str", false] },
                            { $toInt: "$delivery_number_str" },
                            null,
                        ],
                    },
                    delivery_unit: {
                        $toLower: {
                            $let: {
                                vars: {
                                    parts: {
                                        $cond: [
                                            { $ifNull: ["$delivery_time", false] },
                                            { $split: ["$delivery_time", " "] },
                                            [],
                                        ],
                                    },
                                },
                                in: {
                                    $cond: [
                                        { $gte: [{ $size: "$$parts" }, 2] },
                                        { $arrayElemAt: ["$$parts", 1] },
                                        null,
                                    ],
                                },
                            },
                        },
                    },

                },
            },

            // Calculate delivery days, expected delivery date, and notify date
            {
                $addFields: {
                    delivery_days: {
                        $cond: [
                            { $eq: ["$delivery_unit", "weeks"] },
                            { $multiply: ["$delivery_number", 7] },
                            "$delivery_number",
                        ],
                    },
                },
            },
            {
                $addFields: {
                    expected_delivery_date: {
                        $cond: [
                            { $ifNull: ["$delivery_days", false] },
                            {
                                $add: [
                                    "$createdAt",
                                    { $multiply: ["$delivery_days", 24 * 60 * 60 * 1000] },
                                ],
                            },
                            null,
                        ],
                    },
                    notify_date: {
                        $cond: [
                            { $ifNull: ["$delivery_days", false] },
                            {
                                $subtract: [
                                    {
                                        $add: [
                                            "$createdAt",
                                            { $multiply: ["$delivery_days", 24 * 60 * 60 * 1000] },
                                        ],
                                    },
                                    2 * 24 * 60 * 60 * 1000,
                                ],
                            },
                            null,
                        ],
                    },
                },
            },

            // Match only those where notify_date is today
            {
                $match: {
                    $expr: {
                        $eq: [
                            { $dateToString: { date: "$notify_date", format: "%Y-%m-%d" } },
                            today.format("YYYY-MM-DD"),
                        ],
                    },
                },
            },

            // Lookup related enquiry and buyer
            {
                $lookup: {
                    from: "enquires",
                    localField: "enquiry_id",
                    foreignField: "_id",
                    as: "enquiry",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "user_id",
                                foreignField: "_id",
                                as: "buyer",
                            },
                        },
                        { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
                    ],
                },
            },
            { $unwind: "$enquiry" },
            {
                $match: { "enquiry.status": { $ne: "delivered" } },
            },

            // Lookup supplier
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            { $unwind: "$user" },
        ]);

        // console.log("quotations : ", quotations.length);

        for (const q of quotations) {
            const deliveryDate = moment(q.expected_delivery_date).format("dddd, MMMM D, YYYY");

            const suppliermailOptions = {
                to: q.user.email,
                subject: "Delivery Reminder",
                buyer_name: q.enquiry.buyer.full_name,
                enquiry_id: q.enquiry.enquiry_unique_id,
                expected_date: deliveryDate,
                user_name: q.user.full_name,
                portal_url: `${appurl}/enquiry-review-page/${q.enquiry._id}`,
                status: q.enquiry.status,
            };

            const buyermailOptions = {
                to: q.enquiry.buyer.email,
                subject: "Delivery Reminder",
                buyer_name: q.enquiry.buyer.full_name,
                enquiry_id: q.enquiry.enquiry_unique_id,
                user_name: q.enquiry.buyer.full_name,
                expected_date: deliveryDate,
                portal_url: `${appurl}/enquiry-review-page/${q.enquiry._id}`,
                status: q.enquiry.status,
            };

            await emailer.sendEmail(null, suppliermailOptions, "deliveryReminder");
            await emailer.sendEmail(null, buyermailOptions, "deliveryReminder");

            const supplierfcmTokens = await fcm_devices.find({ user_id: q.user._id });
            const buyerfcmTokens = await fcm_devices.find({ user_id: q.enquiry.buyer._id });

            const notification = {
                title: "Delivery Reminder",
                description: `Expected delivery for enquiry ${q.enquiry.enquiry_unique_id} is due on ${deliveryDate}.`,
            };

            for (const device of supplierfcmTokens) {
                await utils.sendNotification(device.token, notification);
            }
            for (const device of buyerfcmTokens) {
                await utils.sendNotification(device.token, notification);
            }

            await new Notification({
                title: notification.title,
                description: notification.description,
                type: "delivery_reminder",
                receiver_id: q.user._id,
                related_to: q.enquiry._id,
                related_to_type: "enquiry",
            }).save();

            await new Notification({
                title: notification.title,
                description: notification.description,
                type: "delivery_reminder",
                receiver_id: q.enquiry.buyer._id,
                related_to: q.enquiry._id,
                related_to_type: "enquiry",
            }).save();
        }

        // console.log(`✅ Delivery reminders sent for ${quotations.length} quotations on ${today.format("YYYY-MM-DD")}`);
    } catch (error) {
        console.error("❌ Error in delivery reminder cron:", error);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// CRON: Auto-expire subscriptions - Runs every hour at minute 0
// Checks for active subscriptions where end_at date has passed and marks them as expired
// ═══════════════════════════════════════════════════════════════════════════
cron.schedule("0 * * * *", async () => {
    try {
        const now = new Date();
        console.log(`🔄 Running subscription expiration check at ${now.toISOString()}`);
        
        // Find and update all active subscriptions that have expired
        const result = await Subscription.updateMany(
            {
                status: 'active',
                end_at: { $exists: true, $ne: null, $lt: now }
            },
            {
                $set: { 
                    status: 'expired',
                    is_active: false
                }
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`✅ Auto-expired ${result.modifiedCount} subscription(s) at ${now.toISOString()}`);
        }
    } catch (error) {
        console.error("❌ Error in subscription expiration cron:", error);
    }
});

// Run subscription expiration check on server startup only after MongoDB is connected
function runStartupSubscriptionExpirationCheck() {
    (async () => {
        try {
            const now = new Date();
            console.log(`🚀 Running startup subscription expiration check...`);
            const result = await Subscription.updateMany(
                {
                    status: 'active',
                    end_at: { $exists: true, $ne: null, $lt: now }
                },
                {
                    $set: {
                        status: 'expired',
                        is_active: false
                    }
                }
            );
            if (result.modifiedCount > 0) {
                console.log(`✅ Startup: Auto-expired ${result.modifiedCount} subscription(s)`);
            } else {
                console.log(`✅ Startup: No expired subscriptions found`);
            }
        } catch (error) {
            console.error("❌ Error in startup subscription expiration check:", error);
        }
    })();
}
if (mongoose.connection.readyState === 1) {
    runStartupSubscriptionExpirationCheck();
} else {
    mongoose.connection.once('connected', runStartupSubscriptionExpirationCheck);
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// NEW CRON JOBS: AUTOMATIC PAYMENT RETRY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// CRON: Process Payment Retries - Runs every 6 hours
// Finds due payment retries and executes them automatically
// Schedule: Day 2, 4, 6 after payment failure
// ═══════════════════════════════════════════════════════════════════════════
cron.schedule("0 */6 * * *", async () => {
    try {
        const now = new Date();
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔄 PAYMENT RETRY PROCESSOR - ${moment(now).format('YYYY-MM-DD HH:mm:ss')}`);
        console.log(`${'='.repeat(80)}`);
        
        // Use the PaymentRetryService to process all due retries
        const results = await PaymentRetryService.processDueRetries();
        
        console.log(`\n📊 Summary:`);
        console.log(`   Total Processed: ${results.length}`);
        console.log(`   Successful: ${results.filter(r => r.success).length}`);
        console.log(`   Failed: ${results.filter(r => !r.success && !r.allRetriesExhausted).length}`);
        console.log(`   Exhausted: ${results.filter(r => r.allRetriesExhausted).length}`);
        console.log(`${'='.repeat(80)}\n`);
        
    } catch (error) {
        console.error("❌ Error in payment retry processor cron:", error);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// CRON: Send Renewal Reminders - Runs daily at 9 AM
// Sends subscription renewal reminders for subscriptions expiring in 7, 3, or 1 day
// ═══════════════════════════════════════════════════════════════════════════
cron.schedule("0 9 * * *", async () => {
    try {
        const now = new Date();
        console.log(`\n${'='.repeat(80)}`);
        console.log(`📧 SUBSCRIPTION RENEWAL REMINDERS - ${moment(now).format('YYYY-MM-DD HH:mm:ss')}`);
        console.log(`${'='.repeat(80)}`);
        
        // Check for subscriptions expiring in 7, 3, or 1 day
        const reminderDays = [7, 3, 1];
        let totalEmailsSent = 0;
        
        for (const days of reminderDays) {
            const targetDate = new Date(now);
            targetDate.setDate(targetDate.getDate() + days);
            
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
            
            console.log(`\n🔍 Checking for subscriptions expiring in ${days} day(s)...`);
            
            const expiringSubscriptions = await Subscription.find({
                status: 'active',
                end_at: { $gte: startOfDay, $lte: endOfDay },
                source: 'stripe', // Only for Stripe subscriptions (IAP handled by stores)
                auto_retry_enabled: { $ne: false }
            }).populate('user_id');
            
            console.log(`   Found ${expiringSubscriptions.length} subscription(s)`);
            
            for (const subscription of expiringSubscriptions) {
                try {
                    const user = subscription.user_id;
                    const plan = await Plan.findOne({ plan_id: subscription.plan_id });
                    
                    if (!user || !user.email) {
                        console.log(`   ⚠️ Skipping subscription ${subscription._id} - no user email`);
                        continue;
                    }
                    
                    // Get billing portal URL for payment method update
                    let updatePaymentLink = urlHelper.frontendUrl('my-account/invoices');
                    if (subscription.stripe_customer_id) {
                        try {
                            updatePaymentLink = await stripeBillingPortal.getBillingPortalUrl(
                                subscription.stripe_customer_id,
                                'my-account/invoices'
                            );
                        } catch (portalError) {
                            console.warn(`   ⚠️ Could not create billing portal URL:`, portalError.message);
                        }
                    }
                    
                    const emailData = {
                        name: user.name || user.email,
                        planName: plan?.plan_name || subscription.type,
                        amount: plan?.price || 0,
                        currency: plan?.currency || 'USD',
                        renewalDate: moment(subscription.end_at).format('MMMM DD, YYYY'),
                        daysUntilRenewal: days,
                        paymentMethod: subscription.stripe_payment_method_id ? 
                            '****' + subscription.stripe_payment_method_id.slice(-4) : '****',
                        updatePaymentLink: updatePaymentLink,
                        supportEmail: process.env.SUPPORT_EMAIL || 'support@blueskyoutsourcing.com'
                    };
                    
                    await emailer.sendEmail(
                        user.email,
                        `🔔 Your Subscription Renews in ${days} Day${days > 1 ? 's' : ''}`,
                        'subscriptionRenewalReminder',
                        emailData
                    );
                    
                    totalEmailsSent++;
                    console.log(`   ✅ Reminder sent to: ${user.email} (${days} days)`);
                    
                } catch (emailError) {
                    console.error(`   ❌ Error sending reminder for subscription ${subscription._id}:`, emailError.message);
                }
            }
        }
        
        console.log(`\n📊 Summary: Sent ${totalEmailsSent} renewal reminder email(s)`);
        console.log(`${'='.repeat(80)}\n`);
        
    } catch (error) {
        console.error("❌ Error in renewal reminder cron:", error);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// CRON: Handle Suspended Subscriptions - Runs daily at 10 AM
// Sends daily reminders for suspended subscriptions (7 days)
// Cancels subscriptions after 15 days of suspension
// ═══════════════════════════════════════════════════════════════════════════
cron.schedule("0 10 * * *", async () => {
    try {
        const now = new Date();
        console.log(`\n${'='.repeat(80)}`);
        console.log(`⏸️  SUSPENDED SUBSCRIPTION HANDLER - ${moment(now).format('YYYY-MM-DD HH:mm:ss')}`);
        console.log(`${'='.repeat(80)}`);
        
        // Find all suspended subscriptions
        const suspendedSubs = await Subscription.find({
            dunning_status: 'suspended',
            status: 'suspended',
            suspension_date: { $exists: true, $ne: null }
        }).populate('user_id');
        
        console.log(`\n📋 Found ${suspendedSubs.length} suspended subscription(s)`);
        
        let dailyRemindersSent = 0;
        let subscriptionsCancelled = 0;
        
        for (const subscription of suspendedSubs) {
            try {
                const user = subscription.user_id;
                if (!user || !user.email) {
                    console.log(`   ⚠️ Skipping subscription ${subscription._id} - no user email`);
                    continue;
                }
                
                const daysSinceSuspension = Math.floor(
                    (now - new Date(subscription.suspension_date)) / (1000 * 60 * 60 * 24)
                );
                
                console.log(`\n   📌 Subscription ${subscription._id}:`);
                console.log(`      User: ${user.email}`);
                console.log(`      Days suspended: ${daysSinceSuspension}`);
                
                // Send daily reminders for first 7 days
                if (daysSinceSuspension >= 1 && daysSinceSuspension <= 7) {
                    const plan = await Plan.findOne({ plan_id: subscription.plan_id });
                    
                    // Get billing portal URL for reactivation
                    let reactivateLink = urlHelper.frontendUrl('my-account/invoices');
                    if (subscription.stripe_customer_id) {
                        try {
                            reactivateLink = await stripeBillingPortal.getBillingPortalUrl(
                                subscription.stripe_customer_id,
                                'my-account/invoices'
                            );
                        } catch (portalError) {
                            console.warn(`   ⚠️ Could not create billing portal URL:`, portalError.message);
                        }
                    }
                    
                    const emailData = {
                        name: user.name || user.email,
                        planName: plan?.plan_name || subscription.type,
                        amount: plan?.price || 0,
                        currency: plan?.currency || 'USD',
                        dayNumber: daysSinceSuspension,
                        suspensionDate: moment(subscription.suspension_date).format('MMMM DD, YYYY'),
                        reactivateLink: reactivateLink,
                        benefits: [
                            'Full access to all features',
                            'Priority customer support',
                            'Continuous service without interruption',
                            'Access to latest updates and improvements'
                        ],
                        supportEmail: process.env.SUPPORT_EMAIL || 'support@blueskyoutsourcing.com'
                    };
                    
                    await emailer.sendEmail(
                        user.email,
                        `⏰ Day ${daysSinceSuspension}/7 - Reactivate Your BSO Subscription`,
                        'subscriptionDailyReminder',
                        emailData
                    );
                    
                    dailyRemindersSent++;
                    console.log(`      ✅ Daily reminder sent (Day ${daysSinceSuspension}/7)`);
                }
                
                // Cancel after 15 days
                if (daysSinceSuspension >= 15) {
                    console.log(`      🚫 Cancelling subscription (15 days passed)...`);
                    
                    await PaymentRetryService.cancelSubscription(subscription._id);
                    
                    // Send cancellation email
                    const plan = await Plan.findOne({ plan_id: subscription.plan_id });
                    
                    const emailData = {
                        name: user.name || user.email,
                        planName: plan?.plan_name || subscription.type,
                        cancellationDate: moment(now).format('MMMM DD, YYYY'),
                        resubscribeLink: urlHelper.frontendUrl('subscription-plan'),
                        plansLink: urlHelper.frontendUrl('subscription-plan'),
                        feedbackLink: urlHelper.frontendUrl('contact-us') // Using contact-us instead of feedback
                    };
                    
                    await emailer.sendEmail(
                        user.email,
                        'We\'re Sorry to See You Go - Subscription Cancelled',
                        'subscriptionCancelled',
                        emailData
                    );
                    
                    subscriptionsCancelled++;
                    console.log(`      ✅ Subscription cancelled and email sent`);
                }
                
            } catch (error) {
                console.error(`   ❌ Error processing subscription ${subscription._id}:`, error.message);
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   Daily reminders sent: ${dailyRemindersSent}`);
        console.log(`   Subscriptions cancelled: ${subscriptionsCancelled}`);
        console.log(`${'='.repeat(80)}\n`);
        
    } catch (error) {
        console.error("❌ Error in suspended subscription handler cron:", error);
    }
});

console.log(`\n✅ Automatic Payment Retry System Initialized`);
console.log(`   - Payment Retry Processor: Every 6 hours`);
console.log(`   - Renewal Reminders: Daily at 9 AM`);
console.log(`   - Suspended Handler: Daily at 10 AM`);
console.log(`   - Retry Schedule: Day 2, 4, 6\n`);


exports.dashboardChartData = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({
            profile_completed: true,
            is_deleted: false,
        });
        const totalBuyer = await User.countDocuments({
            user_type: { $in: ["buyer"] },
            profile_completed: true,
            is_deleted: false,
        });
        const totalSupplier = await User.countDocuments({
            user_type: {
                $in: ["supplier"],
            },
            profile_completed: true,
            is_deleted: false,
        });
        const totalLogistics = await User.countDocuments({
            user_type: {
                $in: ["logistics"],
            },
            profile_completed: true,
            is_deleted: false,
        });
        const totalResource = await User.countDocuments({
            user_type: { $in: ["resource"] },
            profile_completed: true,
            is_deleted: false,
        });
        return res.status(200).json({
            message: "Dashboard data fetched successfully",
            totalUsers,
            totalBuyer,
            totalSupplier,
            totalLogistics,
            totalResource
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getRevenueChartData = async (req, res) => {
    try {
        const { selectedPeriod } = req.query;
        if (!selectedPeriod) {
            utils.handleError(res, {
                message: "Time period is required",
                code: 200
            })
        }
        let currentDate = new Date();
        let startOfPeriod, endOfPeriod;

        if (selectedPeriod === 'daily') {
            startOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
            endOfPeriod = new Date(currentDate.setHours(23, 59, 59, 999));
        } else if (selectedPeriod === 'weekly') {
            startOfPeriod = new Date();
            startOfPeriod.setDate(currentDate.getDate() - 6);
            startOfPeriod.setHours(0, 0, 0, 0);

            endOfPeriod = new Date();
            endOfPeriod.setHours(23, 59, 59, 999);
        } else if (selectedPeriod === 'monthly') {
            startOfPeriod = new Date();
            startOfPeriod.setMonth(currentDate.getMonth() - 1);
            startOfPeriod.setHours(0, 0, 0, 0);

            endOfPeriod = new Date();
            endOfPeriod.setHours(23, 59, 59, 999);
        } else if (selectedPeriod === 'yearly') {
            startOfPeriod = new Date();
            startOfPeriod.setFullYear(currentDate.getFullYear() - 1);
            startOfPeriod.setHours(0, 0, 0, 0);

            endOfPeriod = new Date();
            endOfPeriod.setHours(23, 59, 59, 999);
        }

        // console.log("Date range:", startOfPeriod, "to", endOfPeriod);

        let filter = {
            createdAt: { $gte: startOfPeriod, $lte: endOfPeriod },
            // order_status: { $ne: 'cancelled' } // Exclude cancelled orders
            // payment_status : {$in : ['succeeded']}
        };

        let data = [];

        if (selectedPeriod === 'daily') {
            const dailyData = await Payment.aggregate([
                { $match: filter },
                {
                    $project: {
                        hour: { $hour: "$createdAt" },
                        total_amount: 1
                    }
                },
                {
                    $group: {
                        _id: "$hour",
                        total: { $sum: "$total_amount" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            // console.log("dailyData:", dailyData);

            data = Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                total: 0
            }));

            dailyData.forEach(item => {
                if (item._id >= 0 && item._id <= 23) {
                    data[item._id] = {
                        hour: item._id,
                        total: parseFloat(item.total.toFixed(2))
                    };
                }
            });

        } else if (selectedPeriod === 'weekly') {

            const currentDate = new Date();
            const month = currentDate.getMonth();
            const year = currentDate.getFullYear();

            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0);

            const firstDayOfWeek = startOfMonth.getDay(); // 0 (Sunday) to 6 (Saturday)
            const daysInMonth = endOfMonth.getDate();
            const weeksInMonth = Math.ceil((daysInMonth + firstDayOfWeek) / 7);

            const weeksData = await Payment.aggregate([
                { $match: filter },
                {
                    $project: {
                        createdAt: 1,
                        total_amount: 1,
                        weekOfMonth: {
                            $ceil: {
                                $divide: [
                                    {
                                        $add: [
                                            { $subtract: ["$createdAt", startOfMonth] },
                                            firstDayOfWeek * 24 * 60 * 60 * 1000
                                        ]
                                    },
                                    7 * 24 * 60 * 60 * 1000
                                ]
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$weekOfMonth",
                        total: { $sum: "$total_amount" }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            data = Array.from({ length: weeksInMonth }, (_, i) => ({
                week: i + 1,
                total: 0
            }));

            weeksData.forEach(item => {
                if (item._id >= 1 && item._id <= weeksInMonth) {
                    data[item._id - 1] = {
                        week: item._id,
                        total: parseFloat(item.total.toFixed(2))
                    };
                }
            });

        } else if (selectedPeriod === 'monthly') {
            const daysInMonth = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                0
            ).getDate();
            // console.log("daysInMonth : ", daysInMonth)
            const monthlyData = await Payment.aggregate([
                { $match: filter },
                { $project: { day: { $dayOfMonth: "$createdAt" }, total_amount: 1 } },
                { $group: { _id: "$day", total: { $sum: "$total_amount" } } },
                { $sort: { _id: 1 } }
            ]);
            // console.log("monthlyData : ", monthlyData)

            data = Array.from({ length: daysInMonth }, (_, i) => ({
                day: i + 1,
                total: 0
            }));
            monthlyData.forEach(item => {
                data[item._id - 1] = {
                    day: item._id,
                    total: item.total
                };
            });
        } else if (selectedPeriod === 'yearly') {
            const yearlyData = await Payment.aggregate([
                { $match: filter },
                { $project: { month: { $month: "$createdAt" }, total_amount: 1 } },
                { $group: { _id: "$month", total: { $sum: "$total_amount" } } },
                { $sort: { _id: 1 } }
            ]);
            console.log("yearlyData : ", yearlyData)

            data = Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                total: 0
            }));

            yearlyData.forEach(item => {
                data[item._id - 1] = {
                    month: item._id,
                    total: item.total
                };
            });
        }

        return res.json({
            message: "Revenue data fetched successfully",
            data,
            code: 200
        });

    } catch (error) {
        console.error("Error fetching revenue data:", error);
        utils.handleError(res, error);
    }
};