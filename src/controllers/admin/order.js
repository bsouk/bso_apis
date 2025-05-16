const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Order = require("../../models/order")
const utils = require("../../utils/utils");
const payment = require("../../models/payment");

exports.getOrders = async (req, res) => {
    try {
        const { offset = 0, limit = 10, order_type = "", search = "", user_id } = req.query
        const filter = {}
        if (order_type) {
            filter.order_type = order_type
        }
        if (user_id) {
            filter.buyer_id = new mongoose.Types.ObjectId(user_id)
        }
        if (search) {
            filter.order_unique_id = { $regex: search, $options: "i" }
        }
        const myorders = await Order.find(filter).sort({ createdAt: -1 }).skip(parseInt(offset)).limit(parseInt(limit)).populate('enquiry_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id').populate('buyer_id').populate('logistics_id')
        const count = await Order.countDocuments()
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
        const order_data = await Order.findOne({ _id: id }).populate('enquiry_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id').populate('logistics_id').populate('buyer_id')
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

        const existingRecords = await Order.find({ _id: { $in: ids } });

        if (existingRecords.length !== ids.length) {
            return res.status(404).json({
                message: "One or more IDs do not match any records.",
                code: 404
            });
        }
        const result = await Order.deleteMany({ _id: { $in: ids } });

        res.json({
            message: `${result.deletedCount} Order(s) deleted successfully.`,
            code: 200
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
        const { format } = req.body
        console.log("file format is ", format)

        let filter = {}
        if (req.body.user_id) {
            filter.buyer_id = new mongoose.Types.ObjectId(user_id)
        }

        if (!['excel', 'csv', 'pdf'].includes(format)) {
            return utils.handleError(res, {
                message: "unavailable download format",
                code: 404,
            });
        }
        const order_data = await Order.find(filter)
            .populate('enquiry_id')
            .populate('shipping_address')
            .populate('billing_address')
            .populate('payment_id')
            .populate('tracking_id')
            .populate('buyer_id')
            .populate('logistics_id')
        console.log("order : ", order_data)

        if (!order_data) {
            return utils.handleError(res, {
                message: "Order not found",
                code: 404,
            });
        }

        const cleanorderList = order_data.map((order) => ({
            "Order Id": order?.order_unique_id,
            "Order Type": order?.order_type,
            "Order Status": order?.order_status,
            "Buyer": order?.buyer_id?.full_name,
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
