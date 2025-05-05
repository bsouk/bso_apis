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
        const userId = req.user._id
        console.log("userId : ", userId)
        const filter = { buyer_id: new mongoose.Types.ObjectId(userId) }
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
                        from: "enquires",
                        localField: "enquiry_id",
                        foreignField: "_id",
                        as: "enquiry_data"
                    }
                },
                {
                    $addFields: {
                        enquiry_unique_id: '$enquiry_data.unique_id',
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
                    $project: {
                        enquiry_data: 0
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
                        from: "enquires",
                        localField: "enquiry_id",
                        foreignField: "_id",
                        as: "enquiry_data"
                    }
                },
                {
                    $addFields: {
                        enquiry_unique_id: '$enquiry_data.unique_id',
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
                    $project : {
                        enquiry_data: 0
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


async function generateUniqueId() {
    const id = await Math.floor(Math.random() * 10000000000)
    console.log('unique id : ', id)
    return `#${id}`
}
exports.paynow = async (req, res) => {
    try {
        const data = req.body
        const userId = req.user._id
        console.log("userId : ", userId)

        const enquiry_data = await enquiry.findOne({ _id: data.enquiry_id }).populate('selected_supplier.quote_id').populate('selected_logistics.quote_id')
        console.log("enquiry_data : ", enquiry_data)

        if (!enquiry_data) {
            return res.status(404).json({ error: "Enquiry not found", code: 404 })
        }

        const orderdata = {
            order_unique_id: await generateUniqueId(),
            enquiry_id: data.enquiry_id,
            buyer_id: userId,
            total_amount: enquiry_data?.grand_total,
            shipping_address: enquiry_data?.shipping_address,
            billing_address: enquiry_data?.shipping_address,
            logistics_id: enquiry_data?.selected_logistics?.quote_id?.user_id,
        }

        const neworder = await Order.create(orderdata)
        console.log("neworder : ", neworder)

        enquiry_data.order_id = neworder._id
        await enquiry_data.save()

        const payment_data = await Payment.create({
            enquiry_id: data.enquiry_id,
            order_id: neworder._id,
            buyer_id: userId,
            total_amount: data.total_amount,
            service_charges: data.service_charges,
            logistics_charges: data.logistics_charges,
            supplier_charges: data.supplier_charges,
            txn_id: 'axis_123A789'
        }
        )

        const tracking_data = {
            tracking_unique_id: await generateUniqueId(),
            order_id: neworder._id,
            logistics_id: enquiry_data?.selected_logistics?.quote_id?.user_id,
        }

        const newtracking = await tracking_order.create(tracking_data)
        console.log("newtracking : ", newtracking)

        neworder.payment_id = payment_data._id
        neworder.tracking_id = newtracking._id

        await neworder.save()

        return res.status(200).json({
            message: "checkout successfull!",
            data: {
                order: neworder,
                payment: payment_data,
                tracking: newtracking
            },
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}