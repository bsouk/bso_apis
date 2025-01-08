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
                        as: "buyer_data"
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
                        from: "users",
                        localField: "logistics_id",
                        foreignField: "_id",
                        as: "logistics_data"
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
                    $unwind: {
                        path: "$order_items",
                        preserveNullAndEmptyArrays: true
                    }
                },

                {
                    $lookup: {
                        from: "products",
                        let: { id: "$order_items.product_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$id"]
                                    }
                                }
                            }
                        ],
                        as: "order_product_data"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: { id: "$order_items.supplier_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$id"]
                                    }
                                }
                            }
                        ],
                        as: "order_supplier_data"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: { id: "$order_items.logistics_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$id"]
                                    }
                                }
                            }
                        ],
                        as: "order_logistics_data"
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        let: {
                            id: "$order_items.variant_id"
                        },
                        pipeline: [
                            { $unwind: "$variant" },
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$variant._id", "$$id"]
                                    }
                                }
                            }
                        ],
                        as: "order_variant_data"
                    }
                },
                {
                    $addFields: {
                        "order_items.product": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$order_product_data",
                                        as: "product",
                                        cond: {
                                            $eq: [
                                                "$$product._id",
                                                "$order_items.product_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        "order_items.supplier": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$order_supplier_data",
                                        as: "supplier",
                                        cond: {
                                            $eq: [
                                                "$$supplier._id",
                                                "$order_items.supplier_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        "order_items.variant": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input:
                                            "$order_variant_data.variant",
                                        as: "variant",
                                        cond: {
                                            $eq: [
                                                "$$variant._id",
                                                "$order_items.variant_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        "order_items.logistics": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$order_logistics_data",
                                        as: "logistics",
                                        cond: {
                                            $eq: [
                                                "$$logistics._id",
                                                "$order_items.logistics_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        data: { $first: "$$ROOT" },
                        order_items: { $push: "$order_items" }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                "$data",
                                { order_items: "$order_items" }
                            ]
                        }
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
                },
                {
                    $project: {
                        order_logistics_data: 0,
                        order_supplier_data: 0,
                        order_variant_data: 0,
                        order_product_data: 0,
                        tracking_orders_data: 0,
                        buyer_data: 0,
                        shipping_address_data: 0,
                        billing_address_data: 0,
                        logistics_data: 0,
                        payment_data: 0,
                        tracking_order: 0,
                        shipping_address: 0,
                        billing_address: 0,
                        tracking_id: 0,
                        buyer_id: 0,
                        logistics_id: 0,
                        payment_id: 0
                    }
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
                        as: "buyer_data"
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
                        from: "users",
                        localField: "logistics_id",
                        foreignField: "_id",
                        as: "logistics_data"
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
                    $unwind: {
                        path: "$order_items",
                        preserveNullAndEmptyArrays: true
                    }
                },

                {
                    $lookup: {
                        from: "products",
                        let: { id: "$order_items.product_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$id"]
                                    }
                                }
                            }
                        ],
                        as: "order_product_data"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: { id: "$order_items.supplier_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$id"]
                                    }
                                }
                            }
                        ],
                        as: "order_supplier_data"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: { id: "$order_items.logistics_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$id"]
                                    }
                                }
                            }
                        ],
                        as: "order_logistics_data"
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        let: {
                            id: "$order_items.variant_id"
                        },
                        pipeline: [
                            { $unwind: "$variant" },
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$variant._id", "$$id"]
                                    }
                                }
                            }
                        ],
                        as: "order_variant_data"
                    }
                },
                {
                    $addFields: {
                        "order_items.product": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$order_product_data",
                                        as: "product",
                                        cond: {
                                            $eq: [
                                                "$$product._id",
                                                "$order_items.product_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        "order_items.supplier": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$order_supplier_data",
                                        as: "supplier",
                                        cond: {
                                            $eq: [
                                                "$$supplier._id",
                                                "$order_items.supplier_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        "order_items.variant": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input:
                                            "$order_variant_data.variant",
                                        as: "variant",
                                        cond: {
                                            $eq: [
                                                "$$variant._id",
                                                "$order_items.variant_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        "order_items.logistics": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$order_logistics_data",
                                        as: "logistics",
                                        cond: {
                                            $eq: [
                                                "$$logistics._id",
                                                "$order_items.logistics_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        data: { $first: "$$ROOT" },
                        order_items: { $push: "$order_items" }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                "$data",
                                { order_items: "$order_items" }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        order_logistics_data: 0,
                        order_supplier_data: 0,
                        order_variant_data: 0,
                        order_product_data: 0
                    }
                }
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