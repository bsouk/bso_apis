const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

const Brand = require("../../models/brand");

exports.addBrand = async (req, res) => {
    try {

        const isBrandExists = await Brand.findOne({ name: req.body.name });
        if (isBrandExists) return utils.handleError(res, { message: "The brand name already exists. Please enter a different name", code: 400 });

        const data = {
            name: req.body.name,
            icon: req.body.icon
        }
        const saveBrand = new Brand(data);
        await saveBrand.save()

        res.json({ message: "Brand added successfully", code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getBrand = async (req, res) => {
    try {
        const { limit = 10, offset = 0, search } = req.query;
        const condition = {};

        if (search) {
            condition["$or"] = [
                { name: { $regex: search, $options: "i" } }
            ];
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
        const { name, icon } = req.body;
        const id = req.params.id;
        const isBrandExists = await Brand.findById(id);
        if (!isBrandExists) return utils.handleError(res, { message: "Brand not found" });

        const isBrandNameExists = await Brand.findOne({ _id: { $nin: [new mongoose.Types.ObjectId(id)] }, name });
        if (isBrandNameExists) return utils.handleError(res, { message: "The brand name already exists. Please enter a different name", code: 400 });

        let data = {}
        if (name) {
            data.name = name
        }
        if (icon) {
            data.icon = icon
        }

        await Brand.findByIdAndUpdate(id, { $set: data })
        res.json({ message: "Brand edited successfully", code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.deleteBrand = async (req, res) => {
    try {
        const id = req.params.id;

        const brand = await Brand.findById(id);
        if (!brand) return utils.handleError(res, { message: "Brand not found", code: 404 });

        await Brand.findByIdAndDelete(id);
        res.json({ message: "Brand deleted successfully", code: 200 })
    } catch (error) {
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
        console.log("req.body is ", req.body)

        if (ids.length === 0)
            return utils.handleError(res, {
                message: "Please select at least one Brand",
                code: 400,
            });

        const isAllDeleted = await Brand.find({ _id: ids });
        console.log("brands : ", isAllDeleted)

        if (isAllDeleted.length === 0)
            return utils.handleError(res, {
                message: "No Brand found",
                code: 400,
            });

        const result = await Brand.deleteMany({ _id: { $in: ids } });
        console.log("result", result)

        return res.json({ message: "Selected Brand have been deleted", code: 200 });
    } catch (error) {
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
                code: 404,
            });
        }

        if (req.body.reason && req.body.status === "rejected") {
            brand.is_admin_approved = req.body.status
            brand.rejected_reason = req.body.reason
            await brand.save()
        } else {
            brand.is_admin_approved = req.body.status
            await brand.save()
        }

        res.json({
            message: "Brand status changed Successfully",
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}