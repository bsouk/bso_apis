const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Order = require("../../models/order")
const utils = require("../../utils/utils");
const payment = require("../../models/payment");

exports.getOrders = async (req, res) => {
    try {
        const { offset = 0, limit = 10, order_type = "", search = "", user_id } = req.query;

        const parsedOffset = parseInt(offset) || 0;
        const parsedLimit = parseInt(limit) || 10;

        // Base match (order type, specific user)
        const matchStage = {};
        if (order_type) {
            matchStage.order_type = order_type;
        }
        if (user_id) {
            matchStage.buyer_id = new mongoose.Types.ObjectId(user_id);
        }

        const searchTerm = (search || "").trim();
        const hasSearch = searchTerm.length > 0;
        const searchRegex = hasSearch ? new RegExp(searchTerm, "i") : null;

        // Common pipeline: match orders and join buyer for name/email/phone search
        const basePipeline = [
            { $match: matchStage },
            {
                $lookup: {
                    from: "users",
                    localField: "buyer_id",
                    foreignField: "_id",
                    as: "buyer_id",
                    pipeline: [
                        {
                            $project: {
                                password: 0,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$buyer_id",
                    preserveNullAndEmptyArrays: true,
                },
            },
        ];

        // If search is provided, match on order id OR buyer name/email/phone/ID
        if (hasSearch && searchRegex) {
            basePipeline.push({
                $match: {
                    $or: [
                        { order_unique_id: { $regex: searchRegex } },
                        { "buyer_id.full_name": { $regex: searchRegex } },
                        { "buyer_id.email": { $regex: searchRegex } },
                        { "buyer_id.phone_number": { $regex: searchRegex } },
                        { "buyer_id.unique_user_id": { $regex: searchRegex } },
                    ],
                },
            });
        }

        const listPipeline = [
            ...basePipeline,
            { $sort: { createdAt: -1 } },
            { $skip: parsedOffset },
            { $limit: parsedLimit },
        ];

        const countPipeline = [
            ...basePipeline,
            { $count: "count" },
        ];

        const [orders, countResult] = await Promise.all([
            Order.aggregate(listPipeline),
            Order.aggregate(countPipeline),
        ]);

        const count = countResult[0]?.count || 0;

        return res.status(200).json({
            message: "Orders list fetched successfully",
            data: orders,
            count,
            code: 200,
        });
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.OrderDetails = async (req, res) => {
    try {
        const { id } = req.params
        const order_data = await Order.findOne({ _id: id })
            .populate({
                path: 'enquiry_id',
                populate: [
                    { path: 'selected_payment_terms' },
                    {
                        path: 'selected_supplier',
                        populate: {
                            path: 'quote_id',
                            populate: {
                                path: 'enquiry_items.quantity.unit'
                            }
                        }
                    }
                ]
            })
            .populate('shipping_address').populate('billing_address')
            .populate('payment_id')
            .populate('tracking_id')
            .populate('logistics_id')
            .populate('buyer_id')
        console.log("order_data : ", order_data)

        if (!order_data) {
            return utils.handleError(res, {
                message: "Order not found",
                code: 404,
            });
        }

        return res.status(200).json({
            message: "order details fetched successfully",
            data: order_data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.deleteMultipleOrder = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                message: "Please provide a valid array of IDs to delete.",
                code: 400
            });
        }

        // Perform idempotent delete – safe under concurrent requests
        const result = await Order.deleteMany({ _id: { $in: ids } });

        // If nothing was deleted, it's likely another admin already removed them
        if (!result.deletedCount || result.deletedCount === 0) {
            return res.status(409).json({
                message: "No orders were deleted. They may have already been deleted or processed by another admin. Please refresh the list.",
                code: 409
            });
        }

        // If only some of the requested orders were deleted, report that clearly
        if (result.deletedCount < ids.length) {
            return res.status(200).json({
                message: `${result.deletedCount} order(s) deleted. ${ids.length - result.deletedCount} were already deleted or processed by another admin.`,
                code: 200,
                deletedCount: result.deletedCount,
                requestedCount: ids.length,
            });
        }

        // All requested orders deleted successfully
        res.json({
            message: `${result.deletedCount} order(s) deleted successfully.`,
            code: 200,
            deletedCount: result.deletedCount,
            requestedCount: ids.length,
        });

    } catch (error) {
        console.error("Error in deletequery:", error);
        utils.handleError(res, error);
    }
};

exports.changeOrderStatus = async (req, res) => {
    try {
        const { order_id, status, payment_id } = req.body
        if (order_id && status) {
            const result = await Order.findOneAndUpdate({ _id: order_id }, { $set: { order_status: status, order_type: status } }, { new: true })
            console.log("result : ", result)
            return res.status(200).json({
                message: "Order status changed successfully",
                data: result,
                code: 200
            })
        }

        if (payment_id && status) {
            const result = await payment.findOneAndUpdate({ _id: payment_id }, { $set: { status: status } }, { new: true })
            console.log("result : ", result)
            return res.status(200).json({
                message: "Payment status changed successfully",
                data: result,
                code: 200
            })
        }
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.exportOrder = async (req, res) => {
    try {
        const { format, search = "", order_type = "", user_id } = req.body;
        console.log("file format is ", format);

        if (!['excel', 'csv', 'pdf'].includes(format)) {
            return utils.handleError(res, {
                message: "unavailable download format",
                code: 404,
            });
        }

        let filter = {};
        if (order_type) {
            filter.order_type = order_type;
        }
        if (user_id) {
            filter.buyer_id = new mongoose.Types.ObjectId(user_id);
        }

        // Base query with optional order type / user filters
        let order_data = await Order.find(filter)
            .populate('enquiry_id')
            .populate('shipping_address')
            .populate('billing_address')
            .populate('payment_id')
            .populate('tracking_id')
            .populate('buyer_id')
            .populate('logistics_id');
        console.log("order : ", order_data);

        if (!order_data) {
            return utils.handleError(res, {
                message: "Order not found",
                code: 404,
            });
        }

        const searchTerm = (search || "").trim();
        if (searchTerm.length > 0) {
            const regex = new RegExp(searchTerm, "i");
            order_data = order_data.filter((order) => {
                const orderId = order?.order_unique_id || "";
                const buyerName = order?.buyer_id?.full_name || "";
                const buyerEmail = order?.buyer_id?.email || "";
                const buyerPhone = order?.buyer_id?.phone_number || "";
                const buyerUserId = order?.buyer_id?.unique_user_id || "";
                return (
                    regex.test(orderId) ||
                    regex.test(buyerName) ||
                    regex.test(buyerEmail) ||
                    regex.test(buyerPhone) ||
                    regex.test(buyerUserId)
                );
            });
        }

        const cleanorderList = order_data.map((order) => ({
            "Order Id": order?.order_unique_id,
            "Order Type": order?.order_type,
            "Order Status": order?.order_status,
            "Buyer": order?.buyer_id?.full_name || order?.buyer_id?.email || order?.buyer_id?.phone_number || order?.buyer_id?.unique_user_id,
            "Amount": order?.total_amount,
            "Delivery Charges": order?.delivery_charges,
            "Shipping Address": `${order?.shipping_address?.address?.address_line_1},${order?.shipping_address?.address?.address_line_2},${order?.shipping_address?.address?.city},${order?.shipping_address?.address?.state},${order?.shipping_address?.address?.country},${order?.shipping_address?.address?.pin_code}`,
            "Billing Address": `${order?.billing_address?.address?.address_line_1},${order?.billing_address?.address?.address_line_2},${order?.billing_address?.address?.city},${order?.billing_address?.address?.state},${order?.billing_address?.address?.country},${order?.billing_address?.address?.pin_code}`,
            "Payment": order?.payment_id?.status
        }))

        const headings = [
            "Order Id",
            "Order Type",
            "Order Status",
            "Buyer",
            "Amount",
            "Delivery Charges",
            "Shipping Address",
            "Billing Address",
            "Payment"
        ]

        const data = []
        order_data.map(async (order) =>
            await data.push([order?.order_unique_id,
            order?.order_type,
            order?.order_status,
            order?.buyer_id?.full_name,
            order?.total_amount,
            order?.delivery_charges,
            `${order?.shipping_address?.address?.address_line_1},${order?.shipping_address?.address?.address_line_2},${order?.shipping_address?.address?.city},${order?.shipping_address?.address?.state},${order?.shipping_address?.address?.country},${order?.shipping_address?.address?.pin_code}`,
            `${order?.billing_address?.address?.address_line_1},${order?.billing_address?.address?.address_line_2},${order?.billing_address?.address?.city},${order?.billing_address?.address?.state},${order?.billing_address?.address?.country},${order?.billing_address?.address?.pin_code}`,
            order?.payment_id?.status
            ])
        )

        if (format === "excel") {
            return utils.generateExcel(cleanorderList, res)
        } else if (format === "csv") {
            return utils.generateCSV(cleanorderList, res)
        } else {
            return utils.generatePDF(headings, cleanorderList, res)
        }
    } catch (error) {
        utils.handleError(res, error);
    }
}
