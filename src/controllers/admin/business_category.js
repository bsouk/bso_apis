const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

const business_category = require("../../models/business_category");

exports.addBusinessCategory = async (req, res) => {
    try {
        console.log("req.body is ", req.body)

        const isExisted = await business_category.findOne({ name: req.body.name })

        if (isExisted) {
            return utils.handleError(res, {
                message: "Business Category already existed",
                code: 404,
            });
        }

        const data = new business_category(req.body);
        await data.save()
        console.log("data is ", data)

        return res.status(200).json({
            message: "Business category added successfully",
            data: data,
            code: 200
        })
    } catch (error) {
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
        const { name } = req.body;
        const id = req.params.id;
        const isExists = await business_category.findById(id);
        if (!isExists) return utils.handleError(res, { message: "Business category not found" });

        const isBusinessCategoryNameExists = await business_category.findOne({ _id: { $nin: [new mongoose.Types.ObjectId(id)] }, name });
        if (isBusinessCategoryNameExists) return utils.handleError(res, { message: "The business category name already exists. Please enter a different name", code: 400 });

        await business_category.findByIdAndUpdate(id, { $set: { name } })
        res.json({ message: "Business category edited successfully", code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.deleteBusinessCategory = async (req, res) => {
    try {
        const id = req.params.id;

        const isExists = await business_category.findById(id);
        if (!isExists) return utils.handleError(res, { message: "Business category not found", code: 404 });

        await business_category.findByIdAndDelete(id);
        res.json({ message: "Business category deleted successfully", code: 200 })
    } catch (error) {
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

        return res.json({ message: "Selected Business category have been deleted", code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
}