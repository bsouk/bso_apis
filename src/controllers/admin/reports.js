const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const User = require("../../models/user")
const Order = require("../../models/order")
const Payment = require("../../models/payment")
const utils = require("../../utils/utils");
const Admin = require("../../models/admin");
const Brand = require("../../models/brand");
const BusinessCategory = require("../../models/business_category");
const Category = require("../../models/product_category");
const Job = require("../../models/jobs");
const Enquiry = require("../../models/Enquiry")
const moment = require("moment");

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
            case "Buyer": {
                let userList = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    userList = await User.find({
                        user_type: { $in: ['buyer'] },
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    }).sort({ createdAt: -1 })
                } else {
                    userList = await User.find().sort({ createdAt: -1 })
                }
                console.log("user list is", userList);

                if (userList.length <= 0) {
                    return res.status(404).json({
                        message: "No user data found",
                        code: 404
                    })
                }

                const cleanUserList = userList.map((user) => ({
                    "User Id": user?.unique_user_id ? user?.unique_user_id : "",
                    "Full Name": user?.full_name ? user?.full_name : `${user?.first_name} ${user?.last_name}`,
                    "Company Name": user?.company_name ? user?.company_name : "",
                    "Email": user?.email ? user?.email : "",
                    "Phone Number": user?.phone_number,
                    "status": user?.status,
                    "Profile Completed": user?.profile_completed === true ? "Yes" : "No",
                    "Created At": moment(user?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(user?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanUserList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanUserList, res)
                } else {
                    return res.send(cleanUserList);
                }
            };
                break;
            case "Brand": {
                let brand = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    brand = await Brand.find({
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    }).sort({ createdAt: -1 })
                } else {
                    brand = await Brand.find().sort({ createdAt: -1 })
                }
                console.log("brand list is", brand);

                if (brand.length <= 0) {
                    return res.status(401).json({
                        message: "No brand data found",
                        code: 401
                    })
                }

                const cleanUserList = brand.map((brand) => ({
                    "Name": brand?.name ? brand?.name : " ",
                    "Approval Status": brand?.is_admin_approved,
                    "Created At": moment(brand?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(brand?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanUserList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanUserList, res)
                } else {
                    return res.send(cleanUserList);
                }
            };
                break;
            case "Business Category": {
                let brand = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    brand = await BusinessCategory.find({
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    }).sort({ createdAt: -1 })
                } else {
                    brand = await BusinessCategory.find().sort({ createdAt: -1 })
                }
                console.log("BusinessCategory list is", brand);

                if (brand.length <= 0) {
                    return res.status(401).json({
                        message: "No brand data found",
                        code: 401
                    })
                }

                const cleanUserList = brand.map((brand) => ({
                    "Name": brand?.name ? brand?.name : " ",
                    "Approval Status": brand?.is_admin_approved,
                    "Created At": moment(brand?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(brand?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanUserList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanUserList, res)
                } else {
                    return res.send(cleanUserList);
                }
            };
                break;
            case "Category": {
                let brand = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    brand = await Category.find({
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    }).sort({ createdAt: -1 })
                } else {
                    brand = await Category.find().sort({ createdAt: -1 })
                }
                console.log("brand list is", brand);

                if (brand.length <= 0) {
                    return res.status(401).json({
                        message: "No brand data found",
                        code: 401
                    })
                }

                const cleanUserList = brand.map((brand) => ({
                    "Name": brand?.name ? brand?.name : " ",
                    "Approval Status": brand?.is_admin_approved,
                    "Created At": moment(brand?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(brand?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanUserList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanUserList, res)
                } else {
                    return res.send(cleanUserList);
                }
            };
                break;
            case "Supplier": {
                let userList = []
                let filter = {}
                if (req.body.business_category) {
                    const ids = req.body.business_category
                        .split(',')
                        .map(id => id.trim())
                        .filter(id => id);

                    filter['$or'] = ids.map(id => ({
                        'company_data.business_category': new RegExp(`\\b${id}\\b`)
                    }));
                }
                console.log("filter : ", filter);

                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    userList = await User.find({
                        user_type: { $in: ['supplier'] },
                        createdAt: { $gte: newFromDate, $lte: newToDate },
                        ...filter
                    }).sort({ createdAt: -1 })
                } else {
                    userList = await User.find(filter).sort({ createdAt: -1 })
                }
                console.log("user list is", userList);

                if (userList.length <= 0) {
                    return res.status(401).json({
                        message: "No user data found",
                        code: 401
                    })
                }

                const cleanUserList = await Promise.all(userList.map(async (user) => {
                    let category = []
                    if (user.company_data.business_category) {
                        let ids = user?.company_data?.business_category?.split(',')
                            .map(id => id.trim())
                            .filter(id => mongoose.Types.ObjectId.isValid(id))
                            .map(id => new mongoose.Types.ObjectId(id));
                        console.log("ids : ", ids)
                        category = await BusinessCategory.find({ _id: { $in: ids } }, { name: 1, _id: 0 })
                        console.log("category : ", category);
                    }

                    return {
                        "User Id": user?.unique_user_id ? user?.unique_user_id : " ",
                        "Full Name": user?.full_name ? user?.full_name : " ",
                        "Company Name": user?.company_name ? user?.company_name : " ",
                        "Business Category": category.length !== 0 ? category.map((cat) => cat.name).join(", ") : "",
                        "Email": user?.email ? user?.email : " ",
                        "Phone Number": user?.phone_number ? user?.phone_number : " ",
                        "status": user?.status,
                        "Profile Completed": user?.profile_completed === true ? "Yes" : "No",
                        "Account Holder Name": user?.bank_details?.account_holder_name ? user?.bank_details?.account_holder_name : " ",
                        "Account Number": user?.bank_details?.account_number ? user?.bank_details?.account_number : " ",
                        "Bank Name": user?.bank_details?.bank_name ? user?.bank_details?.bank_name : " ",
                        "Swift Code": user?.bank_details?.swift_code ? user?.bank_details?.swift_code : " ",
                        "IBAN Number": user?.bank_details?.iban_number ? user?.bank_details?.iban_number : " ",
                        "Bank Address Line 1": user?.bank_details?.address?.line1 ? user?.bank_details?.address?.line1 : " ",
                        "Bank Address City": user?.bank_details?.address?.city ? user?.bank_details?.address?.city : " ",
                        "Bank Address State": user?.bank_details?.address?.state ? user?.bank_details?.address?.state : " ",
                        "Bank Address Zip Code": user?.bank_details?.address?.zip_code ? user?.bank_details?.address?.zip_code : " ",
                        "Bank Address Country": user?.bank_details?.address?.country ? user?.bank_details?.address?.country : " ",
                        "Company Name": user?.company_data?.name ? user?.company_data?.name : " ",
                        "Company Phone Number": user?.company_data?.phone_number ? user?.company_data?.phone_number : " ",
                        "Company Email": user?.company_data?.email ? user?.company_data?.email : " ",
                        "Company Registration Number": user?.company_data?.registration_number ? user?.company_data?.registration_number : " ",
                        "Company Incorporation Date": user?.company_data?.incorporation_date ? user?.company_data?.incorporation_date : " ",
                        "Company VAT Number": user?.company_data?.vat_number ? user?.company_data?.vat_number : " ",
                        "Created At": moment(user?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                        "Updated At": moment(user?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                    }
                })
                )
                if (format === "excel") {
                    return utils.generateExcel(cleanUserList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanUserList, res)
                } else {
                    return res.send(cleanUserList);
                }
            };
                break;
            case "Logistics": {
                let userList = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    userList = await User.find({
                        user_type: { $in: ['logistics'] },
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    }).sort({ createdAt: -1 })
                } else {
                    userList = await User.find().sort({ createdAt: -1 })
                }
                console.log("user list is", userList);

                if (userList.length <= 0) {
                    return res.status(401).json({
                        message: "No user data found",
                        code: 401
                    })
                }

                const cleanUserList = userList.map((user) => ({
                    "User Id": user?.unique_user_id ? user?.unique_user_id : "",
                    "Full Name": user?.full_name ? user?.full_name : `${user?.first_name} ${user?.last_name}`,
                    "Company Name": user?.company_name ? user?.company_name : "",
                    "Email": user?.email ? user?.email : "",
                    "Phone Number": user?.phone_number ? user?.phone_number : "",
                    "status": user?.status,
                    "Profile Completed": user?.profile_completed === true ? "Yes" : "No",
                    "Company Name": user?.company_data?.name ? user?.company_data?.name : "",
                    "Company Phone Number": user?.company_data?.phone_number ? user?.company_data?.phone_number : "",
                    "Company Email": user?.company_data?.email ? user?.company_data?.email : "",
                    "Company Registration Number": user?.company_data?.registration_number ? user?.company_data?.registration_number : "",
                    "Company Incorporation Date": user?.company_data?.incorporation_date ? user?.company_data?.incorporation_date : "",
                    "Company VAT Number": user?.company_data?.vat_number ? user?.company_data?.vat_number : "",
                    "Company Address Line 1": user?.company_data?.address?.line1 ? user?.company_data?.address?.line1 : "",
                    "Company Address City": user?.company_data?.address?.city ? user?.company_data?.address?.city : "",
                    "Company Address State": user?.company_data?.address?.state ? user?.company_data?.address?.state : "",
                    "Company Address Zip Code": user?.company_data?.address?.zip_code ? user?.company_data?.address?.zip_code : "",
                    "Company Address Country": user?.company_data?.address?.country ? user?.company_data?.address?.country : "",
                    "Delivery Type": user?.company_data?.delivery_type ? user?.company_data?.delivery_type : "",
                    "Created At": moment(user?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(user?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanUserList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanUserList, res)
                } else {
                    return res.send(cleanUserList);
                }
            };
                break;
            case "Resource": {
                let userList = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    userList = await User.find({
                        user_type: { $in: ['resource'] },
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    }).sort({ createdAt: -1 })
                } else {
                    userList = await User.find().sort({ createdAt: -1 })
                }
                console.log("user list is", userList);

                if (userList.length <= 0) {
                    return res.status(401).json({
                        message: "No user data found",
                        code: 401
                    })
                }

                const cleanUserList = userList.map((user) => ({
                    "User Id": user?.unique_user_id ? user?.unique_user_id : "",
                    "Full Name": user?.full_name ? user?.full_name : `${user?.first_name} ${user?.last_name}`,
                    "Profile Title": user?.profile_title ? user?.profile_title : "",
                    "Profile Description": user?.profile_description ? user?.profile_description : "",
                    "Email": user?.email ? user?.email : "",
                    "Phone Number": user?.phone_number ? user?.phone_number : "",
                    "status": user?.status,
                    "Profile Completed": user?.profile_completed === true ? "Yes" : "No",
                    "Rate per hour": user?.rate_per_hour ? user?.rate_per_hour : "",
                    "Pricing Model": user?.project_pricing_model ? user?.project_pricing_model : "",
                    "Working Hours": user?.resource_availability?.working_hours?.from + " - " + user?.resource_availability?.working_hours?.to,
                    "Time Zone": user?.resource_availability?.time_zone ? user?.resource_availability?.time_zone : "",
                    "Days of Operation": user?.resource_availability?.days_of_operation ? user?.resource_availability?.days_of_operation : "",
                    "Created At": moment(user?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(user?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanUserList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanUserList, res)
                } else {
                    return res.send(cleanUserList);
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
                    articleList = await Product.find({
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    }).populate('user_id').populate('category_id').populate('brand_id').sort({ createdAt: -1 })
                } else {
                    articleList = await Product.find().sort({ createdAt: -1 })
                }
                console.log("article list is", articleList);

                if (articleList.length <= 0) {
                    return res.status(401).json({
                        message: "No Article data found",
                        code: 401
                    })
                }
                const cleanArticleList = articleList.map((article) => ({
                    "Name": article?.name ? article?.name : "",
                    "Brand": article?.brand_id?.name ? article?.brand_id?.name : "",
                    "Category": article?.category_id?.name ? article?.category_id?.name : "",
                    "Approval Status": article?.is_admin_approved,
                    "Created At": moment(article?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(article?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanArticleList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanArticleList, res)
                } else {
                    return res.send(cleanArticleList);
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
                    }).populate('order_items.product_id').populate('order_items.supplier_id').populate('order_items.logistics_id').populate('order_items.variant_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id').populate('buyer_id').sort({ createdAt: -1 })
                } else {
                    orderList = await Order.find().populate('order_items.product_id').populate('order_items.supplier_id').populate('order_items.logistics_id').populate('order_items.variant_id').populate('shipping_address').populate('billing_address').populate('payment_id').populate('tracking_id').populate('buyer_id').sort({ createdAt: -1 })
                }
                console.log("article list is", orderList);

                if (orderList.length <= 0) {
                    return res.status(401).json({
                        message: "No Article data found",
                        code: 401
                    })
                }

                const cleanorderList = orderList.map((order) => ({
                    "Order Id": order?.order_unique_id,
                    "Order Type": order?.order_type,
                    "Order Status": order?.order_status,
                    "Buyer": order?.buyer_id?.full_name,
                    "Amount": order?.total_amount,
                    "Delivery Charges": order?.delivery_charges,
                    "Shipping Address": `${order?.shipping_address?.address?.address_line_1},${order?.shipping_address?.address?.address_line_2},${order?.shipping_address?.address?.city},${order?.shipping_address?.address?.state},${order?.shipping_address?.address?.country},${order?.shipping_address?.address?.pin_code}`,
                    "Billing Address": `${order?.billing_address?.address?.address_line_1},${order?.billing_address?.address?.address_line_2},${order?.billing_address?.address?.city},${order?.billing_address?.address?.state},${order?.billing_address?.address?.country},${order?.billing_address?.address?.pin_code}`,
                    "Payment": order?.payment_id?.status,
                    "Created At": moment(order?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(order?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
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
                    return res.send(cleanorderList);
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
                    }).sort({ createdAt: -1 })
                } else {
                    paymentList = await Payment.find().sort({ createdAt: -1 })
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
                    Reciept: payment?.receipt_number,
                    "Created At": moment(payment?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(payment?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
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
                    return res.send(cleanpaymentList);
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
                    }).sort({ createdAt: -1 })
                } else {
                    SubAdminList = await Admin.find({ role: "sub_admin" }).sort({ createdAt: -1 })
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
                    "Permissions": (Object.entries(subadmin?.permissions[0])
                        .map(([key, actions]) => `${key}: ${Array.isArray(actions) ? actions.map(i => i) : ''}`)).join(', '),
                    "Created At": moment(subadmin?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(subadmin?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanSubAdminList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanSubAdminList, res)
                } else {
                    // return utils.generatePDF(cleanSubAdminList, res)
                    return res.send(cleanSubAdminList);
                }
            }; break;
            case "Job": {
                let List = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    List = await Job.find({
                        createdAt: { $gte: newFromDate, $lte: newToDate }
                    }).populate('company_id').populate('job_category').sort({ createdAt: -1 })
                } else {
                    List = await Job.find().populate('company_id').populate('job_category').sort({ createdAt: -1 })
                }
                console.log("job list is", List);

                if (List.length <= 0) {
                    return res.status(401).json({
                        message: "No Job data found",
                        code: 401
                    })
                }

                const cleanList = List.map((data) => ({
                    "Job Title": data?.job_title ? data?.job_title : " ",
                    "Job Id": data?.job_unique_id ? data?.job_unique_id : " ",
                    "Company Name": data?.company_id?.company_data?.name ? data?.company_id?.company_data?.name : " ",
                    "Job Type": data?.job_type ? data?.job_type : " ",
                    "Job Category": data?.job_category?.name ? data?.job_category?.name : " ",
                    "Job Location": data?.job_location ? data?.job_location : " ",
                    "Job Salary": data?.salary ? data?.salary : " ",
                    "Experience": data?.experience_type ? data?.experience_type : " ",
                    "Budget": data?.budget ? data?.budget : " ",
                    "Job Duration": data?.job_duration ? data?.job_duration : " ",
                    "Payment Mode": data?.payment_type ? data?.payment_type : " ",
                    "Created At": moment(data?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(data?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                }))
                if (format === "excel") {
                    return utils.generateExcel(cleanList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanList, res)
                } else {
                    return res.send(cleanList);
                }
            }; break;
            case "Enquiry": {
                let SubAdminList = []
                if (req.body.fromDate && req.body.toDate) {
                    const newFromDate = new Date(req.body.fromDate);
                    const newToDate = new Date(req.body.toDate);
                    if (isNaN(newFromDate) || isNaN(newToDate)) {
                        return res.status(400).json({ error: "Invalid date format" });
                    }
                    SubAdminList = await Enquiry.find({
                        createdAt: { $gte: newFromDate, $lte: newToDate },
                    }).populate('user_id').populate('shipping_address').populate('selected_supplier.quote_id').populate('selected_logistics.quote_id').sort({ createdAt: -1 })
                } else {
                    SubAdminList = await Enquiry.find({}).populate('user_id').populate('shipping_address').populate('selected_supplier.quote_id').populate('selected_logistics.quote_id').sort({ createdAt: -1 })
                }
                console.log("enquiry list is", SubAdminList);

                if (SubAdminList.length <= 0) {
                    return res.status(401).json({
                        message: "No Enquiry data found",
                        code: 401
                    })
                }

                const cleanSubAdminList = SubAdminList.map((subadmin) => ({
                    "Enquiry Id": subadmin?.enquiry_unique_id,
                    "Enquiry Number": subadmin?.enquiry_number,
                    "Enquiry Status": subadmin?.status,
                    "Buyer Name": subadmin?.user_id?.full_name,
                    "Buyer Email": subadmin?.user_id?.email,
                    "Buyer PhoneNumber": subadmin?.user_id?.phone_number,
                    "Approval Status": subadmin?.is_approved,
                    "Expiry Date": subadmin?.expiry_date,
                    "Priority": subadmin?.priority,
                    "Shipping Address": `${subadmin?.shipping_address?.address?.address_line_1},${subadmin?.shipping_address?.address?.address_line_2},${subadmin?.shipping_address?.address?.city},${subadmin?.shipping_address?.address?.state},${subadmin?.shipping_address?.address?.country},${subadmin?.shipping_address?.address?.pin_code}`,
                    "Created At": moment(subadmin?.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                    "Updated At": moment(subadmin?.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
                }))

                if (format === "excel") {
                    return utils.generateExcel(cleanSubAdminList, res)
                } else if (format === "csv") {
                    return utils.generateCSV(cleanSubAdminList, res)
                } else {
                    // return utils.generatePDF(cleanSubAdminList, res)
                    return res.send(cleanSubAdminList);
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