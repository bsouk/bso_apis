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
