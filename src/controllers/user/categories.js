const User = require("../../models/user");
const Address = require("../../models/address");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

const ProductCategory = require("../../models/product_category");
const ProductSubCategory = require("../../models/product_sub_category");
const ProductSubSubCategory = require("../../models/product_sub_sub_category");
const business_category = require("../../models/business_category")


exports.getCategoryList = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10, sub_id, sub_sub_id } = req.query;

        const filter = {};

        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        if (sub_id && sub_sub_id) {
            return utils.handleError(res, {
                message: "Please send category Parent Id separately",
                code: 404,
            });
        }

        let catergories = []
        let count = 0
        if (sub_id) {
            filter.product_category_type_id = new mongoose.Types.ObjectId(sub_id)
            catergories = await ProductSubCategory.find(filter)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit);

            count = await ProductSubCategory.countDocuments(filter);
        } else if (sub_sub_id) {
            filter.product_sub_category_type_id = new mongoose.Types.ObjectId(sub_sub_id)
            catergories = await ProductSubSubCategory.find(filter)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit);

            count = await ProductSubSubCategory.countDocuments(filter);
        }
        else {
            catergories = await ProductCategory.find(filter)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit);

            count = await ProductCategory.countDocuments(filter);
        }

        res.json({ data: catergories, count, code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.getBusinessCategories = async (req, res) => {
    try {
        const data = await business_category.find()
        const count = await business_category.countDocuments()
        console.log("Business categories : ", data)
        if (!data || data.length === 0) {
            return utils.handleError(res, {
                message: "Business categories not found",
                code: 404,
            });
        }

        return res.status(200).json({
            message: "Business categories fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

