const { default: mongoose } = require("mongoose");
const axios = require("axios");
const Product = require("../../models/product");
const utils = require("../../utils/utils");
const { notifyAllSuperAdmins } = require("../../utils/notifyAdmins");
const { createLog } = require("../../utils/logger");
const admin_received_notification = require("../../models/admin_received_notification");

// exports.addProduct = async (req, res) => {
//     try {
//         const user_id = req.user.id;
//         const { id, name } = req.query
//         const data = req.body;

//         if (!data.brand_id) {
//             delete data.brand_id;
//         }

//         if (name && id) {
//             return utils.handleError(res, {
//                 message: "Please specify one query either name or id",
//                 code: 404,
//             });
//         }
//         else if (id) {
//             const productData = await Product.findOne({ _id: id })
//             console.log("product data is ", productData)

//             if (!productData) {
//                 return utils.handleError(res, {
//                     message: "Product not found",
//                     code: 404,
//                 });
//             }
//             const newdata = Array.isArray(data) ? [...data] : [data];

//             productData?.variant?.push(...newdata);
//             await productData.save();

//             return res.json({ message: "Product sku added successfully", code: 200 });

//         }

//         if (name) {
//             data.name = name
//         }

//         const productData = {
//             user_id: user_id,
//             ...data,
//         };

//         const product = await Product.create(productData);
//         return res.json({ message: "Product added successfully", code: 200 });


//     } catch (error) {
//         utils.handleError(res, error);
//     }
// };


exports.addProduct = async (req, res) => {
    try {
        const adminId = req.user._id
        console.log('admin id : ', adminId)
        const user_id = req.body.supplier_id;
        const { id } = req.body;
        console.log("id is ", id);
        const data = req.body;
        console.log("req.body is ", data);

        // Helper: find canonical part number for a product (first non-deleted, non-empty variant.part_no)
        const getCanonicalPartNo = (productDoc) => {
            if (!productDoc || !Array.isArray(productDoc.variant)) return null;
            const activeVariants = productDoc.variant.filter(
                (v) => v && v.is_sku_deleted !== true && v.part_no
            );
            return activeVariants.length > 0 ? activeVariants[0].part_no : null;
        };

        if (id) {
            const productData = await Product.findOne({ _id: id });
            console.log("product data is ", productData);

            if (!productData) {
                return utils.handleError(res, {
                    message: "Product not found",
                    code: 404,
                });
            }

            const incomingSkuData = req.body?.sku_data || {};
            const incomingPartNo = incomingSkuData.part_no;
            const canonicalPartNo = getCanonicalPartNo(productData);

            // Enforce SKU uniqueness per product (ignore globally deleted variants)
            if (incomingSkuData.sku_id) {
                const newSku = String(incomingSkuData.sku_id).trim();
                const skuExistsInProduct = productData.variant.some(
                    (v) =>
                        v &&
                        v.is_sku_deleted !== true &&
                        v.sku_id &&
                        String(v.sku_id).trim() === newSku
                );
                if (skuExistsInProduct) {
                    return res.status(400).json({
                        code: 400,
                        message: "This SKU already exists for this product. Please use a different SKU.",
                    });
                }
            }

            // Part number rules for existing product:
            // - If product already has a canonical part number, all new inventory must use the SAME part number.
            // - If no canonical exists yet, first incoming part number becomes canonical (still unique globally).
            let finalPartNo = incomingPartNo;

            if (canonicalPartNo) {
                // Product already has a part number; enforce that incoming matches it.
                if (
                    incomingPartNo &&
                    String(incomingPartNo).trim() !== String(canonicalPartNo).trim()
                ) {
                    return res.status(400).json({
                        code: 400,
                        message:
                            "Part number must match the existing product part number for additional inventory.",
                    });
                }
                finalPartNo = canonicalPartNo;
            } else {
                // No canonical part number yet for this product – allow setting it now but ensure global uniqueness.
                if (!incomingPartNo || String(incomingPartNo).trim() === "") {
                    return res.status(400).json({
                        code: 400,
                        message: "Part number is required when adding the first inventory for this product.",
                    });
                }

                const newPartNo = String(incomingPartNo).trim();
                const isExistedPart = await Product.findOne({
                    _id: { $ne: id },
                    "variant.part_no": newPartNo,
                    is_deleted: { $ne: true },
                });
                console.log("isExistedPartNoData (existing product) : ", isExistedPart);

                if (isExistedPart) {
                    return res.status(400).json({
                        code: 400,
                        message:
                            "This part number already exists for another product. Please use a different part number.",
                    });
                }

                finalPartNo = newPartNo;
            }

            const newData = {
                ...incomingSkuData,
                part_no: finalPartNo,
            };

            console.log("new data is ", newData);
            productData?.variant?.push(newData);
            await productData.save();

            try {
                await createLog({
                    admin_id: adminId,
                    admin_name: req.user.full_name || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email,
                    admin_email: req.user.email,
                    admin_role: req.user.role,
                    feature: 'product',
                    action: 'create',
                    related_id: productData._id,
                    related_collection: 'products',
                    status: 'success',
                    details: { product_name: productData.name, added_variant: true, part_no: newData.part_no },
                    req,
                });
            } catch (logErr) {
                console.error('[addProduct variant] Log error:', logErr);
            }

            return res.json({ message: "Product sku added successfully", code: 200 });
        } else {
            let newVariant = [];
            if (data.sku_data) {
                const newPartNo = data?.sku_data?.part_no;

                // Uniqueness for part number across all variants
                if (newPartNo) {
                    const isExistedPart = await Product.findOne({
                        "variant.part_no": newPartNo,
                        is_deleted: { $ne: true },
                    });
                    console.log("isExistedPartNoData : ", isExistedPart);

                    if (isExistedPart) {
                        return res.status(400).json({
                            code: 400,
                            message: "This part number already exists for another product. Please use a different part number.",
                        });
                    }
                }

                newVariant.push(data.sku_data);
            }

            const productData = {
                user_id: user_id ? user_id : adminId,
                product_of: 'admin',
                name: data.name,
                brand_id: data.brand_id,
                category_id: data.category_id,
                variant: [...newVariant],
                is_admin_approved: "approved"
            };

            if (data.sub_category_id) {
                productData.sub_category_id = data.sub_category_id
            }

            if (data.sub_sub_category_id) {
                productData.sub_sub_category_id = data.sub_sub_category_id
            }

            console.log("final product data is", productData)
            const product = await Product.create(productData);

            const productDisplay = product.name || product._id?.toString() || 'N/A';
            const notifTitle = `New Product – ${productDisplay}`;
            const notifDesc = `Admin added a new product. Product: ${productDisplay}`;
            const notifPayload = {
                title: notifTitle,
                description: notifDesc,
                type: 'new_product',
                related_to: product._id,
                related_to_type: 'product',
            };

            // Notify all super_admins (admin panel notifications, like manual enquiry)
            try {
                const { saved, fcmSent } = await notifyAllSuperAdmins(notifPayload);
                if (saved > 0 || fcmSent > 0) console.log(`[addProduct] Admin notification: saved=${saved}, fcmSent=${fcmSent}`);
            } catch (err) {
                console.error('[addProduct] Admin notification error:', err);
            }

            // Always notify the current admin (who added the product) so they see it in the notifications panel
            try {
                const receiverId = adminId && mongoose.Types.ObjectId.isValid(adminId)
                    ? (adminId instanceof mongoose.Types.ObjectId ? adminId : new mongoose.Types.ObjectId(adminId))
                    : null;
                if (receiverId) {
                    await admin_received_notification.create({
                        title: notifTitle,
                        description: notifDesc,
                        type: 'new_product',
                        related_to: product._id,
                        related_to_type: 'product',
                        receiver_id: receiverId,
                    });
                }
            } catch (err) {
                console.error('[addProduct] Current admin notification error:', err);
            }

            // Log success (admin logs system)
            try {
                await createLog({
                    admin_id: adminId,
                    admin_name: req.user.full_name || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email,
                    admin_email: req.user.email,
                    admin_role: req.user.role,
                    feature: 'product',
                    action: 'create',
                    related_id: product._id,
                    related_collection: 'products',
                    status: 'success',
                    details: { product_name: product.name, supplier_id: user_id || adminId },
                    req,
                });
            } catch (logErr) {
                console.error('[addProduct] Log error:', logErr);
            }

            return res.json({ message: "Product added successfully", data: product, code: 200 });
        }

    } catch (error) {
        // Log failure on create
        try {
            await createLog({
                admin_id: req.user?._id,
                admin_name: req.user?.full_name || `${req.user?.first_name || ''} ${req.user?.last_name || ''}`.trim() || req.user?.email,
                admin_email: req.user?.email,
                admin_role: req.user?.role,
                feature: 'product',
                action: 'create',
                status: 'failed',
                error_message: error?.message,
                error_stack: error?.stack,
                req,
            });
        } catch (logErr) {
            console.error('[addProduct] Log error:', logErr);
        }
        utils.handleError(res, error);
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product_id = req.params.id;
        const { variant_id } = req.body;  // Check if deleting a specific variant

        const product = await Product.findById(product_id);
        if (!product)
            return utils.handleError(res, {
                message: "Product not found",
                code: 404,
            });

        // If variant_id is provided, delete only that variant (for inventory management)
        if (variant_id) {
            const variant = product.variant.find(v => v._id.toString() === variant_id);
            
            if (!variant) {
                return utils.handleError(res, {
                    message: "Variant not found",
                    code: 404,
                });
            }

            if (variant.is_sku_deleted === true) {
                return utils.handleError(res, {
                    message: "Variant is already deleted",
                    code: 400,
                });
            }

            // Mark the specific variant as deleted
            await Product.findOneAndUpdate(
                { _id: product_id, 'variant._id': variant_id },
                { $set: { 'variant.$.is_sku_deleted': true } }
            );

            try {
                await createLog({
                    admin_id: req.user._id,
                    admin_name: req.user.full_name || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email,
                    admin_email: req.user.email,
                    admin_role: req.user.role,
                    feature: 'inventory',
                    action: 'delete',
                    related_id: product_id,
                    related_collection: 'products',
                    status: 'success',
                    details: { product_name: product.name, variant_id, message: 'Variant/inventory item soft-deleted' },
                    req,
                });
            } catch (logErr) {
                console.error('[deleteProduct variant] Log error:', logErr);
            }

            return res.json({ message: "Inventory item deleted successfully", code: 200 });
        }

        // If no variant_id, delete the entire product (for product management)
        if (product.is_deleted === true) {
            return utils.handleError(res, {
                message: "Product is already deleted",
                code: 400,
            });
        }

        await Product.findByIdAndUpdate(product_id, { is_deleted: true });

        try {
            await createLog({
                admin_id: req.user._id,
                admin_name: req.user.full_name || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'product',
                action: 'delete',
                related_id: product_id,
                related_collection: 'products',
                status: 'success',
                details: { product_name: product.name },
                req,
            });
        } catch (logErr) {
            console.error('[deleteProduct] Log error:', logErr);
        }

        res.json({ message: "Product deleted successfully", code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.deleteSelectedProducts = async (req, res) => {
    try {
        const { product_ids = [] } = req.body;

        if (product_ids.length == 0)
            return utils.handleError(res, {
                message: "Please select at least one product",
                code: 400,
            });
        const isAllDeleted = await Product.find({ _id: product_ids, is_deleted: true });

        if (isAllDeleted.length == product_ids.length)
            return utils.handleError(res, {
                message: "All selected products are already deleted",
                code: 400,
            });

        await Product.updateMany({ _id: product_ids }, { is_deleted: true });

        try {
            await createLog({
                admin_id: req.user._id,
                admin_name: req.user.full_name || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'product',
                action: 'delete',
                related_id: null,
                related_collection: 'products',
                status: 'success',
                details: { bulk_delete: true, product_ids, count: product_ids.length },
                req,
            });
        } catch (logErr) {
            console.error('[deleteSelectedProducts] Log error:', logErr);
        }

        res.json({ message: "Selected products have been deleted", code: 200 });
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
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    'user.password': 0,
                    // 'user.email': 0,
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

        // Support searching by product name, product ID and part number (variant.part_no)
        if (search) {
            const orConditions = [
                { name: { $regex: search, $options: "i" } },
                { "variant.part_no": { $regex: search, $options: "i" } },
            ];

            // If the search term looks like a valid ObjectId, also match on _id
            if (mongoose.Types.ObjectId.isValid(search)) {
                orConditions.push({ _id: new mongoose.Types.ObjectId(search) });
            }

            // Also support numeric part numbers stored as numbers, not strings
            if (!Number.isNaN(Number(search))) {
                orConditions.push({ "variant.part_no": Number(search) });
            }

            filter.$or = orConditions;
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
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
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
        if (req.body.variant) {
            for (const newVariant of req.body.variant) {
                // Prefer to locate variant by stable identifier (part_no), then fall back to SKU.
                // This allows changing SKU for an existing inventory line as long as part_no is unchanged.
                let existingVariantIndex = -1;

                if (newVariant.part_no) {
                    existingVariantIndex = product.variant.findIndex(
                        (v) =>
                            v &&
                            v.is_sku_deleted !== true &&
                            String(v.part_no || '').trim() === String(newVariant.part_no).trim()
                    );
                }

                if (existingVariantIndex === -1 && newVariant.sku_id) {
                    existingVariantIndex = product.variant.findIndex(
                        (v) =>
                            v &&
                            v.is_sku_deleted !== true &&
                            String(v.sku_id || '').trim() === String(newVariant.sku_id).trim()
                    );
                }

                if (existingVariantIndex === -1) {
                    return utils.handleError(res, {
                        message: `Variant not found for update`,
                        code: 404,
                    });
                }

                const existingVariant = product.variant[existingVariantIndex];
                const existingSku = existingVariant.sku_id;
                const newSku = newVariant.sku_id;

                // SKU uniqueness check (only when SKU is being changed to a new non-empty value)
                if (newSku && String(newSku).trim() !== String(existingSku || '').trim()) {
                    const isExistedSku = await Product.findOne({
                        "variant.sku_id": newSku,
                        _id: { $ne: productId },
                        is_deleted: { $ne: true },
                    });
                    if (isExistedSku) {
                        return res.status(400).json({
                            code: 400,
                            message: "This SKU already exists. Please use a different SKU.",
                        });
                    }
                    const sameProductOther = product.variant.some(
                        (v, i) => i !== existingVariantIndex && v.sku_id && String(v.sku_id).trim() === String(newSku).trim()
                    );
                    if (sameProductOther) {
                        return res.status(400).json({
                            code: 400,
                            message: "This SKU already exists. Please use a different SKU.",
                        });
                    }
                }

                // Part number uniqueness (if provided)
                if (newVariant.part_no) {
                    const newPartNo = newVariant.part_no;
                    const existingPartNo = existingVariant.part_no;

                    if (String(newPartNo).trim() !== String(existingPartNo || '').trim()) {
                        const isExistedPart = await Product.findOne({
                            "variant.part_no": newPartNo,
                            _id: { $ne: productId },
                            is_deleted: { $ne: true },
                        });
                        if (isExistedPart) {
                            return res.status(400).json({
                                code: 400,
                                message: "This part number already exists. Please use a different part number.",
                            });
                        }
                    }
                }

                Object.assign(product.variant[existingVariantIndex], newVariant);
            }
            data_to_edit.variant = product.variant;
        }

        await Product.findByIdAndUpdate(productId, data_to_edit, { new: true });

        const updatedproduct = await Product.findById(productId);

        try {
            await createLog({
                admin_id: req.user._id,
                admin_name: req.user.full_name || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'product',
                action: 'update',
                related_id: productId,
                related_collection: 'products',
                status: 'success',
                details: { product_name: updatedproduct?.name },
                req,
            });
        } catch (logErr) {
            console.error('[editProduct] Log error:', logErr);
        }

        res.json({
            data: updatedproduct,
            message: "Product has been updated",
            code: 200
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.approveRejectProduct = async (req, res) => {
    try {
        const productId = req.body.id

        const product = await Product.findById(productId);

        if (!product || product.is_deleted === true)
            return utils.handleError(res, {
                message: "Product not found",
                code: 404,
            });

        if (req.body.status === "rejected" && !req.body.reason) {
            return utils.handleError(res, {
                message: "Rejection reason is required",
                code: 404,
            });
        }

        if (req.body.reason && req.body.status === "rejected") {
            product.is_admin_approved = req.body.status
            product.rejected_reason = req.body.reason
            await product.save()
        } else {
            product.is_admin_approved = req.body.status
            await product.save()
        }

        res.json({
            message: "Product status changed Successfully",
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getProductNameList = async (req, res) => {
    try {
        // const userId = req.user._id;
        // console.log("userid is ", userId)

        const { search } = req.query;

        const filter = {};

        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        console.log("filter is ", filter)

        const productlist = await Product.aggregate([
            { $match: { ...filter, is_deleted: false } },
            { $project: { _id: 1, name: 1 } },
            { $sort: { createdAt: -1 } },
            // { $skip: parseInt(offset) || 0 },
            // { $limit: parseInt(limit) || 10 }
        ])

        const count = await Product.countDocuments(filter);

        res.json({ data: productlist, count, code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getSkuList = async (req, res) => {
    try {
        const { id } = req.query
        console.log("id is ", id)

        const data = await Product.findOne({ _id: id })
        console.log("product data is ", data)

        if (!data || data.length === 0) {
            return utils.handleError(res, {
                message: "Product not found",
                code: 404,
            });
        }

        const skuListData = [...data.variant]
        console.log("skulist :", skuListData)
        return res.status(200).json({
            message: "Sku variants fetched successfully",
            data: skuListData,
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}

// exports.getInventoryList = async (req, res) => {
//     try {
//         const { offset = 0, limit = 10, search, low_stock, out_of_stock } = req.query
//         let filter = {
//             product_of : 'admin'
//         }
//         if (search) {
//             filter['$or'] = [
//                 {
//                     name: { $regex: search, $options: "i" }
//                 },
//                 {
//                     'variant.inventory_quantity': { $regex: search, $options: "i" }
//                 }
//             ]
//         }
//         if (low_stock) {
//             filter['$expr'] = {
//                 $lte: ["$variant.inventory_quantity", "$variant.Threshold_value"]
//             };
//         }

//         if (out_of_stock) {
//             filter['variant.inventory_quantity'] = { $eq: 0 };
//         }
//         const data = await Product.aggregate(
//             [
//                 {
//                     $match: filter
//                 },
//                 {
//                     $lookup: {
//                         from: "product_categories",
//                         let: { categoryIds: "$category_id" },
//                         pipeline: [
//                             {
//                                 $match: {
//                                     $expr: {
//                                         $in: ["$_id", "$$categoryIds"]
//                                     }
//                                 }
//                             }
//                         ],
//                         as: "categories"
//                     }
//                 },
//                 {
//                     $unwind: {
//                         path: '$variant',
//                         preserveNullAndEmptyArrays: true
//                     }
//                 },
//                 {
//                     $lookup: {
//                         from: 'users',
//                         let: { id: '$user_id' },
//                         pipeline: [
//                             {
//                                 $match: {
//                                     $expr: {
//                                         $eq: ["$$id", "$_id"]
//                                     }
//                                 }
//                             },
//                             {
//                                 $project: {
//                                     _id: 1,
//                                     full_name: 1,
//                                     email: 1
//                                 }
//                             }
//                         ],
//                         as: 'supplier_data'
//                     }
//                 },
//                 {
//                     $unwind: {
//                         path: '$supplier_data',
//                         preserveNullAndEmptyArrays: true
//                     }
//                 },
//                 {
//                     $skip: parseInt(offset) || 0
//                 },
//                 {
//                     $limit: parseInt(limit) || 10
//                 },
//                 {
//                     $sort: { createdAt: -1 }
//                 },
//             ]
//         )

//         const count = await Product.countDocuments(filter)

//         return res.status(200).json({
//             message: "Inventory list fetched successfully",
//             data,
//             count,
//             code: 200
//         })
//     } catch (error) {
//         utils.handleError(res, error);
//     }
// }
exports.getInventoryList = async (req, res) => {
    try {
        const { offset = 0, limit = 10, search, low_stock, out_of_stock } = req.query;

        const matchStage = {
            product_of: 'admin',
            is_deleted: { $ne: true }  // Filter out deleted products
        };

        const pipeline = [
            { $match: matchStage },

            // Unwind each variant to treat it as a row
            {
                $unwind: {
                    path: "$variant",
                    preserveNullAndEmptyArrays: false
                }
            }
        ];

        // Apply per-variant filters
        const variantMatch = {
            'variant.is_sku_deleted': { $ne: true }  // Filter out deleted variants
        };

        if (search) {
            const orConditions = [
                { name: { $regex: search, $options: 'i' } },
                // Allow searching by SKU and Part Number as well (useful for ops)
                { 'variant.sku_id': { $regex: search, $options: 'i' } },
                { 'variant.part_no': { $regex: search, $options: 'i' } },
            ];

            // If the search term looks like a valid ObjectId, also match on product _id
            if (mongoose.Types.ObjectId.isValid(search)) {
                orConditions.push({ _id: new mongoose.Types.ObjectId(search) });
            }

            // Also support numeric part numbers stored as numbers
            if (!Number.isNaN(Number(search))) {
                orConditions.push({ 'variant.part_no': Number(search) });
            }

            variantMatch['$or'] = orConditions;
        }

        if (low_stock) {
            variantMatch['$expr'] = {
                $lte: ["$variant.inventory_quantity", "$variant.Threshold_value"]
            };
        }

        if (out_of_stock) {
            variantMatch['variant.inventory_quantity'] = 0;
        }

        // Always add the variant match to filter deleted variants
        pipeline.push({ $match: variantMatch });

        // Lookup category info
        pipeline.push(
            {
                $lookup: {
                    from: "product_categories",
                    let: { categoryIds: "$category_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $in: ["$_id", "$$categoryIds"] }
                            }
                        }
                    ],
                    as: "categories"
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { id: "$user_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$$id", "$_id"] }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                full_name: 1,
                                email: 1
                            }
                        }
                    ],
                    as: "supplier_data"
                }
            },
            {
                $unwind: {
                    path: "$supplier_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $skip: parseInt(offset) || 0
            },
            {
                $limit: parseInt(limit) || 10
            }
        );

        // Execute pipeline
        const data = await Product.aggregate(pipeline);

        // Count total matching variants (requires same logic without $skip/limit/sort)
        const countPipeline = pipeline.filter(stage => !stage.$skip && !stage.$limit && !stage.$sort)
            .concat([{ $count: "total" }]);
        const countResult = await Product.aggregate(countPipeline);
        const count = countResult[0]?.total || 0;

        return res.status(200).json({
            message: "Variant list fetched successfully",
            data,
            count,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
};



exports.addThresholdValue = async (req, res) => {
    try {
        const { product_id, variant_id, value, reminder } = req.body
        const product_data = await Product.findOne({ _id: product_id })
        if (!product_data) {
            return utils.handleError(res, {
                message: "Product not found",
                code: 404,
            });
        }

        const data = await Product.findOneAndUpdate(
            { _id: product_id, 'variant._id': variant_id },
            {
                $set: {
                    'variant.$.Threshold_value': value,
                    'variant.$.remind_on_low_stock': (reminder === true || reminder === "true") ? true : false
                }
            }, { new: true }
        )

        try {
            await createLog({
                admin_id: req.user._id,
                admin_name: req.user.full_name || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'inventory',
                action: 'update',
                related_id: product_id,
                related_collection: 'products',
                status: 'success',
                details: { product_name: product_data?.name, variant_id, threshold_value: value, remind_on_low_stock: reminder },
                req,
            });
        } catch (logErr) {
            console.error('[addThresholdValue] Log error:', logErr);
        }

        return res.status(200).json({
            message: "Threshold value added successfully",
            data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.changeInventoryQuantity = async (req, res) => {
    try {
        const { product_id, variant_id, stock } = req.body
        const product_data = await Product.findOne({ _id: product_id })
        console.log("product data : ", product_data)
        if (!product_data) {
            return utils.handleError(res, {
                message: "Product not found",
                code: 404,
            });
        }

        const data = await Product.findOneAndUpdate(
            { _id: product_id, 'variant._id': variant_id },
            {
                $set: {
                    'variant.$.inventory_quantity': stock
                }
            }, { new: true }
        )

        try {
            const variantInfo = data?.variant?.find(v => v._id?.toString() === variant_id);
            await createLog({
                admin_id: req.user._id,
                admin_name: req.user.full_name || `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'inventory',
                action: 'update',
                related_id: product_id,
                related_collection: 'products',
                status: 'success',
                details: { product_name: product_data?.name, variant_id, new_quantity: stock, part_no: variantInfo?.part_no },
                req,
            });
        } catch (logErr) {
            console.error('[changeInventoryQuantity] Log error:', logErr);
        }

        return res.status(200).json({
            message: "Inventory Quantity changed successfully",
            data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

/**
 * Generate product description via same AI service as frontend (Product Generation).
 * Uses CHATBOT_API_URL + CHATBOT_X_API_KEY (same as frontend product-list / chatbot).
 * POST body: { productData: object } - product fields to generate description from.
 */
exports.generateProductDescription = async (req, res) => {
  try {
    const chatbotApiUrl = process.env.CHATBOT_API_URL || "https://uxbefmykqw.eu-west-2.awsapprunner.com/api/v1/chat";
    const aiApiKey = process.env.CHATBOT_X_API_KEY;

    if (!aiApiKey) {
      return res.status(500).json({
        code: 500,
        message: "AI description service is not configured. Missing CHATBOT_X_API_KEY in .env (same key as frontend Product Generation).",
      });
    }

    const productData = req.body?.productData ?? req.body;
    const promptText = (req.body?.promptText ?? req.body?.text ?? "").trim();

    if (!productData || typeof productData !== "object") {
      return utils.handleError(res, { message: "Product data is required", code: 400 });
    }

    let question;
    if (promptText) {
      question = `You are a professional product supplier. The user has provided this input to guide the description: "${promptText}". Also use this product data if helpful: ${JSON.stringify(productData)}. Generate a short customer-friendly product description based on the user's input and product data. Output only the description text, no labels or extra text.`;
    } else {
      question = `You are a professional product supplier. Based on the following product data, generate a short customer-friendly product description. Output only the description text, no labels or extra text. Product data: ${JSON.stringify(productData)}`;
    }

    const aiResponse = await axios.post(
      chatbotApiUrl,
      { question },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": aiApiKey,
        },
        timeout: 30000,
      }
    );

    const description = (aiResponse?.data?.answer || aiResponse?.data?.message || "").trim();
    if (!description) {
      return res.status(502).json({
        code: 502,
        message: "AI service did not return a description.",
      });
    }

    return res.status(200).json({
      code: 200,
      message: "Product description generated successfully",
      data: { description },
    });
  } catch (error) {
    const status = error?.response?.status;
    const message = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Failed to generate description";
    // Do not return 401 - frontend treats 401 as session expired and logs user out.
    return res.status(502).json({
      code: 502,
      message: String(message),
    });
  }
};