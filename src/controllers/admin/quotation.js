const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Query = require("../../models/query");
const BidSetting = require("../../models/bidsetting");
const utils = require("../../utils/utils");
const admin = require("../../models/admin");
const bidsetting = require("../../models/bidsetting");
const quotation = require("../../models/quotation");
const moment = require("moment")
const User = require("../../models/user");
const Address = require("../../models/address");


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
                    $unwind: {
                        path: "$query_data",
                        preserveNullAndEmptyArrays: true
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

        const quote = await result.final_quote.map(i => (i._id.toString() === quotation_details_id.toString() ? i : null)).filter(e => e !== null)[0]
        console.log('quote : ', quote)
        const currentTime = await moment(Date.now()).format('lll')
        const timeline_data = {
            date: currentTime,
            detail: 'Admin quotation quote added',
            product_id: quote?.product_id,
            supplier_id: quote?.supplier_id,
            variant_id: quote?.variant_id,
            price: quote?.admin_quote.price,
            media: quote?.admin_quote.media,
            document: quote?.admin_quote.document,
            assignedBy: quote?.admin_quote.assignedBy
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

//submit final quotation

exports.addFinalQuotationList = async (req, res) => {
    try {
        const { quotation_id, final_quotation } = req.body
        console.log("final_quotes : ", final_quotation)
        const queryData = await quotation.findOne({ _id: quotation_id })

        if (!Array.isArray(final_quotation)) {
            return utils.handleError(res, {
                message: "final quotation should be an array",
                code: 400,
            });
        }

        if (!queryData) {
            return utils.handleError(res, {
                message: "Quotation not found",
                code: 400,
            });
        }

        const result = await quotation.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(quotation_id)
            },
            {
                $set: { 'final_quotation_order': final_quotation }
            },
            { new: true }
        )

        return res.status(200).json({
            message: "final quotation added successfully",
            data: result,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.selectLogistics = async (req, res) => {
    try {
        const { id } = req.query
        const quotation_data = await quotation.findOne({ _id: id })
        console.log("quotation_data", quotation_data, quotation_data?.query_id)
        if (!quotation_data) {
            return utils.handleError(res, {
                message: "quotation not found",
                code: 400,
            });
        }

        const query_data = await Query.findOne({ _id: quotation_data?.query_id })
        console.log("query_data", query_data)
        if (!query_data) {
            return utils.handleError(res, {
                message: "query data not found",
                code: 400,
            });
        }

        const buyer_data = await User.findOne({ _id: query_data.createdByUser })
        console.log("buyer_data", buyer_data)
        if (!buyer_data) {
            return utils.handleError(res, {
                message: "buyer not found",
                code: 400,
            });
        }

        const buyer_address = await Address.findOne({ user_id: buyer_data._id, default_address: true })
        console.log("buyer_address", buyer_address)
        if (!buyer_address) {
            return utils.handleError(res, {
                message: "buyer default address not found",
                code: 400,
            });
        }

        const logistics_list = await User.find({
            user_type: 'logistics',
            company_data: { $exists: true, $ne: null }
        });
        console.log("Logistics List: ", logistics_list);

        const filter_data = await logistics_list.map(i => {
            console.log("city : ", i.company_data.address.city, " city : ", buyer_address.address.city)
            console.log("country : ", i.company_data.address.country, " country : ", buyer_address.address.country)
            if (i.company_data.address.city === buyer_address.address.city &&
                i.company_data.address.country === buyer_address.address.country &&
                i.company_data.address.state === buyer_address.address.state
            ) {
                return i
            } else {
                return null
            }
        }
        ).filter(i => i !== null)

        console.log("filter_data : ", filter_data)

        return res.status(200).json({
            message: "Logistics list fetched successfully",
            data: filter_data,
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.assignLogistics = async (req, res) => {
    try {
        const { logistics_id, product_ids, quotation_id } = req.body
        if (!Array.isArray(product_ids)) {
            product_ids = [...product_ids]
        }
        const assign_logistics = product_ids.map(async i => quotation.findOneAndUpdate(
            {
                _id: quotation_id,
                'final_quote.product_id': i
            },
            {
                $set: {
                    "final_quote.$.logistics_id": logistics_id
                }
            },
            { new: true }
        ))

        const data = await Promise.all(assign_logistics)
        console.log('assign_logistics : ', data)

        const result = await quotation.findOneAndUpdate({ _id: quotation_id }, { $set: { is_admin_logistics_decided: 'decided', quotation_type: 'admin-logistics' } }, { new: true })
        console.log('result : ', result)

        await product_ids.map(async e => await result.final_quote.map(async i => {
            if (i.product_id.toString() === e.toString()) {
                const currentTime = await moment(Date.now()).format('lll')
                const timeline_data = {
                    date: currentTime,
                    detail: 'Logistics assigned to quotation',
                    product_id: i?.product_id,
                    supplier_id: i?.supplier_id,
                    variant_id: i?.variant_id,
                    price: i?.price,
                    media: i?.media,
                    document: i?.document,
                    assignedBy: i?.assignedBy
                }
                await result.version_history.push(timeline_data)
            }

        }).filter(e => e !== null)[0])

        await result.save()

        return res.status(200).json({
            message: "logistics assign successfully",
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.approveRejectLogistics = async (req, res) => {
    try {
        const { quotation_id, logistics_id, status } = req.body
        const quotation_data = await quotation.findOne({ _id: quotation_id })
        if (!quotation_data) {
            return utils.handleError(res, {
                message: "quotation not found",
                code: 400,
            });
        }

        if (status === 'rejected' && !req.body.reason) {
            return utils.handleError(res, {
                message: "rejected reason is required",
                code: 400,
            });
        }

        if (status === 'accepted') {
            quotation_data.accepted_logistics = logistics_id
        }

        if (status === "rejected") {
            const response = await quotation.findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(quotation_id)
                },
                {
                    $set: {
                        is_admin_logistics_decided: 'undecided',
                        "rejected_reason.reason": req.body.reason
                    },
                    $addToSet: {
                        "rejected_reason.logistics_ids": logistics_id,
                    },
                },
                { new: true, upsert: true }
            )
            console.log("response : ", response)

            const result = await quotation.updateMany(
                { 'final_quote.logistics_id': logistics_id },
                { $set: { 'final_quote.$.logistics_id': null } }
            )
            console.log("result : ", result)
        }
        await quotation_data.save()

        return res.status(200).json({
            message: `logistics ${status} successfully`,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}