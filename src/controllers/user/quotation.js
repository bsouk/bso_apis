const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require("generate-password");
const quotation = require("../../models/quotation");
const user = require("../../models/user");
const moment = require("moment");
const order = require("../../models/order");
const payment = require("../../models/payment");
const tracking_order = require("../../models/tracking_order");
const version_history = require("../../models/version_history");


// exports.getQuotationList = async (req, res) => {
//     try {
//         const { offset = 0, limit = 10, search } = req.query

//         const userId = req.user._id;
//         console.log("userid is ", userId);

//         const user_data = await user.findOne({ _id: userId });
//         console.log("logged user : ", user_data)
//         if (!user_data) {
//             return utils.handleError(res, {
//                 message: "User not found",
//                 code: 404,
//             });
//         }

//         let filter = {}

//         // if (user_data.user_type === "supplier") {
//         //     filter.final_quote.assignedBy.id = new mongoose.Types.ObjectId(userId)
//         //     filter.final_quote.assignedBy.type = "supplier"
//         // }

//         // if (user_data.user_type === "supplier") {
//         //     filter["final_quote.assignedBy"] = {
//         //         $elemMatch: {
//         //             id: new mongoose.Types.ObjectId(userId),
//         //             type: "supplier",
//         //         },
//         //     };
//         // }

//         if (search) {
//             filter.quotation_unique_id = { $regex: search, $options: "i" }
//         }
//         const data = await quotation.aggregate([
//             {
//                 $unwind: {
//                     path: "$final_quote",
//                     preserveNullAndEmptyArrays: true
//                 }
//             },
//             { $match: { ...filter } },
//             {
//                 $lookup: {
//                     from: "queries",
//                     localField: "query_id",
//                     foreignField: "_id",
//                     as: "query_data"
//                 }
//             },
//             {
//                 $lookup: {
//                     from: "bidsettings",
//                     localField: "bid_setting",
//                     foreignField: "_id",
//                     as: "bid_setting_data"
//                 }
//             },
//             {
//                 $project: {
//                     $cond: {
//                         if: {
//                             "$final_quote.assignedBy.id": { $ne: new mongoose.Types.ObjectId(userId) },
//                             "$final_quote.assignedBy.type": { $ne: "supplier" }
//                         },
//                         then: {
//                             "final_quote.assignedBy": 0
//                         }
//                     }
//                 }
//             },
//             {
//                 $sort: { createdAt: -1 }
//             },
//             {
//                 $skip: parseInt(offset)
//             },
//             {
//                 $limit: parseInt(limit)
//             }
//         ])

//         const count = await quotation.countDocuments(filter)

//         return res.status(200).json({
//             message: "quotation list fetched successfully",
//             data: data,
//             count: count,
//             code: 200
//         })
//     } catch (error) {
//         utils.handleError(res, error);
//     }
// }

exports.getQuotationList = async (req, res) => {
    try {
        const { offset = 0, limit = 10, search, status } = req.query;
        const userId = req.user._id;
        console.log("User ID:", userId);

        const user_data = await user.findOne({ _id: userId });
        console.log("Logged user:", user_data);

        if (!user_data) {
            return utils.handleError(res, {
                message: "User not found",
                code: 404,
            });
        }

        let filter = {};

        if (search) {
            filter.quotation_unique_id = { $regex: search, $options: "i" };
        }

        if (status) {
            filter.is_approved = status
        }

        let filter_data = {
            query_data: 1,
            bid_setting_data: 1,
            createdAt: 1,
            updatedAt: 1,
            is_approved: 1,
            quotation_unique_id: 1,
        }
        if (user_data.user_type === "supplier") {
            filter["final_quote.assignedBy.id"] = new mongoose.Types.ObjectId(userId);
            filter["final_quote.assignedBy.type"] = "supplier";
            filter_data.final_quote = {
                $filter: {
                    input: "$final_quote",
                    as: "quote",
                    cond: {
                        $and: [
                            { $eq: ["$$quote.assignedBy.id", new mongoose.Types.ObjectId(userId)] },
                            { $eq: ["$$quote.assignedBy.type", "supplier"] }
                        ]
                    }
                }
            }
        }

        if (user_data.user_type === "logistics") {
            filter.decided_logistics_id = new mongoose.Types.ObjectId(userId);
            filter["final_quote.logistics_id"] = new mongoose.Types.ObjectId(userId);
        }

        const data = await quotation.aggregate([
            {
                $match: { ...filter }
            },
            // {
            //     $lookup: {
            //         from: "queries",
            //         localField: "query_id",
            //         foreignField: "_id",
            //         as: "query_data",
            //     },
            // },
            // {
            //     $unwind: {
            //         path: "$query_data",
            //         preserveNullAndEmptyArrays: true
            //     }
            // },
            {
                $lookup: {
                    from: "bidsettings",
                    localField: "bid_setting",
                    foreignField: "_id",
                    as: "bid_setting_data",
                },
            },
            {
                $unwind: {
                    path: "$bid_setting_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: filter_data
            },
            {
                $sort: { createdAt: -1 },
            },
            { $skip: parseInt(offset) },
            { $limit: parseInt(limit) },
        ]);

        const count = await quotation.countDocuments(filter);

        return res.status(200).json({
            message: "Quotation list fetched successfully",
            data: data,
            count: count,
            code: 200,
        });
    } catch (error) {
        console.error("Error in getQuotationList:", error);
        utils.handleError(res, error);
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
                    $unwind: {
                        path: "$query_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: "$final_quote",
                        preserveNullAndEmptyArrays: true
                    }
                },
                // {
                //     $lookup: {
                //         from: "bidsettings",
                //         localField: "bid_setting",
                //         foreignField: "_id",
                //         as: "bid_setting_data"
                //     }
                // },
                // {
                //     $unwind: {
                //         path: "$bid_setting_data",
                //         preserveNullAndEmptyArrays: true
                //     }
                // },
                {
                    $lookup: {
                        from: "products",
                        let: { id: "$final_quote.product_id" },
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
                        // localField: "final_quote.product_id",
                        // foreignField: "_id",
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
                    $lookup: {
                        from: "products",
                        let: {
                            variantId: "$final_quote.variant_id"
                        },
                        pipeline: [
                            { $unwind: "$variant" },
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$variant._id", "$$variantId"]
                                    }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
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
                                        cond: {
                                            $eq: [
                                                "$$product._id",
                                                "$final_quote.product_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        // "final_quote.supplier": {
                        //     $arrayElemAt: [
                        //         {
                        //             $filter: {
                        //                 input: "$supplier_data",
                        //                 as: "supplier",
                        //                 cond: {
                        //                     $eq: [
                        //                         "$$supplier._id",
                        //                         "$final_quote.supplier_id"
                        //                     ]
                        //                 }
                        //             }
                        //         },
                        //         0
                        //     ]
                        // },
                        "final_quote.variant_data": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$variant_data",
                                        as: "variant",
                                        cond: {
                                            $eq: [
                                                "$$variant.variant._id",
                                                "$final_quote.variant_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        "final_quote.query_data": {
                            $let: {
                                vars: {
                                    matchedQuery: {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input:
                                                        "$query_data.queryDetails",
                                                    as: "query",
                                                    cond: {
                                                        $and: [
                                                            {
                                                                $eq: [
                                                                    "$$query.product.id",
                                                                    "$final_quote.product_id"
                                                                ]
                                                            },
                                                            {
                                                                $eq: [
                                                                    "$$query.supplier._id",
                                                                    "$final_quote.supplier_id"
                                                                ]
                                                            },
                                                            {
                                                                $eq: [
                                                                    "$$query.variant._id",
                                                                    "$final_quote.variant_id"
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                },
                                in: {
                                    query: "$$matchedQuery.query",
                                    notes: "$$matchedQuery.notes",
                                    price: "$$matchedQuery.price"
                                }
                            }
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
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                "$data",
                                { final_quote: "$final_quote" }
                            ]
                        }
                    }
                },

                {
                    $unwind: {
                        path: "$final_quotation_order",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        let: {
                            variantId:
                                "$final_quotation_order.variant_id"
                        },
                        pipeline: [
                            { $unwind: "$variant" },
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$variant._id", "$$variantId"]
                                    }
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
                        "final_quotation_order.product": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$product_data",
                                        as: "product",
                                        cond: {
                                            $eq: [
                                                "$$product._id",
                                                "$final_quotation_order.product_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        "final_quotation_order.supplier": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$supplier_data",
                                        as: "supplier",
                                        cond: {
                                            $eq: [
                                                "$$supplier._id",
                                                "$final_quotation_order.supplier_id"
                                            ]
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        "final_quotation_order.variant": {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: "$variant_data",
                                        as: "variant",
                                        cond: {
                                            $eq: [
                                                "$$variant.variant._id",
                                                "$final_quotation_order.variant_id"
                                            ]
                                        }
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
                        final_quotation_order: {
                            $push: "$final_quotation_order"
                        }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                "$data",
                                {
                                    final_quotation_order:
                                        "$final_quotation_order"
                                }
                            ]
                        }
                    }
                },

                // {
                //     $unwind: {
                //         path: "$version_history",
                //         preserveNullAndEmptyArrays: true
                //     }
                // },
                // {
                //     $lookup: {
                //         from: "products",
                //         let: {
                //             timelineVariantId:
                //                 "$version_history.variant_id"
                //         },
                //         pipeline: [
                //             { $unwind: "$variant" },
                //             {
                //                 $match: {
                //                     $expr: {
                //                         $eq: [
                //                             "$variant._id",
                //                             "$$timelineVariantId"
                //                         ]
                //                     }
                //                 }
                //             },
                //             {
                //                 $project: {
                //                     _id: 0,
                //                     variant: 1
                //                 }
                //             }
                //         ],
                //         as: "timeline_variant_data"
                //     }
                // },
                // {
                //     $addFields: {
                //         "version_history.product": {
                //             $arrayElemAt: [
                //                 {
                //                     $filter: {
                //                         input: "$product_data",
                //                         as: "product",
                //                         cond: {
                //                             $eq: [
                //                                 "$$product._id",
                //                                 "$version_history.product_id"
                //                             ]
                //                         }
                //                     }
                //                 },
                //                 0
                //             ]
                //         },
                //         "version_history.supplier": {
                //             $arrayElemAt: [
                //                 {
                //                     $filter: {
                //                         input: "$supplier_data",
                //                         as: "supplier",
                //                         cond: {
                //                             $eq: [
                //                                 "$$supplier._id",
                //                                 "$version_history.supplier_id"
                //                             ]
                //                         }
                //                     }
                //                 },
                //                 0
                //             ]
                //         },
                //         "version_history.variant": {
                //             $arrayElemAt: [
                //                 {
                //                     $filter: {
                //                         input: "$timeline_variant_data",
                //                         as: "variant",
                //                         cond: {
                //                             $eq: [
                //                                 "$$variant.variant._id",
                //                                 "$version_history.variant_id"
                //                             ]
                //                         }
                //                     }
                //                 },
                //                 0
                //             ]
                //         }
                //     }
                // },
                // {
                //     $group: {
                //         _id: "$_id",
                //         data: { $first: "$$ROOT" },
                //         version_history: {
                //             $push: "$version_history"
                //         }
                //     }
                // },
                // {
                //     $replaceRoot: {
                //         newRoot: {
                //             $mergeObjects: [
                //                 "$data",
                //                 { version_history: "$version_history" }
                //             ]
                //         }
                //     }
                // },
                // {
                //     $unwind: {
                //         path: '$query_data',
                //         preserveNullAndEmptyArrays: true
                //     }
                // },
                {
                    $project: {
                        query_id: 0,
                        bid_setting: 0,
                        product_data: 0,
                        supplier_data: 0,
                        variant_data: 0,
                        timeline_variant_data: 0,
                        query_data: 0,
                        final_quotation_order: 0,
                        "final_quote.product_id": 0,
                        "final_quote.supplier_id": 0,
                        "final_quote.variant_id": 0,
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

exports.approveRejectQuotation = async (req, res) => {
    try {
        const { id, status } = req.body
        const userId = req.user._id
        console.log("userId : ", userId)
        const quotation_data = await quotation.findOne({ _id: id }).populate('query_id')
        console.log('quotation_data : ', quotation_data)
        if (!quotation_data) {
            return utils.handleError(res, {
                message: "Quotation not found",
                code: 404,
            });
        }

        if (quotation_data?.query_id?.createdByUser.toString() !== userId.toString()) {
            return utils.handleError(res, {
                message: "you don't have permission to edit it",
                code: 404,
            });
        }

        quotation_data.is_approved = status
        await quotation_data.save()

        return res.status(200).json({
            message: "quotation status changed successfully",
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.addQuotationNotes = async (req, res) => {
    try {
        const { final_quote_id, note } = req.body
        const user_id = req.user._id
        console.log("USER_ID : ", user_id)

        const user_data = await user.findOne({ _id: user_id })
        console.log("user_data : ", user_data)

        if (!user_data) {
            return utils.handleError(res, {
                message: "token not found",
                code: 404,
            })
        }

        const queryData = await quotation.findOne(
            {
                'final_quote._id': new mongoose.Types.ObjectId(final_quote_id)
            }
        )
        console.log("query data :", queryData)
        if (!queryData) {
            return utils.handleError(res, {
                message: "Quotation not found",
                code: 404,
            });
        }

        let filter = {}

        if (user_data.user_type === "supplier") {
            filter = { 'final_quote.$.supplier_notes': note }
        } else {
            filter = { 'final_quote.$.buyer_notes': note }
        }

        const data = await quotation.findOneAndUpdate(
            {
                'final_quote._id': new mongoose.Types.ObjectId(final_quote_id)
            },
            {
                $set: filter
            },
            { new: true }
        )

        const quote = await queryData.final_quote.map(i => (i._id.toString() === final_quote_id.toString() ? i : null)).filter(e => e !== null)[0]
        console.log('quote : ', quote)
        const currentTime = await moment(Date.now()).format('lll')
        const timeline_data = {
            date: currentTime,
            detail: user_data.user_type === "supplier" ? 'Supplier quotation note added' : 'Buyer quotation note added',
            product_id: quote?.product_id,
            supplier_id: quote?.supplier_id,
            variant_id: quote?.variant_id,
            price: quote?.price,
            quantity: quote?.quantity,
            media: quote?.media,
            document: quote?.document,
            assignedBy: quote?.assignedBy
        }

        const result = await version_history.create({
            quotation_id: queryData._id,
            ...timeline_data
        })
        console.log("result : ", result)

        return res.status(200).json({
            message: "Quotation notes added successfully",
            data,
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.addSupplierQuotationQuery = async (req, res) => {
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
                    'final_quote.$.supplier_quote': req?.body?.supplier_quote,
                    'final_quote.$.admin_quote': null
                }
            },
            { new: true }
        )
        console.log("result : ", result)


        const quote = await result.final_quote.map(i => (i._id.toString() === quotation_details_id.toString() ? i : null)).filter(e => e !== null)[0]
        console.log('quote : ', quote)
        const currentTime = await moment(Date.now()).format('lll')
        const timeline_data = {
            date: currentTime,
            detail: 'Supplier quotation quote added',
            product_id: quote?.product_id,
            supplier_id: quote?.supplier_id,
            variant_id: quote?.variant_id,
            price: quote?.supplier_quote.price,
            quantity: quote?.supplier_quote?.quantity,
            media: quote?.supplier_quote.media,
            document: quote?.supplier_quote.document,
            assignedBy: quote?.supplier_quote.assignedBy
        }

        const response = await version_history.create({
            quotation_id: queryData._id,
            ...timeline_data
        })
        console.log("response : ", response)

        return res.status(200).json({
            message: "Supplier quote added successfully",
            data: result,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.addLogisticsQuotationQuery = async (req, res) => {
    try {
        const { quotation_id } = req.body

        const userId = req.user._id;
        console.log("userid is ", userId);

        const userData = await user.findOne({ _id: userId })

        if (!userData) {
            return utils.handleError(res, {
                message: "logistics not found",
                code: 404,
            });
        }

        const queryData = await quotation.findById({ _id: quotation_id })
        if (!queryData) {
            return utils.handleError(res, {
                message: "Quotation not found",
                code: 404,
            });
        }
        const currentTime = await moment(Date.now()).format('lll')
        const assignData = {
            id: userId,
            type: userData.user_type,
            date_time: currentTime
        }

        req.body.logistics_quote.assignedBy = assignData

        const result = await quotation.findOneAndUpdate(
            {
                _id: quotation_id
            },
            {
                $set: {
                    logistics_quote: req?.body?.logistics_quote
                }
            },
            { new: true }
        )
        console.log("result : ", result)

        const quote = await result.final_quote.map(i => (i._id.toString() === quotation_details_id.toString() ? i : null)).filter(e => e !== null)[0]
        console.log('quote : ', quote)
        const timeline_data = {
            date: currentTime,
            detail: 'Logistics quotation quote added',
            product_id: quote?.product_id,
            supplier_id: quote?.supplier_id,
            variant_id: quote?.variant_id,
            price: quote?.logistics_quote.price,
            media: quote?.logistics_quote.media,
            document: quote?.logistics_quote.document,
            assignedBy: quote?.logistics_quote.assignedBy
        }

        const response = await version_history.create({
            quotation_id: queryData._id,
            ...timeline_data
        })
        console.log("response : ", response)

        return res.status(200).json({
            message: "Logistics quote added successfully",
            data: result,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


//checkout quotation
async function generateUniqueId() {
    const id = await Math.floor(Math.random() * 10000000000)
    console.log('unique id : ', id)
    return `#${id}`
}

exports.checkout = async (req, res) => {
    try {
        const { shipping_address, billing_address, order_items, total_amount, delivery_charges, payment_method, logistics_id } = req.body
        const userId = req.user._id
        console.log("user : ", userId)

        const buyer_data = await user.findOne({ _id: userId })
        if (!buyer_data) {
            return utils.handleError(res, {
                message: "Buyer might be deleted or not existed",
                code: 404,
            });
        }

        const data = {
            order_unique_id: await generateUniqueId(),
            buyer_id: userId,
            total_amount,
            delivery_charges,
            order_items,
            shipping_address,
            billing_address,
            logistics_id
        }

        const neworder = await order.create(data)
        console.log("neworder : ", neworder)

        const payment_data = {
            order_id: neworder._id,
            buyer_id : userId,
            total_amount,
            delivery_charges,
            buyer_id: userId
        }

        if (payment_method !== "cash_on_delivery") {
            payment_data.txn_id = "axis_123A789"
        }

        const newpayment = await payment.create(payment_data)
        console.log("newpayment : ", newpayment)

        const tracking_data = {
            tracking_unique_id: await generateUniqueId(),
            order_id: neworder._id,
            logistics_id
        }

        const newtracking = await tracking_order.create(tracking_data)
        console.log("newtracking : ", newtracking)

        neworder.payment_id = newpayment._id
        neworder.tracking_id = newtracking._id

        await neworder.save()

        return res.status(200).json({
            message: "checkout successfull!",
            data: {
                order: neworder,
                payment: newpayment,
                tracking: newtracking
            },
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getVersionHistory = async (req, res) => {
    try {
        const { offset = 0, limit = 10, search, quotation_id } = req.query
        if (!quotation_id) {
            return utils.handleError(res, {
                message: "Invalid quotation id",
                code: 400,
            });
        }
        const filter = {}
        if (search) {
            filter.quotation_id = { $regex: search, $options: 'i' }
        }
        const data = await version_history.aggregate([
            {
                $match: {
                    quotation_id: new mongoose.Types.ObjectId(quotation_id),
                    ...filter
                }
            },
            {
                $lookup: {
                    from: "products",
                    let: {
                        id:
                            "$product_id"
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$id"]
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
                $lookup: {
                    from: "products",
                    let: {
                        variantId:
                            "$variant_id"
                    },
                    pipeline: [
                        { $unwind: "$variant" },
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$variant._id", "$$variantId"]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                variant: {
                                    images: 1,
                                    tag: 1
                                }
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
                $project: {
                    product_id: 0,
                    supplier_id: 0,
                    variant_id: 0,
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $skip: parseInt(offset)
            },
            {
                $limit: parseInt(limit)
            }
        ])
        let count = 0
        await data.map((i) =>
            count++
        )
        console.log(count)
        return res.status(200).json({
            message: "version history fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}