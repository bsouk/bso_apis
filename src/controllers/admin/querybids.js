const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Query = require("../../models/query");
const BidSetting = require("../../models/bidsetting");
const utils = require("../../utils/utils");
const admin = require("../../models/admin");
const bidsetting = require("../../models/bidsetting");
const quotation = require("../../models/quotation");
const moment = require("moment")

exports.getquery = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10 } = req.query;

        const filter = {
            is_deleted: { $ne: true }
        };

        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        const productlist = await Query.aggregate([
            { $match: { ...filter } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'createdByUser',
                    foreignField: '_id',
                    as: 'user_detail',
                    // pipeline: [{ $project: { first_name: 1,last_name:1, _id: 1 } }],
                }
            },
            {
                $lookup: {
                    from: 'bidsettings',
                    localField: '_id',
                    foreignField: 'query_id',
                    as: 'bid_details'
                }
            },
            {
                $addFields: {
                    user_detail: {
                        $ifNull: [{ $arrayElemAt: ['$user_detail', 0] }, null],
                    },
                    bid_details: {
                        $ifNull: [{ $arrayElemAt: ['$bid_details', 0] }, null],
                    }
                },
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $skip: parseInt(offset)
            },
            {
                $limit: parseInt(limit)
            },
        ])

        const count = await Query.countDocuments(filter);
        const pendingCount = await Query.countDocuments({ status: "pending" })
        const splitCount = await Query.countDocuments({ 'queryDetails.assigned_to.type': 'supplier' })

        res.json({ data: productlist, count, pendingCount, splitCount, code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.getquerydetail = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: 'ID parameter is required', code: 400 });
        }

        const filter = {
            _id: new mongoose.Types.ObjectId(id),

        };

        const queryDetail = await Query.aggregate([
            { $match: { ...filter } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'createdByUser',
                    foreignField: '_id',
                    as: 'user_detail',
                    // pipeline: [{ $project: { first_name: 1, last_name: 1, _id: 1 } }],
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'queryDetails.product_id',
                    foreignField: '_id',
                    as: 'product_detail',
                }
            },
            {
                $lookup: {
                    from: 'bidsettings',
                    localField: '_id',
                    foreignField: 'query_id',
                    as: 'bid_details'
                }
            },
            {
                $addFields: {
                    user_detail: {
                        $ifNull: [{ $arrayElemAt: ['$user_detail', 0] }, null],
                    },
                    product_detail: {
                        $ifNull: [{ $arrayElemAt: ['$product_detail', 0] }, null],
                    },
                    bid_details: {
                        $ifNull: [{ $arrayElemAt: ['$bid_details', 0] }, null],
                    }
                },
            },
        ]);

        if (!queryDetail.length) {
            return res.status(404).json({ message: 'Query not found', code: 404 });
        }

        res.json({ data: queryDetail[0], code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.addbidexpiration = async (req, res) => {
    try {
        const allowedFields = ["query_id", "bid_closing_date", "remainder_setup_date", "query_priority"];
        const data = req.body;


        const invalidFields = Object.keys(data).filter(field => !allowedFields.includes(field));
        if (invalidFields.length > 0) {
            return res.status(400).json({
                message: `Invalid parameters: ${invalidFields.join(", ")}`,
                code: 400
            });
        }

        const existingBid = await BidSetting.findOne({ query_id: data.query_id });

        if (existingBid) {
            await BidSetting.updateOne(
                { _id: existingBid._id },
                { $set: data }
            );
            return res.json({
                message: "BidExpiration updated successfully",
                code: 200
            });
        } else {

            const newBid = new BidSetting(data);
            await newBid.save();
            return res.json({
                message: "BidExpiration added successfully",
                code: 200
            });
        }
    } catch (error) {
        console.error("Error in addbidexpiration:", error);
        res.status(500).json({
            message: "Internal Server Error",
            code: 500,
            error: error.message
        });
    }
};


exports.getbidexpiration = async (req, res) => {
    try {
        const data = req.query;

        if (!data.event_id) {
            return res.status(400).json({ message: 'event_id parameter is required', code: 400 });
        }

        const existingBid = await BidSetting.findOne({ query_id: data.event_id });

        if (!existingBid) {
            return res.status(404).json({ message: 'BidExpiration not found for the provided event_id', code: 404 });
        }

        res.json({ data: existingBid, code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.deletequery = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                message: "Please provide a valid array of IDs to delete.",
                code: 400
            });
        }

        const existingRecords = await Query.find({ _id: { $in: ids } });


        if (existingRecords.length !== ids.length) {
            return res.status(404).json({
                message: "One or more IDs do not match any records.",
                code: 404
            });
        }
        const result = await Query.deleteMany({ _id: { $in: ids } });

        res.json({
            message: `${result.deletedCount} query(s) deleted successfully.`,
            code: 200
        });
    } catch (error) {
        console.error("Error in deletequery:", error);
        res.status(500).json({
            message: "Internal Server Error",
            code: 500,
            error: error.message
        });
    }
};

exports.updateAssignedProduct = async (req, res) => {
    try {
        const { id, product_id, sku_id, supplier_id } = req.body;

        console.log("=============req.body", req.body)
        if (!id || !product_id || !sku_id || !supplier_id) {
            return res.status(400).json({
                message: "Missing required fields: id, user_id, product_id, sku_id, or supplier_id.",
                code: 400
            });
        }

        const queryObjectId = new mongoose.Types.ObjectId(id);
        const productObjectId = new mongoose.Types.ObjectId(product_id);
        const skuObjectId = new mongoose.Types.ObjectId(sku_id);
        const supplierObjectId = new mongoose.Types.ObjectId(supplier_id);

        const query = await Query.findOne({
            _id: queryObjectId,
            "queryDetails.product.id": productObjectId,
            "queryDetails.variant._id": skuObjectId,
            "queryDetails.supplier._id": supplierObjectId
        });
        console.log("=============query", query)

        if (!query) {
            return res.status(404).json({
                message: "Query not found with the given criteria.",
                code: 404
            });
        }

        const queryDetails = query.queryDetails.find(
            (detail) =>
                detail.product.id.equals(productObjectId) &&
                detail.variant._id.equals(skuObjectId) &&
                detail.supplier._id.equals(supplierObjectId)
        );

        if (!queryDetails) {
            return res.status(404).json({
                message: "Matching queryDetails not found.",
                code: 404
            });
        }

        queryDetails.assigned_to = {
            variant_assigned: supplierObjectId.toString(),
            type: "supplier"
        };

        await query.save();

        res.json({
            message: "Variant assigned successfully.",
            code: 200,
            updatedQuery: query
        });
    } catch (error) {
        console.error("Error in updateAssignedProduct:", error);
        res.status(500).json({
            message: "Internal Server Error",
            code: 500,
            error: error.message
        });
    }
};

exports.unassignVariant = async (req, res) => {
    try {
        const { id, product_id, sku_id, supplier_id } = req.body;

        if (!id || !product_id || !sku_id || !supplier_id) {
            return res.status(400).json({
                message: "Missing required fields: query_id, product_id, sku_id, or supplier_id.",
                code: 400,
            });
        }

        const queryObjectId = new mongoose.Types.ObjectId(id);
        const productObjectId = new mongoose.Types.ObjectId(product_id);
        const skuObjectId = new mongoose.Types.ObjectId(sku_id);
        const supplierObjectId = new mongoose.Types.ObjectId(supplier_id);

        const query = await Query.findOneAndUpdate(
            {
                _id: queryObjectId,
                "queryDetails.product.id": productObjectId,
                "queryDetails.variant._id": skuObjectId,
                "queryDetails.supplier._id": supplierObjectId,
            },
            {
                $set: {
                    "queryDetails.$.assigned_to.variant_assigned": null,
                    "queryDetails.$.assigned_to.type": null,
                },
            },
            { new: true }
        );
        console.log(query)
        if (!query) {
            return res.status(404).json({
                message: "Query not found or no matching queryDetails to unassign.",
                code: 404,
            });
        }

        res.json({
            message: "Variant unassigned successfully.",
            code: 200,
            updatedQuery: query,
        });
    } catch (error) {
        console.error("Error in unassignVariant:", error);
        res.status(500).json({
            message: "Internal Server Error",
            code: 500,
            error: error.message,
        });
    }
};


async function generateUniqueQuotationId() {
    const id = await Math.floor(Math.random() * 10000000000)
    console.log('unique id : ', id)
    return `#${id}`
}

async function createQuotation(final_quotes, query_id) {

    const bidSettingData = await bidsetting.findOne({ query_id: query_id })
    console.log('bid setting data : ', bidSettingData)

    if (!bidSettingData) {
        return utils.handleError(res, {
            message: "bids expiration details need to be added first",
            code: 400,
        });
    }

    const quoteId = await generateUniqueQuotationId()
    const currentTime = await moment(Date.now()).format('lll')
    const data = {
        quotation_unique_id: await quoteId.toString(),
        query_id,
        final_quote: [...final_quotes],
        version_history: currentTime
    }

    if (bidSettingData._id) {
        data.bid_setting = bidSettingData._id
    }

    const newQuotation = await quotation.create(data)
    console.log('new Quotation : ', newQuotation)
}

exports.addFinalQuote = async (req, res) => {
    try {
        const { query_id, final_quotes } = req.body
        console.log("final_quotes : ", final_quotes)
        const queryData = await Query.findOne({ _id: query_id })

        if (!Array.isArray(final_quotes)) {
            return utils.handleError(res, {
                message: "final_quotes should be an array",
                code: 400,
            });
        }

        if (!queryData) {
            return utils.handleError(res, {
                message: "Query not found",
                code: 400,
            });
        }

        // final_quotes?.forEach((i) => queryData?.final_quote?.push(i));
        // await queryData.save()

        const result = await Query.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(query_id)
            },
            {
                $set: { 'final_quote': final_quotes }
            },
            { new: true }
        )

        await createQuotation(final_quotes, query_id)

        return res.status(200).json({
            message: "final quote added successfully",
            data: result,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.supplierQuotesById = async (req, res) => {
    try {
        const { product_id } = req.params
        console.log("product_id : ", product_id)

        if (!mongoose.Types.ObjectId.isValid(product_id)) {
            return res.status(400).json({
                message: "Invalid product ID format",
                code: 400
            });
        }

        const data = await Query.aggregate(
            [
                {
                    $unwind: {
                        path: '$queryDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        'queryDetails.product.id': new mongoose.Types.ObjectId(product_id)
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'queryDetails.product.id',
                        foreignField: '_id',
                        as: 'product_data'
                    }
                },
                {
                    $unwind: {
                        path: '$product_data',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        'queryDetails.product': 1,
                        'queryDetails.supplier_quote': 1,
                        'product_data': 1
                    }
                }
            ]
        )
        console.log("data : ", data)

        return res.status(200).json({
            message: "Supplier quote fetched successfully",
            data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.addAdminQuote = async (req, res) => {
    try {
        const { query_id } = req.body
        const userId = req.user._id;
        console.log("userid is ", userId);

        const userData = await admin.findOne({ _id: userId })
        console.log("admin : ", userData)

        const queryData = await Query.findById({ _id: query_id })
        if (!queryData) {
            return utils.handleError(res, {
                message: "Query not found",
                code: 404,
            });
        }

        const assignData = {
            id: userId,
            type: userData.role
        }

        req.body.admin_quote.assignedBy = assignData

        const result = await Query.findOneAndUpdate(
            {
                _id: query_id,
                'queryDetails._id': req?.body?.query_details_id
            },
            {
                $set: { 'queryDetails.$.admin_quote': req?.body?.admin_quote }
            },
            { new: true }
        )
        console.log("result : ", result)
        return res.status(200).json({
            message: "Supplier quote added successfully",
            data: result,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.adminQuotesById = async (req, res) => {
    try {
        const { product_id } = req.params
        console.log("product_id : ", product_id)

        if (!mongoose.Types.ObjectId.isValid(product_id)) {
            return res.status(400).json({
                message: "Invalid product ID format",
                code: 400
            });
        }

        const data = await Query.aggregate(
            [
                {
                    $unwind: {
                        path: '$queryDetails',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        'queryDetails.product.id': new mongoose.Types.ObjectId(product_id)
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'queryDetails.product.id',
                        foreignField: '_id',
                        as: 'product_data'
                    }
                },
                {
                    $unwind: {
                        path: '$product_data',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 1,
                        'queryDetails.product': 1,
                        'queryDetails.admin_quote': 1,
                        'product_data': 1
                    }
                }
            ]
        )
        console.log("data : ", data)

        return res.status(200).json({
            message: "Admin quote fetched successfully",
            data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.generateFinalQuote = async (req, res) => {
    try {
        const { id } = req.params;

        const queryData = await Query.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id) } },
            {
                $project: {
                    queryDetails: {
                        $filter: {
                            input: "$queryDetails",
                            as: "detail",
                            cond: {
                                $or: [
                                    { $ne: ["$$detail.supplier_quote", null] },
                                    { $ne: ["$$detail.admin_quote", null] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);

        if (!queryData.length) {
            return res.status(400).json({
                message: "Query not found",
                code: 400,
            });
        }

        const finalQuoteList = queryData[0].queryDetails.map(
            (i) => i.supplier_quote || i.admin_quote
        ).filter(i => i !== undefined || null)

        console.log("finalQuote:", finalQuoteList);

        return res.status(200).json({
            message: "Final quote generated successfully",
            data: finalQuoteList,
            code: 200,
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};


// // assign multiple queries to supplier
// exports.assignMultipleQueries = async (req, res) => {
//     try {
//         const { id, product_id, sku_id, supplier_id } = req.body;

//         console.log("=============req.body", req.body)
//         if (!id || !product_id || !sku_id || !supplier_id) {
//             return res.status(400).json({
//                 message: "Missing required fields: id, user_id, product_id, sku_id, or supplier_id.",
//                 code: 400
//             });
//         }

//         const queryObjectId = new mongoose.Types.ObjectId(id);
//         const productObjectId = new mongoose.Types.ObjectId(product_id);
//         const skuObjectId = new mongoose.Types.ObjectId(sku_id);
//         const supplierObjectId = new mongoose.Types.ObjectId(supplier_id);

//         const query = await Query.findOne({
//             _id: queryObjectId,
//             "queryDetails.product.id": productObjectId,
//             "queryDetails.variant._id": skuObjectId,
//             "queryDetails.supplier._id": supplierObjectId
//         });
//         console.log("=============query", query)

//         if (!query) {
//             return res.status(404).json({
//                 message: "Query not found with the given criteria.",
//                 code: 404
//             });
//         }

//         const queryDetails = query.queryDetails.find(
//             (detail) =>
//                 detail.product.id.equals(productObjectId) &&
//                 detail.variant._id.equals(skuObjectId) &&
//                 detail.supplier._id.equals(supplierObjectId)
//         );

//         if (!queryDetails) {
//             return res.status(404).json({
//                 message: "Matching queryDetails not found.",
//                 code: 404
//             });
//         }

//         queryDetails.assigned_to = {
//             variant_assigned: supplierObjectId.toString(),
//             type: "supplier"
//         };

//         await query.save();

//         res.json({
//             message: "Variant assigned successfully.",
//             code: 200,
//             updatedQuery: query
//         });
//     } catch (error) {
//         console.error("Error in updateAssignedProduct:", error);
//         res.status(500).json({
//             message: "Internal Server Error",
//             code: 500,
//             error: error.message
//         });
//     }
// };