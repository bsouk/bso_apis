const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Order = require("../../models/order")
const utils = require("../../utils/utils");
const Payment = require("../../models/payment")
const User = require("../../models/user")
const enquiry = require("../../models/Enquiry")
const tracking_order = require("../../models/tracking_order");


exports.getPaymentListing = async (req, res) => {
    try {
        const { status, from_date, to_date, offset = 0, limit = 10 } = req.query
        const filter = {}
        if (status) {
            filter.status = status
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
                }
            ]
        )

        return res.status(200).json({
            message: "Payment details fetched successfully",
            data: payment_data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}
