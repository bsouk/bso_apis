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
const version_history = require("../../models/version_history");
const query_assigned_suppliers = require("../../models/query_assigned_suppliers");


exports.getQuotationList = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10, status } = req.query
        const filter = {}

        if (search) {
            filter.$or = [
                {
                    quotation_unique_id: { $regex: search, $options: "i" }
                },
                {
                    "query_data.query_unique_id": {
                        $regex: search,
                        $options: "i"
                    }
                }
            ]
        }
        if (status) {
            filter.is_approved = status
        }

        const data = await quotation.aggregate(
            [
                // { $match: { ...filter } },
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
                { $match: { ...filter } },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: parseInt(offset)
                },
                {
                    $limit: parseInt(limit)
                }
            ]
        )
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

exports.getQuotationDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, {
                message: "Invalid quotation id",
                code: 404,
            });
        }

        const data = await quotation.aggregate(
            // [
            //     {
            //         $match: {
            //             _id: new mongoose.Types.ObjectId(id)
            //         }
            //     },
            //     {
            //         $lookup: {
            //             from: "queries",
            //             localField: "query_id",
            //             foreignField: "_id",
            //             as: "query_data"
            //         }
            //     },
            //     {
            //         $unwind: {
            //             path: "$query_data",
            //             preserveNullAndEmptyArrays: true
            //         }
            //     },
            //     {
            //         $lookup: {
            //             from: "bidsettings",
            //             localField: "bid_setting",
            //             foreignField: "_id",
            //             as: "bid_setting_data"
            //         }
            //     },
            //     {
            //         $unwind: {
            //             path: "$bid_setting_data",
            //             preserveNullAndEmptyArrays: true
            //         }
            //     },
            //     {
            //         $lookup: {
            //             from: "users",
            //             localField: "decided_logistics_id",
            //             foreignField: "_id",
            //             as: "logistics_data"
            //         }
            //     },
            //     {
            //         $unwind: {
            //             path: "$logistics_data",
            //             preserveNullAndEmptyArrays: true
            //         }
            //     },
            //     {
            //         $lookup: {
            //             from: "query_assigned_suppliers",
            //             let: { id: "$_id" },
            //             pipeline: [
            //                 {
            //                     $match: {
            //                         $expr: {
            //                             $eq: ["$quotation_id", "$$id"]
            //                         }
            //                     }
            //                 },
            //                 {
            //                     $lookup: {
            //                         from: "products",
            //                         let: { vid: "$variant_id" },
            //                         pipeline: [
            //                             {
            //                                 $unwind: {
            //                                     path: "$variant"
            //                                 }
            //                             },
            //                             {
            //                                 $match: {
            //                                     $expr: {
            //                                         $eq: ["$variant._id", "$$vid"]
            //                                     }
            //                                 }
            //                             },
            //                             {
            //                                 $project: {
            //                                     _id: 1,
            //                                     variant: {
            //                                         images: 1,
            //                                         tag: 1
            //                                     }
            //                                 }
            //                             }
            //                         ],
            //                         as: "variant_data"
            //                     }
            //                 },
            //                 {
            //                     $lookup: {
            //                         from: "products",
            //                         let: { pid: "$product_id" },
            //                         pipeline: [
            //                             {
            //                                 $match: {
            //                                     $expr: {
            //                                         $eq: ["$_id", "$$pid"]
            //                                     }
            //                                 }
            //                             },
            //                             {
            //                                 $project: {
            //                                     _id: 1,
            //                                     name: 1
            //                                 }
            //                             }
            //                         ],
            //                         as: "product_data"
            //                     }
            //                 },

            //                 {
            //                     $lookup: {
            //                         from: "users",
            //                         let: { pid: "$variant_assigned_to" },
            //                         pipeline: [
            //                             {
            //                                 $match: {
            //                                     $expr: {
            //                                         $eq: ["$_id", "$$pid"]
            //                                     }
            //                                 }
            //                             },
            //                             {
            //                                 $project: {
            //                                     _id: 1,
            //                                     full_name: 1
            //                                 }
            //                             }
            //                         ],
            //                         as: "supplier_data"
            //                     }
            //                 },
            //                 {
            //                     $unwind: {
            //                         path: "$product_data",
            //                         preserveNullAndEmptyArrays: true
            //                     }
            //                 },
            //                 {
            //                     $unwind: {
            //                         path: "$variant_data",
            //                         preserveNullAndEmptyArrays: true
            //                     }
            //                 },
            //                 {
            //                     $unwind: {
            //                         path: "$supplier_data",
            //                         preserveNullAndEmptyArrays: true
            //                     }
            //                 },
            //                 {
            //                     $group: {
            //                         _id: '$variant_id',
            //                         query_id: { $first: '$query_id' },
            //                         product_id: { $first: '$product_id' },
            //                         variant_id: { $first: '$variant_id' },
            //                         variant_assigned_to: { $push: '$variant_assigned_to' },
            //                         user_type: { $first: '$user_type' },
            //                         quantity: { $push: '$quantity' },
            //                         // is_selected : {$first : '$is_selected'},
            //                         // admin_approved_quotes : {$push : '$admin_approved_quotes'},
            //                         // supplier_quote : {$push : '$supplier_quote'},
            //                         // admin_quote : {$push : '$admin_quote'},
            //                         //logistics_price : {$push : '$logistics_price'},
            //                         //admin_margin : {$push : '$admin_margin'},
            //                         createdAt: { $first: '$createdAt' },
            //                         updatedAt: { $first: '$updatedAt' },
            //                         variant_data: { $first: '$variant_data.variant' },
            //                         product_data: { $first: '$product_data' },
            //                         supplier_data: { $first: '$supplier_data' }
            //                     }
            //                 }
            //             ],
            //             as: "final_quote"
            //         }
            //     }
            // ]
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
                        from: "query_assigned_suppliers",
                        let: { id: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$quotation_id", "$$id"]
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: "products",
                                    let: { vid: "$variant_id" },
                                    pipeline: [
                                        {
                                            $unwind: {
                                                path: "$variant"
                                            }
                                        },
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ["$variant._id", "$$vid"]
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
                                $lookup: {
                                    from: "products",
                                    let: { pid: "$product_id" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ["$_id", "$$pid"]
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
                                    from: "users",
                                    let: { pid: "$variant_assigned_to" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ["$_id", "$$pid"]
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
                                $unwind: {
                                    path: "$supplier_data",
                                    preserveNullAndEmptyArrays: true
                                }
                            },
                            {
                                $group: {
                                    _id: "$variant_id",
                                    query_id: { $first: "$query_id" },
                                    product_id: { $first: "$product_id" },
                                    variant_id: { $first: "$variant_id" },
                                    variant_assigned_to: {
                                        $push: "$variant_assigned_to"
                                    },
                                    product_data: {
                                        $first: "$product_data"
                                    },
                                    variant_data: {
                                        $first: "$variant_data"
                                    },
                                    supplier_data: {
                                        $first: "$supplier_data"
                                    },
                                    buyer_notes: { $first: '$buyer_notes' },
                                    createdAt: { $first: "$createdAt" },
                                    updatedAt: { $first: "$updatedAt" }
                                }
                            }
                        ],
                        as: "final_quote"
                    }
                },
                {
                    $addFields: {
                        final_quote: {
                            $map: {
                                input: "$final_quote",
                                as: "fq",
                                in: {
                                    $mergeObjects: [
                                        "$$fq",
                                        {
                                            quantity: {
                                                $let: {
                                                    vars: {
                                                        matched_query: {
                                                            $arrayElemAt: [
                                                                {
                                                                    $filter: {
                                                                        input:
                                                                            "$query_data.queryDetails",
                                                                        as: "qd",
                                                                        cond: {
                                                                            $and: [
                                                                                {
                                                                                    $eq: [
                                                                                        "$$qd.product.id",
                                                                                        "$$fq.product_id"
                                                                                    ]
                                                                                },
                                                                                {
                                                                                    $eq: [
                                                                                        "$$qd.variant._id",
                                                                                        "$$fq.variant_id"
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
                                                        $ifNull: [
                                                            "$$matched_query.quantity",
                                                            null
                                                        ]
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
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
        const { quotation_id, supplier_id } = req.body
        const userId = req.user._id;
        console.log("userid is ", userId);

        const userData = await admin.findOne({ _id: userId })
        console.log("admin : ", userData)

        const queryData = await quotation.findById({ _id: quotation_id })
        if (!queryData) {
            return utils.handleError(res, {
                message: "Quotation not found",
                code: 404,
            });
        }

        const assignData = {
            id: userId,
            type: userData.role
        }

        req.body.admin_quote.assignedBy = assignData

        const result = await query_assigned_suppliers.findOneAndUpdate(
            {
                quotation_id: new mongoose.Types.ObjectId(quotation_id),
                variant_assigned_to: new mongoose.Types.ObjectId(supplier_id),
                is_selected: true
            },
            {
                $set: {
                    admin_quote: req.body?.admin_quote,
                    supplier_quote: null
                }
            }, { new: true }
        )
        console.log("result : ", result)

        const currentTime = await moment(Date.now()).format('lll')
        const timeline_data = {
            date: currentTime,
            detail: 'Admin quotation quote added',
            product_id: result?.product_id,
            supplier_id: result?.variant_assigned_to,
            variant_id: result?.variant_id,
            price: result?.admin_quote.price,
            quantity: result?.quantity,
            media: result?.admin_quote.media,
            document: result?.admin_quote.document,
            assignedBy: result?.admin_quote.assignedBy
        }

        const version_history_data = await version_history.create({
            quotation_id,
            ...timeline_data
        })
        console.log("version history : ", version_history_data)

        queryData.buyer_notes = ""
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

exports.getFinalQuotationList = async (req, res) => {
    try {
        const { quotation_id } = req.query

        // const data = await query_assigned_suppliers.aggregate(
        //     [
        //         {
        //             $match: {
        //                 quotation_id: new mongoose.Types.ObjectId(quotation_id),
        //                 is_selected: true
        //             }
        //         },
        //         {
        //             $lookup: {
        //                 from: "products",
        //                 let: { id: "$product_id" },
        //                 pipeline: [
        //                     {
        //                         $match: {
        //                             $expr: { $eq: ["$$id", "$_id"] }
        //                         }
        //                     },
        //                     {
        //                         $project: {
        //                             _id: 1,
        //                             name: 1
        //                         }
        //                     }
        //                 ],
        //                 as: "product_data"
        //             }
        //         },
        //         {
        //             $lookup: {
        //                 from: "queries",
        //                 let: { id: "$query_id" },
        //                 pipeline: [
        //                     {
        //                         $match: {
        //                             $expr: { $eq: ["$$id", "$_id"] }
        //                         }
        //                     },
        //                     {
        //                         $project: {
        //                             _id: 1,
        //                             status: 1,
        //                             queryDetails: 1
        //                         }
        //                     }
        //                 ],
        //                 as: "query_data"
        //             }
        //         },
        //         {
        //             $unwind: {
        //                 path: "$query_data",
        //                 preserveNullAndEmptyArrays: true
        //             }
        //         },
        //         {
        //             $lookup: {
        //                 from: "products",
        //                 let: { id: "$variant_id" },
        //                 pipeline: [
        //                     {
        //                         $unwind: {
        //                             path: "$variant",
        //                             preserveNullAndEmptyArrays: true
        //                         }
        //                     },
        //                     {
        //                         $match: {
        //                             $expr: {
        //                                 $eq: ["$$id", "$variant._id"]
        //                             }
        //                         }
        //                     },
        //                     {
        //                         $project: {
        //                             variant: 1
        //                         }
        //                     }
        //                 ],
        //                 as: "variant_data"
        //             }
        //         },
        //         {
        //             $unwind: {
        //                 path: "$product_data",
        //                 preserveNullAndEmptyArrays: true
        //             }
        //         },
        //         {
        //             $unwind: {
        //                 path: "$variant_data",
        //                 preserveNullAndEmptyArrays: true
        //             }
        //         },
        //         {
        //             $addFields: {
        //                 buyer_quantity: {
        //                     $cond: {
        //                         if: {
        //                             $gt: [
        //                                 {
        //                                     $size: "$query_data.queryDetails"
        //                                 },
        //                                 0
        //                             ]
        //                         },
        //                         then: {
        //                             $map: {
        //                                 input: {
        //                                     $filter: {
        //                                         input:
        //                                             "$query_data.queryDetails",
        //                                         as: "sq",
        //                                         cond: {
        //                                             $and: [
        //                                                 {
        //                                                     $eq: [
        //                                                         "$$sq.product.id",
        //                                                         "$product_id"
        //                                                     ]
        //                                                 },
        //                                                 {
        //                                                     $eq: [
        //                                                         "$$sq.variant._id",
        //                                                         "$variant_id"
        //                                                     ]
        //                                                 }
        //                                             ]
        //                                         }
        //                                     }
        //                                 },
        //                                 as: "filtered_supplier",
        //                                 in: "$$filtered_supplier.quantity"
        //                             }
        //                         },
        //                         else: []
        //                     }
        //                 }
        //             }
        //         },
        //         {
        //             $unwind: {
        //                 path: "$buyer_quantity",
        //                 preserveNullAndEmptyArrays: true
        //             }
        //         },
        //         {
        //             $group: {
        //                 _id: {
        //                     variant_id: "$variant_id"
        //                 },
        //                 variant_assigned_to: {
        //                     $push: "$variant_assigned_to"
        //                 },
        //                 total_quantity: { $sum: "$quantity.value" },
        //                 total_quantity_unit: {
        //                     $first: "$quantity.unit"
        //                 },
        //                 is_selected: { $first: "$is_selected" },
        //                 logistics_price: {
        //                     $sum: "$logistics_price"
        //                 },
        //                 supplier_quote_price: {
        //                     $sum: "$supplier_quote.price"
        //                 },
        //                 supplier_quote_media: {
        //                     $push: "$supplier_quote.media"
        //                 },
        //                 supplier_quote_document: {
        //                     $push: "$supplier_quote.document"
        //                 },
        //                 admin_margin_value: {
        //                     $sum: "$admin_margin.value"
        //                 },
        //                 admin_margin_margin_type: {
        //                     $first: "$admin_margin.margin_type"
        //                 },
        //                 quotation_id: { $first: "$quotation_id" },
        //                 buyer_notes: { $push: "$buyer_notes" },
        //                 admin_notes: { $push: "$admin_notes" },
        //                 product_data: { $first: "$product_data" },
        //                 // query_data: { $first: "$query_data" },
        //                 variant_data: {
        //                     $first: "$variant_data.variant"
        //                 },
        //                 buyer_quantity: {
        //                     $first: "$buyer_quantity"
        //                 },
        //                 createdAt: { $first: "$createdAt" },
        //                 updatedAt: { $first: "$updatedAt" }
        //             }
        //         },
        //         {
        //             $addFields: {
        //                 supplier_quote_media: {
        //                     $reduce: {
        //                         input: "$supplier_quote_media",
        //                         initialValue: [],
        //                         in: {
        //                             $concatArrays: ["$$value", "$$this"]
        //                         }
        //                     }
        //                 },
        //                 supplier_quote_document: {
        //                     $reduce: {
        //                         input: "$supplier_quote_document",
        //                         initialValue: [],
        //                         in: {
        //                             $concatArrays: ["$$value", "$$this"]
        //                         }
        //                     }
        //                 }
        //             }
        //         },
        //         {
        //             $project: {
        //                 _id: 1,
        //                 product_id: 0
        //             }
        //         }
        //     ]
        // )
        const data = await quotation.aggregate(
            [
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(quotation_id)
                    }
                },
                {
                    $lookup: {
                        from: "queries",
                        let: { id: "$query_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$_id"]
                                    }
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
                        from: "query_assigned_suppliers",
                        let: { id: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$quotation_id"]
                                    },
                                    is_selected: true
                                }
                            },
                            {
                                $project: {
                                    supplier_quote: 1,
                                    admin_approved_quotes: 1,
                                    admin_margin: 1,
                                    product_id: 1,
                                    variant_id: 1,
                                    logistics_price: 1,
                                    is_admin_approved: 1
                                }
                            }
                        ],
                        as: "assigned_suppliers"
                    }
                },
                {
                    $addFields: {
                        queryDetails: {
                            $map: {
                                input: "$query_data.queryDetails",
                                as: "qd",
                                in: {
                                    $mergeObjects: [
                                        "$$qd",
                                        {
                                            supplier_quotes: {
                                                $map: {
                                                    input: {
                                                        $filter: {
                                                            input:
                                                                "$assigned_suppliers",
                                                            as: "sq",
                                                            cond: {
                                                                $and: [
                                                                    {
                                                                        $eq: [
                                                                            "$$sq.product_id",
                                                                            "$$qd.product.id"
                                                                        ]
                                                                    },
                                                                    {
                                                                        $eq: [
                                                                            "$$sq.variant_id",
                                                                            "$$qd.variant._id"
                                                                        ]
                                                                    }
                                                                ]
                                                            }
                                                        }
                                                    },
                                                    as: "filtered_supplier",
                                                    in: {
                                                        quote_details:
                                                            "$$filtered_supplier.supplier_quote",
                                                        matched_variant_id:
                                                            "$$filtered_supplier.variant_id"
                                                    }
                                                }
                                            },
                                            final_quote: {
                                                $let: {
                                                    vars: {
                                                        approved_supplier: {
                                                            $arrayElemAt: [
                                                                {
                                                                    $filter: {
                                                                        input:
                                                                            "$assigned_suppliers",
                                                                        as: "sq",
                                                                        cond: {
                                                                            $and: [
                                                                                {
                                                                                    $eq: [
                                                                                        "$$sq.product_id",
                                                                                        "$$qd.product.id"
                                                                                    ]
                                                                                },
                                                                                {
                                                                                    $eq: [
                                                                                        "$$sq.variant_id",
                                                                                        "$$qd.variant._id"
                                                                                    ]
                                                                                },
                                                                                {
                                                                                    $ne: [
                                                                                        "$$sq.admin_approved_quotes",
                                                                                        null
                                                                                    ]
                                                                                },
                                                                                {
                                                                                    $ne: [
                                                                                        "$$sq.admin_margin.value",
                                                                                        null
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
                                                        $cond: {
                                                            if: {
                                                                // $and: [
                                                                //     {
                                                                //         $ne: [
                                                                //             "$$approved_supplier",
                                                                //             null
                                                                //         ]
                                                                //     },
                                                                //     {
                                                                //         $not: [
                                                                //             "$$approved_supplier.is_admin_approved"
                                                                //         ]
                                                                //     }
                                                                // ]
                                                                $ne: [
                                                                    "$$approved_supplier",
                                                                    null
                                                                ]
                                                            },
                                                            then: {
                                                                final_price_by_admin:
                                                                    "$$approved_supplier.admin_approved_quotes",
                                                                logistics_price:
                                                                    "$$approved_supplier.logistics_price",
                                                                admin_margin:
                                                                    "$$approved_supplier.admin_margin",
                                                                matched_variant_id:
                                                                    "$$approved_supplier.variant_id"
                                                            },
                                                            else: null
                                                        }
                                                    }
                                                }
                                            },
                                            // updated_final_quote: {
                                            //     $let: {
                                            //         vars: {
                                            //             approved_supplier: {
                                            //                 $arrayElemAt: [
                                            //                     {
                                            //                         $filter: {
                                            //                             input:
                                            //                                 "$assigned_suppliers",
                                            //                             as: "sq",
                                            //                             cond: {
                                            //                                 $and: [
                                            //                                     {
                                            //                                         $eq: [
                                            //                                             "$$sq.product_id",
                                            //                                             "$$qd.product.id"
                                            //                                         ]
                                            //                                     },
                                            //                                     {
                                            //                                         $eq: [
                                            //                                             "$$sq.variant_id",
                                            //                                             "$$qd.variant._id"
                                            //                                         ]
                                            //                                     },
                                            //                                     {
                                            //                                         $ne: [
                                            //                                             "$$sq.admin_approved_quotes",
                                            //                                             null
                                            //                                         ]
                                            //                                     },
                                            //                                     {
                                            //                                         $ne: [
                                            //                                             "$$sq.admin_margin.value",
                                            //                                             null
                                            //                                         ]
                                            //                                     }
                                            //                                 ]
                                            //                             }
                                            //                         }
                                            //                     },
                                            //                     0
                                            //                 ]
                                            //             }
                                            //         },
                                            //         in: {
                                            //             $cond: {
                                            //                 if: {

                                            //                     $ne: [
                                            //                         "$$approved_supplier",
                                            //                         null
                                            //                     ]
                                            //                 },
                                            //                 then: {
                                            //                     final_price_by_admin:
                                            //                         "$$approved_supplier.admin_approved_quotes",
                                            //                     logistics_price:
                                            //                         "$$approved_supplier.logistics_price",
                                            //                     admin_margin:
                                            //                         "$$approved_supplier.admin_margin",
                                            //                     matched_variant_id:
                                            //                         "$$approved_supplier.variant_id"
                                            //                 },
                                            //                 else: null
                                            //             }
                                            //         }
                                            //     }
                                            // },
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        queryDetails: {
                            $map: {
                                input: "$queryDetails",
                                as: "qd",
                                in: {
                                    $mergeObjects: [
                                        "$$qd",
                                        {
                                            final_quote: {
                                                $cond: {
                                                    if: {
                                                        $eq: [
                                                            "$$qd.final_quote",
                                                            {}
                                                        ]
                                                    },
                                                    then: null,
                                                    else: "$$qd.final_quote"
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $project: {
                        //assigned_suppliers: 0,
                        query_data: 0
                    }
                }
            ]
        )

        return res.status(200).json({
            message: "final quotation quote list generated successfully",
            data: data[0],
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

        const is_supplier_assigned = await query_assigned_suppliers.find({ quotation_id, is_selected: true })
        console.log('is_supplier_assigned : ', is_supplier_assigned)

        if (is_supplier_assigned.length === 0) {
            const response = await final_quotation.map(async (i) => {
                const newquote = await query_assigned_suppliers.create({
                    query_id,
                    quotation_id,
                    is_selected: true,
                    final_quotation_submit: true,
                    product_id: i?.product_id,
                    variant_id: i?.variant_id,
                    logistics_price: i?.logistics_price,
                    admin_margin: {
                        value: i?.admin_margin?.value,
                        margin_type: i?.admin_margin?.margin_type
                    },
                    admin_approved_quotes: i?.admin_final_price,
                    quantity: i?.quantity
                })
                console.log('newquote : ', newquote)
            })
            console.log('response : ', response)
        }

        if (is_supplier_assigned.length !== 0) {
            let result = await final_quotation.map(async i => {
                const response = await query_assigned_suppliers.findOneAndUpdate(
                    {
                        quotation_id: new mongoose.Types.ObjectId(quotation_id),
                        variant_id: new mongoose.Types.ObjectId(i?.variant_id),
                        product_id: new mongoose.Types.ObjectId(i?.product_id),
                        is_selected: true
                    },
                    {
                        $set: {
                            admin_approved_quotes: i?.admin_final_price,
                            logistics_price: i?.logistics_price,
                            admin_margin: {
                                value: i?.admin_margin?.value,
                                margin_type: i?.admin_margin?.margin_type
                            },
                            buyer_notes: null,
                            final_quotation_submit: true
                        }
                    },
                    { new: true }
                )
                console.log("response : ", response)
                if (!response || response.admin_approved_quotes === null) {
                    const newquote = await query_assigned_suppliers.create({
                        query_id,
                        quotation_id,
                        is_selected: true,
                        final_quotation_submit: true,
                        product_id: i?.product_id,
                        variant_id: i?.variant_id,
                        logistics_price: i?.logistics_price,
                        admin_margin: {
                            value: i?.admin_margin?.value,
                            margin_type: i?.admin_margin?.margin_type
                        },
                        admin_approved_quotes: i?.admin_final_price ?? null,
                        quantity: i?.quantity ?? null
                    });
                    console.log('newquote : ', newquote);
                }

            }
            )
            console.log("result : ", result)
        }

        const version_history_data = await final_quotation.map(async i => {
            const currentTime = await moment(Date.now()).format('lll')
            const timeline_data = {
                date: currentTime,
                detail: 'Final Quotation submited',
                product_id: i?.product_id,
                supplier_id: i?.variant_assigned_to,
                variant_id: i?.variant_id,
                price: i?.admin_approved_quotes?.price,
                quantity: i?.quantity,
                media: i?.admin_approved_quotes?.media,
                document: i?.admin_approved_quotes?.document,
                assignedBy: i?.admin_quote.assignedBy ?? null
            }
            const save_data = await version_history.create({
                quotation_id,
                ...timeline_data
            })
            console.log("save_data : ", save_data)
        })
        console.log("version history : ", version_history_data)

        return res.status(200).json({
            message: "final quotation added successfully",
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

        const result = await quotation.findOneAndUpdate({ _id: quotation_id }, {
            $set: {
                is_admin_logistics_decided: 'decided', quotation_type: 'admin-logistics', decided_logistics_id: logistics_id, is_approved: 'processing'
            }
        }, { new: true })
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
                    quantity: i?.quantity,
                    media: i?.media,
                    document: i?.document,
                    assignedBy: i?.assignedBy
                }
                await version_history.create({
                    quotation_id,
                    ...timeline_data
                })
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
            quotation_data.rejected_reason = null
            quotation_data.is_approved = "approved"
        }

        if (status === "rejected") {
            quotation_data.is_admin_logistics_decided = 'undecided'
            quotation_data.decided_logistics_id = null
            quotation_data.is_approved = "cancelled"
            quotation_data.logistics_quote = null
            quotation_data.admin_notes = null
            quotation_data.accepted_logistics = null
            quotation_data.rejected_reason.reason = req.body.reason
            if (!quotation_data.rejected_reason) {
                quotation_data.rejected_reason = { reason: "", logistics_ids: [] };
            }
            if (!Array.isArray(quotation_data.rejected_reason.logistics_ids)) {
                quotation_data.rejected_reason.logistics_ids = [];
            }
            if (!quotation_data.rejected_reason.logistics_ids.includes(logistics_id)) {
                quotation_data.rejected_reason.logistics_ids.push(logistics_id)
            }
            // const response = await quotation.findOneAndUpdate(
            //     {
            //         _id: new mongoose.Types.ObjectId(quotation_id)
            //     },
            //     {
            //         $set: {
            //             is_admin_logistics_decided: 'undecided',
            //             decided_logistics_id: null,
            //             logistics_quote: null,
            //             admin_notes: null,
            //             accepted_logistics: null,
            //             "rejected_reason.reason": req.body.reason
            //         },
            //         $addToSet: {
            //             "rejected_reason.logistics_ids": logistics_id,
            //         },
            //     },
            //     { new: true, upsert: true }
            // )
            // console.log("response : ", response)

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


exports.addAdminQuotationNotes = async (req, res) => {
    try {
        const { quotation_id, supplier_id, variant_id, note } = req.body

        const result = await query_assigned_suppliers.findOneAndUpdate(
            {
                quotation_id: new mongoose.Types.ObjectId(quotation_id),
                variant_assigned_to: new mongoose.Types.ObjectId(supplier_id),
                variant_id: new mongoose.Types.ObjectId(variant_id),
                is_selected: true
            },
            {
                $set: {
                    admin_notes: note,
                    supplier_quote: null
                }
            }, { new: true }
        )
        console.log("result : ", result)

        const currentTime = await moment(Date.now()).format('lll')
        const timeline_data = {
            date: currentTime,
            detail: 'Admin quotation note added',
            product_id: result?.product_id,
            supplier_id: result?.supplier_id,
            variant_id: result?.variant_id,
            price: result?.price,
            media: result?.media,
            document: result?.document,
            assignedBy: result?.assignedBy
        }

        await version_history.create({
            quotation_id,
            ...timeline_data
        })

        return res.status(200).json({
            message: "Admin Quotation notes added successfully",
            data: result,
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
        const filter = {
            quotation_id: new mongoose.Types.ObjectId(quotation_id),
        }
        // if (search) {
        //     filter.quotation_id = { $regex: search, $options: 'i' }
        // }
        const mainpipeline = [
            {
                $match: filter
            },
            {
                $lookup: {
                    from: "quotations",
                    let: {
                        id: "$quotation_id"
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
                                quotation_unique_id: 1
                            }
                        }
                    ],
                    as: "quotation_data"
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
                    path: "$quotation_data",
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
                    quotation_id: 0
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
        ]

        const data = await version_history.aggregate(mainpipeline)
        const count = await version_history.countDocuments(filter)
        console.log(data)

        // let count = 0
        // await data.map((i) =>
        //     count++
        // )
        // console.log(count)

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


exports.getQuotationAssignedSupplier = async (req, res) => {
    try {
        const { quotation_id, variant_id } = req.query
        if (!quotation_id && !variant_id) {
            return utils.handleError(res, {
                message: "quotation and variant id is required",
                code: 400,
            });
        }
        const data = await query_assigned_suppliers.aggregate(
            [
                {
                    $match: {
                        quotation_id: new mongoose.Types.ObjectId(quotation_id),
                        variant_id: new mongoose.Types.ObjectId(variant_id),
                        is_selected: true
                    }
                },
                {
                    $lookup: {
                        from: "products",
                        let: { vid: "$variant_id" },
                        pipeline: [
                            {
                                $unwind: {
                                    path: "$variant"
                                }
                            },
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$variant._id", "$$vid"]
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
                    $lookup: {
                        from: "products",
                        let: { pid: "$product_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$pid"]
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
                        from: "users",
                        let: { pid: "$variant_assigned_to" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$_id", "$$pid"]
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
                    $unwind: {
                        path: "$supplier_data",
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]
        )

        return res.status(200).json({
            message: "assigned suppliers data fetched successfully",
            data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.acceptRejectSupplierQuote = async (req, res) => {
    try {
        const { quotation_id, supplier_id, quote_id, status } = req.body
        const queryData = await quotation.findById({ _id: quotation_id })
        if (!queryData) {
            return utils.handleError(res, {
                message: "Quotation not found",
                code: 404,
            });
        }

        const result = await query_assigned_suppliers.findOneAndUpdate(
            {
                quotation_id: new mongoose.Types.ObjectId(quotation_id),
                variant_assigned_to: new mongoose.Types.ObjectId(supplier_id),
                _id: new mongoose.Types.ObjectId(quote_id)
            },
            {
                $set: {
                    is_admin_approved: (status === true || status === "true") ? true : false
                }
            },
            { new: true }
        )
        console.log("result : ", result)

        return res.status(200).json({
            message: "Supplier quote status updated successfully",
            data: result,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}