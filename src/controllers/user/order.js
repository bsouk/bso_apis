const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Order = require("../../models/order")
const utils = require("../../utils/utils");

exports.myOrder = async (req, res) => {
    try {
        const { offset = 0, limit = 10, order_type = "active", search = "" } = req.query
        const userId = req.user._id
        console.log("userId : ", userId)

        const myorders = await Order.find({ buyer_id: userId, order_type, order_unique_id: { $regex: search, $options: "i" } }).skip(parseInt(offset)).limit(parseInt(limit)).populate('order_items.product_id').populate('order_items.supplier_id').populate('order_items.logistics_id').populate('order_items.variant_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id')
        const count = await Order.countDocuments()
        console.log("myorders : ", myorders)

        if (!myorders || myorders.length === 0) {
            return utils.handleError(res, {
                message: "Order not found",
                code: 404,
            });
        }
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
        const order_data = await Order.findOne({ _id: id }).populate('order_items.product_id').populate('order_items.supplier_id').populate('order_items.logistics_id').populate('order_items.variant_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id')
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