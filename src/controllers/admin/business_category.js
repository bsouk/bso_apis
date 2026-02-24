const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');
const { logSuccess, logFailure } = require("../../utils/logger");

const business_category = require("../../models/business_category");

const CATEGORY_NAME_MAX = 30;
const CATEGORY_NAME_REGEX = /^[a-zA-Z\s]+$/;

function validateCategoryName(name) {
    if (!name || typeof name !== 'string') return { valid: false, message: 'Business category name is required.' };
    const trimmed = name.trim();
    if (!trimmed) return { valid: false, message: 'Business category name is required.' };
    if (trimmed.length > CATEGORY_NAME_MAX) return { valid: false, message: 'Business category name must be at most 30 characters.' };
    if (!CATEGORY_NAME_REGEX.test(trimmed)) return { valid: false, message: 'Only letters and spaces allowed (no digits or special characters).' };
    return { valid: true, value: trimmed };
}

exports.addBusinessCategory = async (req, res) => {
    try {
        const validation = validateCategoryName(req.body?.name);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message, code: 400 });
        }
        const name = validation.value;

        const isExisted = await business_category.findOne({ name })

        if (isExisted) {
            return utils.handleError(res, {
                message: "Business Category already existed",
                code: 404,
            });
        }

        const data = new business_category({ ...req.body, name });
        await data.save()
        console.log("data is ", data)

        // Log creation
        try {
            await logSuccess(
                req.user,
                "business_category",
                "create",
                {
                    related_id: data._id,
                    related_collection: "business_categories",
                    details: {
                        business_category_id: data._id,
                        name: data.name,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log business category create:", logError?.message);
        }

        return res.status(200).json({
            message: "Business category added successfully",
            data: data,
            code: 200
        })
    } catch (error) {
        try {
            await logFailure(
                req.user,
                "business_category",
                "create",
                error,
                {
                    metadata: {
                        name: req.body?.name,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log business category create error:", logError?.message);
        }
        utils.handleError(res, error);
    }
}

exports.getBusinessCategory = async (req, res) => {
    try {
        const { limit = 10, offset = 0, search } = req.query;
        const condition = {};

        if (search) {
            condition["$or"] = [
                { name: { $regex: search, $options: "i" } }
            ];
        }

        const count = await business_category.aggregate([
            {
                $match: condition,
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 }
                }
            }
        ]);

        const data = await business_category.aggregate([
            {
                $match: condition,
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $skip: +offset,
            },
            {
                $limit: +limit,
            },
        ]);

        res.json({ data: data, count: count?.[0]?.count ?? 0, code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.editBusinessCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const validation = validateCategoryName(req.body?.name);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message, code: 400 });
        }
        const name = validation.value;

        const isExists = await business_category.findById(id);
        if (!isExists) return utils.handleError(res, { message: "Business category not found" });

        const isBusinessCategoryNameExists = await business_category.findOne({ _id: { $nin: [new mongoose.Types.ObjectId(id)] }, name });
        if (isBusinessCategoryNameExists) return utils.handleError(res, { message: "The business category name already exists. Please enter a different name", code: 400 });

        await business_category.findByIdAndUpdate(id, { $set: { name } })

        // Log update
        try {
            await logSuccess(
                req.user,
                "business_category",
                "update",
                {
                    related_id: isExists._id,
                    related_collection: "business_categories",
                    details: {
                        business_category_id: isExists._id,
                        previous_name: isExists.name,
                        new_name: name,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log business category update:", logError?.message);
        }

        res.json({ message: "Business category edited successfully", code: 200 });
    } catch (error) {
        try {
            await logFailure(
                req.user,
                "business_category",
                "update",
                error,
                {
                    metadata: {
                        id: req.params?.id,
                        name: req.body?.name,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log business category update error:", logError?.message);
        }
        utils.handleError(res, error);
    }
}

exports.deleteBusinessCategory = async (req, res) => {
    try {
        const id = req.params.id;

        const isExists = await business_category.findById(id);
        if (!isExists) return utils.handleError(res, { message: "Business category not found", code: 404 });

        // Check if business category is used in any user's company_data
        const usersUsingCategory = await require("../../models/user").countDocuments({
            "company_data.business_category": { $regex: new RegExp(`\\b${id}\\b`) }
        });
        if (usersUsingCategory > 0) {
            return res.status(400).json({
                code: 400,
                message: "This business category is linked with existing users / suppliers and cannot be deleted.",
            });
        }

        await business_category.findByIdAndDelete(id);

        // Log delete
        try {
            await logSuccess(
                req.user,
                "business_category",
                "delete",
                {
                    related_id: isExists._id,
                    related_collection: "business_categories",
                    details: {
                        business_category_id: isExists._id,
                        name: isExists.name,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log business category delete:", logError?.message);
        }

        res.json({ message: "Business category deleted successfully", code: 200 })
    } catch (error) {
        try {
            await logFailure(
                req.user,
                "business_category",
                "delete",
                error,
                {
                    metadata: {
                        id: req.params?.id,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log business category delete error:", logError?.message);
        }
        utils.handleError(res, error);
    }
}

exports.getBusinessCategorybyId = async (req, res) => {
    try {
        const id = req.params.id;

        const category = await business_category.findById(id);
        if (!category) {
            return utils.handleError(res, {
                message: "Business category not found",
                code: 404,
            });
        }

        res.json({ data: category, code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.deleteselectedBusinessCategory = async (req, res) => {
    try {
        const { ids = [] } = req.body;
        console.log("req.body is ", req.body)

        if (ids.length === 0)
            return utils.handleError(res, {
                message: "Please select at least one Business category",
                code: 400,
            });

        const isAllDeleted = await business_category.find({ _id: ids });
        console.log("categories : ", isAllDeleted)

        if (isAllDeleted.length === 0)
            return utils.handleError(res, {
                message: "No Business category found",
                code: 400,
            });

        const result = await business_category.deleteMany({ _id: { $in: ids } });
        console.log("result", result)

        // Log bulk delete (best effort)
        try {
            await logSuccess(
                req.user,
                "business_category",
                "bulk_delete",
                {
                    details: {
                        requested_ids: ids,
                        deleted_count: result.deletedCount || 0,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log bulk business category delete:", logError?.message);
        }

        return res.json({ message: "Selected Business category have been deleted", code: 200 });
    } catch (error) {
        try {
            await logFailure(
                req.user,
                "business_category",
                "bulk_delete",
                error,
                {
                    metadata: {
                        ids: req.body?.ids || [],
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log bulk business category delete error:", logError?.message);
        }
        utils.handleError(res, error);
    }
}


exports.approveRejectBusinessCategory = async (req, res) => {
    try {
        const business_category_id = req.body.id

        const business_category_data = await business_category.findById(business_category_id);
        const previousStatus = business_category_data?.is_admin_approved;
        const previousReason = business_category_data?.rejected_reason;

        if (!business_category_data)
            return utils.handleError(res, {
                message: "Business category not found",
                code: 404,
            });

        if (req.body.status === "rejected" && !req.body.reason) {
            return utils.handleError(res, {
                message: "Rejection reason is required",
                code: 404,
            });
        }

        if (req.body.reason && req.body.status === "rejected") {
            business_category_data.is_admin_approved = req.body.status
            business_category_data.rejected_reason = req.body.reason
            await business_category_data.save()
        } else {
            business_category_data.is_admin_approved = req.body.status
            await business_category_data.save()
        }

        // Log status change
        try {
            await logSuccess(
                req.user,
                "business_category",
                "status_change",
                {
                    related_id: business_category_data._id,
                    related_collection: "business_categories",
                    details: {
                        business_category_id: business_category_data._id,
                        previous_status: previousStatus,
                        new_status: business_category_data.is_admin_approved,
                        previous_rejected_reason: previousReason || null,
                        new_rejected_reason: business_category_data.rejected_reason || null,
                        reason_payload: req.body.reason || null,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log business category status change:", logError?.message);
        }

        res.json({
            message: "Business category status changed Successfully",
            code: 200
        });

    } catch (error) {
        try {
            await logFailure(
                req.user,
                "business_category",
                "status_change",
                error,
                {
                    metadata: {
                        id: req.body?.id,
                        status: req.body?.status,
                        reason: req.body?.reason,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log business category status change error:", logError?.message);
        }
        utils.handleError(res, error);
    }
}