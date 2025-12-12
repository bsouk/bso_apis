const { default: mongoose } = require("mongoose");
const Payment = require("../../models/payment");
const User = require("../../models/user");
const Subscription = require("../../models/subscription");
const enquiry = require("../../models/Enquiry");
const Order = require("../../models/order");
const Plan = require("../../models/plan");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Helper function to determine payment purpose and feature
 * Exported for use in payment creation
 */
exports.determinePaymentDetails = async function determinePaymentDetails(payment) {
    let payment_purpose = "other";
    let payment_feature = "other";
    let user_type = null;
    let purpose_details = {
        description: ""
    };

    // Check if payment is for subscription
    if (payment.subscription_id) {
        payment_purpose = "subscription";
        const subscription = await Subscription.findById(payment.subscription_id).populate('plan_id');
        const plan = await Plan.findOne({ plan_id: subscription?.plan_id });
        
        if (subscription) {
            user_type = subscription.type;
            if (subscription.type === "buyer") {
                payment_feature = "buyer_subscription";
            } else if (subscription.type === "supplier") {
                payment_feature = "supplier_subscription";
            } else if (subscription.type === "logistics") {
                payment_feature = "logistics_subscription";
            } else if (subscription.type === "recruiter") {
                payment_feature = "recruiter_subscription";
            }
            
            purpose_details.subscription_id = subscription.subscription_id;
            purpose_details.plan_name = plan?.plan_name || "";
            purpose_details.plan_type = subscription.type || "";
            purpose_details.description = `${subscription.type} subscription payment`;
        }
    }
    // Check if payment is for enquiry/order
    else if (payment.enquiry_id || payment.order_id) {
        payment_purpose = "enquiry_payment";
        payment_feature = "enquiry_purchase";
        
        if (payment.buyer_id) {
            user_type = "buyer";
        } else if (payment.supplier_id) {
            user_type = "supplier";
        }
        
        if (payment.enquiry_id) {
            const enquiryData = await enquiry.findById(payment.enquiry_id);
            if (enquiryData) {
                purpose_details.enquiry_unique_id = enquiryData.enquiry_unique_id || "";
                purpose_details.description = `Payment for enquiry ${enquiryData.enquiry_unique_id || payment.enquiry_id}`;
            }
        }
        
        if (payment.order_id) {
            const orderData = await Order.findById(payment.order_id);
            if (orderData) {
                purpose_details.order_unique_id = orderData.order_unique_id || "";
                purpose_details.description = `Payment for order ${orderData.order_unique_id || payment.order_id}`;
            }
        }
    }
    // Check if payment is for logistics
    else if (payment.logistic_payment && payment.logistic_payment.length > 0) {
        payment_purpose = "logistics_payment";
        payment_feature = "logistics_fee";
        
        if (payment.buyer_id) {
            user_type = "buyer";
        } else if (payment.supplier_id) {
            user_type = "supplier";
        }
        
        purpose_details.description = "Logistics fee payment";
    }
    // Check if payment is for team member
    else if (payment.team_id) {
        payment_purpose = "team_member";
        payment_feature = "team_expansion";
        
        // Get user type from team owner
        const team = await require("../../models/team").findById(payment.team_id);
        if (team) {
            const user = await User.findById(team.user_id);
            if (user) {
                user_type = user.current_user_type || user.user_type?.[0] || "buyer";
            }
        }
        
        purpose_details.description = "Team member addition payment";
    }
    // If user_type is still not determined, try to get from buyer_id or supplier_id
    if (!user_type) {
        if (payment.buyer_id) {
            const user = await User.findById(payment.buyer_id);
            if (user) {
                user_type = user.current_user_type || user.user_type?.[0] || "buyer";
            }
        } else if (payment.supplier_id) {
            const user = await User.findById(payment.supplier_id);
            if (user) {
                user_type = user.current_user_type || user.user_type?.[0] || "supplier";
            }
        }
    }

    return {
        payment_purpose,
        payment_feature,
        user_type,
        purpose_details
    };
}

/**
 * Helper function to extract payment method details
 * Exported for use in payment creation
 */
exports.extractPaymentMethodDetails = async function extractPaymentMethodDetails(payment) {
    const details = {
        transaction_id: payment.stripe_payment_intent || payment.payment_stage?.[0]?.txn_id || null,
        receipt_url: payment.receipt || payment.payment_stage?.[0]?.receipt || null,
        receipt_image: payment.payment_stage?.[0]?.receipt_image || null
    };

    // If payment method is card, try to get card details from Stripe
    if (payment.stripe_payment_method_id && payment.payment_method_type === "card") {
        try {
            const paymentMethod = await stripe.paymentMethods.retrieve(payment.stripe_payment_method_id);
            if (paymentMethod && paymentMethod.card) {
                details.card_last4 = paymentMethod.card.last4;
                details.card_brand = paymentMethod.card.brand;
                details.card_exp_month = paymentMethod.card.exp_month;
                details.card_exp_year = paymentMethod.card.exp_year;
            }
        } catch (error) {
            console.log("Error retrieving payment method details:", error.message);
        }
    }

    // If payment method is bank transfer
    if (payment.payment_method_type === "bank_transfer" && payment.payment_stage?.[0]?.txn_id) {
        details.bank_account_last4 = payment.payment_stage[0].txn_id.slice(-4);
        details.transaction_id = payment.payment_stage[0].txn_id;
    }

    return details;
}

/**
 * Get Payment Management List with filters
 */
exports.getPaymentManagement = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            offset = 0,
            limit = 10,
            start_date,
            end_date,
            user_type,
            payment_purpose,
            payment_feature,
            payment_method,
            payment_status,
            search
        } = req.query;

        // Build filter - include old payments that don't have is_deleted field
        // This ensures compatibility with existing payments that don't have the new fields
        const filter = {
            $and: [
                {
                    $or: [
                        { buyer_id: new mongoose.Types.ObjectId(userId) },
                        { supplier_id: new mongoose.Types.ObjectId(userId) }
                    ]
                },
                {
                    $or: [
                        { is_deleted: { $exists: false } }, // Include old payments without is_deleted field
                        { is_deleted: false }
                    ]
                },
                {
                    $or: [
                        { is_permanently_deleted: { $exists: false } }, // Include old payments without is_permanently_deleted field
                        { is_permanently_deleted: false }
                    ]
                }
            ]
        };

        // Additional filters - add directly to filter (outside $and for simple conditions)
        // Date filter
        if (start_date && end_date) {
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);
            endDate.setHours(23, 59, 59, 999); // End of day
            filter.$and.push({ createdAt: { $gte: startDate, $lte: endDate } });
        }

        // User type filter - include payments without user_type field (old payments)
        if (user_type) {
            filter.$and.push({
                $or: [
                    { user_type: { $exists: false } }, // Old payments without user_type
                    { user_type: user_type }
                ]
            });
        }

        // Payment purpose filter - include payments without payment_purpose field (old payments)
        if (payment_purpose) {
            filter.$and.push({
                $or: [
                    { payment_purpose: { $exists: false } }, // Old payments without payment_purpose
                    { payment_purpose: payment_purpose }
                ]
            });
        }

        // Payment feature filter - include payments without payment_feature field (old payments)
        if (payment_feature) {
            filter.$and.push({
                $or: [
                    { payment_feature: { $exists: false } }, // Old payments without payment_feature
                    { payment_feature: payment_feature }
                ]
            });
        }

        // Payment method filter - match by payment_method_type or check payment_stage
        if (payment_method) {
            filter.$and.push({
                $or: [
                    { payment_method_type: payment_method },
                    { "payment_stage.payment_method": payment_method }
                ]
            });
        }

        // Payment status filter
        if (payment_status) {
            filter.$and.push({ payment_status: payment_status });
        }

        // Search filter
        if (search) {
            filter.$and.push({
                $or: [
                    { "purpose_details.enquiry_unique_id": { $regex: search, $options: "i" } },
                    { "purpose_details.order_unique_id": { $regex: search, $options: "i" } },
                    { "purpose_details.subscription_id": { $regex: search, $options: "i" } },
                    { "payment_method_details.transaction_id": { $regex: search, $options: "i" } }
                ]
            });
        }

        // Aggregate query
        const data = await Payment.aggregate([
            { $match: filter },
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
                $addFields: {
                    enquiry_unique_id: "$enquiry_data.enquiry_unique_id"
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
                $lookup: {
                    from: "subscriptions",
                    localField: "subscription_id",
                    foreignField: "_id",
                    as: "subscription_data"
                }
            },
            {
                $unwind: {
                    path: "$subscription_data",
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
        ]);

        // Get total count
        const count = await Payment.countDocuments(filter);

        // Calculate total amount
        const totalAmountResult = await Payment.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$total_amount" }
                }
            }
        ]);
        const total_amount = totalAmountResult[0]?.total || 0;

        return res.status(200).json({
            message: "Payments fetched successfully",
            data,
            count,
            total_amount,
            filters_applied: {
                start_date,
                end_date,
                user_type,
                payment_purpose,
                payment_feature,
                payment_method,
                payment_status,
                search
            },
            code: 200
        });
    } catch (error) {
        console.error("Get payment management error:", error);
        utils.handleError(res, error);
    }
};

/**
 * Get Payment Management Details
 */
exports.getPaymentManagementDetails = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        // Build filter - include old payments that don't have is_deleted field
        const filter = {
            $and: [
                { _id: new mongoose.Types.ObjectId(id) },
                {
                    $or: [
                        { buyer_id: new mongoose.Types.ObjectId(userId) },
                        { supplier_id: new mongoose.Types.ObjectId(userId) }
                    ]
                },
                {
                    $or: [
                        { is_permanently_deleted: { $exists: false } }, // Include old payments without is_permanently_deleted field
                        { is_permanently_deleted: false }
                    ]
                }
            ]
        };

        const payment = await Payment.aggregate([
            {
                $match: filter
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
                    from: "orders",
                    let: { id: "$order_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$id"] }
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
                $lookup: {
                    from: "subscriptions",
                    localField: "subscription_id",
                    foreignField: "_id",
                    as: "subscription_data"
                }
            },
            {
                $unwind: {
                    path: "$subscription_data",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        if (!payment || payment.length === 0) {
            return res.status(404).json({
                message: "Payment not found",
                code: 404
            });
        }

        return res.status(200).json({
            message: "Payment details fetched successfully",
            data: payment[0],
            code: 200
        });
    } catch (error) {
        console.error("Get payment details error:", error);
        utils.handleError(res, error);
    }
};

/**
 * Delete Payment (Soft Delete)
 */
exports.deletePaymentManagement = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const payment = await Payment.findOne({
            _id: id,
            $or: [
                { buyer_id: new mongoose.Types.ObjectId(userId) },
                { supplier_id: new mongoose.Types.ObjectId(userId) }
            ],
            is_permanently_deleted: false
        });

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found",
                code: 404
            });
        }

        if (payment.is_deleted) {
            return res.status(400).json({
                message: "Payment is already deleted",
                code: 400
            });
        }

        // Soft delete
        payment.is_deleted = true;
        payment.deleted_at = new Date();
        payment.deleted_by = userId;
        payment.deleted_by_user = true;
        payment.deleted_by_admin = false;

        await payment.save();

        // Get user details for email
        const user = await User.findById(userId);
        if (user && user.email) {
            // Send email notification
            const mailOptions = {
                to: user.email,
                subject: "Payment Deleted",
                user_name: user.full_name || user.first_name || "User",
                payment_id: payment._id.toString(),
                payment_amount: payment.total_amount || 0,
                currency: payment.currency || "USD",
                payment_purpose: payment.payment_purpose || "Payment",
                payment_date: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "N/A",
                portal_url: `${process.env.APP_URL || process.env.FRONTEND_PROD_URL}/payment-history`
            };

            try {
                await emailer.sendEmail(null, mailOptions, "paymentDeleted");
            } catch (emailError) {
                console.error("Error sending payment deletion email:", emailError);
                // Don't fail the request if email fails
            }
        }

        return res.status(200).json({
            message: "Payment deleted successfully",
            data: {
                _id: payment._id,
                is_deleted: payment.is_deleted,
                deleted_at: payment.deleted_at,
                deleted_by: payment.deleted_by
            },
            code: 200
        });
    } catch (error) {
        console.error("Delete payment error:", error);
        utils.handleError(res, error);
    }
};

/**
 * Restore Deleted Payment
 */
exports.restorePaymentManagement = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const payment = await Payment.findOne({
            _id: id,
            $or: [
                { buyer_id: new mongoose.Types.ObjectId(userId) },
                { supplier_id: new mongoose.Types.ObjectId(userId) }
            ],
            is_deleted: true,
            is_permanently_deleted: false
        });

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found or not deleted",
                code: 404
            });
        }

        // Restore
        payment.is_deleted = false;
        payment.deleted_at = null;
        payment.deleted_by = null;
        payment.deleted_by_user = false;
        payment.deleted_by_admin = false;

        await payment.save();

        return res.status(200).json({
            message: "Payment restored successfully",
            data: {
                _id: payment._id,
                is_deleted: payment.is_deleted
            },
            code: 200
        });
    } catch (error) {
        console.error("Restore payment error:", error);
        utils.handleError(res, error);
    }
};

/**
 * Get Payment Statistics
 */
exports.getPaymentStatistics = async (req, res) => {
    try {
        const userId = req.user._id;
        const { start_date, end_date, user_type } = req.query;

        const filter = {
            $or: [
                { buyer_id: new mongoose.Types.ObjectId(userId) },
                { supplier_id: new mongoose.Types.ObjectId(userId) }
            ],
            is_deleted: false,
            is_permanently_deleted: false
        };

        if (start_date && end_date) {
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);
            endDate.setHours(23, 59, 59, 999);
            filter.createdAt = { $gte: startDate, $lte: endDate };
        }

        if (user_type) {
            filter.user_type = user_type;
        }

        const stats = await Payment.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    total_payments: { $sum: 1 },
                    total_amount: { $sum: "$total_amount" },
                    completed_payments: {
                        $sum: { $cond: [{ $eq: ["$payment_status", "completed"] }, 1, 0] }
                    },
                    pending_payments: {
                        $sum: { $cond: [{ $eq: ["$payment_status", "pending"] }, 1, 0] }
                    },
                    failed_payments: {
                        $sum: { $cond: [{ $eq: ["$payment_status", "failed"] }, 1, 0] }
                    }
                }
            }
        ]);

        const byPurpose = await Payment.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$payment_purpose",
                    count: { $sum: 1 },
                    amount: { $sum: "$total_amount" }
                }
            }
        ]);

        const byPaymentMethod = await Payment.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$payment_method_type",
                    count: { $sum: 1 },
                    amount: { $sum: "$total_amount" }
                }
            }
        ]);

        const byUserType = await Payment.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: "$user_type",
                    count: { $sum: 1 },
                    amount: { $sum: "$total_amount" }
                }
            }
        ]);

        const result = {
            total_payments: stats[0]?.total_payments || 0,
            total_amount: stats[0]?.total_amount || 0,
            completed_payments: stats[0]?.completed_payments || 0,
            pending_payments: stats[0]?.pending_payments || 0,
            failed_payments: stats[0]?.failed_payments || 0,
            by_purpose: {},
            by_payment_method: {},
            by_user_type: {}
        };

        byPurpose.forEach(item => {
            result.by_purpose[item._id || "other"] = {
                count: item.count,
                amount: item.amount
            };
        });

        byPaymentMethod.forEach(item => {
            result.by_payment_method[item._id || "other"] = {
                count: item.count,
                amount: item.amount
            };
        });

        byUserType.forEach(item => {
            result.by_user_type[item._id || "other"] = {
                count: item.count,
                amount: item.amount
            };
        });

        return res.status(200).json({
            message: "Statistics fetched successfully",
            data: result,
            code: 200
        });
    } catch (error) {
        console.error("Get payment statistics error:", error);
        utils.handleError(res, error);
    }
};
