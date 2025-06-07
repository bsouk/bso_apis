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


exports.addProductCategory = async (req, res) => {
    try {
        const { icon, name } = req.body;

        const isCategoryExists = await ProductCategory.findOne({ name: name });
        if (isCategoryExists)
            return utils.handleError(res, {
                message: "This category already exist",
                code: 400,
            });

        const category = new ProductCategory({ icon, name });
        await category.save();

        res.json({ message: "Category added successfully", data:category, code: 200 });

    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.addProductSubCategory = async (req, res) => {
    try {
        const { name, icon, product_category_type_id } = req.body

        if (!name || !icon || !product_category_type_id) return res.json({ "message": "Send valid data", "code": 500 })

        //mark main category have further sub category
        const mainCategory = await ProductCategory.findById({ _id: product_category_type_id })

        if (!mainCategory) {
            return utils.handleError(res, {
                message: "Main category not found",
                code: 400,
            });
        }

        mainCategory.isNext = true
        await mainCategory.save()

        const isSubCategoryExist = await ProductSubCategory.findOne({ name, product_category_type_id });

        if (isSubCategoryExist) return res.json({ "message": "Subcategory already exist for this category", "code": 500 });

        const newSubCategory = new ProductSubCategory({ name, icon, product_category_type_id });
        await newSubCategory.save();
        return res.json({ "message": "Subcategory added successfully",data:newSubCategory, "code": 500 })

    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.addProductSubSubCategory = async (req, res) => {
    try {
        const { name, icon, product_category_type_id, product_sub_category_type_id } = req.body

        if (!name || !icon || !product_category_type_id || !product_sub_category_type_id) return res.json({ "message": "Send valid data", "code": 500 })

        const isSubSubCategoryExist = await ProductSubSubCategory.findOne({ name, product_category_type_id, product_sub_category_type_id });

        if (isSubSubCategoryExist) return res.json({ "message": "Sub-Sub-Category already exist for this category", "code": 500 });

        //mark its parent category have sub category
        const mainCategory = await ProductSubCategory.findById({ _id: product_sub_category_type_id })
        if (!mainCategory) {
            return utils.handleError(res, {
                message: "Sub Category not found",
                code: 404,
            });
        }

        mainCategory.isNext = true
        await mainCategory.save()

        const newSubSubCategory = new ProductSubSubCategory({ name, icon, product_category_type_id, product_sub_category_type_id });
        await newSubSubCategory.save();
        return res.json({ "message": "Sub-Sub-Category added successfully", "code": 500 })

    } catch (error) {
        utils.handleError(res, error);
    }
}