const User = require("../../models/user");
const Address = require("../../models/address");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

const ProductCategory = require("../../models/product_category");
const ProductSubCategory = require("../../models/product_sub_category");

exports.getCategoryList = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10, sub_id } = req.query;

        const filter = {};

        if (search) {
            filter.name = { $regex: search, $options: "i" };
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
        } else {
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

