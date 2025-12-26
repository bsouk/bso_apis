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
      is_admin_approved: "approved"
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
    const productId = req.params.id;
    const userId = req.user?.id || req.user?._id;
    console.log("⚙️ Incoming req.body:", JSON.stringify(req.body, null, 2));
    console.log("⚙️ Product ID:", productId);
    console.log("⚙️ User ID:", userId);

    if (!productId) {
      return utils.handleError(res, { message: "Product ID is required", code: 400 });
    }

    const product = await Product.findById(productId);
    if (!product || product.is_deleted) {
      return utils.handleError(res, { message: "Product not found", code: 404 });
    }

    // Optional: Check if product belongs to user (uncomment if needed)
    // if (product.user_id && product.user_id.toString() !== userId?.toString()) {
    //   return utils.handleError(res, { message: "You don't have permission to edit this product", code: 403 });
    // }

    const data_to_edit = {};
    
    // Handle category fields - ensure they're always arrays
    ['category_id', 'sub_category_id', 'sub_sub_category_id'].forEach(f => {
      if (req.body[f] !== undefined && req.body[f] !== null) {
        if (Array.isArray(req.body[f])) {
          // Filter out empty strings and null values
          data_to_edit[f] = req.body[f].filter(item => item && item !== '');
        } else if (req.body[f] !== '' && req.body[f] !== null) {
          // Convert single value to array
          data_to_edit[f] = [req.body[f]];
        }
        // If it's an empty string or null, don't include it in the update
      }
    });
    
    if (req.body.name) data_to_edit.name = req.body.name;
    if (req.body.brand_id) data_to_edit.brand_id = req.body.brand_id;

    // Handle variant/sku_data
    const incomingVariants = req.body.variant || req.body.sku_data;
    if (incomingVariants) {
      try {
        product.variant = Array.isArray(product.variant) ? product.variant : [];
        const variantsArray = Array.isArray(incomingVariants) ? incomingVariants : [incomingVariants];
        
        console.log("📦 Processing variants. Incoming:", variantsArray.length, "Existing:", product.variant.length);
        
        let hasValidVariant = false;
        const updatedVariants = [...product.variant]; // Create a copy to avoid direct mutation
        
        for (const newV of variantsArray) {
          if (!newV || !newV.sku_id) {
            console.warn("⚠️ Skipping invalid variant:", newV);
            continue;
          }
          
          // Try to find variant by sku_id (handle both string and ObjectId comparisons)
          const idx = updatedVariants.findIndex(v => {
            if (!v || !v.sku_id) return false;
            const existingSku = String(v.sku_id).trim();
            const incomingSku = String(newV.sku_id).trim();
            return existingSku === incomingSku;
          });
          
          if (idx === -1) {
            const availableSkus = updatedVariants.map(v => v?.sku_id).filter(Boolean);
            console.warn(`⚠️ Variant with sku_id "${newV.sku_id}" not found. Available SKUs:`, availableSkus);
            // Return error if variant not found - this is a critical issue
            return utils.handleError(res, { 
              message: `Variant with SKU ID "${newV.sku_id}" not found in product. Available SKUs: ${availableSkus.join(', ')}`, 
              code: 404 
            });
          }
          
          hasValidVariant = true;
          
          // Process images - ensure they're strings (file paths), not objects
          let processedImages = [];
          if (newV.images && Array.isArray(newV.images)) {
            processedImages = newV.images.map(img => {
              if (typeof img === 'string') return img.trim();
              if (img && typeof img === 'object') {
                if (img.url) return String(img.url).trim();
                if (img.fileKey) return String(img.fileKey).trim();
              }
              return null;
            }).filter(Boolean);
          } else if (newV.images !== undefined) {
            // If images is explicitly set to null/undefined, keep existing
            processedImages = updatedVariants[idx].images || [];
          } else {
            // If images not provided, keep existing
            processedImages = updatedVariants[idx].images || [];
          }
          
          // Process specification - ensure it's in the correct format
          let processedSpecs = [];
          if (newV.specification && Array.isArray(newV.specification)) {
            processedSpecs = newV.specification
              .filter(spec => spec && (spec.specification_type || spec.value))
              .map(spec => {
                if (typeof spec === 'object' && spec.specification_type && spec.value) {
                  return {
                    specification_type: String(spec.specification_type).trim(),
                    value: String(spec.value).trim()
                  };
                }
                return spec;
              });
          } else if (newV.specification !== undefined) {
            processedSpecs = updatedVariants[idx].specification || [];
          } else {
            processedSpecs = updatedVariants[idx].specification || [];
          }
          
          // Process tag - ensure it's an array of strings
          let processedTags = [];
          if (newV.tag && Array.isArray(newV.tag)) {
            processedTags = newV.tag.map(t => String(t).trim()).filter(Boolean);
          } else if (newV.tag !== undefined) {
            processedTags = updatedVariants[idx].tag || [];
          } else {
            processedTags = updatedVariants[idx].tag || [];
          }
          
          // Build updated variant object - only update provided fields
          const updatedVariant = {
            ...updatedVariants[idx].toObject ? updatedVariants[idx].toObject() : updatedVariants[idx],
            ...(newV.sku_id !== undefined && { sku_id: String(newV.sku_id).trim() }),
            ...(newV.part_no !== undefined && { part_no: String(newV.part_no).trim() }),
            ...(newV.description !== undefined && { description: String(newV.description).trim() }),
            ...(newV.inventory_quantity !== undefined && { inventory_quantity: String(newV.inventory_quantity).trim() }),
            ...(newV.price !== undefined && { price: Number(newV.price) }),
            ...(newV.discount !== undefined && { discount: Number(newV.discount) }),
            ...(newV.bulk_discount !== undefined && { bulk_discount: Number(newV.bulk_discount) }),
            images: processedImages,
            specification: processedSpecs,
            tag: processedTags,
          };
          
          // Remove undefined values
          Object.keys(updatedVariant).forEach(key => {
            if (updatedVariant[key] === undefined) {
              delete updatedVariant[key];
            }
          });
          
          updatedVariants[idx] = updatedVariant;
        }
        
        if (hasValidVariant) {
          data_to_edit.variant = updatedVariants;
          console.log("✅ Variants processed successfully");
        } else {
          console.warn("⚠️ No valid variants found to update");
        }
      } catch (variantError) {
        console.error("🔴 Error processing variants:", variantError);
        return utils.handleError(res, { 
          message: `Error processing variants: ${variantError.message}`, 
          code: 500,
          error: variantError.toString()
        });
      }
    }

    // 🚨 Debug: view data before GPT
    console.log("🔍 Data to validate:", data_to_edit);

    // Optional GPT Validation - Skip if API key is not available or if API call fails
    let gptValidationPassed = true;
    const gptApiKey = process.env.GPT_API_KEY;
    
    if (gptApiKey) {
      try {
        const gptPrompt = `
You are a strict validator for product data.

You will be given a product JSON. Validate it based on the rules below and respond with ONLY valid JSON (no markdown, no explanation, no extra text).

Here is the product JSON:
${JSON.stringify(data_to_edit)}

Validation rules:
- name: Must be meaningful (not gibberish or repeated characters)
- brand_id: Must be a non-empty string
- category_id and sub_category_id: Must be non-empty arrays
- Each variant must have:
  - sku_id: non-empty
  - part_no: non-empty
  - description: clear and meaningful
  - inventory_quantity:Required

If valid:
{"status": "valid"}

If invalid:
{"status": "error", "errors": "name is not meaningful, description does not clearly describe the product"}

⚠️ Respond with clean JSON only. Do not include backticks, markdown, explanations, or comments.
`;

        const gptResp = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a strict product validator.' },
            { role: 'user', content: gptPrompt }
          ],
          temperature: 0
        }, {
          headers: { Authorization: `Bearer ${gptApiKey}` },
          timeout: 10000 // 10 second timeout
        });

        const content = gptResp.data.choices[0].message.content.trim();
        let gptResult;
        console.log('GPT content', content);
        
        try {
          // Match only the JSON part of the response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON found in GPT response");

          gptResult = JSON.parse(jsonMatch[0]);
        } catch (ex) {
          console.warn("⚠️ Invalid GPT response format, skipping GPT validation:", ex.message);
          gptValidationPassed = true; // Continue without GPT validation
        }

        if (gptResult && gptResult.status !== 'valid') {
          console.log("🔻 GPT Validation failed:", gptResult.errors);
          // Continue anyway - GPT validation is optional
          // You can uncomment the line below to reject invalid products
          // return res.status(400).json({ message: gptResult?.errors, errors: gptResult, code: 400 });
          console.warn("⚠️ GPT validation failed but continuing with update (GPT validation is optional)");
        }
      } catch (gptError) {
        // GPT API call failed - log but continue with update
        console.warn("⚠️ GPT validation failed (API unavailable or error), continuing without validation:", gptError.message);
        gptValidationPassed = true; // Continue without GPT validation
      }
    } else {
      console.log("ℹ️ GPT_API_KEY not configured, skipping GPT validation");
    }

    // Only set approval status if we have data to update
    if (Object.keys(data_to_edit).length > 0) {
      data_to_edit.is_admin_approved = 'approved';
    }
    
    console.log("✅ Updating product (approved):", JSON.stringify(data_to_edit, null, 2));

    // Validate data_to_edit is not empty
    if (Object.keys(data_to_edit).length === 0) {
      return utils.handleError(res, { 
        message: "No data provided to update", 
        code: 400 
      });
    }

    try {
      // Use updateOne instead of findByIdAndUpdate for better error handling
      const updateResult = await Product.updateOne(
        { _id: productId },
        { $set: data_to_edit },
        { runValidators: false }
      );
      
      console.log("📝 Update result:", updateResult);
      
      if (updateResult.matchedCount === 0) {
        return utils.handleError(res, { 
          message: "Product not found", 
          code: 404 
        });
      }
      
      if (updateResult.modifiedCount === 0 && updateResult.matchedCount > 0) {
        console.warn("⚠️ Product found but no changes were made");
      }
      
      // Fetch the updated product
      const updated = await Product.findById(productId);
      
      if (!updated) {
        return utils.handleError(res, { 
          message: "Product not found after update", 
          code: 404 
        });
      }

      res.json({ data: updated, message: "Updated & approved", code: 200 });
    } catch (updateError) {
      console.error("🔴 MongoDB update error:", updateError);
      console.error("🔴 Error stack:", updateError.stack);
      console.error("🔴 Update data that failed:", JSON.stringify(data_to_edit, null, 2));
      
      // Check for specific MongoDB errors
      if (updateError.name === 'ValidationError') {
        return utils.handleError(res, { 
          message: `Validation error: ${updateError.message}`, 
          code: 400,
          errors: updateError.errors
        });
      }
      
      if (updateError.name === 'CastError') {
        return utils.handleError(res, { 
          message: `Invalid data format: ${updateError.message}`, 
          code: 400
        });
      }
      
      return utils.handleError(res, { 
        message: updateError.message || "Failed to update product", 
        code: 500,
        error: updateError.toString()
      });
    }

  } catch (err) {
    console.error("🔴 editProduct error:", err);
    console.error("🔴 Error stack:", err.stack);
    utils.handleError(res, {
      message: err.message || "Internal server error",
      code: err.code || 500,
      error: err.toString()
    });
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

/**
 * Generate product details via external AI service
 * Requires env:
 * - CHATBOT_X_API_KEY (uses same API key as chatbot)
 * 
 * API Endpoint: https://uxbefmykqw.eu-west-2.awsapprunner.com/api/v1/product-list
 * Uses the same API key as chatbot (CHATBOT_X_API_KEY from .env lines 105-106)
 */
exports.generateProductList = async (req, res) => {
    try {
        // Use the specific product list API URL
        const productListApiUrl = 'https://uxbefmykqw.eu-west-2.awsapprunner.com/api/v1/product-list';
        
        // Use the same API key as chatbot (from .env lines 105-106)
        const aiApiKey = process.env.CHATBOT_X_API_KEY;

        if (!aiApiKey) {
            return utils.handleError(res, {
                message: "AI product generation service is not configured. Missing CHATBOT_X_API_KEY.",
                code: 500,
            });
        }

        // Prepare payload from request body
        const requestBody = req.body || {};
        
        // Validate required fields
        if (!requestBody.text) {
            return utils.handleError(res, {
                message: "Product description text is required",
                code: 400,
            });
        }
        
        console.log('📝 Calling AI Product List API:', productListApiUrl);
        console.log('📦 Payload:', JSON.stringify(requestBody, null, 2));

        const aiResponse = await axios.post(
            productListApiUrl,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': aiApiKey
                },
                timeout: 30000,
            }
        );

        const responseData = aiResponse?.data || {};

        console.log('✅ AI Product List Response:', JSON.stringify(responseData, null, 2));

        return res.status(200).json({
            message: "Product details generated successfully",
            code: 200,
            data: responseData,
        });
    } catch (error) {
        console.error("AI product generation error:", error?.response?.data || error.message);
        return utils.handleError(res, error);
    }
};

