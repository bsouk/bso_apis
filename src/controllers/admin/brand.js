const utils = require("../../utils/utils");
const mongoose = require("mongoose");
const { createLog } = require("../../utils/logger");

const Brand = require("../../models/brand");

const getAdminLogContext = (req) => ({
  admin_id: req.user?._id,
  admin_name: req.user?.full_name || req.user?.email,
  admin_email: req.user?.email,
  admin_role: req.user?.role || 'sub_admin',
  req,
});

const BRAND_NAME_REGEX = /^[a-zA-Z\s]{1,30}$/;

exports.addBrand = async (req, res) => {
    try {
        const name = (req.body.name || '').trim();
        if (!name) return utils.handleError(res, { message: "Brand name is required", code: 400 });
        if (name.length > 30) return utils.handleError(res, { message: "Brand name must be at most 30 characters", code: 400 });
        if (!BRAND_NAME_REGEX.test(name)) return utils.handleError(res, { message: "Brand name can only contain letters and spaces (no digits or special characters)", code: 400 });

        const isBrandExists = await Brand.findOne({ name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
        if (isBrandExists) return utils.handleError(res, { message: "The brand name already exists. Please enter a different name", code: 400 });

        const data = { name, icon: req.body.icon };
        const saveBrand = new Brand(data);
        await saveBrand.save();

        await createLog({
            ...getAdminLogContext(req),
            feature: 'brand',
            action: 'create',
            status: 'success',
            related_id: saveBrand._id,
            related_collection: 'brands',
            metadata: { brand_name: name },
        });

        res.json({ message: "Brand added successfully", code: 200 });
    } catch (error) {
        await createLog({
            ...getAdminLogContext(req),
            feature: 'brand',
            action: 'create',
            status: 'failed',
            error_message: error.message,
            metadata: { name: req.body?.name },
        }).catch(() => {});
        utils.handleError(res, error);
    }
}


exports.getBrand = async (req, res) => {
    try {
        const { limit = 10, offset = 0, search, status } = req.query;
        const condition = {};

        if (search) {
            condition["$or"] = [
                { name: { $regex: search, $options: "i" } }
            ];
        }
        if (status && ['pending', 'approved', 'rejected'].includes(String(status).toLowerCase())) {
            condition.is_admin_approved = String(status).toLowerCase();
        }

        const count = await Brand.aggregate([
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

        const data = await Brand.aggregate([
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

exports.editBrand = async (req, res) => {
    try {
        const newName = (req.body.name || '').trim();
        const id = req.params.id;
        const isBrandExists = await Brand.findById(id);
        if (!isBrandExists) return utils.handleError(res, { message: "Brand not found", code: 404 });

        if (newName) {
            if (newName.length > 30) return utils.handleError(res, { message: "Brand name must be at most 30 characters", code: 400 });
            if (!BRAND_NAME_REGEX.test(newName)) return utils.handleError(res, { message: "Brand name can only contain letters and spaces (no digits or special characters)", code: 400 });
            const isBrandNameExists = await Brand.findOne({ _id: { $ne: id }, name: { $regex: new RegExp(`^${newName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
            if (isBrandNameExists) return utils.handleError(res, { message: "The brand name already exists. Please enter a different name", code: 400 });
        }

        const data = {};
        if (newName) data.name = newName;
        if (req.body.icon !== undefined) data.icon = req.body.icon;
        if (Object.keys(data).length) await Brand.findByIdAndUpdate(id, { $set: data });

        await createLog({
            ...getAdminLogContext(req),
            feature: 'brand',
            action: 'update',
            status: 'success',
            related_id: id,
            related_collection: 'brands',
            metadata: { brand_name: newName || isBrandExists.name },
        });

        res.json({ message: "Brand edited successfully", code: 200 });
    } catch (error) {
        await createLog({
            ...getAdminLogContext(req),
            feature: 'brand',
            action: 'update',
            status: 'failed',
            related_id: req.params?.id,
            error_message: error.message,
        }).catch(() => {});
        utils.handleError(res, error);
    }
}

exports.deleteBrand = async (req, res) => {
    try {
        const id = req.params.id;

        const brand = await Brand.findById(id);
        if (!brand) return utils.handleError(res, { message: "Brand not found", code: 404 });

        await Brand.findByIdAndDelete(id);

        await createLog({
            ...getAdminLogContext(req),
            feature: 'brand',
            action: 'delete',
            status: 'success',
            related_id: id,
            related_collection: 'brands',
            metadata: { brand_name: brand.name },
        });

        res.json({ message: "Brand deleted successfully", code: 200 });
    } catch (error) {
        await createLog({
            ...getAdminLogContext(req),
            feature: 'brand',
            action: 'delete',
            status: 'failed',
            related_id: req.params?.id,
            error_message: error.message,
        }).catch(() => {});
        utils.handleError(res, error);
    }
}

exports.getBrandbyId = async (req, res) => {
    try {
        const id = req.params.id;

        const brand = await Brand.findById(id);
        if (!brand) {
            return utils.handleError(res, {
                message: "brand not found",
                code: 404,
            });
        }

        res.json({ data: brand, code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.deleteselectedbrand = async (req, res) => {
    try {
        const { ids = [] } = req.body;

        if (ids.length === 0)
            return utils.handleError(res, {
                message: "Please select at least one Brand",
                code: 400,
            });

        const brandsToDelete = await Brand.find({ _id: { $in: ids } });
        if (brandsToDelete.length === 0)
            return utils.handleError(res, {
                message: "No Brand found",
                code: 400,
            });

        await Brand.deleteMany({ _id: { $in: ids } });

        await createLog({
            ...getAdminLogContext(req),
            feature: 'brand',
            action: 'bulk_delete',
            status: 'success',
            related_collection: 'brands',
            metadata: { count: ids.length, brand_ids: ids },
        });

        return res.json({ message: "Selected Brand have been deleted", code: 200 });
    } catch (error) {
        await createLog({
            ...getAdminLogContext(req),
            feature: 'brand',
            action: 'bulk_delete',
            status: 'failed',
            error_message: error.message,
        }).catch(() => {});
        utils.handleError(res, error);
    }
}

exports.approveRejectBrand = async (req, res) => {
    try {
        const brandId = req.body.id

        const brand = await Brand.findById(brandId);

        if (!brand)
            return utils.handleError(res, {
                message: "Brand not found",
                code: 404,
            });

        if (req.body.status === "rejected" && !req.body.reason) {
            return utils.handleError(res, {
                message: "Rejection reason is required",
                code: 400,
            });
        }
        if (req.body.status === "rejected" && req.body.reason && String(req.body.reason).length > 255) {
            return utils.handleError(res, {
                message: "Rejection reason must be at most 255 characters",
                code: 400,
            });
        }

        if (req.body.reason && req.body.status === "rejected") {
            brand.is_admin_approved = req.body.status;
            brand.rejected_reason = req.body.reason;
            await brand.save();
        } else {
            brand.is_admin_approved = req.body.status;
            await brand.save();
        }

        const actionType = req.body.status === "approved" ? "approve" : "reject";
        await createLog({
            ...getAdminLogContext(req),
            feature: 'brand',
            action: actionType,
            status: 'success',
            related_id: brandId,
            related_collection: 'brands',
            metadata: {
                brand_name: brand.name,
                status: req.body.status,
                ...(req.body.reason && { rejected_reason: req.body.reason }),
            },
        });

        res.json({
            message: "Brand status changed Successfully",
            code: 200
        });

    } catch (error) {
        await createLog({
            ...getAdminLogContext(req),
            feature: 'brand',
            action: req.body?.status === "approved" ? "approve" : "reject",
            status: 'failed',
            related_id: req.body?.id,
            error_message: error.message,
        }).catch(() => {});
        utils.handleError(res, error);
    }
}