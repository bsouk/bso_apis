const cron = require("node-cron");
const fcm_devices = require("../../models/fcm_devices");
const Enquiry = require("../../models/Enquiry");
const Notification = require("../../models/notification")
const Subscription = require("../../models/subscription")
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const moment = require("moment");

cron.schedule("30 3 * * * ", async () => {
    try {
        const one_day = moment().add(1, "days").endOf("day").format("dddd, MMMM D, YYYY h:mm A");
        console.log("one_day : ", one_day)
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
            console.log("userFcmDevices : ", userFcmDevices)
            let notificationbody = {
                title: 'Plan Change Request',
                description: `As we can see on your enquiry number ${data?.enquiry_unique_id}, no supplier has quoted yet. We request you to change your current plan to BSO Admin.`
            }
            if (userFcmDevices && userFcmDevices.length > 0) {
                userFcmDevices.forEach(async i => {
                    const token = i.token
                    console.log("token : ", token)
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
                console.log("newuserNotification : ", newuserNotification)
                await newuserNotification.save();
            } else {
                console.log(`No active FCM tokens found for user ${trail.user_id}.`);
            }
        }
    } catch (error) {
        console.log("error", error)
    }
});


// cron for reminder for within payment terms
cron.schedule("0 10 * * *", async () => {
    try {
        const today = moment().startOf("day");
        console.log("today : ", today)

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
            { $unwind: "$payment_terms.schedule" },
            {
                $addFields: {
                    due_date: {
                        $add: ["$createdAt", { $multiply: ["$payment_terms.schedule.days", 24 * 60 * 60 * 1000] }]
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $eq: [
                            { $dateToString: { format: "%Y-%m-%d", date: "$due_date" } },
                            today.format("YYYY-MM-DD")
                        ]
                    }
                }
            },
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

        for (let i = 0; i < enquiries.length; i++) {
            const enquiry = enquiries[i];
            const mailOptions = {
                to: enquiry.user.email,
                subject: "Payment Reminder",
                buyer_name: enquiry.user.full_name || enquiry.user.first_name,
                enquiry_id: enquiry.enquiry_unique_id,
                payment_due_date: moment(enquiry.due_date).format("dddd, MMMM D, YYYY"),
            };

            await emailer.sendEmail(null, mailOptions, "paymentReminder");

            // Notification
            const fcmTokens = await fcm_devices.find({ user_id: enquiry.user_id });
            const notificationbody = {
                title: "Payment Reminder",
                // description: `Your payment for enquiry ${enquiry.enquiry_unique_id} is due today.`,
                description: `Your payment for enquiry ${enquiry.enquiry_unique_id} is due on ${moment(enquiry.due_date).format("dddd, MMMM D, YYYY")}, based on your selected payment terms (within ${enquiry.payment_terms.schedule.days} days of enquiry creation).`,
            };

            for (const device of fcmTokens) {
                await utils.sendNotification(device.token, notificationbody);
            }

            const dbnotificationbody = {
                title: notificationbody.title,
                description: notificationbody.description,
                type: "payment_reminder",
                receiver_id: enquiry.user_id,
                related_to: enquiry._id,
                related_to_type: "enquiry",
            };
            await new Notification(dbnotificationbody).save();
        }

        console.log(`✅ Payment reminders sent for ${enquiries.length} enquiries on ${today.format("YYYY-MM-DD")}`);
    } catch (err) {
        console.error("❌ Error in payment reminder cron:", err);
    }
});

