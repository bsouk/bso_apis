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
                $unwind: {
                    path: "$queryDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "quantity_units",
                    let: { id: "$queryDetails.quantity.unit" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$$id", "$_id"]
                                }
                            }
                        }
                    ],
                    as: "quantity_unit_data"
                }
            },
            {
                $unwind: {
                    path: "$quantity_unit_data",
                    preserveNullAndEmptyArrays: true
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
            {
                $set: {
                    "queryDetails.quantity.unit":
                        "$quantity_unit_data.unit",
                    "queryDetails.quantity.unit_id":
                        "$quantity_unit_data._id"
                }
            },
            {
                $group: {
                    _id: "$_id",
                    queryDetails: { $push: "$queryDetails" },
                    otherFields: { $first: "$$ROOT" }
                }
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: [
                            "$otherFields",
                            { queryDetails: "$queryDetails" }
                        ]
                    }
                }
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
        const assigned_supplier_result = await query_assigned_suppliers.deleteMany({ query_id: { $in: ids } })
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

            // const changestatus = await Query.findOneAndUpdate(
            //     {
            //         _id: new mongoose.Types.ObjectId(i.query_id),
            //         'queryDetails.variant._id': new mongoose.Types.ObjectId(i.variant_id)
            //     },
            //     {
            //         $set: {
            //             'queryDetails.$.split_quantity.is_selected': true,
            //             'queryDetails.$.split_quantity.quantity_assigned': i.quantity
            //         }
            //     }, { new: true }
            // )
            // console.log("changestatus : ", changestatus)
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
    const bidSettingData = await bidsetting.findOne({ query_id: query_id });
    console.log('bid setting data : ', bidSettingData);

    const quoteId = await generateUniqueQuotationId();
    const currentTime = moment().format('lll');

    console.log("final quotes : ", final_quotes);

    if (!Array.isArray(final_quotes)) {
        return utils.handleError(res, {
            message: "final_quotes should be an array",
            code: 400,
        });
    }

    const timeline_data = final_quotes.map(i => ({
        date: currentTime,
        detail: 'quotation created',
        product_id: i?.product_id ?? null,
        supplier_id: Array.isArray(i?.variant_assigned_to) ? i.variant_assigned_to : [],
        variant_id: i?.variant_id ?? null,
        quantity: i?.quantity ?? null,
        price: i?.supplier_quote?.price ?? null,
        media: i?.supplier_quote?.media ?? [],
        message: i?.supplier_quote?.message ?? "",
        document: i?.supplier_quote?.document ?? [],
        assignedBy: i?.supplier_quote?.assignedBy ?? null
    }));

    const data = {
        quotation_unique_id: quoteId,
        query_id
        // final_quote: final_quotes
    };

    if (bidSettingData?._id) {
        data.bid_setting = bidSettingData._id;
    }

    const newQuotation = await quotation.create(data);
    console.log('new Quotation : ', newQuotation);

    await query_assigned_suppliers.updateMany(
        {
            query_id: new mongoose.Types.ObjectId(query_id),
            is_selected: true
        },
        {
            $set: {
                quotation_id: new mongoose.Types.ObjectId(newQuotation._id)
            }
        },
        { new: true }
    )

    await Promise.all(
        timeline_data.map(i =>
            version_history.create({
                quotation_id: newQuotation._id,
                ...i
            })
        )
    );
}

exports.addFinalQuote = async (req, res) => {
    try {
        const { final_quotes, query_id } = req.body
        console.log("final_quotes : ", final_quotes)

        if (!Array.isArray(final_quotes)) {
            return utils.handleError(res, {
                message: "final_quotes should be an array",
                code: 400,
            });
        }

        const query_data = await Query.findOne({ _id: query_id })
        console.log("query_data : ", query_data)

        if (!query_data) {
            return utils.handleError(res, {
                message: "Query not found",
                code: 404,
            });
        }

        // const is_split_quantity = query_data.queryDetails.every(i => i.split_quantity && i.split_quantity.is_selected);
        // console.log("is_split_quantity : ", is_split_quantity)

        // if (is_split_quantity) {
        //     let result = await Promise.all(
        //         final_quotes.map(async i =>
        //             query_assigned_suppliers.findOneAndUpdate(
        //                 {
        //                     query_id: new mongoose.Types.ObjectId(query_id),
        //                     is_selected: true
        //                 },
        //                 {
        //                     $set: {
        //                         admin_approved_quotes: i?.supplier_quote,
        //                         logistics_price: i?.logistics_price,
        //                         admin_margin: {
        //                             value: i?.admin_margin?.value,
        //                             margin_type: i?.admin_margin?.margin_type
        //                         }
        //                     }
        //                 },
        //                 { new: true }
        //             )
        //         )
        //     );
        //     console.log("result : ", result)
        // }

        // if(!is_split_quantity){
        //     const result = await final_quotes.map(async i => {
        //         const newdata = await query_assigned_suppliers.create({
        //             query_id : query_id,
        //             product_id : i?.product_id,
        //             variant_id : i?.variant_id,
        //             logistics_price : i?.logistics_price,
        //             admin_margin : i?.admin_margin
        //         })
        //         console.log("newdata : ", newdata)
        //     })
        //     console.log("result : ", result)
        // }

        let result = await Promise.all(
            final_quotes.map(async i =>
                query_assigned_suppliers.findOneAndUpdate(
                    {
                        query_id: new mongoose.Types.ObjectId(query_id),
                        is_selected: true
                    },
                    {
                        $set: {
                            admin_approved_quotes: i?.supplier_quote,
                            logistics_price: i?.logistics_price,
                            admin_margin: {
                                value: i?.admin_margin?.value,
                                margin_type: i?.admin_margin?.margin_type
                            }
                        }
                    },
                    { new: true }
                )
            )
        );
        console.log("result : ", result)

        await createQuotation(final_quotes, query_id, res)
        query_data.status = "completed"
        await query_data.save()

        return res.status(200).json({
            message: "final quote added successfully",
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
        const query_data = await Query.findOne({ _id: id })
        console.log("query_data : ", query_data)
        if (!query_data) {
            return utils.handleError(res, {
                message: "Query not found",
                code: 404,
            });
        }

        // const is_split_quantity = query_data.queryDetails.every(i => i.split_quantity && i.split_quantity.is_selected);
        // console.log("is_split_quantity : ", is_split_quantity)

        // let final_quotes = []
        // if (is_split_quantity === true) {
        //     final_quotes = await query_assigned_suppliers.aggregate(
        //         [
        //             {
        //                 $match: {
        //                     query_id: new mongoose.Types.ObjectId(id),
        //                     is_selected: true
        //                 }
        //             },
        //             {
        //                 $lookup: {
        //                     from: "products",
        //                     let: { id: "$product_id" },
        //                     pipeline: [
        //                         {
        //                             $match: {
        //                                 $expr: { $eq: ["$$id", "$_id"] }
        //                             }
        //                         },
        //                         {
        //                             $project: {
        //                                 _id: 1,
        //                                 name: 1
        //                             }
        //                         }
        //                     ],
        //                     as: "product_data"
        //                 }
        //             },
        //             {
        //                 $lookup: {
        //                     from: "queries",
        //                     let: { id: "$query_id" },
        //                     pipeline: [
        //                         {
        //                             $match: {
        //                                 $expr: { $eq: ["$$id", "$_id"] }
        //                             }
        //                         },
        //                         {
        //                             $project: {
        //                                 _id: 1,
        //                                 status: 1,
        //                                 queryDetails: 1
        //                             }
        //                         }
        //                     ],
        //                     as: "query_data"
        //                 }
        //             },
        //             {
        //                 $unwind: {
        //                     path: "$query_data",
        //                     preserveNullAndEmptyArrays: true
        //                 }
        //             },
        //             {
        //                 $lookup: {
        //                     from: "products",
        //                     let: { id: "$variant_id" },
        //                     pipeline: [
        //                         {
        //                             $unwind: {
        //                                 path: "$variant",
        //                                 preserveNullAndEmptyArrays: true
        //                             }
        //                         },
        //                         {
        //                             $match: {
        //                                 $expr: {
        //                                     $eq: ["$$id", "$variant._id"]
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             $project: {
        //                                 variant: 1
        //                             }
        //                         }
        //                     ],
        //                     as: "variant_data"
        //                 }
        //             },
        //             {
        //                 $unwind: {
        //                     path: "$product_data",
        //                     preserveNullAndEmptyArrays: true
        //                 }
        //             },
        //             {
        //                 $unwind: {
        //                     path: "$variant_data",
        //                     preserveNullAndEmptyArrays: true
        //                 }
        //             },
        //             {
        //                 $addFields: {
        //                     buyer_quantity: {
        //                         $cond: {
        //                             if: {
        //                                 $gt: [
        //                                     {
        //                                         $size: "$query_data.queryDetails"
        //                                     },
        //                                     0
        //                                 ]
        //                             },
        //                             then: {
        //                                 $map: {
        //                                     input: {
        //                                         $filter: {
        //                                             input:
        //                                                 "$query_data.queryDetails",
        //                                             as: "sq",
        //                                             cond: {
        //                                                 $and: [
        //                                                     {
        //                                                         $eq: [
        //                                                             "$$sq.product.id",
        //                                                             "$product_id"
        //                                                         ]
        //                                                     },
        //                                                     {
        //                                                         $eq: [
        //                                                             "$$sq.variant._id",
        //                                                             "$variant_id"
        //                                                         ]
        //                                                     }
        //                                                 ]
        //                                             }
        //                                         }
        //                                     },
        //                                     as: "filtered_supplier",
        //                                     in: "$$filtered_supplier.quantity"
        //                                 }
        //                             },
        //                             else: []
        //                         }
        //                     }
        //                 }
        //             },
        //             {
        //                 $unwind: {
        //                     path: "$buyer_quantity",
        //                     preserveNullAndEmptyArrays: true
        //                 }
        //             },
        //             {
        //                 $group: {
        //                     _id: {
        //                         variant_id: "$variant_id",
        //                         query_id: "$query_id",
        //                         product_id: "$product_id"
        //                     },
        //                     variant_assigned_to: {
        //                         $push: "$variant_assigned_to"
        //                     },
        //                     total_quantity: { $sum: "$quantity.value" },
        //                     total_quantity_unit: {
        //                         $first: "$quantity.unit"
        //                     },
        //                     is_selected: { $first: "$is_selected" },
        //                     logistics_price: {
        //                         $sum: "$logistics_price"
        //                     },
        //                     supplier_quote_price: {
        //                         $sum: "$supplier_quote.price"
        //                     },
        //                     supplier_quote_media: {
        //                         $push: "$supplier_quote.media"
        //                     },
        //                     supplier_quote_document: {
        //                         $push: "$supplier_quote.document"
        //                     },
        //                     product_data: { $first: "$product_data" },
        //                     query_data: { $first: "$query_data" },
        //                     variant_data: {
        //                         $first: "$variant_data.variant"
        //                     },
        //                     buyer_quantity: {
        //                         $first: "$buyer_quantity"
        //                     },
        //                     createdAt: { $first: "$createdAt" },
        //                     updatedAt: { $first: "$updatedAt" }
        //                 }
        //             },
        //             {
        //                 $addFields: {
        //                     supplier_quote_media: {
        //                         $reduce: {
        //                             input: "$supplier_quote_media",
        //                             initialValue: [],
        //                             in: {
        //                                 $concatArrays: ["$$value", "$$this"]
        //                             }
        //                         }
        //                     },
        //                     supplier_quote_document: {
        //                         $reduce: {
        //                             input: "$supplier_quote_document",
        //                             initialValue: [],
        //                             in: {
        //                                 $concatArrays: ["$$value", "$$this"]
        //                             }
        //                         }
        //                     }
        //                 }
        //             },
        //             {
        //                 $project: {
        //                     _id: 0,
        //                     product_id: 0
        //                 }
        //             }
        //         ]
        //     )
        // }

        // if (is_split_quantity === false) {
        //     final_quotes = await Query.aggregate(
        //         [
        //             {
        //                 $match: {
        //                     _id: new mongoose.Types.ObjectId(id)
        //                 }
        //             },
        //             {
        //                 $unwind: {
        //                     path: "$queryDetails",
        //                     preserveNullAndEmptyArrays: true
        //                 }
        //             },
        //             {
        //                 $lookup: {
        //                     from: "products",
        //                     let: { id: "$queryDetails.product.id" },
        //                     pipeline: [
        //                         {
        //                             $match: {
        //                                 $expr: { $eq: ["$$id", "$_id"] }
        //                             }
        //                         },
        //                         {
        //                             $project: {
        //                                 _id: 1,
        //                                 name: 1
        //                             }
        //                         }
        //                     ],
        //                     as: "product_data"
        //                 }
        //             },
        //             {
        //                 $lookup: {
        //                     from: "products",
        //                     let: { id: "$queryDetails.variant._id" },
        //                     pipeline: [
        //                         {
        //                             $unwind: {
        //                                 path: "$variant",
        //                                 preserveNullAndEmptyArrays: true
        //                             }
        //                         },
        //                         {
        //                             $match: {
        //                                 $expr: {
        //                                     $eq: ["$$id", "$variant._id"]
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             $project: {
        //                                 variant: 1
        //                             }
        //                         }
        //                     ],
        //                     as: "variant_data"
        //                 }
        //             },
        //             {
        //                 $unwind: {
        //                     path: "$product_data",
        //                     preserveNullAndEmptyArrays: true
        //                 }
        //             },
        //             {
        //                 $unwind: {
        //                     path: "$variant_data",
        //                     preserveNullAndEmptyArrays: true
        //                 }
        //             },
        //             {
        //                 $addFields: {
        //                     "queryDetails.product_data":
        //                         "$product_data",
        //                     "queryDetails.variant_data": "$variant_data"
        //                 }
        //             },
        //             {
        //                 $group: {
        //                     _id: "$_id",
        //                     query_unique_id: {
        //                         $first: "$query_unique_id"
        //                     },
        //                     status: { $first: "$status" },
        //                     createdByUser: { $first: "$createdByUser" },
        //                     adminApproved: { $first: "$adminApproved" },
        //                     queryDetails: { $push: "$queryDetails" },
        //                     createdAt: { $first: "$createdAt" },
        //                     updatedAt: { $first: "$updatedAt" }
        //                 }
        //             },
        //             {
        //                 $project: {
        //                     _id: 1,
        //                     product_data: 0,
        //                     variant_data: 0
        //                 }
        //             }
        //         ]
        //     )
        // }

        const final_quotes = await query_assigned_suppliers.aggregate(
            [
                {
                    $match: {
                        query_id: new mongoose.Types.ObjectId(id),
                        is_selected: true
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        let: { id: "$product_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$$id", "$_id"] }
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
                    $lookup: {
                        from: "queries",
                        let: { id: "$query_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$$id", "$_id"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    status: 1,
                                    queryDetails: 1
                                }
                            }
                        ],
                        as: "query_data"
                    }
                },
                {
                    $unwind: {
                        path: "$query_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        let: { id: "$variant_id" },
                        pipeline: [
                            {
                                $unwind: {
                                    path: "$variant",
                                    preserveNullAndEmptyArrays: true
                                }
                            },
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$variant._id"]
                                    }
                                }
                            },
                            {
                                $project: {
                                    variant: 1
                                }
                            }
                        ],
                        as: "variant_data"
                    }
                },
                {
                    $unwind: {
                        path: "$product_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: "$variant_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        buyer_quantity: {
                            $cond: {
                                if: {
                                    $gt: [
                                        {
                                            $size: "$query_data.queryDetails"
                                        },
                                        0
                                    ]
                                },
                                then: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input:
                                                    "$query_data.queryDetails",
                                                as: "sq",
                                                cond: {
                                                    $and: [
                                                        {
                                                            $eq: [
                                                                "$$sq.product.id",
                                                                "$product_id"
                                                            ]
                                                        },
                                                        {
                                                            $eq: [
                                                                "$$sq.variant._id",
                                                                "$variant_id"
                                                            ]
                                                        }
                                                    ]
                                                }
                                            }
                                        },
                                        as: "filtered_supplier",
                                        in: "$$filtered_supplier.quantity"
                                    }
                                },
                                else: []
                            }
                        }
                    }
                },
                {
                    $unwind: {
                        path: "$buyer_quantity",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: {
                            variant_id: "$variant_id",
                            query_id: "$query_id",
                            product_id: "$product_id"
                        },
                        variant_assigned_to: {
                            $push: "$variant_assigned_to"
                        },
                        total_quantity: { $sum: "$quantity.value" },
                        total_quantity_unit: {
                            $first: "$quantity.unit"
                        },
                        is_selected: { $first: "$is_selected" },
                        logistics_price: {
                            $sum: "$logistics_price"
                        },
                        supplier_quote_price: {
                            $sum: "$supplier_quote.price"
                        },
                        supplier_quote_media: {
                            $push: "$supplier_quote.media"
                        },
                        supplier_quote_document: {
                            $push: "$supplier_quote.document"
                        },
                        product_data: { $first: "$product_data" },
                        query_data: { $first: "$query_data" },
                        variant_data: {
                            $first: "$variant_data.variant"
                        },
                        buyer_quantity: {
                            $first: "$buyer_quantity"
                        },
                        createdAt: { $first: "$createdAt" },
                        updatedAt: { $first: "$updatedAt" }
                    }
                },
                {
                    $addFields: {
                        supplier_quote_media: {
                            $reduce: {
                                input: "$supplier_quote_media",
                                initialValue: [],
                                in: {
                                    $concatArrays: ["$$value", "$$this"]
                                }
                            }
                        },
                        supplier_quote_document: {
                            $reduce: {
                                input: "$supplier_quote_document",
                                initialValue: [],
                                in: {
                                    $concatArrays: ["$$value", "$$this"]
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        product_id: 0
                    }
                }
            ]
        )

        return res.status(200).json({
            message: "final quote list generated successfully",
            data: final_quotes,
            code: 200
        })
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
        const { offset = 0, limit = 10, variant_id, query_id } = req.query
        if (!variant_id && !query_id) {
            return utils.handleError(res, {
                message: "Query and Variant id is required",
                code: 404,
            });
        }
        let filter = {
            variant_id: new mongoose.Types.ObjectId(variant_id),
            query_id: new mongoose.Types.ObjectId(query_id)
        }
        const data = await query_assigned_suppliers.aggregate(
            [
                {
                    $match: filter
                },
                {
                    $lookup: {
                        from: "quantity_units",
                        let: { id: "$quantity.unit" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$_id"]
                                    }
                                }
                            }
                        ],
                        as: "quantity_units_data"
                    }
                },
                {
                    $unwind: {
                        path: "$quantity_units_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        "quantity.unit": "$quantity_units_data.unit",
                        "quantity.unit_id": "$quantity_units_data._id"
                    }
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
                $lookup: {
                    from: "quantity_units",
                    let: { id: "$queryDetails.quantity.unit" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$$id", "$_id"]
                                }
                            }
                        }
                    ],
                    as: "quantity_units_data"
                }
            },
            {
                $unwind: {
                    path: "$quantity_units_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    "queryDetails.quantity.unit": "$quantity_units_data.unit",
                    "queryDetails.quantity.unit_id": "$quantity_units_data._id",
                    "queryDetails.split_quantity.assigned_quantity.unit": "$quantity_units_data.unit",
                    "queryDetails.split_quantity.assigned_quantity.unit_id": "$quantity_units_data._id",
                    "queryDetails.split_quantity.total_quantity.unit": "$quantity_units_data.unit",
                    "queryDetails.split_quantity.total_quantity.unit_id": "$quantity_units_data._id",
                }
            },
            {
                $project: {
                    "queryDetails.product": 1,
                    "queryDetails.variant._id": 1,
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
        const { query_id, variant_id, supplier_id, status } = req.body
        const supplier_data = await query_assigned_suppliers.findOne({ query_id, variant_id, variant_assigned_to: supplier_id })
        console.log("result : ", supplier_data)

        if (!supplier_data) {
            return utils.handleError(res, {
                message: "assigned supplier not found",
                code: 400,
            });
        }
        supplier_data.is_selected = (status === true || status === "true") ? true : false
        await supplier_data.save()

        const result = await Query.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(query_id),
                'queryDetails.variant._id': new mongoose.Types.ObjectId(variant_id)
            },
            {
                $push: {
                    'queryDetails.$.assigned_suppliers': {
                        id: supplier_data.variant_assigned_to,
                        accessed_id: supplier_data._id
                    }
                }
            },
            {
                new: true
            }
        )
        console.log("result is : ", result)

        return res.status(200).json({
            message: "supplier status changed successfully",
            data: supplier_data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}