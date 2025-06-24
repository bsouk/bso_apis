const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const utils = require("../../utils/utils");
const Team = require("../../models/team");
const User = require("../../models/user");
const BrandModel = require("../../models/brand")
const CategoryModel = require("../../models/product_category");
const SubCategoryModel = require("../../models/product_sub_category")

const axios = require('axios')
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
      variant: [...newVariant],
      product_of: "supplier"
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
          'user.password': 0,
          // 'user.email': 0,
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
    const { search, offset = 0, limit = 10, category_id, status, from, to, time_filter } = req.query;

    const filter = {
      is_deleted: { $ne: true },
      // is_admin_approved: "approved"
    };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (status) {
      filter.is_admin_approved = status
    }

    // if (category_id) {
    //   filter.category_id = { $in: [new mongoose.Types.ObjectId(category_id)] }
    // }

    if (category_id) {
      const categoryIds = category_id.split(',').map(id => id.trim()).filter(mongoose.Types.ObjectId.isValid);
      if (categoryIds.length) {
        filter.category_id = { $in: categoryIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    if (from && to) {
      let newfrom = new Date(from);
      let newto = new Date(to);
      console.log("newfrom : ", newfrom, " newto : ", newto);
      filter.createdAt = { $gte: newfrom, $lte: newto }
    }

    if (time_filter) {
      const now = new Date();
      let start, end;

      switch (time_filter) {
        case 'today': {
          start = new Date(now.setHours(0, 0, 0, 0));
          end = new Date(now.setHours(23, 59, 59, 999));
          console.log("start : ", start, " end : ", end);
          break;
        }

        case 'this_week': {
          start = new Date();
          start.setDate(now.getDate() - 6);
          start.setHours(0, 0, 0, 0);

          end = new Date();
          end.setHours(23, 59, 59, 999);
          console.log("start : ", start, " end : ", end);
          break;
        }

        case 'this_month': {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          console.log("start : ", start, " end : ", end);
          break;
        }

        case 'previous_month': {
          const prevMonth = now.getMonth() - 1;
          const year = prevMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const month = (prevMonth + 12) % 12;
          start = new Date(year, month, 1);
          end = new Date(year, month + 1, 0, 23, 59, 59, 999);
          console.log("start : ", start, " end : ", end);
          break;
        }

        case 'this_year': {
          // start = new Date(now.getFullYear(), 0, 1);
          // end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          start = new Date();
          start.setFullYear(start.getFullYear() - 1);
          start.setHours(0, 0, 0, 0);
          end = new Date();
          end.setHours(23, 59, 59, 999);
          console.log("start : ", start, " end : ", end);
          break;
        }

        default:
          break;
      }
      if (start && end) {
        filter.createdAt = { $gte: start, $lte: end };
      }
    }

    console.log("filter : ", filter)

    // const productlist = await Product.find(filter)
    //   .sort({ createdAt: -1 })
    //   .skip(offset)
    //   .limit(limit)
    //   .populate('category_id').populate('sub_category_id').populate('sub_sub_category_id').populate('brand_id')
    const productlist = await Product.aggregate([
      { $match: { ...filter } },
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
          'user.password': 0,
          // 'user.email': 0,
          user_id: 0,
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

exports.getMyProductList = async (req, res) => {
  try {
    const id = req.user._id
    const { search, offset = 0, limit = 10, category_id, status, from, to, time_filter } = req.query;

    let teamdata = await Team.findOne(
      {
        $or: [
          {
            admin_id: new mongoose.Types.ObjectId(id)
          },
          {
            members: { $in: [new mongoose.Types.ObjectId(id)] }
          },
        ],
        team_type: "supplier",
      }
    ).populate('admin_id')
    console.log("teamdata : ", teamdata)

    const mymemberdata = await User.findOne({ _id: new mongoose.Types.ObjectId(id) })
    console.log("mymemberdata : ", mymemberdata)

    let mypermission = mymemberdata?.permission?.quotation
    console.log("mypermission : ", mypermission)

    const filter = {
      is_deleted: { $ne: true },
      // is_admin_approved: "approved"
    };

    if (teamdata) {
      switch (mypermission) {
        case "all": {
          filter.user_id = { $in: [...teamdata?.members, teamdata?.admin_id?._id] }
        }; break;
        case "none": {
          return res.json({ data: [], count: 0, code: 200 });
        }
        default: {
          filter.user_id = new mongoose.Types.ObjectId(id)
        }
      }
    } else {
      filter.user_id = new mongoose.Types.ObjectId(id)
    }

    let queryFilter = {}

    if (search) {
      queryFilter['$or'] = [
        { name: { $regex: search, $options: "i" } },
        { 'brand.name': { $regex: search, $options: "i" } },
        {
          variant: {
            $elemMatch: {
              $or: [
                { sku_id: { $regex: search, $options: "i" } },
                { part_no: { $regex: search, $options: "i" } }
              ]
            }
          }
        }
      ]
    }

    if (status) {
      filter.is_admin_approved = status
    }

    // if (category_id) {
    //   filter.category_id = { $in: [new mongoose.Types.ObjectId(category_id)] }
    // }

    if (category_id) {
      const categoryIds = category_id.split(',').map(id => id.trim()).filter(mongoose.Types.ObjectId.isValid);
      if (categoryIds.length) {
        filter.category_id = { $in: categoryIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    if (from && to) {
      let newfrom = new Date(from);
      let newto = new Date(to);
      console.log("newfrom : ", newfrom, " newto : ", newto);
      filter.createdAt = { $gte: newfrom, $lte: newto }
    }

    if (time_filter) {
      const now = new Date();
      let start, end;

      switch (time_filter) {
        case 'today': {
          start = new Date(now.setHours(0, 0, 0, 0));
          end = new Date(now.setHours(23, 59, 59, 999));
          console.log("start : ", start, " end : ", end);
          break;
        }

        case 'this_week': {
          start = new Date();
          start.setDate(now.getDate() - 6);
          start.setHours(0, 0, 0, 0);

          end = new Date();
          end.setHours(23, 59, 59, 999);
          console.log("start : ", start, " end : ", end);
          break;
        }

        case 'this_month': {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          console.log("start : ", start, " end : ", end);
          break;
        }

        case 'previous_month': {
          const prevMonth = now.getMonth() - 1;
          const year = prevMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
          const month = (prevMonth + 12) % 12;
          start = new Date(year, month, 1);
          end = new Date(year, month + 1, 0, 23, 59, 59, 999);
          console.log("start : ", start, " end : ", end);
          break;
        }

        case 'this_year': {
          // start = new Date(now.getFullYear(), 0, 1);
          // end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          start = new Date();
          start.setFullYear(start.getFullYear() - 1);
          start.setHours(0, 0, 0, 0);
          end = new Date();
          end.setHours(23, 59, 59, 999);
          console.log("start : ", start, " end : ", end);
          break;
        }

        default:
          break;
      }
      if (start && end) {
        filter.createdAt = { $gte: start, $lte: end };
      }
    }

    console.log("filter : ", filter, "queryFilter : ", queryFilter);

    // const productlist = await Product.find(filter)
    //   .sort({ createdAt: -1 })
    //   .skip(offset)
    //   .limit(limit)
    //   .populate('category_id').populate('sub_category_id').populate('sub_sub_category_id').populate('brand_id')
    const productlist = await Product.aggregate([
      { $match: { ...filter } },
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
      { $match: queryFilter },
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
          'user.password': 0,
          // 'user.email': 0,
          user_id: 0,
          brand_id: 0,
          category_id: 0,
          sub_category_id: 0,
          sub_sub_category_id: 0
        }
      }
    ])
    const count = await Product.countDocuments(filter);
    return res.json({ data: productlist, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.editProduct = async (req, res) => {
  try {
    const productId = req.params.id
    console.log("req.body is ", req.body)

    const product = await Product.findById(productId);

    if (!product || product.is_deleted === true)
      return utils.handleError(res, {
        message: "Product not found",
        code: 404,
      });

    let data_to_edit = {}
    // if (req.body.variant) {
    //     const isExisted = await Product.find({ 'variant.sku_id': { $in: req.body.variant.sku_id } })
    //     console.log("isExisted ", isExisted)
    //     if (!isExisted) {
    //         return utils.handleError(res, {
    //             message: "sku_id not existed",
    //             code: 404,
    //         });
    //     }
    //     data_to_edit.variant = [...req.body.variant]
    // }
    if (req.body.category_id) {
      data_to_edit.category_id = [...req.body.category_id]
    }
    if (req.body.sub_category_id) {
      data_to_edit.sub_category_id = [...req.body.sub_category_id]
    }
    if (req.body.sub_sub_category_id) {
      data_to_edit.sub_sub_category_id = [...req.body.sub_sub_category_id]
    }
    if (req.body.name) {
      data_to_edit.name = req.body.name
    }
    if (req.body.brand_id) {
      data_to_edit.brand_id = req.body.brand_id
    }
    const incomingVariants = req.body.variant || req.body.sku_data;

    if (incomingVariants) {
      if (!Array.isArray(product.variant)) {
        product.variant = [];
      }

      for (const newVariant of incomingVariants) {
        const existingVariantIndex = product.variant.findIndex(
          (v) => v.sku_id === newVariant.sku_id
        );

        if (existingVariantIndex !== -1) {
          Object.assign(product.variant[existingVariantIndex], newVariant);
        } else {
          return utils.handleError(res, {
            message: `Variant with sku_id ${newVariant.sku_id} not found`,
            code: 404,
          });
        }
      }

      data_to_edit.variant = product.variant;
    }


    await Product.findByIdAndUpdate(productId, data_to_edit, { new: true });

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
      { $match: { ...filter, is_deleted: false } },
      { $project: { _id: 1, name: 1, brand_id: 1, category_id: 1, sub_category_id: 1 } },
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

exports.addReview = async (req, res) => {
  try {
    const { order_id, review_stars, title, comment, uploaded_images, product_id } = req.body
    const product_data = await Product.findOne({ _id: product_id })
    console.log("product_data : ", product_data)
    if (!product_data) {
      return utils.handleError(res, {
        message: 'product not found',
        code: 404,
      });
    }

    const newreview = {
      order_id,
      review_stars,
      title,
      comment
    }

    if (uploaded_images && uploaded_images.length !== 0) {
      newreview.uploaded_images = uploaded_images
    }

    product_data.review.push(newreview)
    await product_data.save()

    return res.status(200).json({
      message: "review added successfully",
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}

function parseSpecification(specStr) {
  if (!specStr) return [];

  return specStr.split(",").map((item) => {
    const [key, value] = item.split(":").map(i => i.trim());
    return {
      specification_type: key,
      value: value
    };
  });
}

async function findOrCreateByName(model, name, field = "name") {
  if (!name) return null;
  const existing = await model.findOne({ [field]: name.trim() });
  if (existing) return existing._id;

  const created = await model.create({ [field]: name.trim() });
  return created._id;
}



async function checkDataIsNotEmptyAndConvertProduct(data, req, res) {
  try {
    const modifiedData = [];

    for (let index = 0; index < data.length; index++) {
      const row = data[index];
      const rowNumber = index + 1;

      const getValue = (key) => row[key]?.toString().trim() || "";

      const product_name = getValue("Product Name");
      if (!product_name) throw { message: `Missing 'Product Name' at row ${rowNumber}`, code: 400 };

      const product_brand = getValue("Product Brand");
      if (!product_brand) throw { message: `Missing 'Product Brand' at row ${rowNumber}`, code: 400 };

      const product_categories = getValue("Product Categories");
      if (!product_categories) throw { message: `Missing 'Product Categories' at row ${rowNumber}`, code: 400 };

      const product_sub_categories = getValue("Product Sub Categories"); // optional

      const sku = getValue("SKU");
      if (!sku) throw { message: `Missing 'SKU' at row ${rowNumber}`, code: 400 };

      const isExistedSku = await Product.findOne({ "variant.sku_id": sku });
      if (isExistedSku) {
        throw { message: `SKU '${sku}' already exists`, code: 400 };
      }

      const part_no = getValue("Part No.");
      if (!part_no) throw { message: `Missing 'Part No.' at row ${rowNumber}`, code: 400 };

      const quantity = getValue("Inventory Quantity");
      if (!quantity) throw { message: `Missing 'Inventory Quantity' at row ${rowNumber}`, code: 400 };
      if (isNaN(Number(quantity))) throw { message: `'Inventory Quantity' must be a number at row ${rowNumber}`, code: 400 };

      const specification = getValue("Specification");
      const specifications = parseSpecification(specification);

      // if (!specification) throw { message: `Missing 'Specification' at row ${rowNumber}`, code: 400 };

      const tags = getValue("Tags");
      if (!tags) throw { message: `Missing 'Tags' at row ${rowNumber}`, code: 400 };

      const description = getValue("Discription"); // Keep the typo if Excel uses it
      if (!description) throw { message: `Missing 'Discription' at row ${rowNumber}`, code: 400 };
      const brand_id = await findOrCreateByName(BrandModel, product_brand);
      const category_id = await findOrCreateByName(CategoryModel, product_categories);
      const sub_category_id = await findOrCreateByName(SubCategoryModel, product_sub_categories); // optional
      console.log('modifiedData', modifiedData)
      // Add to final transformed data
      modifiedData.push({
        product_name,
        brand_id,
        category_id,
        sub_category_id,
        sku,
        part_no,
        quantity: Number(quantity),
        specification: specifications,
        tags,
        description,
      });
    }

    // Call GPT after validation
    const gptResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `You are a product quality reviewer. For each product, decide if it should be approved or rejected.

For rejected products, give a clear reason why.

Return *only* a valid JSON array in this format:
[
  {
    "product": { ... }, 
    "status": "approved" | "rejected", 
    "reason": "optional reason if rejected"
  }
]

No explanation. No markdown. Just raw JSON.`
          }
          ,
          {
            role: 'user',
            content: JSON.stringify(modifiedData)
          }

        ],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GPT_API_KEY}`
        }
      }
    );

    const content = gptResponse?.data?.choices?.[0]?.message?.content?.trim();


    let parsed;

    try {
      // Remove markdown code block wrappers if any
      const jsonClean = content
        .replace(/^```json/, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();

      parsed = JSON.parse(jsonClean);
    } catch (err) {
      console.error("GPT Output (raw):", content);
      throw { message: "Invalid GPT JSON format", code: 500 };
    }

    return parsed;


  } catch (error) {
    console.error("Validation or GPT Error:", error);
    throw error;
  }
}

async function convertAndSave(item, userId) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('item', item)
      const productData = {
        name: item.product.product_name,
        brand_id: item.product.brand_id,
        category_id: [item.product.category_id],
        sub_category_id: [item.product.sub_category_id],
        variant: [{
          sku_id: item.product.sku,
          part_no: item.product.part_no,
          description: item.product.description,
          inventory_quantity: item.product.quantity,
          specification: item.product.specification,
          tag: item.product.tags,
        }],
        is_admin_approved: item.status === "approved" ? "approved" : "rejected",
        rejected_reason: item.status === "rejected" ? item.reason : "",
        user_id: userId
      };

      const product = new Product(productData);
      await product.save();
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

exports.bulkUpload = async (req, res) => {
  try {
    const files = req.files;
    const type = req.body.type;
    const userId = req.user?._id;

    if (!["excel", "csv"].includes(type))
      return utils.handleError(res, { message: "Invalid type", code: 400 });

    if (!files?.articles?.data)
      return utils.handleError(res, { message: "No file uploaded", code: 400 });

    const productFileData = files.articles.data;
    const data = type === "excel"
      ? utils.jsonConverterFromExcel(productFileData)
      : await utils.jsonConverterFromCsv(productFileData);

    const gptValidatedData = await checkDataIsNotEmptyAndConvertProduct(data);

    const responseSummary = [];

    for (const item of gptValidatedData) {
      await convertAndSave(item, userId);
      responseSummary.push({
        sku: item.product?.sku,
        status: item.status,
        reason: item.reason || null
      });
    }

    const rejectedCount = responseSummary.filter(i => i.status === "rejected").length;
    const allApproved = rejectedCount === 0;
    return res.status(200).json({
      message: rejectedCount === 0 ? "All products uploaded successfully." : "Some products were rejected.",
      summary: responseSummary,
      allApproved,
      code: 200
    });

  } catch (error) {
    console.error("Bulk Upload Error:", error);
    return utils.handleError(res, {
      code: error.code || 500,
      message: error.message || "Something went wrong",
    });
  }
};

