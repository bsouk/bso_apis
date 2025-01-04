const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const User = require("../../models/user")
const Order = require("../../models/order")
const Payment = require("../../models/payment")
const utils = require("../../utils/utils");

exports.downloadReport = async (req, res) => {
    const { format, reportOf } = req.body
    console.log("file format is ", format)

    if (!['excel', 'csv', 'pdf'].includes(format)) {
        return utils.handleError(res, {
            message: "unavailable download format",
            code: 404,
        });
    }

    try {
        switch (reportOf) {
            case "User": {
                let userList = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    userList = await User.find({
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    })
                } else {
                    userList = await User.find()
                }
                console.log("user list is", userList);

                if (userList.length <= 0) {
                    return res.status(401).json({
                        message: "No user data found",
                        code: 401
                    })
                }

                const cleanUserList = userList.map((user) => ({
                    userId: user?.unique_user_id,
                    fullName: user?.full_name,
                    companyName: user?.company_name,
                    email: user?.email,
                    phoneNumber: user?.phone_number,
                    userType: user?.user_type,
                    status: user?.status,
                    profileCompleted: user?.profile_completed
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanUserList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanUserList, res)
                } else {
                    return utils.generatePDF(cleanUserList, res)
                }
            };
                break;
            case "Article": {
                let articleList = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    articleList = await Article.find({
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    }).lean()
                } else {
                    articleList = await Article.find().lean()
                }
                console.log("article list is", articleList);

                if (articleList.length <= 0) {
                    return res.status(401).json({
                        message: "No Article data found",
                        code: 401
                    })
                }

                const cleanArticleList = articleList.map((article) => ({
                    ArticleName: article?.name,
                    ArticleId: article?.article_id,
                    CutLengthPrice: article?.min_cut_length_price,
                    WholeSalePrice: article?.price,
                    HSNCode: article?.hsn_code,
                    Discount: article?.applied_discount,
                    FeatureStatus: article?.feature_status,
                    DisplayStatus: article?.status
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanArticleList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanArticleList, res)
                } else {
                    return utils.generatePDF(cleanArticleList, res)
                }
            }; break;
            case "Order": {
                let orderList = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    orderList = await Order.find({
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    }).populate('order_items.product_id').populate('order_items.supplier_id').populate('order_items.logistics_id').populate('order_items.variant_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id').populate('buyer_id')
                } else {
                    orderList = await Order.find().populate('order_items.product_id').populate('order_items.supplier_id').populate('order_items.logistics_id').populate('order_items.variant_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id').populate('buyer_id')
                }
                console.log("article list is", orderList);

                if (orderList.length <= 0) {
                    return res.status(401).json({
                        message: "No Article data found",
                        code: 401
                    })
                }

                const cleanorderList = orderList.map((order) => ({
                    "Order Id": order.order_unique_id,
                    "Order Type": order.order_type,
                    "Order Status": order.order_status,
                    "Buyer": order.buyer_id.full_name,
                    "Amount": order.total_amount,
                    "Delivery Charges": order.delivery_charges,
                    "Shipping Address": `${order.shipping_address.address.address_line_1},${order.shipping_address.address.address_line_2},${order.shipping_address.address.city},${order.shipping_address.address.state},${order.shipping_address.address.country},${order.shipping_address.address.pin_code}`,
                    "Billing Address": `${order.billing_address.address.address_line_1},${order.billing_address.address.address_line_2},${order.billing_address.address.city},${order.billing_address.address.state},${order.billing_address.address.country},${order.billing_address.address.pin_code}`,
                    "Payment": order.payment_id.status
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
                orderList.map(async (order) =>
                    await data.push([order.order_unique_id,
                    order.order_type,
                    order.order_status,
                    order.buyer_id.full_name,
                    order.total_amount,
                    order.delivery_charges,
                    `${order.shipping_address.address.address_line_1},${order.shipping_address.address.address_line_2},${order.shipping_address.address.city},${order.shipping_address.address.state},${order.shipping_address.address.country},${order.shipping_address.address.pin_code}`,
                    `${order.billing_address.address.address_line_1},${order.billing_address.address.address_line_2},${order.billing_address.address.city},${order.billing_address.address.state},${order.billing_address.address.country},${order.billing_address.address.pin_code}`,
                    order.payment_id.status
                    ])
                )

                if (format === "excel") {
                    return utils.generateExcel(cleanorderList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanorderList, res)
                } else {
                    return utils.generatePDF(headings, cleanorderList, res)
                }
            }; break;
            case "Payment": {
                let paymentList = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    paymentList = await Payment.find({
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    })
                } else {
                    paymentList = await Payment.find()
                }
                console.log("article list is", paymentList);

                if (paymentList.length <= 0) {
                    return res.status(401).json({
                        message: "No Article data found",
                        code: 401
                    })
                }

                const cleanpaymentList = paymentList.map((payment) => ({
                    "Payment Method": payment?.payment_method,
                    "Transaction Id": payment?.txn_id,
                    Status: payment?.status,
                    Amount: payment?.total_amount,
                    "Delivery Charges": payment.delivery_charges,
                    Reciept: payment?.receipt_number
                }))

                const headings = [
                    "Payment Method",
                    "Transaction Id",
                    "Status",
                    "Amount",
                    "Delivery Charges",
                    "Reciept"
                ]

                const data = []
                paymentList.map(async (payment) =>
                    await data.push([
                        payment?.payment_method,
                        payment?.txn_id,
                        payment?.status,
                        payment?.total_amount,
                        payment.delivery_charges,
                        payment?.receipt_number
                    ])
                )

                if (format === "excel") {
                    return utils.generateExcel(cleanpaymentList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanpaymentList, res)
                } else {
                    return utils.generatePDF(headings, cleanpaymentList, res)
                }
            }; break;
            case "SubAdmin": {
                let SubAdminList = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    SubAdminList = await Admin.find({
                        createdAt: { $gte: newFromDate, $lte: newToDate },
                        role: "sub_admin"
                    }).lean()
                } else {
                    SubAdminList = await Admin.find({ role: "sub_admin" }).lean()
                }
                console.log("subadmin list is", SubAdminList);

                if (SubAdminList.length <= 0) {
                    return res.status(401).json({
                        message: "No Article data found",
                        code: 401
                    })
                }

                const cleanSubAdminList = SubAdminList.map((subadmin) => ({
                    Name: subadmin?.full_name,
                    Email: subadmin?.email,
                    Role: subadmin?.role,
                    PhoneNumber: subadmin?.phone_number,
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanSubAdminList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanSubAdminList, res)
                } else {
                    return utils.generatePDF(cleanSubAdminList, res)
                }
            }; break;
            default: return utils.handleError(res, {
                message: "Invalid report property",
                code: 404,
            });
        }
    } catch (error) {
        utils.handleError(res, error);
    }
}