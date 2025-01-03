const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Order = require("../../models/order")
const utils = require("../../utils/utils");
const payment = require("../../models/payment");

exports.getOrders = async (req, res) => {
    try {
        const { offset = 0, limit = 10, order_type = "", search = "" } = req.query
        const filter = {}
        if (order_type) {
            filter.order_type = order_type
        }
        if (search) {
            filter.order_unique_id = { $regex: search, $options: "i" }
        }
        const myorders = await Order.find(filter).skip(parseInt(offset)).limit(parseInt(limit)).populate('order_items.product_id').populate('order_items.supplier_id').populate('order_items.logistics_id').populate('order_items.variant_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id').populate('buyer_id').populate('logistics_id')
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
        const order_data = await Order.findOne({ _id: id }).populate('order_items.product_id').populate('order_items.supplier_id').populate('order_items.logistics_id').populate('order_items.variant_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id').populate('logistics_id')
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
            const result = await Order.findOneAndUpdate({ _id: order_id }, { $set: { order_status: status } }, { new: true })
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


