const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Query = require("../../models/query");
const Enquiry = require("../../models/Enquiry");
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
const { Country, State, City } = require('country-state-city');
const EnquiryQuotes = require("../../models/EnquiryQuotes");
const AdminQuotes = require("../../models/admin_quotes");
const logistics_quotes = require("../../models/logistics_quotes");
const Subscription = require("../../models/subscription");
const Notification = require("../../models/notification");
const fcm_devices = require("../../models/fcm_devices");
const emailer = require("../../utils/emailer");
const { createLog, logSuccess, logFailure } = require("../../utils/logger");


async function genQuoteId() {
    let token = Math.floor(Math.random() * 100000000)
    return `quote-${token}`
}

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
            user_type: { $in: ['logistics'] },
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

exports.addenquiryquotes = async (req, res) => {
    try {
        const data = req.body;
        console.log("data : ", data)
        const userId = req.user._id;
        const enquiryData = await EnquiryQuotes.findOne({ enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), user_id: new mongoose.Types.ObjectId(userId) }).populate('enquiry_id');
        console.log("enquiryData : ", enquiryData);
        let enquiry = {}
        // if (enquiryData) {
        //     enquiry = await EnquiryQuotes.findOneAndUpdate(
        //         { enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), user_id: new mongoose.Types.ObjectId(userId) },
        //         { $set: data },
        //         {
        //             new: true
        //         }
        //     )
        //     console.log("enquiry : ", enquiry);
        // } else {
        let quote_unique_id = await genQuoteId()
        let type = "admin"
        enquiry = await EnquiryQuotes.create({
            ...data,
            quote_unique_id,
            user_id: userId,
            type,
        });
        console.log("enquiry : ", enquiry);
        // }

        //send notification
        // const notificationMessage = {
        //     title: 'New Quote submit by supplier',
        //     description: `${req.user.full_name} has created a new quote . Enquiry ID : ${buyerenquiry?.enquiry_unique_id}`,
        //     quote: enquiry._id
        // };

        // const buyerfcm = await fcm_devices.find({ user_id: buyerenquiry.user_id });
        // console.log("buyerfcm : ", buyerfcm)

        // if (buyerfcm && buyerfcm.length > 0) {
        //     buyerfcm.forEach(async i => {
        //         const token = i.token
        //         console.log("token : ", token)
        //         await utils.sendNotification(token, notificationMessage);
        //     })
        //     const NotificationData = {
        //         title: notificationMessage.title,
        //         // body: notificationMessage.description,
        //         description: notificationMessage.description,
        //         type: "supplier_quote_added",
        //         receiver_id: buyerenquiry.user_id,
        //         related_to: buyerenquiry.user_id,
        //         related_to_type: "user",
        //     };
        //     const newNotification = new Notification(NotificationData);
        //     console.log("newNotification : ", newNotification)
        //     await newNotification.save();
        // }

        return res.status(200).json({
            message: "Quotation saved Successfully",
            data: enquiry,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.addAddress = async (req, res) => {
    try {
        const data = req.body
        console.log("address data is ", data)

        const userId = req.user._id;
        console.log("userid is ", userId);

        const allAddress = await Address.find({ user_id: userId });
        console.log("address list is ", allAddress)

        if (!allAddress || allAddress.length === 0) {
            data.default_address = true
        }

        data.user_id = userId;
        console.log("data : ", data)

        const newaddressdata = await Address.create(data);
        console.log("created address data is ", newaddressdata);

        res.status(200).json({
            success: true,
            message: "Address added successfully",
            data: newaddressdata,
            code: 200
        })
    } catch (err) {
        utils.handleError(res, err);
    }
}

exports.getAddressList = async (req, res) => {
    try {
        const userId = req.user._id;
        const addressList = await Address.find({ user_id: userId }).populate("user_id", "full_name");

        console.log(addressList)

        return res.status(200).json({
            success: true,
            message: "Address List Fetched Successfully",
            data: addressList,
            code: 200
        })
    } catch (err) {
        utils.handleError(res, err);
    }
}

//edit address 
exports.editAddress = async (req, res) => {
    try {
        const id = req.params.id
        console.log("address id is ", id)

        const data = req.body;
        console.log("data to edited is ", data)

        const addressdata = await Address.findById(id);
        console.log("addressdata is ", addressdata)

        if (Object.keys(addressdata).length === 0) {
            return utils.handleError(res, {
                message: "Address Not Found",
                code: 400,
            });
        }

        const result = await Address.findByIdAndUpdate(id, data, { new: true });

        res.status(200).json({
            status: true,
            message: "Address edited Successfully",
            data: result,
            code: 200
        })
    } catch (err) {
        utils.handleError(res, err);
    }
}

exports.getAddressbyid = async (req, res) => {
    try {
        const id = req.params.id
        console.log("address id is ", id)

        const data = req.body;
        console.log("data to edited is ", data)

        const addressdata = await Address.findById(id);


        res.status(200).json({
            status: true,
            message: "Address Fetch Successfully",
            data: addressdata,
            code: 200
        })
    } catch (err) {
        utils.handleError(res, err);
    }
}


exports.getEnquiryItem = async (req, res) => {
    try {
        const { enquiryId, itemId } = req.query;

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(enquiryId) || !mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        // Fetch only the matched enquiry item
        const data = await Enquiry.findOne(
            { _id: enquiryId, "enquiry_items._id": itemId },
            { enquiry_items: { $elemMatch: { _id: itemId } } }
        )
            .populate("enquiry_items.quantity.unit");

        if (!data || data.enquiry_items.length === 0) {
            return res.status(404).json({ message: "Enquiry item not found" });
        }

        return res.status(200).json({
            success: true,
            item: data,
        });
    } catch (error) {
        console.error("Error fetching enquiry item:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

exports.getCountry = async (req, res) => {
    try {
        const data = await Country.getAllCountries()
        console.log("data : ", data)

        return res.status(200).json(
            {
                message: "Countries data fetched successfully",
                data,
                code: 200
            }
        )
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getStates = async (req, res) => {
    try {
        const { country } = req.params;
        const data = State.getStatesOfCountry(country);
        console.log("data : ", data)
        return res.status(200).json(
            {
                message: "Countries data fetched successfully",
                data,
                code: 200
            }
        )
    } catch (error) {
        utils.handleError(res, error);
    }
}




exports.addAdminquotes = async (req, res) => {
    try {
        const data = req.body;
        console.log("data : ", data)
        const userId = req.user._id;

        const buyerenquiry = await Enquiry.findOne({ _id: data.enquiry_id })
        console.log("buyerenquiry : ", buyerenquiry)

        const enquiryData = await AdminQuotes.findOne({ enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), user_id: new mongoose.Types.ObjectId(userId) }).populate('enquiry_id');
        console.log("enquiryData : ", enquiryData);
        let enquiry = {}
        if (enquiryData) {
            const itemToCheck = data.enquiry_items[0]?.item_id
            const check = enquiryData?.enquiry_items?.find(
                (item) => item?.item_id == itemToCheck
            );
            console.log("check:", check);
            if (check) {
                enquiry = await AdminQuotes.findOneAndUpdate(
                    { enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), user_id: new mongoose.Types.ObjectId(userId) },
                    {
                        $set: {
                            "enquiry_items.$[elem]": data.enquiry_items[0]
                        }
                    },
                    {
                        new: true,
                        arrayFilters: [{ "elem.item_id": itemToCheck }]
                    }
                )
            } else {
                enquiry = await AdminQuotes.findOneAndUpdate(
                    { enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), user_id: new mongoose.Types.ObjectId(userId) },
                    { $push: { enquiry_items: data?.enquiry_items } },
                    {
                        new: true
                    }
                )
            }
            console.log("enquiry : ", enquiry);
        } else {
            let quote_unique_id = await genQuoteId()
            enquiry = await AdminQuotes.create({
                ...data,
                quote_unique_id,
                user_id: userId,
            });
            console.log("enquiry : ", enquiry);
        }

        // //send notification
        // const notificationMessage = {
        //     title: 'New Quote submit by supplier',
        //     description: `${req.user.full_name} has created a new quote . Enquiry ID : ${buyerenquiry?.enquiry_unique_id}`,
        //     quote: enquiry._id
        // };

        // const buyerfcm = await fcm_devices.find({ user_id: buyerenquiry.user_id });
        // console.log("buyerfcm : ", buyerfcm)

        // if (buyerfcm && buyerfcm.length > 0) {
        //     buyerfcm.forEach(async i => {
        //         const token = i.token
        //         console.log("token : ", token)
        //         await utils.sendNotification(token, notificationMessage);
        //     })
        //     const NotificationData = {
        //         title: notificationMessage.title,
        //         // body: notificationMessage.description,
        //         description: notificationMessage.description,
        //         type: "supplier_quote_added",
        //         receiver_id: buyerenquiry.user_id,
        //         related_to: buyerenquiry.user_id,
        //         related_to_type: "user",
        //     };
        //     const newNotification = new Notification(NotificationData);
        //     console.log("newNotification : ", newNotification)
        //     await newNotification.save();
        // }

        return res.status(200).json({
            message: "Admin Quotation Submit Successfully",
            data: enquiry,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}



exports.getSingleAdminQuotes = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params
        console.log("id : ", id)

        let data = await AdminQuotes.findOne({ enquiry_id: new mongoose.Types.ObjectId(id), user_id: new mongoose.Types.ObjectId(userId) }).populate('enquiry_items.quantity.unit')
        console.log("data : ", data)

        return res.status(200).json({
            message: "Admin quotes fetched successfully",
            data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

// ==================== Admin Quote Management Functions ====================

// Get all quotes list for admin panel
exports.getQuotesList = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10, type } = req.query;
        const filter = {};

        if (search && typeof search === 'string' && search.trim()) {
            filter.$or = [
                { quote_unique_id: { $regex: search.trim(), $options: "i" } },
                { "enquiry_id.enquiry_unique_id": { $regex: search.trim(), $options: "i" } },
                { "user_id.full_name": { $regex: search.trim(), $options: "i" } },
                { "user_id.company_data.name": { $regex: search.trim(), $options: "i" } },
            ];
        }

        if (type) {
            filter.type = type; // 'supplier' or 'logistics' or 'admin'
        }

        // Aggregate pipeline to get quotes with populated data
        const data = await EnquiryQuotes.aggregate([
            {
                $lookup: {
                    from: "enquires",
                    localField: "enquiry_id",
                    foreignField: "_id",
                    as: "enquiry_id"
                }
            },
            {
                $unwind: {
                    path: "$enquiry_id",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user_id"
                }
            },
            {
                $unwind: {
                    path: "$user_id",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "admins",
                    localField: "created_by_admin",
                    foreignField: "_id",
                    as: "created_by_admin"
                }
            },
            {
                $unwind: {
                    path: "$created_by_admin",
                    preserveNullAndEmptyArrays: true
                }
            },
            { 
                $match: Object.keys(filter).length > 0 ? filter : {} 
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
        ]);

        // Get counts for stats - wrap in try-catch to prevent crashes
        let count = 0;
        let totalCount = 0;
        let pendingCount = 0;
        let acceptedCount = 0;
        let rejectedCount = 0;
        
        // Separate counts for supplier and logistics
        let pendingSupplierCount = 0;
        let pendingLogisticsCount = 0;
        let acceptedSupplierCount = 0;
        let acceptedLogisticsCount = 0;
        let rejectedSupplierCount = 0;
        let rejectedLogisticsCount = 0;
        let totalSupplierCount = 0;
        let totalLogisticsCount = 0;

        try {
            const countFilter = Object.keys(filter).length > 0 ? filter : {};
            count = await EnquiryQuotes.countDocuments(countFilter);
            
            // Total counts (all quotes from both collections)
            const supplierTotal = await EnquiryQuotes.countDocuments({});
            const logisticsTotal = await logistics_quotes.countDocuments({});
            totalCount = supplierTotal + logisticsTotal;
            totalSupplierCount = supplierTotal;
            totalLogisticsCount = logisticsTotal;
            
            // Pending counts
            const supplierPending = await EnquiryQuotes.countDocuments({ is_selected: false, status: "pending" });
            const logisticsPending = await logistics_quotes.countDocuments({ is_selected: false, status: "pending" });
            pendingCount = supplierPending + logisticsPending;
            pendingSupplierCount = supplierPending;
            pendingLogisticsCount = logisticsPending;
            
            // Accepted counts
            const supplierAccepted = await EnquiryQuotes.countDocuments({ is_selected: true });
            const logisticsAccepted = await logistics_quotes.countDocuments({ is_selected: true });
            acceptedCount = supplierAccepted + logisticsAccepted;
            acceptedSupplierCount = supplierAccepted;
            acceptedLogisticsCount = logisticsAccepted;
            
            // Rejected counts
            const supplierRejected = await EnquiryQuotes.countDocuments({ status: "rejected" });
            const logisticsRejected = await logistics_quotes.countDocuments({ status: "rejected" });
            rejectedCount = supplierRejected + logisticsRejected;
            rejectedSupplierCount = supplierRejected;
            rejectedLogisticsCount = logisticsRejected;
        } catch (countError) {
            console.error('Error getting quote counts:', countError);
            // Continue with 0 counts if count queries fail
        }

        return res.status(200).json({
            message: "Quotes list fetched successfully",
            data: data || [],
            count: count || 0,
            totalCount: totalCount || 0,
            pendingCount: pendingCount || 0,
            acceptedCount: acceptedCount || 0,
            rejectedCount: rejectedCount || 0,
            // Separate counts by type
            pendingSupplierCount: pendingSupplierCount || 0,
            pendingLogisticsCount: pendingLogisticsCount || 0,
            acceptedSupplierCount: acceptedSupplierCount || 0,
            acceptedLogisticsCount: acceptedLogisticsCount || 0,
            rejectedSupplierCount: rejectedSupplierCount || 0,
            rejectedLogisticsCount: rejectedLogisticsCount || 0,
            totalSupplierCount: totalSupplierCount || 0,
            totalLogisticsCount: totalLogisticsCount || 0,
            code: 200
        });
    } catch (error) {
        console.error('Error in getQuotesList:', error);
        utils.handleError(res, error);
    }
}

// Get quote details by ID - matches frontend pattern
exports.getQuoteDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, {
                message: "Invalid quote ID",
                code: 400,
            });
        }

        // First try to find in EnquiryQuotes (supplier quotes)
        let data = await EnquiryQuotes.findOne({ _id: new mongoose.Types.ObjectId(id) })
            .populate({ path: 'collection_readiness', populate: 'collection_address' })
            .populate('user_id', 'full_name email user_type current_user_type company_data')
            .populate('payment_terms')
            .populate('admin_payment_terms')
            .populate('enquiry_items.quantity.unit')
            .populate("pickup_address")
            .populate({ 
                path: 'enquiry_id', 
                select: 'priority shipping_address enquiry_unique_id enquiry_number expiry_date delivery_selection_data', 
                populate: [
                    { path: 'shipping_address' }, 
                    { path: 'selected_logistics.quote_id' }
                ] 
            })
            .populate({
                path: 'created_by_admin',
                select: 'full_name',
                strictPopulate: false
            })
            .lean();

        // If not found in EnquiryQuotes, try logistics_quotes
        if (!data) {
            data = await logistics_quotes.findOne({ _id: id })
                .populate({
                    path: 'enquiry_id',
                    populate: [
                        {
                            path: "selected_supplier.quote_id",
                            populate: [
                                { path: "pickup_address", strictPopulate: false },
                                { path: "collection_readiness.collection_address" },
                                { path: "enquiry_items.quantity.unit" }
                            ]
                        },
                        {
                            path: "shipping_address"
                        }
                    ],
                    select: '-enquiry_items'
                })
                .populate({ path: 'user_id', select: "company_data full_name email" })
                .populate({
                    path: 'created_by_admin',
                    select: 'full_name',
                    strictPopulate: false
                })
                .lean();

            if (data) {
                // For logistics quotes, also fetch payment data like frontend does
                const Payment = require("../../models/payment");
                const paymentdata = await Payment.findOne({ 
                    enquiry_id: data?.enquiry_id?._id, 
                    buyer_id: data?.enquiry_id?.user_id 
                }).lean();
                
                const supplierpay = await Payment.findOne({ 
                    enquiry_id: data?.enquiry_id?._id, 
                    supplier_id: data?.enquiry_id?.selected_supplier?.quote_id?.user_id 
                }).lean();

                if (paymentdata && supplierpay && paymentdata.logistic_payment && paymentdata.logistic_payment.length === 0 && supplierpay?.logistic_payment?.length !== 0) {
                    paymentdata.logistic_payment = supplierpay?.logistic_payment || [];
                }

                return res.status(200).json({
                    message: "Logistics quote details fetched successfully",
                    data,
                    payment: paymentdata || null,
                    code: 200
                });
            }
        }

        if (!data) {
            return res.status(404).json({
                message: "Quote not found",
                code: 404
            });
        }

        // Transform user_id to include company_name from company_data
        if (data.user_id && data.user_id.company_data) {
            data.user_id = {
                ...data.user_id,
                company_name: data.user_id.company_data?.name || data.user_id.company_data?.company_name
            };
        }

        return res.status(200).json({
            message: "Quote details fetched successfully",
            data,
            code: 200
        });

    } catch (error) {
        console.error('Error in getQuoteDetails:', error);
        utils.handleError(res, error);
    }
}

// Create supplier quote on behalf of supplier (admin)
exports.createSupplierQuote = async (req, res) => {
    try {
        const data = req.body;
        const adminId = req.user._id;
        const { supplier_id } = data;

        if (!supplier_id) {
            return utils.handleError(res, {
                message: "Supplier ID is required",
                code: 400,
            });
        }

        // Verify supplier exists and has active subscription
        const supplier = await User.findOne({ 
            _id: supplier_id, 
            user_type: { $in: ["supplier"] } 
        });

        if (!supplier) {
            return utils.handleError(res, {
                message: "Supplier not found",
                code: 404,
            });
        }

        const activeSubscription = await Subscription.findOne({ 
            user_id: supplier_id, 
            status: "active", 
            type: "supplier" 
        });

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "Supplier does not have an active subscription",
                code: 400,
            });
        }

        // Check if enquiry exists
        const buyerenquiry = await Enquiry.findOne({ _id: data.enquiry_id });
        if (!buyerenquiry) {
            return utils.handleError(res, {
                message: "Enquiry not found",
                code: 404,
            });
        }

        // Check if quote already exists for this supplier and enquiry
        const existingQuote = await EnquiryQuotes.findOne({ 
            enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), 
            user_id: new mongoose.Types.ObjectId(supplier_id) 
        });

        let quote;
        if (existingQuote) {
            // Update existing quote
            quote = await EnquiryQuotes.findOneAndUpdate(
                { 
                    enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), 
                    user_id: new mongoose.Types.ObjectId(supplier_id) 
                },
                { 
                    $set: {
                        ...data,
                        type: "admin",
                        is_admin_updated: true,
                        created_by_admin: adminId
                    }
                },
                { new: true }
            );
        } else {
            // Create new quote
            let quote_unique_id = await genQuoteId();
            quote = await EnquiryQuotes.create({
                ...data,
                quote_unique_id,
                user_id: supplier_id,
                type: "admin",
                is_admin_updated: true,
                created_by_admin: adminId
            });
        }

        // Send notification to buyer - wrapped in try-catch to prevent crashes
        try {
            const notificationMessage = {
                title: 'New Quote submitted by Admin on behalf of Supplier',
                description: `Admin has created a new quote on behalf of ${supplier.full_name}. Enquiry ID: ${buyerenquiry?.enquiry_unique_id}`,
                quote: quote._id
            };

            const buyerfcm = await fcm_devices.find({ user_id: buyerenquiry.user_id });
            if (buyerfcm && buyerfcm.length > 0) {
                // Use Promise.all to properly handle async forEach
                await Promise.all(
                    buyerfcm.map(async (i) => {
                        try {
                            const token = i.token;
                            if (token) {
                                await utils.sendNotification(token, notificationMessage);
                            }
                        } catch (notifError) {
                            console.error('Error sending FCM notification to buyer:', notifError);
                            // Continue with other notifications even if one fails
                        }
                    })
                );

                // Save notification to database
                try {
                    const NotificationData = {
                        title: notificationMessage.title,
                        description: notificationMessage.description,
                        type: "supplier_quote_added",
                        receiver_id: buyerenquiry.user_id,
                        related_to: quote._id,
                        related_to_type: "quote",
                    };
                    const newNotification = new Notification(NotificationData);
                    await newNotification.save();
                } catch (dbError) {
                    console.error('Error saving buyer notification to database:', dbError);
                    // Continue even if database save fails
                }
            }
        } catch (notifError) {
            console.error('Error in buyer notification flow:', notifError);
            // Continue with the rest of the function even if notifications fail
        }

        // Send notification to supplier - wrapped in try-catch to prevent crashes
        try {
            const supplierNotificationMessage = {
                title: 'Quote Created on Your Behalf',
                description: `Admin has created a quote on your behalf for Enquiry ID: ${buyerenquiry?.enquiry_unique_id}`,
                quote: quote._id
            };

            const supplierfcm = await fcm_devices.find({ user_id: supplier_id });
            if (supplierfcm && supplierfcm.length > 0) {
                // Use Promise.all to properly handle async forEach
                await Promise.all(
                    supplierfcm.map(async (i) => {
                        try {
                            const token = i.token;
                            if (token) {
                                await utils.sendNotification(token, supplierNotificationMessage);
                            }
                        } catch (notifError) {
                            console.error('Error sending FCM notification to supplier:', notifError);
                            // Continue with other notifications even if one fails
                        }
                    })
                );

                // Save notification to database
                try {
                    const SupplierNotificationData = {
                        title: supplierNotificationMessage.title,
                        description: supplierNotificationMessage.description,
                        type: "admin_quote_created",
                        receiver_id: supplier_id,
                        related_to: quote._id,
                        related_to_type: "quote",
                    };
                    const supplierNotification = new Notification(SupplierNotificationData);
                    await supplierNotification.save();
                } catch (dbError) {
                    console.error('Error saving supplier notification to database:', dbError);
                    // Continue even if database save fails
                }
            }
        } catch (notifError) {
            console.error('Error in supplier notification flow:', notifError);
            // Continue with the rest of the function even if notifications fail
        }

        // Send email notifications to buyer
        try {
            const buyer = await User.findById(buyerenquiry.user_id);
            if (buyer && buyer.email) {
                const mailOptions = {
                    to: buyer.email,
                    subject: `New Quote Submitted - Enquiry ${buyerenquiry.enquiry_unique_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    email: buyer.email,
                    name: buyer.full_name || 'Buyer',
                    enquiry_id: buyerenquiry.enquiry_unique_id,
                    enquiry_number: buyerenquiry.enquiry_number,
                    supplier_name: supplier.full_name,
                    quote_id: quote.quote_unique_id,
                    quote_link: `${process.env.FRONTEND_PROD_URL}/enquiry/${buyerenquiry._id}`,
                };
                await emailer.sendEmail(null, mailOptions, "quoteCreated");
            }
        } catch (emailError) {
            console.error('Error sending email to buyer:', emailError);
        }

        // Send email notifications to supplier
        try {
            if (supplier && supplier.email) {
                const mailOptions = {
                    to: supplier.email,
                    subject: `Quote Created on Your Behalf - Enquiry ${buyerenquiry.enquiry_unique_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    email: supplier.email,
                    name: supplier.full_name || 'Supplier',
                    enquiry_id: buyerenquiry.enquiry_unique_id,
                    enquiry_number: buyerenquiry.enquiry_number,
                    quote_id: quote.quote_unique_id,
                    quote_link: `${process.env.FRONTEND_PROD_URL}/quote/${quote._id}`,
                };
                await emailer.sendEmail(null, mailOptions, "quoteCreatedForSupplier");
            }
        } catch (emailError) {
            console.error('Error sending email to supplier:', emailError);
        }

        // Create log entry for admin action
        try {
            const adminUser = await admin.findById(adminId);
            if (adminUser) {
                await logSuccess(
                    adminUser,
                    'quote_management',
                    'create',
                    {
                        related_id: quote._id,
                        related_collection: 'enquiry_quotes',
                        metadata: {
                            quote_type: 'supplier',
                            quote_unique_id: quote.quote_unique_id,
                            enquiry_id: buyerenquiry.enquiry_unique_id,
                            enquiry_number: buyerenquiry.enquiry_number,
                            supplier_id: supplier._id.toString(),
                            supplier_name: supplier.full_name,
                            buyer_id: buyerenquiry.user_id.toString(),
                            grand_total: quote.grand_total,
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating log:', logError);
        }

        return res.status(200).json({
            message: "Supplier quote created successfully",
            data: quote,
            quote_id: quote._id,
            code: 200
        });

    } catch (error) {
        // Log failure
        try {
            const adminUser = await admin.findById(req.user._id);
            if (adminUser) {
                await logFailure(
                    adminUser,
                    'quote_management',
                    'create',
                    error,
                    {
                        related_collection: 'enquiry_quotes',
                        metadata: {
                            quote_type: 'supplier',
                            enquiry_id: req.body.enquiry_id,
                            supplier_id: req.body.supplier_id,
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating failure log:', logError);
        }
        utils.handleError(res, error);
    }
}

// Create logistics quote on behalf of logistics (admin)
exports.createLogisticsQuote = async (req, res) => {
    try {
        const data = req.body;
        const adminId = req.user._id;
        const { logistics_id } = data;

        if (!logistics_id) {
            return utils.handleError(res, {
                message: "Logistics ID is required",
                code: 400,
            });
        }

        // Verify logistics exists and has active subscription
        const logistics = await User.findOne({ 
            _id: logistics_id, 
            user_type: { $in: ["logistics"] } 
        });

        if (!logistics) {
            return utils.handleError(res, {
                message: "Logistics provider not found",
                code: 404,
            });
        }

        const activeSubscription = await Subscription.findOne({ 
            user_id: logistics_id, 
            status: "active", 
            type: "logistics" 
        });

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "Logistics provider does not have an active subscription",
                code: 400,
            });
        }

        // Check if enquiry exists
        const buyerenquiry = await Enquiry.findOne({ _id: data.enquiry_id });
        if (!buyerenquiry) {
            return utils.handleError(res, {
                message: "Enquiry not found",
                code: 404,
            });
        }

        // Check if quote already exists
        const existingQuote = await logistics_quotes.findOne({ 
            enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), 
            user_id: new mongoose.Types.ObjectId(logistics_id) 
        });

        let quote;
        if (existingQuote) {
            // Update existing quote
            quote = await logistics_quotes.findOneAndUpdate(
                { 
                    enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), 
                    user_id: new mongoose.Types.ObjectId(logistics_id) 
                },
                { 
                    $set: {
                        ...data,
                        created_by_admin: adminId
                    }
                },
                { new: true }
            );
        } else {
            // Create new quote
            let quote_unique_id = await genQuoteId();
            quote = await logistics_quotes.create({
                ...data,
                quote_unique_id,
                user_id: logistics_id,
                created_by_admin: adminId
            });
        }

        // Send notifications to buyer - wrapped in try-catch to prevent crashes
        try {
            const buyerfcm = await fcm_devices.find({ user_id: buyerenquiry.user_id });
            if (buyerfcm && buyerfcm.length > 0) {
                const notificationMessage = {
                    title: 'New Logistics Quote Submitted',
                    description: `Admin has created a logistics quote on behalf of ${logistics.full_name}. Enquiry ID: ${buyerenquiry?.enquiry_unique_id}`,
                    quote: quote._id
                };
                
                // Use Promise.all to properly handle async operations
                await Promise.all(
                    buyerfcm.map(async (i) => {
                        try {
                            const token = i.token;
                            if (token) {
                                await utils.sendNotification(token, notificationMessage);
                            }
                        } catch (notifError) {
                            console.error('Error sending FCM notification to buyer:', notifError);
                            // Continue with other notifications even if one fails
                        }
                    })
                );

                // Save notification to database
                try {
                    const NotificationData = {
                        title: notificationMessage.title,
                        description: notificationMessage.description,
                        type: "logistics_quote_added",
                        receiver_id: buyerenquiry.user_id,
                        related_to: quote._id,
                        related_to_type: "quote",
                    };
                    const newNotification = new Notification(NotificationData);
                    await newNotification.save();
                } catch (dbError) {
                    console.error('Error saving logistics notification to database:', dbError);
                    // Continue even if database save fails
                }
            }
        } catch (notifError) {
            console.error('Error in logistics notification flow:', notifError);
            // Continue with the rest of the function even if notifications fail
        }

        // Send email notifications to buyer
        try {
            const buyer = await User.findById(buyerenquiry.user_id);
            if (buyer && buyer.email) {
                const mailOptions = {
                    to: buyer.email,
                    subject: `New Logistics Quote - Enquiry ${buyerenquiry.enquiry_unique_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    email: buyer.email,
                    name: buyer.full_name || 'Buyer',
                    enquiry_id: buyerenquiry.enquiry_unique_id,
                    enquiry_number: buyerenquiry.enquiry_number,
                    logistics_name: logistics.full_name,
                    quote_id: quote.quote_unique_id,
                    shipping_fee: quote.shipping_fee,
                    quote_link: `${process.env.FRONTEND_PROD_URL}/enquiry/${buyerenquiry._id}`,
                };
                await emailer.sendEmail(null, mailOptions, "logisticsQuoteCreated");
            }
        } catch (emailError) {
            console.error('Error sending email to buyer:', emailError);
        }

        // Send email notifications to logistics
        try {
            if (logistics && logistics.email) {
                const mailOptions = {
                    to: logistics.email,
                    subject: `Logistics Quote Created on Your Behalf - Enquiry ${buyerenquiry.enquiry_unique_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    email: logistics.email,
                    name: logistics.full_name || 'Logistics Provider',
                    enquiry_id: buyerenquiry.enquiry_unique_id,
                    enquiry_number: buyerenquiry.enquiry_number,
                    quote_id: quote.quote_unique_id,
                    shipping_fee: quote.shipping_fee,
                    quote_link: `${process.env.FRONTEND_PROD_URL}/logistics-quote/${quote._id}`,
                };
                await emailer.sendEmail(null, mailOptions, "logisticsQuoteCreatedForProvider");
            }
        } catch (emailError) {
            console.error('Error sending email to logistics:', emailError);
        }

        // Create log entry for admin action
        try {
            const adminUser = await admin.findById(adminId);
            if (adminUser) {
                await logSuccess(
                    adminUser,
                    'quote_management',
                    'create',
                    {
                        related_id: quote._id,
                        related_collection: 'logistics_quotes',
                        metadata: {
                            quote_type: 'logistics',
                            quote_unique_id: quote.quote_unique_id,
                            enquiry_id: buyerenquiry.enquiry_unique_id,
                            enquiry_number: buyerenquiry.enquiry_number,
                            logistics_id: logistics._id.toString(),
                            logistics_name: logistics.full_name,
                            buyer_id: buyerenquiry.user_id.toString(),
                            shipping_fee: quote.shipping_fee,
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating log:', logError);
        }

        return res.status(200).json({
            message: "Logistics quote created successfully",
            data: quote,
            quote_id: quote._id,
            code: 200
        });

    } catch (error) {
        // Log failure
        try {
            const adminUser = await admin.findById(req.user._id);
            if (adminUser) {
                await logFailure(
                    adminUser,
                    'quote_management',
                    'create',
                    error,
                    {
                        related_collection: 'logistics_quotes',
                        metadata: {
                            quote_type: 'logistics',
                            enquiry_id: req.body.enquiry_id,
                            logistics_id: req.body.logistics_id,
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating failure log:', logError);
        }
        utils.handleError(res, error);
    }
}

// Delete quotes (bulk or single)
exports.deleteQuote = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return utils.handleError(res, {
                message: "Please provide a valid array of quote IDs to delete",
                code: 400,
            });
        }

        // Delete from EnquiryQuotes
        const resultEnquiryQuotes = await EnquiryQuotes.deleteMany({ 
            _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) } 
        });

        // Delete from logistics_quotes
        const resultLogisticsQuotes = await logistics_quotes.deleteMany({ 
            _id: { $in: ids.map(id => new mongoose.Types.ObjectId(id)) } 
        });

        const totalDeleted = resultEnquiryQuotes.deletedCount + resultLogisticsQuotes.deletedCount;

        // Create log entry for deletion
        try {
            const adminUser = await admin.findById(req.user._id);
            if (adminUser) {
                await logSuccess(
                    adminUser,
                    'quote_management',
                    'bulk_delete',
                    {
                        related_collection: 'enquiry_quotes,logistics_quotes',
                        metadata: {
                            deleted_count: totalDeleted,
                            enquiry_quotes_deleted: resultEnquiryQuotes.deletedCount,
                            logistics_quotes_deleted: resultLogisticsQuotes.deletedCount,
                            quote_ids: ids,
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating log:', logError);
        }

        return res.status(200).json({
            message: `${totalDeleted} quote(s) deleted successfully`,
            deletedCount: totalDeleted,
            code: 200
        });

    } catch (error) {
        // Log failure
        try {
            const adminUser = await admin.findById(req.user._id);
            if (adminUser) {
                await logFailure(
                    adminUser,
                    'quote_management',
                    'bulk_delete',
                    error,
                    {
                        related_collection: 'enquiry_quotes,logistics_quotes',
                        metadata: {
                            quote_ids: req.body.ids,
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating failure log:', logError);
        }
        utils.handleError(res, error);
    }
}

// Get enquiries for a specific supplier
exports.getEnquiriesForSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { search, offset = 0, limit = 100 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, {
                message: "Invalid supplier ID",
                code: 400,
            });
        }

        const filter = {
            status: { $in: ["pending", "delivery"] },
        };

        if (search) {
            filter.$or = [
                { enquiry_unique_id: { $regex: search, $options: "i" } },
                { enquiry_number: { $regex: search, $options: "i" } },
                { "user_id.full_name": { $regex: search, $options: "i" } },
            ];
        }

        // Get enquiries that don't already have quotes from this supplier
        const enquiries = await Enquiry.aggregate([
            {
                $match: filter
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user_id"
                }
            },
            {
                $unwind: {
                    path: "$user_id",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "enquiry_quotes",
                    let: { enquiryId: "$_id", supplierId: new mongoose.Types.ObjectId(id) },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$enquiry_id", "$$enquiryId"] },
                                        { $eq: ["$user_id", "$$supplierId"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "existing_quotes"
                }
            },
            {
                $match: {
                    existing_quotes: { $size: 0 } // Only get enquiries without existing quotes from this supplier
                }
            },
            {
                $project: {
                    existing_quotes: 0
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
        ]);

        return res.status(200).json({
            message: "Enquiries for supplier fetched successfully",
            data: enquiries,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}

// Get enquiries for a specific logistics provider
exports.getEnquiriesForLogistics = async (req, res) => {
    try {
        const { id } = req.params;
        const { search, offset = 0, limit = 100 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, {
                message: "Invalid logistics ID",
                code: 400,
            });
        }

        const filter = {
            status: { $in: ["pending", "delivery"] },
        };

        if (search) {
            filter.$or = [
                { enquiry_unique_id: { $regex: search, $options: "i" } },
                { enquiry_number: { $regex: search, $options: "i" } },
                { "user_id.full_name": { $regex: search, $options: "i" } },
            ];
        }

        // Similar to supplier but check logistics_quotes
        const enquiries = await Enquiry.aggregate([
            {
                $match: filter
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user_id"
                }
            },
            {
                $unwind: {
                    path: "$user_id",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "logistics_quotes",
                    let: { enquiryId: "$_id", logisticsId: new mongoose.Types.ObjectId(id) },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$enquiry_id", "$$enquiryId"] },
                                        { $eq: ["$user_id", "$$logisticsId"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "existing_quotes"
                }
            },
            {
                $match: {
                    existing_quotes: { $size: 0 }
                }
            },
            {
                $project: {
                    existing_quotes: 0
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
        ]);

        return res.status(200).json({
            message: "Enquiries for logistics provider fetched successfully",
            data: enquiries,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}

// Get enquiry details
exports.getEnquiryDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, {
                message: "Invalid enquiry ID",
                code: 400,
            });
        }

        const enquiry = await Enquiry.findById(id)
            .populate('user_id', 'full_name email phone_number company_name')
            .populate('shipping_address')
            .populate('selected_supplier.quote_id')
            .populate('selected_logistics.quote_id');

        if (!enquiry) {
            return utils.handleError(res, {
                message: "Enquiry not found",
                code: 404,
            });
        }

        return res.status(200).json({
            message: "Enquiry details fetched successfully",
            data: enquiry,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}

// Get suppliers list
exports.getSuppliersList = async (req, res) => {
    try {
        const { limit = 100, offset = 0, search = "" } = req.query;

        const condition = {
            user_type: { $in: ["supplier"] },
            is_deleted: false,
            is_trashed: { $ne: true },
        };

        if (search) {
            condition["$or"] = [
                { full_name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { company_name: { $regex: search, $options: "i" } },
                { unique_user_id: { $regex: search, $options: "i" } },
            ];
        }

        // Use aggregation to join with subscriptions
        const suppliers = await User.aggregate([
            {
                $match: condition
            },
            {
                $lookup: {
                    from: "subscriptions",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$user_id", "$$userId"] },
                                        { $eq: ["$status", "active"] }
                                    ]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "plans",
                                localField: "plan_id",
                                foreignField: "plan_id",
                                as: "plan"
                            }
                        },
                        {
                            $unwind: {
                                path: "$plan",
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $limit: 1
                        }
                    ],
                    as: "subscription"
                }
            },
            {
                $unwind: {
                    path: "$subscription",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    full_name: 1,
                    email: 1,
                    phone_number: 1,
                    company_name: "$company_data.name",
                    company_data: 1,
                    profile_image: 1,
                    unique_user_id: 1,
                    user_type: 1,
                    createdAt: 1,
                    subscription: {
                        _id: "$subscription._id",
                        status: "$subscription.status",
                        type: "$subscription.plan.type",
                        plan_name: "$subscription.plan.plan_name",
                        subscription_id: "$subscription.subscription_id"
                    }
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
        ]);

        return res.status(200).json({
            message: "Suppliers list fetched successfully",
            data: suppliers || [],
            code: 200
        });

    } catch (error) {
        console.error('Error in getSuppliersList:', error);
        utils.handleError(res, error);
    }
}

// Get logistics list
exports.getLogisticsList = async (req, res) => {
    try {
        const { limit = 100, offset = 0, search = "" } = req.query;

        const condition = {
            user_type: { $in: ["logistics"] },
            is_deleted: false,
            is_trashed: { $ne: true },
        };

        if (search) {
            condition["$or"] = [
                { full_name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { unique_user_id: { $regex: search, $options: "i" } },
                { "company_data.name": { $regex: search, $options: "i" } },
            ];
        }

        // Use aggregation to join with subscriptions (same approach as getSuppliersList)
        const logistics = await User.aggregate([
            {
                $match: condition
            },
            {
                $lookup: {
                    from: "subscriptions",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$user_id", "$$userId"] },
                                        { $eq: ["$status", "active"] }
                                    ]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "plans",
                                localField: "plan_id",
                                foreignField: "plan_id",
                                as: "plan"
                            }
                        },
                        {
                            $unwind: {
                                path: "$plan",
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $limit: 1
                        }
                    ],
                    as: "subscription"
                }
            },
            {
                $unwind: {
                    path: "$subscription",
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
                $limit: parseInt(limit) || 100
            },
            {
                $project: {
                    _id: 1,
                    full_name: 1,
                    email: 1,
                    phone_number: 1,
                    phone_number_code: 1,
                    company_name: {
                        $ifNull: ["$company_data.name", ""]
                    },
                    company_data: 1,
                    profile_image: 1,
                    unique_user_id: 1,
                    user_type: 1,
                    createdAt: 1,
                    subscription: {
                        $cond: {
                            if: { $ne: ["$subscription", null] },
                            then: {
                                _id: "$subscription._id",
                                status: "$subscription.status",
                                type: {
                                    $ifNull: ["$subscription.type", "$subscription.plan.type"]
                                },
                                plan_name: {
                                    $ifNull: ["$subscription.plan.plan_name", ""]
                                },
                                subscription_id: "$subscription.subscription_id"
                            },
                            else: null
                        }
                    }
                }
            }
        ]);

        // Return empty array if no logistics found (not an error)
        if (!logistics || logistics.length === 0) {
            return res.status(200).json({
                message: search ? `No logistics providers found matching "${search}"` : "No logistics providers found",
                data: [],
                code: 200
            });
        }

        return res.status(200).json({
            message: "Logistics providers list fetched successfully",
            data: logistics || [],
            code: 200
        });

    } catch (error) {
        console.error('Error in getLogisticsList:', error);
        console.error('Error stack:', error.stack);
        // Return user-friendly error message
        const errorMessage = error?.message || 'Failed to fetch logistics providers. Please try again.';
        return res.status(500).json({
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            code: 500
        });
    }
}

// Get supplier addresses
exports.getSupplierAddresses = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, {
                message: "Invalid supplier ID",
                code: 400,
            });
        }

        const addresses = await Address.find({ user_id: id })
            .populate('address.city')
            .populate('address.state')
            .populate('address.country')
            .sort({ default_address: -1, createdAt: -1 });

        return res.status(200).json({
            message: "Supplier addresses fetched successfully",
            data: addresses,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}

// Get logistics enquiry detail
exports.getLogisticsEnquiryDetail = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, {
                message: "Invalid enquiry ID",
                code: 400,
            });
        }

        const data = await Enquiry.findOne({ _id: id })
            .populate('selected_payment_terms')
            .populate("shipping_address")
            .populate("enquiry_items.quantity.unit")
            .populate({
                path: 'selected_supplier.quote_id',
                populate: [
                    {
                        path: "pickup_address"
                    },
                    {
                        path: 'collection_readiness',
                        populate: 'collection_address'
                    },
                    {
                        path: "enquiry_items.quantity.unit"
                    }
                ]
            });

        if (!data) {
            return utils.handleError(res, {
                message: "Enquiry not found",
                code: 404,
            });
        }

        const newdata = {
            ...data.toObject(),
            selected_supplier: data?.selected_supplier?.quote_id || null,
        };

        return res.status(200).json({
            message: "Logistics enquiry details fetched successfully",
            data: newdata,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}