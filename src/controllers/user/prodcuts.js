const Product = require("../../models/product");
const utils = require("../../utils/utils");


exports.addProduct = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id, name } = req.query
    const data = req.body;

    if (!data.brand_id) {
      delete data.brand_id;
    }

    if (name && id) {
      return utils.handleError(res, {
        message: "Please specify one query either name or id",
        code: 404,
      });
    }
    else if (id) {
      const productData = await Product.findOne({ _id: id })
      console.log("product data is ", productData)

      if (!productData) {
        return utils.handleError(res, {
          message: "Product not found",
          code: 404,
        });
      }
      const newdata = Array.isArray(data) ? [...data] : [data];

      productData?.variant?.push(...newdata);
      await productData.save();

      return res.json({ message: "Product sku added successfully", code: 200 });

    }

    if (name) {
      data.name = name
    }

    const productData = {
      user_id: user_id,
      ...data,
    };

    const product = await Product.create(productData);
    return res.json({ message: "Product added successfully", code: 200 });


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
    const product = await Product.findById(product_id);

    if (!product || product.is_deleted === true)
      return utils.handleError(res, {
        message: "Product not found",
        code: 404,
      });

    res.json({ data: product, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.getProductList = async (req, res) => {
  try {
    const { search, offset = 0, limit = 10, supplier_id } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (supplier_id) {
      filter.user_id = supplier_id
    }

    const productlist = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

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
