const { default: mongoose } = require("mongoose");
const Payment = require("../../models/payment");
const User = require("../../models/user");
const Subscription = require("../../models/subscription");
const enquiry = require("../../models/Enquiry");
const Order = require("../../models/order");
const Plan = require("../../models/plan");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");

/**
 * Search Users for Payment Management
 */
exports.searchUsers = async (req, res) => {
    try {
        const { search, user_type, offset = 0, limit = 20 } = req.query;

        const filter = {
            status: "active"
        };

        if (user_type) {
            filter.user_type = { $in: [user_type] };
        }

        if (search) {
            filter.$or = [
                { full_name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { unique_user_id: { $regex: search, $options: "i" } }
            ];
        }

        const users = await User.find(filter)
            .select("_id full_name first_name last_name email unique_user_id user_type current_user_type")
            .skip(parseInt(offset))
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const count = await User.countDocuments(filter);

        return res.status(200).json({
            message: "Users fetched successfully",
            data: users,
            count,
            code: 200
        });
    } catch (error) {
        console.error("Search users error:", error);
        utils.handleError(res, error);
    }
};

/**
 * Get User Payments (Admin View)
 */
exports.getUserPayments = async (req, res) => {
    try {
        const { user_id } = req.params;
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
            search,
            include_deleted = false
        } = req.query;

        if (!user_id) {
            return res.status(400).json({
                message: "User ID is required",
                code: 400
            });
        }

        // Build filter
        const filter = {
            $or: [
                { buyer_id: new mongoose.Types.ObjectId(user_id) },
                { supplier_id: new mongoose.Types.ObjectId(user_id) }
            ]
        };

        // Include deleted payments if requested
        if (!include_deleted || include_deleted === "false") {
            filter.is_permanently_deleted = false;
            if (!include_deleted || include_deleted === "false") {
                filter.is_deleted = false;
            }
        }

        // Date filter
        if (start_date && end_date) {
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);
            endDate.setHours(23, 59, 59, 999);
            filter.createdAt = { $gte: startDate, $lte: endDate };
        }

        // User type filter
        if (user_type) {
            filter.user_type = user_type;
        }

        // Payment purpose filter
        if (payment_purpose) {
            filter.payment_purpose = payment_purpose;
        }

        // Payment feature filter
        if (payment_feature) {
            filter.payment_feature = payment_feature;
        }

        // Payment method filter
        if (payment_method) {
            filter.payment_method_type = payment_method;
        }

        // Payment status filter
        if (payment_status) {
            filter.payment_status = payment_status;
        }

        // Search filter
        if (search) {
            filter.$or = [
                ...filter.$or,
                { "purpose_details.enquiry_unique_id": { $regex: search, $options: "i" } },
                { "purpose_details.order_unique_id": { $regex: search, $options: "i" } },
                { "purpose_details.subscription_id": { $regex: search, $options: "i" } },
                { "payment_method_details.transaction_id": { $regex: search, $options: "i" } }
            ];
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
                $lookup: {
                    from: "users",
                    localField: "deleted_by",
                    foreignField: "_id",
                    as: "deleted_by_user_data"
                }
            },
            {
                $unwind: {
                    path: "$deleted_by_user_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    deleted_by_user_name: "$deleted_by_user_data.full_name"
                }
            },
            {
                $project: {
                    enquiry_data: 0,
                    deleted_by_user_data: 0
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

        // Get user details
        const user = await User.findById(user_id).select("_id full_name email user_type current_user_type");

        return res.status(200).json({
            message: "User payments fetched successfully",
            data,
            count,
            total_amount,
            user: user,
            filters_applied: {
                start_date,
                end_date,
                user_type,
                payment_purpose,
                payment_feature,
                payment_method,
                payment_status,
                search,
                include_deleted
            },
            code: 200
        });
    } catch (error) {
        console.error("Get user payments error:", error);
        utils.handleError(res, error);
    }
};

/**
 * Get User Payment Details (Admin View)
 */
exports.getUserPaymentDetails = async (req, res) => {
    try {
        const { user_id, payment_id } = req.params;

        const payment = await Payment.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(payment_id),
                    $or: [
                        { buyer_id: new mongoose.Types.ObjectId(user_id) },
                        { supplier_id: new mongoose.Types.ObjectId(user_id) }
                    ]
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
            },
            {
                $lookup: {
                    from: "users",
                    localField: "deleted_by",
                    foreignField: "_id",
                    as: "deleted_by_user_data"
                }
            },
            {
                $unwind: {
                    path: "$deleted_by_user_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    deleted_by_user_name: "$deleted_by_user_data.full_name"
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
        console.error("Get user payment details error:", error);
        utils.handleError(res, error);
    }
};

/**
 * Delete User Payment (Admin - Soft Delete or Permanent Delete)
 */
exports.deleteUserPayment = async (req, res) => {
    try {
        const adminId = req.admin._id;
        const { user_id, payment_id } = req.params;
        const { permanent = false } = req.body;

        const payment = await Payment.findOne({
            _id: payment_id,
            $or: [
                { buyer_id: new mongoose.Types.ObjectId(user_id) },
                { supplier_id: new mongoose.Types.ObjectId(user_id) }
            ]
        });

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found",
                code: 404
            });
        }

        // Get user details for email
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                code: 404
            });
        }

        if (permanent) {
            // Permanent delete
            if (payment.is_permanently_deleted) {
                return res.status(400).json({
                    message: "Payment is already permanently deleted",
                    code: 400
                });
            }

            payment.is_permanently_deleted = true;
            payment.permanently_deleted_at = new Date();
            payment.permanently_deleted_by = adminId;
            payment.is_deleted = true; // Also mark as soft deleted
            payment.deleted_at = new Date();
            payment.deleted_by_admin = true;
            payment.deleted_by_user = false;

            await payment.save();

            // Send email notification
            if (user.email) {
                const mailOptions = {
                    to: user.email,
                    subject: "Payment Permanently Deleted",
                    user_name: user.full_name || user.first_name || "User",
                    payment_id: payment._id.toString(),
                    payment_amount: payment.total_amount || 0,
                    currency: payment.currency || "USD",
                    payment_purpose: payment.payment_purpose || "Payment",
                    payment_date: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "N/A",
                    portal_url: `${process.env.APP_URL || process.env.FRONTEND_PROD_URL}/payment-history`,
                    deleted_by: "Admin"
                };

                try {
                    await emailer.sendEmail(null, mailOptions, "paymentDeleted");
                } catch (emailError) {
                    console.error("Error sending payment deletion email:", emailError);
                }
            }

            return res.status(200).json({
                message: "Payment permanently deleted successfully",
                data: {
                    _id: payment._id,
                    is_permanently_deleted: payment.is_permanently_deleted,
                    permanently_deleted_at: payment.permanently_deleted_at
                },
                code: 200
            });
        } else {
            // Soft delete
            if (payment.is_deleted && !payment.deleted_by_admin) {
                return res.status(400).json({
                    message: "Payment is already deleted by user",
                    code: 400
                });
            }

            payment.is_deleted = true;
            payment.deleted_at = new Date();
            payment.deleted_by = new mongoose.Types.ObjectId(user_id); // Record as if done by user
            payment.deleted_by_admin = true;
            payment.deleted_by_user = false;

            await payment.save();

            // Send email notification
            if (user.email) {
                const mailOptions = {
                    to: user.email,
                    subject: "Payment Deleted",
                    user_name: user.full_name || user.first_name || "User",
                    payment_id: payment._id.toString(),
                    payment_amount: payment.total_amount || 0,
                    currency: payment.currency || "USD",
                    payment_purpose: payment.payment_purpose || "Payment",
                    payment_date: payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "N/A",
                    portal_url: `${process.env.APP_URL || process.env.FRONTEND_PROD_URL}/payment-history`,
                    deleted_by: "Admin"
                };

                try {
                    await emailer.sendEmail(null, mailOptions, "paymentDeleted");
                } catch (emailError) {
                    console.error("Error sending payment deletion email:", emailError);
                }
            }

            return res.status(200).json({
                message: "Payment deleted successfully (soft delete)",
                data: {
                    _id: payment._id,
                    is_deleted: payment.is_deleted,
                    deleted_at: payment.deleted_at,
                    deleted_by_admin: payment.deleted_by_admin
                },
                code: 200
            });
        }
    } catch (error) {
        console.error("Delete user payment error:", error);
        utils.handleError(res, error);
    }
};

/**
 * Restore User Payment (Admin)
 */
exports.restoreUserPayment = async (req, res) => {
    try {
        const { user_id, payment_id } = req.params;

        const payment = await Payment.findOne({
            _id: payment_id,
            $or: [
                { buyer_id: new mongoose.Types.ObjectId(user_id) },
                { supplier_id: new mongoose.Types.ObjectId(user_id) }
            ],
            is_deleted: true,
            is_permanently_deleted: false
        });

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found or cannot be restored",
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
        console.error("Restore user payment error:", error);
        utils.handleError(res, error);
    }
};

/**
 * Get User Payment Statistics (Admin)
 */
exports.getUserPaymentStatistics = async (req, res) => {
    try {
        const { user_id } = req.params;
        const { start_date, end_date, user_type } = req.query;

        const filter = {
            $or: [
                { buyer_id: new mongoose.Types.ObjectId(user_id) },
                { supplier_id: new mongoose.Types.ObjectId(user_id) }
            ],
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
                    },
                    deleted_payments: {
                        $sum: { $cond: [{ $eq: ["$is_deleted", true] }, 1, 0] }
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

        const result = {
            total_payments: stats[0]?.total_payments || 0,
            total_amount: stats[0]?.total_amount || 0,
            completed_payments: stats[0]?.completed_payments || 0,
            pending_payments: stats[0]?.pending_payments || 0,
            failed_payments: stats[0]?.failed_payments || 0,
            deleted_payments: stats[0]?.deleted_payments || 0,
            by_purpose: {},
            by_payment_method: {},
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

        return res.status(200).json({
            message: "Statistics fetched successfully",
            data: result,
            code: 200
        });
    } catch (error) {
        console.error("Get user payment statistics error:", error);
        utils.handleError(res, error);
    }
};
