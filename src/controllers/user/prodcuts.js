const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const utils = require("../../utils/utils");

exports.addProduct = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.body
    const data = req.body;
    console.log("req.body is ", data)

    if (id) {
      const productData = await Product.findOne({ _id: id })
      console.log("product data is ", productData)

      if (!productData) {
        return utils.handleError(res, {
          message: "Product not found",
          code: 404,
        });
      }

      // const isExistedSku = productData?.variant?.some(i => i.sku_id.toString() === req.body?.sku_data?.sku_id?.toString())
      // console.log("isExistedSku : ", isExistedSku)

      const isExistedSku = await Product.findOne({
        "variant.sku_id": req.body?.sku_data?.sku_id,
      });
      console.log("isExistedSkuData : ", isExistedSku)

      if (isExistedSku) {
        return utils.handleError(res, {
          message: "Sku Id is already existed",
          code: 404,
        });
      }

      const newData = {
        ...req.body.sku_data
      }

      console.log("new data is ", newData)
      productData?.variant?.push(newData);
      await productData.save();

      return res.json({ message: "Product sku added successfully", code: 200 });
    }

    let newVariant = []
    if (data.sku_data) {
      // const isExistedSkuData = await Product.find({ sku_id: { $elemMatch: data?.sku_data?.sku_id } })
      const isExistedSkuData = await Product.findOne({
        "variant.sku_id": data?.sku_data?.sku_id,
      });
      console.log("isExistedSkuData : ", isExistedSkuData)

      if (isExistedSkuData) {
        return utils.handleError(res, {
          message: "Sku Id is already existed",
          code: 404,
        });
      }

      newVariant.push(data.sku_data)
    }

    const productData = {
      user_id: user_id,
      name: data.name,
      brand_id: data.brand_id,
      category_id: data.category_id,
      variant: [...newVariant]
    };

    if (data.sub_category_id) {
      productData.sub_category_id = data.sub_category_id
    }

    if (data.sub_sub_category_id) {
      productData.sub_sub_category_id = data.sub_sub_category_id
    }

    console.log("final product data is", productData)
    const product = await Product.create(productData);
    return res.json({ message: "Product added successfully", data: product, code: 200 });

  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product_id = req.params.id;

    const product = await Product.findById(product_id);
    if (!product)
      return utils.handleError(res, {
        message: "Product not found",
        code: 404,
      });

    if (product.is_deleted === true)
      utils.handleError(res, {
        message: "Product is already deleted",
        code: 400,
      });
    await Product.findByIdAndUpdate(product_id, { is_deleted: true });

    res.json({ message: "Product deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product_id = req.params.id;
    // const product = await Product.findById(product_id).populate({ path: 'category_id', as: 'category' }).populate({ path: 'sub_category_id', as: 'sub_sub_category' }).populate({ path: 'sub_sub_category_id', as: 'sub_sub_category' }).populate({ path: 'brand_id', as: 'brand' });
    const product = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(product_id), is_deleted: { $ne: true } } },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'product_categories',
          localField: 'category_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $lookup: {
          from: 'product_sub_category_types',
          localField: 'sub_category_id',
          foreignField: '_id',
          as: 'sub_category'
        }
      },
      {
        $lookup: {
          from: 'product_sub_sub_category_types',
          localField: 'sub_sub_category_id',
          foreignField: '_id',
          as: 'sub_sub_category'
        }
      },
      {
        $lookup: {
          from: 'brands',
          localField: 'brand_id',
          foreignField: '_id',
          as: 'brand'
        }
      },
      { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          user_id: 0,
          brand_id: 0,
          category_id: 0,
          sub_category_id: 0,
          sub_sub_category_id: 0
        }
      }
    ])
    console.log("productdata is ", product)
    if (!product || product.is_deleted === true)
      return utils.handleError(res, {
        message: "Product not found",
        code: 404,
      });
    res.json({ data: product[0], code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getProductList = async (req, res) => {
  try {
    const { search, offset = 0, limit = 10, supplier_id } = req.query;

    const filter = {
      is_deleted: { $ne: true }
    };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (supplier_id) {
      filter.user_id = new mongoose.Types.ObjectId(supplier_id)
    }

    // const productlist = await Product.find(filter)
    //   .sort({ createdAt: -1 })
    //   .skip(offset)
    //   .limit(limit)
    //   .populate('category_id').populate('sub_category_id').populate('sub_sub_category_id').populate('brand_id')

    const productlist = await Product.aggregate([
      { $match: { ...filter } },
      {
        $lookup: {
          from: 'product_categories',
          localField: 'category_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $lookup: {
          from: 'product_sub_category_types',
          localField: 'sub_category_id',
          foreignField: '_id',
          as: 'sub_category'
        }
      },
      {
        $lookup: {
          from: 'product_sub_sub_category_types',
          localField: 'sub_sub_category_id',
          foreignField: '_id',
          as: 'sub_sub_category'
        }
      },
      {
        $lookup: {
          from: 'brands',
          localField: 'brand_id',
          foreignField: '_id',
          as: 'brand'
        }
      },
      { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: parseInt(offset)
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          brand_id: 0,
          category_id: 0,
          sub_category_id: 0,
          sub_sub_category_id: 0
        }
      }
    ])

    const count = await Product.countDocuments(filter);

    res.json({ data: productlist, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.editProduct = async (req, res) => {
  try {
    const productId = req.params.id

    const product = await Product.findById(productId);

    if (!product || product.is_deleted === true)
      return utils.handleError(res, {
        message: "Product not found",
        code: 404,
      });

    await Product.findByIdAndUpdate(productId, req.body);
    const updatedproduct = await Product.findById(productId);

    res.json({
      data: updatedproduct,
      message: "Product has been updated",
      code: 200
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getProductNameList = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("userid is ", userId)

    const { search, offset = 0, limit = 10 } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (req.query.category_id) {
      filter.category_id = new mongoose.Types.ObjectId(req.query.category_id)
    } else {
      filter.user_id = new mongoose.Types.ObjectId(userId)
    }

    console.log("filter is ", filter)

    const productlist = await Product.aggregate([
      { $match: { ...filter } },
      { $project: { _id: 1, name: 1 } },
      { $sort: { createdAt: -1 } },
      { $skip: parseInt(offset) || 0 },
      { $limit: parseInt(limit) || 10 }
    ])

    const count = await Product.countDocuments(filter);

    res.json({ data: productlist, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
}