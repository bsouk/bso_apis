const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Query = require("../../models/query");
const BidSetting = require("../../models/bidsetting");
const utils = require("../../utils/utils");
const admin = require("../../models/admin");
const bidsetting = require("../../models/bidsetting");
const quotation = require("../../models/quotation");
const moment = require("moment");
const version_history = require("../../models/version_history");
const query_assigned_suppliers = require("../../models/query_assigned_suppliers");

exports.getquery = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10 } = req.query;

        const filter = {
            is_deleted: { $ne: true }
        };

        if (search) {
            filter.query_unique_id = { $regex: search, $options: "i" };
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

        const totalCount = await Query.countDocuments()
        const count = await Query.countDocuments(filter);
        const pendingCount = await Query.countDocuments({ status: "pending" })
        const splitCount = await Query.countDocuments({ 'queryDetails.assigned_to.type': 'supplier' })

        res.json({ data: productlist, totalCount, count, pendingCount, splitCount, code: 200 });
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
                    from: 'users',
                    localField: 'queryDetails.supplier._id',
                    foreignField: '_id',
                    as: 'supplier_detail',
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
                    supplier_detail: {
                        $ifNull: [{ $arrayElemAt: ['$supplier_detail', 0] }, null]
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

        const query_quotation = await quotation.deleteMany({ query_id: { $in: ids } })

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
        const data = req.body
        if (data.selected_supplier.length === 0 && !Array.isArray(data.selected_supplier)) {
            return utils.handleError(res, {
                message: "please select at least single supplier",
                code: 400,
            });
        }

        await data.selected_supplier.map(async i => {
            const result = await query_assigned_suppliers.create(i)
            console.log("result : ", result)
        })

        return res.status(200).json({
            message: "selected suppliers assigned successfully",
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.unassignVariant = async (req, res) => {
    try {
        const data = req.body
        if (data.selected_supplier.length === 0 && !Array.isArray(data.selected_supplier)) {
            return utils.handleError(res, {
                message: "please select at least single supplier",
                code: 400,
            });
        }

        await data.selected_supplier.map(async i => {
            console.log("i : ", i)
            const result = await query_assigned_suppliers.findOneAndDelete({ variant_id: new mongoose.Types.ObjectId(i.variant_id), variant_assigned_to: new mongoose.Types.ObjectId(i.supplier_id) })
            console.log("result : ", result)
        })

        return res.status(200).json({
            message: "selected suppliers unassigned successfully",
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
};


async function generateUniqueQuotationId() {
    const id = await Math.floor(Math.random() * 10000000000)
    console.log('unique id : ', id)
    return `#${id}`
}

async function createQuotation(final_quotes, query_id, res) {

    const bidSettingData = await bidsetting.findOne({ query_id: query_id })
    console.log('bid setting data : ', bidSettingData)

    const quoteId = await generateUniqueQuotationId()
    const currentTime = await moment(Date.now()).format('lll')
    const timeline_data = await final_quotes.map(i => ({
        date: currentTime,
        detail: 'quotation created',
        product_id: i?.product_id,
        supplier_id: i?.supplier_id,
        variant_id: i?.variant_id,
        quantity: i?.quantity,
        price: i?.price,
        media: i?.media,
        message: i?.message,
        document: i?.document,
        assignedBy: i?.assignedBy
    })
    )
    const data = {
        quotation_unique_id: await quoteId.toString(),
        query_id,
        final_quote: [...final_quotes]
    }

    if (bidSettingData?._id) {
        data.bid_setting = bidSettingData?._id
    }

    const newQuotation = await quotation.create(data)
    console.log('new Quotation : ', newQuotation)

    await timeline_data.map(async i => await version_history.create({
        quotation_id: newQuotation._id,
        ...i
    }))
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

        await createQuotation(final_quotes, query_id, res)
        queryData.status = "completed"
        await queryData.save()

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
        const { query_id, id } = req.query
        console.log("query_id : ", query_id, id)

        if (!mongoose.Types.ObjectId.isValid(query_id) && !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid ID format",
                code: 400
            });
        }


        if (!id && !query_id) {
            return utils.handleError(res, {
                message: "Query Id and index Id is required",
                code: 404,
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
                        _id: new mongoose.Types.ObjectId(id),
                        'queryDetails._id': new mongoose.Types.ObjectId(query_id)
                    }
                },
                // {
                //     $lookup: {
                //         from: 'products',
                //         localField: 'queryDetails.product.id',
                //         foreignField: '_id',
                //         as: 'product_data'
                //     }
                // },
                // {
                //     $unwind: {
                //         path: '$product_data',
                //         preserveNullAndEmptyArrays: true
                //     }
                // },
                {
                    $project: {
                        _id: 1,
                        'queryDetails.variant': 1,
                        'queryDetails.supplier_quote': 1,
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
        const { query_id, _id, admin_quote } = req.body
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

        admin_quote.assignedBy = assignData

        const result = await query_assigned_suppliers.findOneAndUpdate(
            {
                query_id,
                _id
            },
            {
                $set: {
                    admin_quote,
                    supplier_quote: null
                }
            }
        )
        console.log("result : ", result)
        return res.status(200).json({
            message: "Admin quote added successfully",
            data: result,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.adminQuotesById = async (req, res) => {
    try {
        const { id, query_id } = req.query

        if (!mongoose.Types.ObjectId.isValid(id) && !mongoose.Types.ObjectId.isValid(query_id)) {
            return res.status(400).json({
                message: "Invalid ID format",
                code: 400
            });
        }

        if (!id && !query_id) {
            return utils.handleError(res, {
                message: "Query Id and index Id is required",
                code: 404,
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
                        _id: new mongoose.Types.ObjectId(id),
                        'queryDetails._id': new mongoose.Types.ObjectId(query_id)
                    }
                },
                // {
                //     $lookup: {
                //         from: 'products',
                //         localField: 'queryDetails.product.id',
                //         foreignField: '_id',
                //         as: 'product_data'
                //     }
                // },
                // {
                //     $unwind: {
                //         path: '$product_data',
                //         preserveNullAndEmptyArrays: true
                //     }
                // },
                {
                    $project: {
                        _id: 1,
                        'queryDetails.variant': 1,
                        'queryDetails.admin_quote': 1
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

            { $unwind: "$queryDetails" },

            // {
            //     $lookup: {
            //         from: "products",
            //         localField: "queryDetails.product.id",
            //         foreignField: "_id",
            //         as: "product_data"
            //     }
            // },

            // {
            //     $addFields: {
            //         "queryDetails.product_data": { $arrayElemAt: ["$product_data", 0] }
            //     }
            // },
            {
                $addFields: {
                    "queryDetails.final_quote": {
                        $ifNull: ["$queryDetails.admin_quote", "$queryDetails.supplier_quote"]
                    }
                }
            },
            // {
            //     $addFields: {
            //         "queryDetails.final_quote.quantity":
            //             "$queryDetails.quantity"
            //     }
            // },
            {
                $addFields: {
                    "queryDetails.final_quote.quantity": {
                        $cond: {
                            if: {
                                $or: [
                                    {
                                        $ne: [
                                            "$queryDetails.admin_quote",
                                            null
                                        ]
                                    },
                                    {
                                        $ne: [
                                            "$queryDetails.supplier_quote",
                                            null
                                        ]
                                    }
                                ]
                            },
                            then: "$queryDetails.quantity",
                            else: null
                        }
                    }
                }
            },
            {
                $match: {
                    "queryDetails.final_quote": { $ne: null }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    queryDetails: { $push: "$queryDetails" }
                }
            },
            {
                $project: {
                    "queryDetails.product": 1,
                    "queryDetails.supplier": 1,
                    "queryDetails.variant": 1,
                    "queryDetails.final_quote": 1
                }
            }
        ]);

        // if (!queryData.length) {
        //     return res.status(400).json({
        //         message: "Query not found",
        //         code: 400,
        //     });
        // }

        return res.status(200).json({
            message: "Final quote generated successfully",
            data: queryData[0],
            code: 200,
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};


// assign multiple queries to supplier
exports.assignMultipleQueries = async (req, res) => {
    try {
        const { assign_fields } = req.body;

        console.log("=============req.body", req.body)
        if (!Array.isArray(assign_fields) || assign_fields.length === 0) {
            return res.status(400).json({
                message: "Please provide a valid assign field list",
                code: 400,
            });
        }

        const result = await Promise.all(assign_fields.map(async (i) => await Query.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(i.id),
                "queryDetails.product.id": new mongoose.Types.ObjectId(i.product_id),
                "queryDetails.variant._id": new mongoose.Types.ObjectId(i.sku_id),
                "queryDetails.supplier._id": new mongoose.Types.ObjectId(i.supplier_id)
            },
            {
                $set: {
                    "queryDetails.$.assigned_to.variant_assigned": i.supplier_id.toString(),
                    "queryDetails.$.assigned_to.type": "supplier",
                }
            },
            { new: true }
        )))

        console.log("result : ", result)

        res.json({
            message: "Selected variant assigned successfully.",
            data: result,
            code: 200,
        });
    } catch (error) {
        console.error("Error in assiging process:", error);
        res.status(500).json({
            message: "Internal Server Error",
            code: 500,
            error: error.message
        });
    }
};

//unassign Multiple queries to supplier
exports.unAssignMultipleQueries = async (req, res) => {
    try {
        const { unassign_fields } = req.body;

        console.log("=============req.body", req.body)
        if (!Array.isArray(unassign_fields) || unassign_fields.length === 0) {
            return res.status(400).json({
                message: "Please provide a valid assign field list",
                code: 400,
            });
        }

        const result = await Promise.all(unassign_fields.map(async (i) => await Query.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(i.id),
                "queryDetails.product.id": new mongoose.Types.ObjectId(i.product_id),
                "queryDetails.variant._id": new mongoose.Types.ObjectId(i.sku_id),
                "queryDetails.supplier._id": new mongoose.Types.ObjectId(i.supplier_id)
            },
            {
                $set: {
                    "queryDetails.$.assigned_to.variant_assigned": null,
                    "queryDetails.$.assigned_to.type": "admin",
                    "queryDetails.$.supplier_quote": null,
                }
            },
            { new: true }
        )))

        console.log("result : ", result)

        res.json({
            message: "Selected variant Unassigned successfully.",
            data: result,
            code: 200,
        });
    } catch (error) {
        console.error("Error in Unassiging process:", error);
        res.status(500).json({
            message: "Internal Server Error",
            code: 500,
            error: error.message
        });
    }
};

exports.updateSplitQuantity = async (req, res) => {
    try {
        const { split_quantity, querydata_id } = req.body
        const result = await Query.findOneAndUpdate(
            {
                "queryDetails._id": querydata_id
            },
            {
                $set: {
                    "queryDetails.$.split_quantity": split_quantity
                }
            },
            {
                new: true
            }
        )
        console.log("result : ", result)

        return res.status(200).json({
            message: "quantity data updated successfully",
            data: result,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getAssignedSuppliers = async (req, res) => {
    try {
        const { offset = 0, limit = 10, variant_id } = req.query
        let filter = {
            variant_id: new mongoose.Types.ObjectId(variant_id)
        }
        const data = await query_assigned_suppliers.aggregate(
            [
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: "users",
                        let: { id: "$variant_assigned_to" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$_id"]
                                    }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    full_name: 1
                                }
                            }
                        ],
                        as: "supplier_data"
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        let: { id: "$product_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$_id"]
                                    }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1
                                }
                            }
                        ],
                        as: "product_data"
                    }
                },
                {
                    $addFields: {
                        quote: "$supplier_quote"
                    }
                },
                {
                    $unwind: {
                        path: "$supplier_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: "$product_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: {
                        "quote.price": 1
                    }
                },
                {
                    $skip: parseInt(offset) || 0
                },
                {
                    $limit: parseInt(limit) || 10
                },
                {
                    $project: {
                        supplier_quote: 0,
                        admin_quote: 0,
                        user_type: 0
                    }
                }
            ]
        )

        const count = await query_assigned_suppliers.countDocuments(filter)
        return res.status(200).json({
            message: "assigned suppliers list fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getProductVariantdetails = async (req, res) => {
    try {
        const { querydata_id } = req.query
        const data = await Query.aggregate([
            {
                $unwind: {
                    path: "$queryDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    "queryDetails._id": new mongoose.Types.ObjectId(querydata_id)
                }
            },
            {
                $project: {
                    "queryDetails.product": 1,
                    "queryDetails.variant.images": 1,
                    "queryDetails.quantity": 1,
                    "queryDetails.split_quantity": 1
                }
            }
        ])
        console.log("data : ", data)

        return res.status(200).json({
            message: "Product variant data fetched successfully",
            data: data[0],
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.acceptRejectAssignedSupplier = async (req, res) => {
    try {
        const { variant_id, supplier_id, status } = req.body
        const supplier_data = await query_assigned_suppliers.findOne({ variant_id, variant_assigned_to: supplier_id })
        if (!supplier_data) {
            return utils.handleError(res, {
                message: "assigned supplier not found",
                code: 400,
            });
        }

        supplier_data.is_selected = status === true || status === "true" ? true : false
        await supplier_data.save()

        return res.status(200).json({
            message: "supplier status changed successfully",
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}