const User = require("../../models/user");
const Address = require("../../models/address");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

const ProductCategory = require("../../models/product_category");
const ProductSubCategory = require("../../models/product_sub_category");
const ProductSubSubCategory = require("../../models/product_sub_sub_category");


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

    const subCategories = await ProductSubCategory.deleteMany({ product_category_type_id: id })
    const subSubCategories = await ProductSubSubCategory.deleteMany({ product_category_type_id: id })

    await ProductCategory.findByIdAndDelete(id);

    res.json({ message: "Category deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteSelectedCategory = async (req, res) => {
  try {
    const { ids = [] } = req.body;
    console.log("req.body is ", req.body)

    if (ids.length === 0)
      return utils.handleError(res, {
        message: "Please select at least one Category",
        code: 400,
      });

    const isAllDeleted = await ProductCategory.find({ _id: ids });
    console.log("categories : ", isAllDeleted)

    if (isAllDeleted.length === 0)
      return utils.handleError(res, {
        message: "No category found",
        code: 400,
      });

    const result = await ProductCategory.deleteMany({ _id: { $in: ids } });
    console.log("result", result)

    return res.json({ message: "Selected Category have been deleted", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
}

//sub category

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

    //count parent category child and if chile is single then update parent isnext false
    const parentCount = await ProductSubCategory.find({ product_category_type_id: isCategoryExists.product_category_type_id })
    console.log('length : ', parentCount.length)
    if (parentCount.length === 1) {
      const mainCategory = await ProductCategory.findById({ _id: isCategoryExists.product_category_type_id })
      mainCategory.isNext = false
      await mainCategory.save()
    }

    //now find its sub-category and delete all
    const allChildCategories = await ProductSubSubCategory.find({ product_sub_category_type_id: id })
    if (allChildCategories.length !== 0) {
      const result = await ProductSubSubCategory.deleteMany({ _id: { $in: allChildCategories } })
      console.log("result : ", result)
    }
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

exports.deleteSelectedSubCategory = async (req, res) => {
  try {
    const { ids = [] } = req.body;
    console.log("req.body is ", req.body)

    if (ids.length === 0)
      return utils.handleError(res, {
        message: "Please select at least one Sub Category",
        code: 400,
      });

    const isAllDeleted = await ProductSubCategory.find({ _id: ids });
    console.log("categories : ", isAllDeleted)

    if (isAllDeleted.length === 0)
      return utils.handleError(res, {
        message: "No Sub category found",
        code: 400,
      });

    //count parent category child and if chile is single then update parent isnext false
    const parentCount = await ProductSubCategory.find({ product_category_type_id: isAllDeleted[0].product_category_type_id })
    console.log('length : ', parentCount.length)
    if (parentCount.length === 1) {
      const mainCategory = await ProductCategory.findById({ _id: isAllDeleted[0].product_category_type_id })
      mainCategory.isNext = false
      await mainCategory.save()
    }

    //now find its sub-category and delete all
    const allChildCategories = await ProductSubSubCategory.find({ product_sub_category_type_id: { $in: ids } });
    if (allChildCategories.length !== 0) {
      const childCategoryIds = allChildCategories.map((child) => child._id);
      const deleteChildResult = await ProductSubSubCategory.deleteMany({ _id: { $in: childCategoryIds } });
      console.log("Child categories deleted: ", deleteChildResult);
    }

    const result = await ProductSubCategory.deleteMany({ _id: { $in: ids } });
    console.log("result", result)

    return res.json({ message: "Selected Sub Category have been deleted", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
}

//sub sub category

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


exports.getSubSubCategory = async (req, res) => {
  try {
    const { search, offset = 0, limit = 10 } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const catergories = await ProductSubSubCategory.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const count = await ProductSubSubCategory.countDocuments(filter);

    res.json({ data: catergories, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};


exports.editSubSubCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const isCategoryExists = await ProductSubSubCategory.findById(id);
    if (!isCategoryExists)
      return utils.handleError(res, {
        message: "Sub-Sub-Category not found",
        code: 404,
      });

    const result = await ProductSubSubCategory.findByIdAndUpdate({ _id: id }, req.body);
    console.log("result is ", result)

    res.json({ message: "Sub-Sub-Category edited successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteSubSubCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const isCategoryExists = await ProductSubSubCategory.findById(id);
    if (!isCategoryExists)
      return utils.handleError(res, {
        message: "Sub-Sub-Category not found",
        code: 404,
      });

    //count parent category child and if chile is single then update parent isnext false
    const parentCount = await ProductSubSubCategory.find({ product_sub_category_type_id: isCategoryExists.product_sub_category_type_id })
    console.log('length : ', parentCount.length)

    if (parentCount.length === 1) {
      const mainCategory = await ProductSubCategory.findById({ _id: isCategoryExists.product_sub_category_type_id })
      mainCategory.isNext = false
      await mainCategory.save()
    }

    await ProductSubSubCategory.findByIdAndDelete(id);

    res.json({ message: "Sub-Sub-Category deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getSubSubCategoryById = async (req, res) => {
  try {
    const id = req.params.id;

    const subsubcategory = await ProductSubSubCategory.findById(id);
    if (!subsubcategory) {
      return utils.handleError(res, {
        message: "Sub-Sub-Category not found",
        code: 404,
      });
    }

    res.json({ data: subsubcategory, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};


exports.deleteSelectedSubSubCategory = async (req, res) => {
  try {
    const { ids = [] } = req.body;
    console.log("req.body is ", req.body)

    if (ids.length === 0)
      return utils.handleError(res, {
        message: "Please select at least one Sub-Sub-Category",
        code: 400,
      });

    const isAllDeleted = await ProductSubSubCategory.find({ _id: ids });
    console.log("categories : ", isAllDeleted)

    if (isAllDeleted.length === 0)
      return utils.handleError(res, {
        message: "No Sub-Sub-Category found",
        code: 400,
      });

    //count parent category child and if chile is single then update parent isnext false
    const parentCount = await ProductSubSubCategory.find({ product_sub_category_type_id: isAllDeleted[0].product_sub_category_type_id })
    console.log('length : ', parentCount.length)
    if (parentCount.length === 1) {
      const mainCategory = await ProductSubCategory.findById({ _id: isAllDeleted[0].product_sub_category_type_id })
      mainCategory.isNext = false
      await mainCategory.save()
    }

    const result = await ProductSubSubCategory.deleteMany({ _id: { $in: ids } });
    console.log("result", result)

    return res.json({ message: "Selected Sub-Sub-Category have been deleted", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
}

//get category as per parent category
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


//aprove/reject main category
exports.approveRejectCategory = async (req, res) => {
  try {
    const categoryId = req.body.id

    const categoryData = await ProductCategory.findById(categoryId);

    if (!categoryData)
      return utils.handleError(res, {
        message: "Category not found",
        code: 404,
      });

    if (req.body.status === "rejected" && !req.body.reason) {
      return utils.handleError(res, {
        message: "Rejection reason is required",
        code: 404,
      });
    }

    if (req.body.reason && req.body.status === "rejected") {
      categoryData.is_admin_approved = req.body.status
      categoryData.rejected_reason = req.body.reason
      await categoryData.save()
    } else {
      categoryData.is_admin_approved = req.body.status
      await categoryData.save()
    }

    res.json({
      message: "Category status changed Successfully",
      code: 200
    });

  } catch (error) {
    utils.handleError(res, error);
  }
}