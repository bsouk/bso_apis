const User = require("../../models/user");
const Address = require("../../models/address");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

const ProductCategory = require("../../models/product_category");
const ProductSubCategory = require("../../models/product_sub_category");

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

    res.json({ message: "Category added successfully", code: 200 });

  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.productCategories = async (req, res) => {
  try {
    const { search, offset = 0, limit = Number.MAX_SAFE_INTEGER } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const catergories = await ProductCategory.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
    const count = await ProductCategory.countDocuments(filter);

    res.json({ data: catergories, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getProductCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const catergory = await ProductCategory.findById(id);
    if (!catergory) {
      return utils.handleError(res, {
        message: "Category not found",
        code: 404,
      });
    }


    res.json({ data: catergory, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.editProductCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const isCategoryExists = await ProductCategory.findById(id);
    if (!isCategoryExists)
      return utils.handleError(res, {
        message: "Category not found",
        code: 404,
      });

    const result = await ProductCategory.findByIdAndUpdate({ _id: id }, req.body);
    console.log("result is ", result)

    res.json({ message: "Category edited successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteProductCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const isCategoryExists = await ProductCategory.findById(id);
    if (!isCategoryExists)
      return utils.handleError(res, {
        message: "Category not found",
        code: 404,
      });

    await ProductCategory.findByIdAndDelete(id);

    res.json({ message: "Category deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.addProductSubCategory = async (req, res) => {
  try {
    const { name, icon, product_category_type_id } = req.body

    if (!name || !icon || !product_category_type_id) return res.json({ "message": "Send valid data", "code": 500 })

    const isSubCategoryExist = await ProductSubCategory.findOne({ name, product_category_type_id });

    if (isSubCategoryExist) return res.json({ "message": "Subcategory already exist for this category", "code": 500 });

    const newSubCategory = new ProductSubCategory({ name, icon, product_category_type_id });
    await newSubCategory.save();
    return res.json({ "message": "Subcategory added successfully", "code": 500 })

  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.getSubCategory = async (req, res) => {
  try {
    const { search, offset = 0, limit = 10 } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const catergories = await ProductSubCategory.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const count = await ProductSubCategory.countDocuments(filter);

    res.json({ data: catergories, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};


exports.editSubCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const isCategoryExists = await ProductSubCategory.findById(id);
    if (!isCategoryExists)
      return utils.handleError(res, {
        message: "Sub Category not found",
        code: 404,
      });

    const result = await ProductSubCategory.findByIdAndUpdate({ _id: id }, req.body);
    console.log("result is ", result)

    res.json({ message: "Sub Category edited successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteSubCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const isCategoryExists = await ProductSubCategory.findById(id);
    if (!isCategoryExists)
      return utils.handleError(res, {
        message: "Sub Category not found",
        code: 404,
      });

    await ProductSubCategory.findByIdAndDelete(id);

    res.json({ message: "Sub Category deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getSubCategoryById = async (req, res) => {
  try {
    const id = req.params.id;

    const subcategory = await ProductSubCategory.findById(id);
    if (!subcategory) {
      return utils.handleError(res, {
        message: "Sub Category not found",
        code: 404,
      });
    }

    res.json({ data: subcategory, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};