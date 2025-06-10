const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Order = require("../../models/order")
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const Payment = require("../../models/payment")
const User = require("../../models/user")
const enquiry = require("../../models/Enquiry")
const tracking_order = require("../../models/tracking_order");
const Notification = require("../../models/notification")
const fcm_devices = require("../../models/fcm_devices");


exports.getPaymentListing = async (req, res) => {
    try {
        const { status, from_date, to_date, offset = 0, limit = 10, user_id } = req.query
        const filter = {}
        if (status) {
            filter.status = status
        }
        if (user_id) {
            filter.buyer_id = new mongoose.Types.ObjectId(user_id)
        }
        if (from_date && to_date) {
            const newFromDate = new Date(from_date);
            const newToDate = new Date(to_date);
            if (isNaN(newFromDate) || isNaN(newToDate)) {
                return res.status(400).json({ error: "Invalid date format" });
            }
            filter.createdAt = { $gte: newFromDate, $lte: newToDate }
        }
        const data = await Payment.aggregate(
            [
                {
                    $match: { ...filter }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "buyer_id",
                        foreignField: "_id",
                        as: "buyer",
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    full_name: 1,
                                    first_name: 1,
                                    last_name: 1,
                                    email: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$buyer",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "orders",
                        let: { id: "$order_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$id"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    order_unique_id: 1
                                }
                            }
                        ],
                        as: "order_data"
                    }
                },
                {
                    $unwind: {
                        path: "$order_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: parseInt(offset)
                },
                {
                    $limit: parseInt(limit)
                }
            ]
        )

        const count = await Payment.countDocuments(filter)
        return res.status(200).json({
            message: "Payment data fetched successfully",
            data,
            count,
            code: 200
        })
    }
    catch (error) {
        utils.handleError(res, error);
    }
}

exports.paymentDetails = async (req, res) => {
    try {
        const { id } = req.params
        const payment_data = await Payment.aggregate(
            [
                {
                    $match: { _id: new mongoose.Types.ObjectId(id) }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "buyer_id",
                        foreignField: "_id",
                        as: "buyer",
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    full_name: 1,
                                    first_name: 1,
                                    last_name: 1,
                                    email: 1,
                                    profile_image: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$buyer",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "orders",
                        let: { id: "$order_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$id"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    order_unique_id: 1
                                }
                            }
                        ],
                        as: "order_data"
                    }
                },
                {
                    $unwind: {
                        path: "$order_data",
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]
        )

        return res.status(200).json({
            message: "Payment details fetched successfully",
            data: payment_data[0],
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.updatepaymentstatus = async (req, res) => {
    try {
        const { payment_id, payment_stage_id } = req.body;

        if (!payment_id || !payment_stage_id) {
            return res.status(400).json({ error: "Payment ID and Payment Stage ID are required", code: 400 });
        }


        const payment = await Payment.findOne({ _id: payment_id }).populate('buyer_id').populate('supplier_id').populate('enquiry_id');
        console.log("payment : ", payment)
        if (!payment) {
            return res.status(404).json({ error: "Payment not found", code: 404 });
        }


        const stageIndex = payment.payment_stage.findIndex(stage => stage._id.toString() === payment_stage_id);
        if (stageIndex === -1) {
            return res.status(404).json({ error: "Payment stage not found", code: 404 });
        }


        payment.payment_stage[stageIndex].status = "succeeded";
        payment.payment_stage[stageIndex].schedule_status = "completed";

        await payment.save();


        //send notification for payment
        const mailOptions = {
            to: payment?.buyer_id?.email || payment?.supplier_id?.email,
            subject: "Payment Approved",
            enquiry_id: payment?.enquiry_id?.enquiry_unique_id,
            user_name: payment?.buyer_id?.user_id?.full_name || payment?.supplier_id?.user_id?.full_name,
            amount: payment.payment_stage[stageIndex]?.amount,
            schedule: payment.payment_stage[stageIndex]?.schedule_id,
            transaction_id: payment.payment_stage[stageIndex]?.txn_id,
            method: payment.payment_stage[stageIndex]?.payment_method,
            portal_url: `${process.env.APP_URL}/enquiry-review-page/${payment?.enquiry_id?._id}`,
        }
        emailer.sendEmail(null, mailOptions, "adminPaymentConfirmation");
        //send notification
        const notificationMessage = {
            title: 'Payment Approved',
            description: `Your payment for enquiry ${payment?.enquiry_id?.enquiry_unique_id} that has been uploaded to review has been approved by bso`,
            enquiry: payment?.enquiry_id?._id
        };

        let id = payment?.buyer_id?._id ?? payment?.supplier_id?._id;
        const fcm = await fcm_devices.find({ user_id: new mongoose.Types.ObjectId(id) });
        console.log("fcm : ", fcm)

        if (fcm && fcm.length > 0) {
            fcm.forEach(async i => {
                const token = i.token
                console.log("token : ", token)
                await utils.sendNotification(token, notificationMessage);
            })
            const NotificationData = {
                title: notificationMessage.title,
                // body: notificationMessage.description,
                description: notificationMessage.description,
                type: "payment_completed",
                receiver_id: id,
                related_to: id,
                related_to_type: "user",
            };
            const newNotification = new Notification(NotificationData);
            console.log("newNotification : ", newNotification)
            await newNotification.save();
        }


        return res.status(200).json({
            message: "Payment stage updated to completed",
            data: payment,
            code: 200
        });
    } catch (error) {
        console.error("Error in logisticpaynow:", error);
        return res.status(500).json({ error: "Internal server error", code: 500 });
    }
}