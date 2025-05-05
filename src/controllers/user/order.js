const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Order = require("../../models/order")
const utils = require("../../utils/utils");

exports.myOrder = async (req, res) => {
    try {
        const { offset = 0, limit = 10, order_type = "active", search = "" } = req.query
        const userId = req.user._id
        console.log("userId : ", userId)
        const filter = {
            buyer_id: new mongoose.Types.ObjectId(userId)
        }
        if (order_type) {
            filter.order_type = order_type
        }
        if (search) {
            filter.order_unique_id = { $regex: search, $options: "i" }
        }
        // const myorders = await Order.find({ buyer_id: userId }, filter).skip(parseInt(offset)).limit(parseInt(limit)).populate('order_items.product_id').populate('order_items.supplier_id').populate('order_items.logistics_id').populate('order_items.variant_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id').populate('buyer_id').populate('logistics_id')
        const myorders = await Order.aggregate(
            [
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "buyer_id",
                        foreignField: "_id",
                        as: "buyer_data",
                        pipeline : [
                            {
                                $project: {
                                   password: 0,
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$buyer_data",
                        preserveNullAndEmptyArrays: true
                    }
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
                    $unwind: {
                        path: "$enquiry_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "logistics_id",
                        foreignField: "_id",
                        as: "logistics_data",
                        pipeline : [
                            {
                                $project: {
                                   password: 0,
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$logistics_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "addresses",
                        localField: "shipping_address",
                        foreignField: "_id",
                        as: "shipping_address_data"
                    }
                },
                {
                    $unwind: {
                        path: "$shipping_address_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "addresses",
                        localField: "billing_address",
                        foreignField: "_id",
                        as: "billing_address_data"
                    }
                },
                {
                    $unwind: {
                        path: "$billing_address_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "tracking_orders",
                        localField: "tracking_id",
                        foreignField: "_id",
                        as: "tracking_orders_data"
                    }
                },
                {
                    $unwind: {
                        path: "$tracking_orders_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "payments",
                        localField: "payment_id",
                        foreignField: "_id",
                        as: "payment_data"
                    }
                },
                {
                    $unwind: {
                        path: "$payment_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: parseInt(offset) || 0
                },
                {
                    $limit: parseInt(limit) || 10
                }
            ]
        )
        const count = await Order.countDocuments(filter)
        console.log("myorders : ", myorders)

        // if (!myorders || myorders.length === 0) {
        //     return utils.handleError(res, {
        //         message: "Order not found",
        //         code: 404,
        //     });
        // }
        return res.status(200).json({
            message: "Orders list fetched successfully",
            data: myorders,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.OrderDetails = async (req, res) => {
    try {
        const { id } = req.params
        // const order_data = await Order.findOne({ _id: id }).populate('order_items.product_id').populate('order_items.supplier_id').populate('order_items.logistics_id').populate('order_items.variant_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id').populate('logistics_id')
        const order_data = await Order.aggregate(
            [
                {
                    $match: { _id: new mongoose.Types.ObjectId(id) }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "buyer_id",
                        foreignField: "_id",
                        as: "buyer_data",
                        pipeline : [
                            {
                                $project: {
                                   password: 0,
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$buyer_data",
                        preserveNullAndEmptyArrays: true
                    }
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
                    $unwind: {
                        path: "$enquiry_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "logistics_id",
                        foreignField: "_id",
                        as: "logistics_data",
                        pipeline : [
                            {
                                $project: {
                                   password: 0,
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$logistics_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "addresses",
                        localField: "shipping_address",
                        foreignField: "_id",
                        as: "shipping_address_data"
                    }
                },
                {
                    $unwind: {
                        path: "$shipping_address_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "addresses",
                        localField: "billing_address",
                        foreignField: "_id",
                        as: "billing_address_data"
                    }
                },
                {
                    $unwind: {
                        path: "$billing_address_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "tracking_orders",
                        localField: "tracking_id",
                        foreignField: "_id",
                        as: "tracking_orders_data"
                    }
                },
                {
                    $unwind: {
                        path: "$tracking_orders_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "payments",
                        localField: "payment_id",
                        foreignField: "_id",
                        as: "payment_data"
                    }
                },
                {
                    $unwind: {
                        path: "$payment_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
            ]
        )
        console.log("order_data : ", order_data)

        if (!order_data) {
            return utils.handleError(res, {
                message: "Order not found",
                code: 404,
            });
        }

        return res.status(200).json({
            message: "order details fetched successfully",
            data: order_data[0],
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}