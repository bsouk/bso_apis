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
const Notification = require("../../models/notification")
const Subscription = require("../../models/subscription")
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
cron.schedule("* * * * *", async () => {
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
        console.log("enquiries : ", enquiries)

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

        console.log("Date range:", startOfPeriod, "to", endOfPeriod);

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
            console.log("dailyData:", dailyData);

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
            console.log("daysInMonth : ", daysInMonth)
            const monthlyData = await Payment.aggregate([
                { $match: filter },
                { $project: { day: { $dayOfMonth: "$createdAt" }, total_amount: 1 } },
                { $group: { _id: "$day", total: { $sum: "$total_amount" } } },
                { $sort: { _id: 1 } }
            ]);
            console.log("monthlyData : ", monthlyData)

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