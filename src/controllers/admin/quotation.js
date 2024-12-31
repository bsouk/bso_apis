const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Query = require("../../models/query");
const BidSetting = require("../../models/bidsetting");
const utils = require("../../utils/utils");
const admin = require("../../models/admin");
const bidsetting = require("../../models/bidsetting");
const quotation = require("../../models/quotation");
const moment = require("moment")


exports.getQuotationList = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10, status } = req.query
        const filter = {}

        if (search) {
            filter.quotation_unique_id = { $regex: search, $options: "i" }
        }
        if (status) {
            filter.is_approved = status
        }

        const data = await quotation.aggregate([
            { $match: { ...filter } },
            {
                $lookup: {
                    from: 'queries',
                    localField: 'query_id',
                    foreignField: '_id',
                    as: 'query_data'
                }
            },
            {
                $lookup: {
                    from: 'bidsettings',
                    localField: 'bid_setting',
                    foreignField: '_id',
                    as: 'bid_setting_data'
                }
            },
            {
                $unwind: {
                    path: "$query_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: "$bid_setting_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'query_data.createdByUser',
                    foreignField: '_id',
                    as: 'query_user_data'
                }
            },
            {
                $unwind: {
                    path: "$query_user_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $skip: parseInt(offset)
            },
            {
                $limit: parseInt(limit)
            }
        ])
        const count = await quotation.countDocuments(filter)
        return res.status(200).json({
            message: "Quotation list fetched successfully",
            data,
            count,
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.deleteMultipleQuotation = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                message: "Please provide a valid array of IDs to delete.",
                code: 400
            });
        }

        const existingRecords = await quotation.find({ _id: { $in: ids } });

        if (existingRecords.length !== ids.length) {
            return res.status(404).json({
                message: "One or more IDs do not match any records.",
                code: 404
            });
        }
        const result = await quotation.deleteMany({ _id: { $in: ids } });

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


// exports.getQuotationDetails = async (req, res) => {
//     try {
//         const { id } = req.params

//         if (!mongoose.Types.ObjectId.isValid(id)) {
//             return utils.handleError(res, {
//                 message: "Invalid quotation id",
//                 code: 404,
//             });
//         }

//         const data = await quotation.aggregate([
//             {
//                 $match: { _id: new mongoose.Types.ObjectId(id) }
//             },
//             {
//                 $lookup: {
//                     from: 'queries',
//                     localField: 'query_id',
//                     foreignField: '_id',
//                     as: 'query_data'
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$query_data',
//                     preserveNullAndEmptyArrays: true,
//                 }
//             },
//             {
//                 $lookup: {
//                     from: 'bidsettings',
//                     localField: 'bid_setting',
//                     foreignField: '_id',
//                     as: 'bid_setting_data'
//                 }
//             },
//             {
//                 $unwind: {
//                     path: '$bid_setting_data',
//                     preserveNullAndEmptyArrays: true,
//                 }
//             },
//             {
//                 $project: {
//                     query_id: 0,
//                     bid_setting: 0
//                 }
//             }
//         ])

//         return res.status(200).json({
//             message: "Quotation data fetched successfully",
//             data: data[0],
//             code: 200
//         })
//     } catch (error) {
//         utils.handleError(res, error);
//     }
// }

exports.getQuotationDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, {
                message: "Invalid quotation id",
                code: 404,
            });
        }

        // const data = await quotation.aggregate([
        //     {
        //         $match: { _id: new mongoose.Types.ObjectId(id) },
        //     },
        //     {
        //         $lookup: {
        //             from: "queries",
        //             localField: "query_id",
        //             foreignField: "_id",
        //             as: "query_data",
        //         },
        //     },
        //     {
        //         $unwind: {
        //             path: "$query_data",
        //             preserveNullAndEmptyArrays: true,
        //         },
        //     },
        //     {
        //         $lookup: {
        //             from: "bidsettings",
        //             localField: "bid_setting",
        //             foreignField: "_id",
        //             as: "bid_setting_data",
        //         },
        //     },
        //     {
        //         $unwind: {
        //             path: "$bid_setting_data",
        //             preserveNullAndEmptyArrays: true,
        //         },
        //     },
        //     {
        //         $lookup: {
        //             from: "products",
        //             localField: "final_quote.product_id",
        //             foreignField: "_id",
        //             as: "product_data",
        //         },
        //     },
        //     {
        //         $lookup: {
        //             from: "users",
        //             localField: "final_quote.supplier_id",
        //             foreignField: "_id",
        //             as: "supplier_data",
        //         },
        //     },
        //     {
        //         $lookup: {
        //             from: "variants",
        //             localField: "final_quote.variant_id",
        //             foreignField: "_id",
        //             as: "variant_data",
        //         },
        //     },
        //     {
        //         $lookup: {
        //             from: "products",
        //             localField: "version_history.product_id",
        //             foreignField: "_id",
        //             as: "timeline_product_data",
        //         }
        //     },
        //     {
        //         $lookup: {
        //             from: "users",
        //             localField: "version_history.supplier_id",
        //             foreignField: "_id",
        //             as: "timeline_supplier_data",
        //         }
        //     },
        //     {
        //         $lookup: {
        //             from: "variants",
        //             localField: "version_history.variant_id",
        //             foreignField: "_id",
        //             as: "timeline_variant_data",
        //         },
        //     },
        //     {
        //         $addFields: {
        //             final_quote: {
        //                 $map: {
        //                     input: "$final_quote",
        //                     as: "quote",
        //                     in: {
        //                         $mergeObjects: [
        //                             "$$quote",
        //                             {
        //                                 product: {
        //                                     $arrayElemAt: [
        //                                         {
        //                                             $filter: {
        //                                                 input: "$product_data",
        //                                                 as: "product",
        //                                                 cond: {
        //                                                     $eq: [
        //                                                         "$$product._id",
        //                                                         "$$quote.product_id",
        //                                                     ],
        //                                                 },
        //                                             },
        //                                         },
        //                                         0,
        //                                     ],
        //                                 },
        //                                 supplier: {
        //                                     $arrayElemAt: [
        //                                         {
        //                                             $filter: {
        //                                                 input: "$supplier_data",
        //                                                 as: "supplier",
        //                                                 cond: {
        //                                                     $eq: [
        //                                                         "$$supplier._id",
        //                                                         "$$quote.supplier_id",
        //                                                     ],
        //                                                 },
        //                                             },
        //                                         },
        //                                         0,
        //                                     ],
        //                                 },
        //                                 variant: {
        //                                     $arrayElemAt: [
        //                                         {
        //                                             $filter: {
        //                                                 input: "$variant_data",
        //                                                 as: "variant",
        //                                                 cond: {
        //                                                     $eq: [
        //                                                         "$$variant._id",
        //                                                         "$$quote.variant_id",
        //                                                     ],
        //                                                 },
        //                                             },
        //                                         },
        //                                         0,
        //                                     ],
        //                                 },
        //                             },
        //                         ],
        //                     },
        //                 },
        //             },
        //         },
        //     },
        //     {
        //         $project: {
        //             query_id: 0,
        //             bid_setting: 0,
        //             product_data: 0,
        //             supplier_data: 0,
        //             variant_data: 0,
        //         },
        //     },
        // ]);

        const data = await quotation.aggregate(
            [
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(id)
                    }
                },
                {
                    $lookup: {
                        from: "queries",
                        localField: "query_id",
                        foreignField: "_id",
                        as: "query_data"
                    }
                },
                {
                    $lookup: {
                        from: "bidsettings",
                        localField: "bid_setting",
                        foreignField: "_id",
                        as: "bid_setting_data"
                    }
                },
                {
                    $unwind: {
                        path: "$bid_setting_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        localField: "final_quote.product_id",
                        foreignField: "_id",
                        as: "product_data"
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "final_quote.supplier_id",
                        foreignField: "_id",
                        as: "supplier_data"
                    }
                },
                {
                    $unwind: {
                        path: "$final_quote",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        let: { variantId: "$final_quote.variant_id" },
                        pipeline: [
                            { $unwind: "$variant" },
                            {
                                $match: {
                                    $expr: { $eq: ["$variant._id", "$$variantId"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    variant: 1
                                }
                            }
                        ],
                        as: "variant_data"
                    }
                },
                {
                    $addFields: {
                        "final_quote.product": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$product_data",
                                        as: "product",
                                        cond: { $eq: ["$$product._id", "$final_quote.product_id"] }
                                    }
                                },
                                0
                            ]
                        },
                        "final_quote.supplier": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$supplier_data",
                                        as: "supplier",
                                        cond: { $eq: ["$$supplier._id", "$final_quote.supplier_id"] }
                                    }
                                },
                                0
                            ]
                        },
                        "final_quote.variant": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$variant_data",
                                        as: "variant",
                                        cond: { $eq: ["$$variant.variant._id", "$final_quote.variant_id"] }
                                    }
                                },
                                0
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        data: { $first: "$$ROOT" },
                        final_quote: { $push: "$final_quote" }
                    }
                },
                {
                    $replaceRoot: { newRoot: { $mergeObjects: ["$data", { final_quote: "$final_quote" }] } }
                },
                {
                    $unwind: {
                        path: "$version_history",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        let: { timelineVariantId: "$version_history.variant_id" },
                        pipeline: [
                            { $unwind: "$variant" },
                            {
                                $match: {
                                    $expr: { $eq: ["$variant._id", "$$timelineVariantId"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 0,
                                    variant: 1
                                }
                            }
                        ],
                        as: "timeline_variant_data"
                    }
                },
                {
                    $addFields: {
                        "version_history.product": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$product_data",
                                        as: "product",
                                        cond: { $eq: ["$$product._id", "$version_history.product_id"] }
                                    }
                                },
                                0
                            ]
                        },
                        "version_history.supplier": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$supplier_data",
                                        as: "supplier",
                                        cond: { $eq: ["$$supplier._id", "$version_history.supplier_id"] }
                                    }
                                },
                                0
                            ]
                        },
                        "version_history.variant": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$timeline_variant_data",
                                        as: "variant",
                                        cond: { $eq: ["$$variant.variant._id", "$version_history.variant_id"] }
                                    }
                                },
                                0
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        data: { $first: "$$ROOT" },
                        version_history: { $push: "$version_history" }
                    }
                },
                {
                    $replaceRoot: { newRoot: { $mergeObjects: ["$data", { version_history: "$version_history" }] } }
                },
                {
                    $project: {
                        query_id: 0,
                        bid_setting: 0,
                        product_data: 0,
                        supplier_data: 0,
                        variant_data: 0,
                        timeline_variant_data: 0
                    }
                }
            ]
        )

        return res.status(200).json({
            message: "Quotation data fetched successfully",
            data: data[0],
            code: 200,
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.addAdminQuotationQuery = async (req, res) => {
    try {
        const { quotation_id, quotation_details_id } = req.body

        const queryData = await quotation.findById({ _id: quotation_id })
        if (!queryData) {
            return utils.handleError(res, {
                message: "Quotation not found",
                code: 404,
            });
        }

        const result = await quotation.findOneAndUpdate(
            {
                _id: quotation_id,
                'final_quote._id': quotation_details_id
            },
            {
                $set: {
                    'final_quote.$.admin_quote': req?.body?.admin_quote,
                    'final_quote.$.supplier_quote': null
                }
            },
            { new: true }
        )
        console.log("result : ", result)

        const quote = await queryData.final_quote.map(i => (i._id.toString() === quotation_details_id.toString() ? i : null)).filter(e => e !== null)[0]
        console.log('quote : ', quote)
        const currentTime = await moment(Date.now()).format('lll')
        const timeline_data = {
            date: currentTime,
            detail: 'Admin quotation quote added',
            product_id: quote?.product_id,
            supplier_id: quote?.supplier_id,
            variant_id: quote?.variant_id,
            price: quote?.price,
            media: quote?.media,
            document: quote?.document,
            assignedBy: quote?.assignedBy
        }

        queryData.version_history.push(timeline_data)
        await queryData.save()

        return res.status(200).json({
            message: "Admin quote added successfully",
            data: result,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}
