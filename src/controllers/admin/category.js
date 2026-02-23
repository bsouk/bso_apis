const User = require("../../models/user");
const Address = require("../../models/address");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');
const { createLog } = require("../../utils/logger");

const ProductCategory = require("../../models/product_category");
const ProductSubCategory = require("../../models/product_sub_category");
const ProductSubSubCategory = require("../../models/product_sub_sub_category");
const Product = require("../../models/product");

const getAdminLogContext = (req) => ({
  admin_id: req.user?._id,
  admin_name: req.user?.full_name || req.user?.email,
  admin_email: req.user?.email,
  admin_role: req.user?.role || 'sub_admin',
  req,
});


exports.addProductCategory = async (req, res) => {
  try {
    const { icon, name } = req.body;
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return utils.handleError(res, { message: "Category name is required", code: 400 });
    }

    const isCategoryExists = await ProductCategory.findOne({
      name: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (isCategoryExists) {
      return utils.handleError(res, {
        message: "Category already exists",
        code: 400,
      });
    }

    const category = new ProductCategory({ icon, name: trimmedName });
    await category.save();

    await createLog({
      ...getAdminLogContext(req),
      feature: 'category',
      action: 'create',
      status: 'success',
      related_id: category._id,
      related_collection: 'product_categories',
      metadata: { category_name: trimmedName },
    });

    res.json({ message: "Category added successfully", code: 200 });

  } catch (error) {
    await createLog({
      ...getAdminLogContext(req),
      feature: 'category',
      action: 'create',
      status: 'failed',
      error_message: error.message,
      metadata: { name: req.body?.name },
    }).catch(() => {});
    utils.handleError(res, error);
  }
};

exports.productCategories = async (req, res) => {
  try {
    const { search, offset = 0, limit = Number.MAX_SAFE_INTEGER, status } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (status && ['pending', 'approved', 'rejected'].includes(String(status).toLowerCase())) {
      filter.is_admin_approved = String(status).toLowerCase();
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

    const data = catergory.toObject ? catergory.toObject() : catergory;
    data.version = data.version ?? 1;
    res.json({ data, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.editProductCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const newName = (req.body.name || '').trim();
    const requestVersion = req.body.version != null ? Number(req.body.version) : 1;

    const doc = await ProductCategory.findById(id);
    if (!doc) {
      return utils.handleError(res, {
        message: "Category not found",
        code: 404,
      });
    }

    if (newName) {
      const duplicate = await ProductCategory.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${newName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (duplicate) {
        return utils.handleError(res, {
          message: "Category already exists",
          code: 400,
        });
      }
    }

    const currentVersion = doc.version ?? 1;
    if (currentVersion !== requestVersion) {
      return res.status(409).json({
        code: 409,
        message: "This category was modified by another user. Please refresh and try again.",
      });
    }

    const updatePayload = { ...req.body, name: newName || req.body.name };
    delete updatePayload.version;
    const versionFilter = requestVersion === 1
      ? { $or: [{ version: 1 }, { version: { $exists: false } }] }
      : { version: requestVersion };
    const result = await ProductCategory.findOneAndUpdate(
      { _id: id, ...versionFilter },
      { $set: updatePayload, $inc: { version: 1 } },
      { new: true }
    );
    if (!result) {
      return res.status(409).json({
        code: 409,
        message: "This category was modified by another user. Please refresh and try again.",
      });
    }

    await createLog({
      ...getAdminLogContext(req),
      feature: 'category',
      action: 'update',
      status: 'success',
      related_id: id,
      related_collection: 'product_categories',
      metadata: { category_name: newName || doc?.name },
    });

    res.json({ message: "Category edited successfully", code: 200 });
  } catch (error) {
    await createLog({
      ...getAdminLogContext(req),
      feature: 'category',
      action: 'update',
      status: 'failed',
      related_id: id,
      error_message: error.message,
    }).catch(() => {});
    utils.handleError(res, error);
  }
};

exports.deleteProductCategory = async (req, res) => {
  try {
    const id = req.params.id;

    const isCategoryExists = await ProductCategory.findById(id);
    if (!isCategoryExists) {
      return utils.handleError(res, {
        message: "Category not found",
        code: 404,
      });
    }

    const productsUsingCategory = await Product.countDocuments({ category_id: id });
    if (productsUsingCategory > 0) {
      return res.status(400).json({
        code: 400,
        message: "This category is already in use and cannot be deleted.",
      });
    }

    const subCategories = await ProductSubCategory.deleteMany({ product_category_type_id: id });
    const subSubCategories = await ProductSubSubCategory.deleteMany({ product_category_type_id: id });
    await ProductCategory.findByIdAndDelete(id);

    await createLog({
      ...getAdminLogContext(req),
      feature: 'category',
      action: 'delete',
      status: 'success',
      related_id: id,
      related_collection: 'product_categories',
      metadata: { category_name: isCategoryExists.name },
    });

    res.json({ message: "Category deleted successfully", code: 200 });
  } catch (error) {
    await createLog({
      ...getAdminLogContext(req),
      feature: 'category',
      action: 'delete',
      status: 'failed',
      related_id: req.params?.id,
      error_message: error.message,
    }).catch(() => {});
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

    // Block bulk delete when any category is in use by products
    const inUseCount = await Product.countDocuments({ category_id: { $in: ids } });
    if (inUseCount > 0) {
      return res.status(400).json({
        code: 400,
        message: "One or more selected categories are linked with products and cannot be deleted.",
      });
    }

    const result = await ProductCategory.deleteMany({ _id: { $in: ids } });
    console.log("result", result);

    await createLog({
      ...getAdminLogContext(req),
      feature: 'category',
      action: 'bulk_delete',
      status: 'success',
      related_collection: 'product_categories',
      metadata: { count: ids.length, category_ids: ids },
    });

    return res.json({ message: "Selected Category have been deleted", code: 200 });
  } catch (error) {
    await createLog({
      ...getAdminLogContext(req),
      feature: 'category',
      action: 'bulk_delete',
      status: 'failed',
      error_message: error.message,
    }).catch(() => {});
    utils.handleError(res, error);
  }
};

//sub category

exports.addProductSubCategory = async (req, res) => {
  try {
    const { name, icon, product_category_type_id } = req.body;
    const trimmedName = (name || '').trim();

    if (!trimmedName || !product_category_type_id) {
      return utils.handleError(res, { message: "Send valid data", code: 400 });
    }

    const mainCategory = await ProductCategory.findById(product_category_type_id);
    if (!mainCategory) {
      return utils.handleError(res, {
        message: "Main category not found",
        code: 400,
      });
    }

    mainCategory.isNext = true;
    await mainCategory.save();

    const nameRegex = new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const isSubCategoryExist = await ProductSubCategory.findOne({
      name: { $regex: nameRegex },
      product_category_type_id,
    });
    if (isSubCategoryExist) {
      return utils.handleError(res, {
        message: "Sub-category already exists",
        code: 400,
      });
    }

    const newSubCategory = new ProductSubCategory({
      name: trimmedName,
      icon: icon || undefined,
      product_category_type_id,
      is_admin_approved: 'approved', // Auto-approve when admin creates
    });
    await newSubCategory.save();

    await createLog({
      ...getAdminLogContext(req),
      feature: 'sub_category',
      action: 'create',
      status: 'success',
      related_id: newSubCategory._id,
      related_collection: 'product_sub_category_types',
      metadata: { sub_category_name: trimmedName, category_id: product_category_type_id },
    });

    return res.json({ message: "Sub-category added successfully", code: 200 });
  } catch (error) {
    await createLog({
      ...getAdminLogContext(req),
      feature: 'sub_category',
      action: 'create',
      status: 'failed',
      error_message: error.message,
      metadata: { name: req.body?.name },
    }).catch(() => {});
    utils.handleError(res, error);
  }
};


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
    const newName = (req.body.name || '').trim();

    const existing = await ProductSubCategory.findById(id);
    if (!existing) {
      return utils.handleError(res, {
        message: "Sub-category not found",
        code: 404,
      });
    }

    if (newName) {
      const nameRegex = new RegExp(`^${newName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      const duplicate = await ProductSubCategory.findOne({
        _id: { $ne: id },
        product_category_type_id: existing.product_category_type_id,
        name: { $regex: nameRegex },
      });
      if (duplicate) {
        return utils.handleError(res, {
          message: "Sub-category already exists",
          code: 400,
        });
      }
    }

    const result = await ProductSubCategory.findByIdAndUpdate(
      { _id: id },
      { ...req.body, name: newName || req.body.name }
    );
    console.log("result is ", result);

    await createLog({
      ...getAdminLogContext(req),
      feature: 'sub_category',
      action: 'update',
      status: 'success',
      related_id: id,
      related_collection: 'product_sub_category_types',
      metadata: { sub_category_name: newName || existing.name },
    });

    res.json({ message: "Sub-category edited successfully", code: 200 });
  } catch (error) {
    await createLog({
      ...getAdminLogContext(req),
      feature: 'sub_category',
      action: 'update',
      status: 'failed',
      related_id: req.params?.id,
      error_message: error.message,
    }).catch(() => {});
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

    const productsUsingSubCategory = await Product.countDocuments({ sub_category_id: id });
    if (productsUsingSubCategory > 0) {
      return res.status(400).json({
        code: 400,
        message: "This sub-category is already in use and cannot be deleted.",
      });
    }

    //count parent category child and if chile is single then update parent isnext false
    const parentCount = await ProductSubCategory.find({ product_category_type_id: isCategoryExists.product_category_type_id })
    console.log('length : ', parentCount.length)
    if (parentCount.length === 1) {
      const mainCategory = await ProductCategory.findById({ _id: isCategoryExists.product_category_type_id })
      mainCategory.isNext = false
      await mainCategory.save()
    }

    const allChildCategories = await ProductSubSubCategory.find({ product_sub_category_type_id: id });
    if (allChildCategories.length !== 0) {
      const childIds = allChildCategories.map((c) => c._id);
      await ProductSubSubCategory.deleteMany({ _id: { $in: childIds } });
    }
    await ProductSubCategory.findByIdAndDelete(id);

    await createLog({
      ...getAdminLogContext(req),
      feature: 'sub_category',
      action: 'delete',
      status: 'success',
      related_id: id,
      related_collection: 'product_sub_category_types',
      metadata: { sub_category_name: isCategoryExists.name },
    });

    res.json({ message: "Sub Category deleted successfully", code: 200 });
  } catch (error) {
    await createLog({
      ...getAdminLogContext(req),
      feature: 'sub_category',
      action: 'delete',
      status: 'failed',
      related_id: req.params?.id,
      error_message: error.message,
    }).catch(() => {});
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
    console.log("result", result);

    await createLog({
      ...getAdminLogContext(req),
      feature: 'sub_category',
      action: 'bulk_delete',
      status: 'success',
      related_collection: 'product_sub_category_types',
      metadata: { count: ids.length },
    });

    return res.json({ message: "Selected Sub Category have been deleted", code: 200 });
  } catch (error) {
    await createLog({
      ...getAdminLogContext(req),
      feature: 'sub_category',
      action: 'bulk_delete',
      status: 'failed',
      error_message: error.message,
    }).catch(() => {});
    utils.handleError(res, error);
  }
};

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

// Get category list (for product dropdowns) – only approved categories/sub-categories
exports.getCategoryList = async (req, res) => {
  try {
    const { search, offset = 0, limit = 10, sub_id, sub_sub_id } = req.query;

    const filter = { is_admin_approved: 'approved' };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (sub_id && sub_sub_id) {
      return utils.handleError(res, {
        message: "Please send category Parent Id separately",
        code: 404,
      });
    }

    let catergories = [];
    let count = 0;
    if (sub_id) {
      const parentCategory = await ProductCategory.findById(sub_id);
      if (!parentCategory) {
        return res.json({ data: [], count: 0, code: 200 });
      }
      // Admin: show sub-categories regardless of parent approval (admin manages them)
      filter.product_category_type_id = new mongoose.Types.ObjectId(sub_id);
      catergories = await ProductSubCategory.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
      count = await ProductSubCategory.countDocuments(filter);
    } else if (sub_sub_id) {
      const parentSubCategory = await ProductSubCategory.findById(sub_sub_id);
      if (!parentSubCategory || parentSubCategory.is_admin_approved !== 'approved') {
        return res.json({ data: [], count: 0, code: 200 });
      }
      filter.product_sub_category_type_id = new mongoose.Types.ObjectId(sub_sub_id);
      catergories = await ProductSubSubCategory.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
      count = await ProductSubSubCategory.countDocuments(filter);
    } else {
      catergories = await ProductCategory.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
      count = await ProductCategory.countDocuments(filter);
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
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
      categoryData.is_admin_approved = req.body.status;
      categoryData.rejected_reason = req.body.reason;
      await categoryData.save();
    } else {
      categoryData.is_admin_approved = req.body.status;
      await categoryData.save();
    }

    const actionType = req.body.status === "approved" ? "approve" : "reject";
    await createLog({
      ...getAdminLogContext(req),
      feature: 'category',
      action: actionType,
      status: 'success',
      related_id: categoryId,
      related_collection: 'product_categories',
      metadata: {
        category_name: categoryData.name,
        status: req.body.status,
        ...(req.body.reason && { rejected_reason: req.body.reason }),
      },
    });

    res.json({
      message: "Category status changed Successfully",
      code: 200
    });

  } catch (error) {
    await createLog({
      ...getAdminLogContext(req),
      feature: 'category',
      action: req.body?.status === "approved" ? "approve" : "reject",
      status: 'failed',
      related_id: req.body?.id,
      error_message: error.message,
    }).catch(() => {});
    utils.handleError(res, error);
  }
};