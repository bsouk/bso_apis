const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Order = require("../../models/order")
const utils = require("../../utils/utils");

exports.myOrder = async (req, res) => {
    try {
        const userId = req.user._id
        console.log("userId : ", userId)

        const myorders = await Order.find({ buyer_id: userId }).populate('order_items.product_id').populate('order_items.supplier_id').populate('order_items.logistics_id').populate('order_items.variant_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id')
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
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}
