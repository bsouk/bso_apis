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
const { notifyAllSuperAdmins } = require("../../utils/notifyAdmins");
const { emitNotificationToUser } = require("../../config/socket");


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
        const adminId = req.user._id;

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

        // Store quotation details for logging before deletion
        const quotationDetails = existingRecords.map(q => ({
            id: q._id.toString(),
            quotation_unique_id: q.quotation_unique_id
        }));

        const result = await quotation.deleteMany({ _id: { $in: ids } });

        // Create admin log for successful deletion
        try {
            const adminUser = await admin.findById(adminId);
            if (adminUser) {
                await logSuccess(
                    adminUser,
                    'quotation_management',
                    'delete_multiple_quotations',
                    {
                        related_collection: 'quotations',
                        metadata: {
                            deleted_count: result.deletedCount,
                            quotation_ids: ids,
                            quotation_details: quotationDetails
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating log:', logError);
        }

        res.json({
            message: `${result.deletedCount} quotation(s) deleted successfully.`,
            code: 200
        });

    } catch (error) {
        console.error("Error in deleteMultipleQuotation:", error);
        
        // Log failure
        try {
            const adminUser = await admin.findById(req.user._id);
            if (adminUser) {
                await logFailure(
                    adminUser,
                    'quotation_management',
                    'delete_multiple_quotations',
                    error,
                    {
                        related_collection: 'quotations',
                        metadata: {
                            quotation_ids: req.body.ids
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating failure log:', logError);
        }
        
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
        const adminId = req.user._id;
        console.log("final_quotes : ", final_quotation)
        const queryData = await quotation.findOne({ _id: quotation_id }).populate('query_id')

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

        // Get buyer details
        let buyer = null;
        if (queryData.query_id?.createdByUser) {
            buyer = await User.findById(queryData.query_id.createdByUser);
        }

        const is_supplier_assigned = await query_assigned_suppliers.find({ quotation_id, is_selected: true })
        console.log('is_supplier_assigned : ', is_supplier_assigned)

        if (is_supplier_assigned.length === 0) {
            const response = await final_quotation.map(async (i) => {
                const newquote = await query_assigned_suppliers.create({
                    query_id: queryData.query_id?._id,
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
                        query_id: queryData.query_id?._id,
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
                assignedBy: i?.admin_quote?.assignedBy ?? null
            }
            const save_data = await version_history.create({
                quotation_id,
                ...timeline_data
            })
            console.log("save_data : ", save_data)
        })
        console.log("version history : ", version_history_data)

        // Send email to buyer about final quotation
        try {
            if (buyer && buyer.email) {
                const mailOptions = {
                    to: buyer.email,
                    subject: `Final Quotation Submitted - ${queryData.quotation_unique_id || quotation_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    name: buyer.full_name || buyer.first_name || 'Buyer',
                    quotation_id: queryData.quotation_unique_id || quotation_id,
                    items_count: final_quotation.length,
                    view_link: `${process.env.FRONTEND_PROD_URL}quotation-management`
                };
                await emailer.sendEmail(null, mailOptions, "FinalQuotationSubmitted");
            }
        } catch (emailError) {
            console.error('Error sending email to buyer:', emailError);
        }

        // Create admin log
        try {
            const adminUser = await admin.findById(adminId);
            if (adminUser) {
                await logSuccess(
                    adminUser,
                    'quotation_management',
                    'submit_final_quotation',
                    {
                        related_id: quotation_id,
                        related_collection: 'quotations',
                        metadata: {
                            quotation_id: quotation_id,
                            quotation_unique_id: queryData.quotation_unique_id,
                            items_count: final_quotation.length,
                            buyer_id: buyer?._id?.toString(),
                            buyer_name: buyer?.full_name
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating log:', logError);
        }

        return res.status(200).json({
            message: "Final quotation added successfully",
            code: 200
        })
    } catch (error) {
        // Log failure
        try {
            const adminUser = await admin.findById(req.user._id);
            if (adminUser) {
                await logFailure(
                    adminUser,
                    'quotation_management',
                    'submit_final_quotation',
                    error,
                    {
                        related_collection: 'quotations',
                        metadata: {
                            quotation_id: req.body.quotation_id,
                            final_quotation_count: req.body.final_quotation?.length
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
        let { logistics_id, product_ids, quotation_id } = req.body
        const adminId = req.user._id;
        
        if (!Array.isArray(product_ids)) {
            product_ids = [product_ids]
        }

        // Get logistics provider details
        const logisticsProvider = await User.findById(logistics_id);
        if (!logisticsProvider) {
            return utils.handleError(res, {
                message: "Logistics provider not found",
                code: 404,
            });
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
        }, { new: true }).populate('query_id')
        console.log('result : ', result)

        // Get buyer details
        let buyer = null;
        if (result.query_id?.createdByUser) {
            buyer = await User.findById(result.query_id.createdByUser);
        }

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

        // Send email to logistics provider
        try {
            if (logisticsProvider && logisticsProvider.email) {
                const mailOptions = {
                    to: logisticsProvider.email,
                    subject: `You Have Been Assigned to a Quotation - ${result.quotation_unique_id || quotation_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    name: logisticsProvider.full_name || logisticsProvider.first_name || 'Logistics Provider',
                    quotation_id: result.quotation_unique_id || quotation_id,
                    products_count: product_ids.length,
                    view_link: `${process.env.FRONTEND_PROD_URL}quotation-management-logistics`
                };
                await emailer.sendEmail(null, mailOptions, "LogisticsAssigned");
            }
        } catch (emailError) {
            console.error('Error sending email to logistics provider:', emailError);
        }

        // Send email to buyer
        try {
            if (buyer && buyer.email) {
                const mailOptions = {
                    to: buyer.email,
                    subject: `Logistics Assigned to Your Quotation - ${result.quotation_unique_id || quotation_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    name: buyer.full_name || buyer.first_name || 'Buyer',
                    quotation_id: result.quotation_unique_id || quotation_id,
                    logistics_name: logisticsProvider.full_name || logisticsProvider.first_name,
                    view_link: `${process.env.FRONTEND_PROD_URL}quotation-management`
                };
                await emailer.sendEmail(null, mailOptions, "LogisticsAssignedBuyer");
            }
        } catch (emailError) {
            console.error('Error sending email to buyer:', emailError);
        }

        // Create admin log
        try {
            const adminUser = await admin.findById(adminId);
            if (adminUser) {
                await logSuccess(
                    adminUser,
                    'quotation_management',
                    'assign_logistics',
                    {
                        related_id: quotation_id,
                        related_collection: 'quotations',
                        metadata: {
                            quotation_id: quotation_id,
                            quotation_unique_id: result.quotation_unique_id,
                            logistics_id: logistics_id,
                            logistics_name: logisticsProvider.full_name,
                            products_assigned: product_ids.length,
                            buyer_id: buyer?._id?.toString(),
                            buyer_name: buyer?.full_name
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating log:', logError);
        }

        return res.status(200).json({
            message: "Logistics assigned successfully",
            code: 200
        })
    } catch (error) {
        // Log failure
        try {
            const adminUser = await admin.findById(req.user._id);
            if (adminUser) {
                await logFailure(
                    adminUser,
                    'quotation_management',
                    'assign_logistics',
                    error,
                    {
                        related_collection: 'quotations',
                        metadata: {
                            quotation_id: req.body.quotation_id,
                            logistics_id: req.body.logistics_id,
                            product_ids: req.body.product_ids
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

exports.approveRejectLogistics = async (req, res) => {
    try {
        const { quotation_id, logistics_id, status } = req.body
        const adminId = req.user._id;
        const isAccepted = status === 'accepted';
        
        const quotation_data = await quotation.findOne({ _id: quotation_id }).populate('query_id')
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

        // Get logistics provider details
        const logisticsProvider = await User.findById(logistics_id);
        if (!logisticsProvider) {
            return utils.handleError(res, {
                message: "Logistics provider not found",
                code: 404,
            });
        }

        // Get buyer details from the query
        let buyer = null;
        if (quotation_data.query_id?.createdByUser) {
            buyer = await User.findById(quotation_data.query_id.createdByUser);
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
            
            if (!quotation_data.rejected_reason) {
                quotation_data.rejected_reason = { reason: req.body.reason, logistics_ids: [] };
            } else {
                quotation_data.rejected_reason.reason = req.body.reason
            }
            if (!Array.isArray(quotation_data.rejected_reason.logistics_ids)) {
                quotation_data.rejected_reason.logistics_ids = [];
            }
            if (!quotation_data.rejected_reason.logistics_ids.includes(logistics_id)) {
                quotation_data.rejected_reason.logistics_ids.push(logistics_id)
            }

            const result = await quotation.updateMany(
                { 'final_quote.logistics_id': logistics_id },
                { $set: { 'final_quote.$.logistics_id': null } }
            )
            console.log("result : ", result)
        }
        await quotation_data.save()

        // Send email to logistics provider
        try {
            if (logisticsProvider && logisticsProvider.email) {
                const mailOptions = {
                    to: logisticsProvider.email,
                    subject: `Your Logistics Quote Has Been ${isAccepted ? 'Accepted' : 'Rejected'} - Quotation ${quotation_data.quotation_unique_id || quotation_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    name: logisticsProvider.full_name || logisticsProvider.first_name || 'Logistics Provider',
                    quotation_id: quotation_data.quotation_unique_id || quotation_id,
                    status: isAccepted ? 'Accepted' : 'Rejected',
                    reason: req.body.reason || '',
                    view_link: `${process.env.FRONTEND_PROD_URL}quotation-management-logistics`
                };
                await emailer.sendEmail(null, mailOptions, isAccepted ? "LogisticsQuoteAcceptedProvider" : "LogisticsQuoteRejected");
            }
        } catch (emailError) {
            console.error('Error sending email to logistics provider:', emailError);
        }

        // Send email to buyer
        try {
            if (buyer && buyer.email) {
                const mailOptions = {
                    to: buyer.email,
                    subject: `Logistics Quote ${isAccepted ? 'Accepted' : 'Rejected'} - Quotation ${quotation_data.quotation_unique_id || quotation_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    name: buyer.full_name || buyer.first_name || 'Buyer',
                    quotation_id: quotation_data.quotation_unique_id || quotation_id,
                    logistics_name: logisticsProvider.full_name || logisticsProvider.first_name,
                    status: isAccepted ? 'Accepted' : 'Rejected',
                    reason: req.body.reason || '',
                    view_link: `${process.env.FRONTEND_PROD_URL}quotation-management`
                };
                await emailer.sendEmail(null, mailOptions, isAccepted ? "LogisticsQuoteAccepted" : "LogisticsQuoteRejectedBuyer");
            }
        } catch (emailError) {
            console.error('Error sending email to buyer:', emailError);
        }

        // Create admin log
        try {
            const adminUser = await admin.findById(adminId);
            if (adminUser) {
                await logSuccess(
                    adminUser,
                    'quotation_management',
                    isAccepted ? 'accept_logistics_quote' : 'reject_logistics_quote',
                    {
                        related_id: quotation_id,
                        related_collection: 'quotations',
                        metadata: {
                            quotation_id: quotation_id,
                            quotation_unique_id: quotation_data.quotation_unique_id,
                            logistics_id: logistics_id,
                            logistics_name: logisticsProvider.full_name,
                            status: status,
                            reason: req.body.reason || null,
                            buyer_id: buyer?._id?.toString(),
                            buyer_name: buyer?.full_name
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating log:', logError);
        }

        return res.status(200).json({
            message: `Logistics ${status} successfully`,
            code: 200
        })
    } catch (error) {
        // Log failure
        try {
            const adminUser = await admin.findById(req.user._id);
            if (adminUser) {
                await logFailure(
                    adminUser,
                    'quotation_management',
                    'approve_reject_logistics',
                    error,
                    {
                        related_collection: 'quotations',
                        metadata: {
                            quotation_id: req.body.quotation_id,
                            logistics_id: req.body.logistics_id,
                            status: req.body.status
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


exports.addAdminQuotationNotes = async (req, res) => {
    try {
        const { quotation_id, supplier_id, variant_id, note } = req.body
        const adminId = req.user._id;

        // Get quotation details for logging
        const quotationData = await quotation.findById(quotation_id);
        
        // Get supplier details
        const supplier = await User.findById(supplier_id);

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

        // Create admin log
        try {
            const adminUser = await admin.findById(adminId);
            if (adminUser) {
                await logSuccess(
                    adminUser,
                    'quotation_management',
                    'add_admin_notes',
                    {
                        related_id: quotation_id,
                        related_collection: 'query_assigned_suppliers',
                        metadata: {
                            quotation_id: quotation_id,
                            quotation_unique_id: quotationData?.quotation_unique_id,
                            supplier_id: supplier_id,
                            supplier_name: supplier?.full_name,
                            variant_id: variant_id,
                            note_preview: note?.substring(0, 100)
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating log:', logError);
        }

        return res.status(200).json({
            message: "Admin Quotation notes added successfully",
            data: result,
            code: 200
        })

    } catch (error) {
        // Log failure
        try {
            const adminUser = await admin.findById(req.user._id);
            if (adminUser) {
                await logFailure(
                    adminUser,
                    'quotation_management',
                    'add_admin_notes',
                    error,
                    {
                        related_collection: 'query_assigned_suppliers',
                        metadata: {
                            quotation_id: req.body.quotation_id,
                            supplier_id: req.body.supplier_id,
                            variant_id: req.body.variant_id
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
        const adminId = req.user._id;
        const isAccepted = (status === true || status === "true");
        
        const queryData = await quotation.findById({ _id: quotation_id }).populate('query_id');
        if (!queryData) {
            return utils.handleError(res, {
                message: "Quotation not found",
                code: 404,
            });
        }

        // Get supplier details
        const supplier = await User.findById(supplier_id);
        if (!supplier) {
            return utils.handleError(res, {
                message: "Supplier not found",
                code: 404,
            });
        }

        // Get buyer details from the query
        let buyer = null;
        if (queryData.query_id?.createdByUser) {
            buyer = await User.findById(queryData.query_id.createdByUser);
        }

        const result = await query_assigned_suppliers.findOneAndUpdate(
            {
                quotation_id: new mongoose.Types.ObjectId(quotation_id),
                variant_assigned_to: new mongoose.Types.ObjectId(supplier_id),
                _id: new mongoose.Types.ObjectId(quote_id)
            },
            {
                $set: {
                    is_admin_approved: isAccepted
                }
            },
            { new: true }
        )
        console.log("result : ", result)

        // Send email to supplier
        try {
            if (supplier && supplier.email) {
                const mailOptions = {
                    to: supplier.email,
                    subject: `Your Quote Has Been ${isAccepted ? 'Accepted' : 'Rejected'} - Quotation ${queryData.quotation_unique_id || quotation_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    name: supplier.full_name || supplier.first_name || 'Supplier',
                    quotation_id: queryData.quotation_unique_id || quotation_id,
                    status: isAccepted ? 'Accepted' : 'Rejected',
                    view_link: `${process.env.FRONTEND_PROD_URL}quotation-management`
                };
                await emailer.sendEmail(null, mailOptions, isAccepted ? "SupplierQuoteAcceptedProvider" : "SupplierQuoteRejected");
            }
        } catch (emailError) {
            console.error('Error sending email to supplier:', emailError);
        }

        // Send email to buyer
        try {
            if (buyer && buyer.email) {
                const mailOptions = {
                    to: buyer.email,
                    subject: `Supplier Quote ${isAccepted ? 'Accepted' : 'Rejected'} - Quotation ${queryData.quotation_unique_id || quotation_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    name: buyer.full_name || buyer.first_name || 'Buyer',
                    quotation_id: queryData.quotation_unique_id || quotation_id,
                    supplier_name: supplier.full_name || supplier.first_name,
                    status: isAccepted ? 'Accepted' : 'Rejected',
                    view_link: `${process.env.FRONTEND_PROD_URL}quotation-management`
                };
                await emailer.sendEmail(null, mailOptions, isAccepted ? "SupplierQuoteAccepted" : "SupplierQuoteRejectedBuyer");
            }
        } catch (emailError) {
            console.error('Error sending email to buyer:', emailError);
        }

        // Create admin log
        try {
            const adminUser = await admin.findById(adminId);
            if (adminUser) {
                await logSuccess(
                    adminUser,
                    'quotation_management',
                    isAccepted ? 'accept_supplier_quote' : 'reject_supplier_quote',
                    {
                        related_id: quote_id,
                        related_collection: 'query_assigned_suppliers',
                        metadata: {
                            quotation_id: quotation_id,
                            quotation_unique_id: queryData.quotation_unique_id,
                            supplier_id: supplier_id,
                            supplier_name: supplier.full_name,
                            status: isAccepted ? 'accepted' : 'rejected',
                            buyer_id: buyer?._id?.toString(),
                            buyer_name: buyer?.full_name
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating log:', logError);
        }

        return res.status(200).json({
            message: `Supplier quote ${isAccepted ? 'accepted' : 'rejected'} successfully`,
            data: result,
            code: 200
        })
    } catch (error) {
        // Log failure
        try {
            const adminUser = await admin.findById(req.user._id);
            if (adminUser) {
                await logFailure(
                    adminUser,
                    'quotation_management',
                    'accept_reject_supplier_quote',
                    error,
                    {
                        related_collection: 'query_assigned_suppliers',
                        metadata: {
                            quotation_id: req.body.quotation_id,
                            supplier_id: req.body.supplier_id,
                            quote_id: req.body.quote_id,
                            status: req.body.status
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
        const { search, offset = 0, limit = 10, type, status, start_date, end_date } = req.query;
        const supplierFilter = {};
        const logisticsFilter = {};

        if (search && typeof search === 'string' && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: "i" };
            supplierFilter.$or = [
                { quote_unique_id: searchRegex },
                { "enquiry_id.enquiry_unique_id": searchRegex },
                { "user_id.full_name": searchRegex },
                { "user_id.company_data.name": searchRegex },
            ];
            logisticsFilter.$or = [
                { quote_unique_id: searchRegex },
                { "enquiry_id.enquiry_unique_id": searchRegex },
                { "user_id.full_name": searchRegex },
                { "user_id.company_data.name": searchRegex },
            ];
        }

        // ⭐ Date range filter
        if (start_date || end_date) {
            const dateFilter = {};
            if (start_date) {
                dateFilter.$gte = new Date(start_date);
            }
            if (end_date) {
                // Add one day to end_date to include the entire end date
                const endDateObj = new Date(end_date);
                endDateObj.setDate(endDateObj.getDate() + 1);
                dateFilter.$lt = endDateObj;
            }
            supplierFilter.createdAt = dateFilter;
            logisticsFilter.createdAt = dateFilter;
            console.log("dateFilter applied to quotes: ", dateFilter);
        }

        // Apply status filter
        if (status) {
            const statusLower = status.toLowerCase();
            if (statusLower === 'pending') {
                // Pending = not selected and not rejected
                supplierFilter.$and = supplierFilter.$and || [];
                supplierFilter.$and.push({
                    $or: [
                        { is_selected: false },
                        { is_selected: { $exists: false } }
                    ]
                });
                supplierFilter.$and.push({
                    $or: [
                        { status: { $ne: "rejected" } },
                        { status: { $exists: false } }
                    ]
                });
                
                logisticsFilter.$and = logisticsFilter.$and || [];
                logisticsFilter.$and.push({
                    $or: [
                        { is_selected: false },
                        { is_selected: { $exists: false } }
                    ]
                });
                logisticsFilter.$and.push({
                    $or: [
                        { status: { $ne: "rejected" } },
                        { status: { $exists: false } }
                    ]
                });
            } else if (statusLower === 'accepted') {
                // Accepted = is_selected is true
                supplierFilter.is_selected = true;
                logisticsFilter.is_selected = true;
            } else if (statusLower === 'rejected') {
                // Rejected = status is rejected
                supplierFilter.status = "rejected";
                logisticsFilter.status = "rejected";
            }
        }

        // Apply type filter
        if (type === 'admin') {
            supplierFilter.type = 'admin';
        } else if (type === 'supplier') {
            supplierFilter.$and = supplierFilter.$and || [];
            supplierFilter.$and.push({ $or: [{ type: 'supplier' }, { type: { $exists: false } }, { type: null }] });
            supplierFilter.$and.push({ type: { $ne: 'admin' } });
        }

        // Determine which collections to query based on type
        const includeSupplier = !type || type === 'supplier' || type === 'admin' || type === 'all';
        const includeLogistics = !type || type === 'logistics' || type === 'all';

        let data = [];

        // Query EnquiryQuotes (supplier quotes)
        if (includeSupplier && type !== 'logistics') {
            const supplierData = await EnquiryQuotes.aggregate([
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
                    $match: Object.keys(supplierFilter).length > 0 ? supplierFilter : {} 
                },
                {
                    $addFields: {
                        quote_source: "supplier" // Mark as supplier quote
                    }
            },
            { 
                $sort: { createdAt: -1 } 
                }
            ]);
            data = [...supplierData];
        }

        // Query logistics_quotes (logistics quotes)
        if (includeLogistics && type !== 'supplier' && type !== 'admin') {
            const logisticsData = await logistics_quotes.aggregate([
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
                    $match: Object.keys(logisticsFilter).length > 0 ? logisticsFilter : {} 
                },
                {
                    $addFields: {
                        quote_source: "logistics", // Mark as logistics quote
                        type: "logistics" // Ensure type is set for display
                    }
                },
                { 
                    $sort: { createdAt: -1 } 
                }
            ]);
            data = [...data, ...logisticsData];
        }

        // Sort combined data by createdAt descending
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Apply pagination
        const totalDataCount = data.length;
        const paginatedData = data.slice(parseInt(offset) || 0, (parseInt(offset) || 0) + (parseInt(limit) || 10));

        // Get counts for stats - wrap in try-catch to prevent crashes
        let count = totalDataCount;
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
            // Total counts (all quotes from both collections)
            const supplierTotal = await EnquiryQuotes.countDocuments({});
            const logisticsTotal = await logistics_quotes.countDocuments({});
            totalCount = supplierTotal + logisticsTotal;
            totalSupplierCount = supplierTotal;
            totalLogisticsCount = logisticsTotal;
            
            // Pending counts (not selected and status is pending or not set)
            const supplierPending = await EnquiryQuotes.countDocuments({ 
                $or: [
                    { is_selected: false },
                    { is_selected: { $exists: false } }
                ]
            });
            const logisticsPending = await logistics_quotes.countDocuments({ 
                $or: [
                    { is_selected: false },
                    { is_selected: { $exists: false } }
                ]
            });
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
            data: paginatedData || [],
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

                // Add type for logistics quotes so frontend can identify it
                data.type = 'logistics';

                // Transform user_id to include company_name from company_data
                if (data.user_id && data.user_id.company_data) {
                    data.user_id = {
                        ...data.user_id,
                        company_name: data.user_id.company_data?.name || data.user_id.company_data?.company_name
                    };
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

        // Add type for supplier quotes if not already set
        if (!data.type) {
            data.type = 'supplier';
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

        // Check for active subscription - check for supplier type OR all_in_one type
        // Use case-insensitive search for status
        const activeSubscription = await Subscription.findOne({ 
            user_id: supplier_id, 
            status: { $regex: /^active$/i }, 
            type: { $in: ["supplier", "all_in_one"] }
        });

        console.log('🔍 Supplier subscription check:', {
            supplier_id,
            activeSubscription: activeSubscription ? {
                _id: activeSubscription._id,
                status: activeSubscription.status,
                type: activeSubscription.type,
                plan_id: activeSubscription.plan_id
            } : null
        });

        // If no subscription found with type filter, check without type filter (in case type is not set)
        let hasValidSubscription = !!activeSubscription;
        if (!hasValidSubscription) {
            const anyActiveSubscription = await Subscription.findOne({ 
                user_id: supplier_id, 
                status: { $regex: /^active$/i }
            });
            if (anyActiveSubscription) {
                console.log('✅ Found active subscription without type filter:', {
                    _id: anyActiveSubscription._id,
                    status: anyActiveSubscription.status,
                    type: anyActiveSubscription.type,
                    plan_id: anyActiveSubscription.plan_id
                });
                hasValidSubscription = true;
            } else {
                // Log all subscriptions for this user for debugging
                const allSubs = await Subscription.find({ user_id: supplier_id });
                console.log('❌ No active subscription found. All subscriptions for user:', allSubs.map(s => ({
                    _id: s._id,
                    status: s.status,
                    type: s.type,
                    plan_id: s.plan_id,
                    start_at: s.start_at,
                    end_at: s.end_at
                })));
            }
        }

        if (!hasValidSubscription) {
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

        // Remove _id from data to prevent duplicate key errors
        // The _id might come from fetched enquiry data
        const safeData = { ...data };
        delete safeData._id;
        delete safeData.id;
        
        // Debug logging for custom charges
        console.log('📋 Custom charges data:', {
            custom_charges_one: safeData.custom_charges_one,
            custom_charges_two: safeData.custom_charges_two,
            discount: safeData.discount,
            grand_total: safeData.grand_total
        });

        // Handle custom created_date from admin (allows past dates)
        let customCreatedAt = null;
        if (safeData.created_date) {
            customCreatedAt = new Date(safeData.created_date);
            console.log("📅 Using custom created date for quote:", customCreatedAt);
            delete safeData.created_date; // Remove from data to prevent field conflict
        }

        let quote;
        if (existingQuote) {
            // Update existing quote instead of creating a new one
            console.log('📝 Updating existing quote:', existingQuote._id);
            quote = await EnquiryQuotes.findOneAndUpdate(
                { 
                    enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), 
                    user_id: new mongoose.Types.ObjectId(supplier_id) 
                },
                { 
                    $set: {
                        ...safeData,
                        type: "supplier",
                        // is_admin_updated is set to false initially - will be set to true when final quote is submitted
                        is_admin_updated: false,
                        created_by_admin: adminId,
                        // Update createdAt if custom date provided
                        ...(customCreatedAt && { createdAt: customCreatedAt })
                    }
                },
                { new: true }
            );
        } else {
            // Create new quote
            console.log('📝 Creating new quote for supplier:', supplier_id);
            let quote_unique_id = await genQuoteId();
            quote = await EnquiryQuotes.create({
                ...safeData,
                quote_unique_id,
                user_id: supplier_id,
                type: "supplier",
                // is_admin_updated is set to false initially - will be set to true when final quote is submitted
                is_admin_updated: false,
                created_by_admin: adminId,
                // Set custom createdAt if provided
                ...(customCreatedAt && { createdAt: customCreatedAt })
            });
        }

        // Send notification to buyer - always save to DB so it shows in frontend bell; send FCM if buyer has tokens
        const enquiryIdDisplay = buyerenquiry?.enquiry_unique_id || buyerenquiry?._id?.toString() || 'N/A';
        try {
            const notificationMessage = {
                title: `New Supplier Quote – Enquiry ${enquiryIdDisplay}`,
                description: `${supplier.full_name} has submitted a new quote. Enquiry ID: ${enquiryIdDisplay}`,
                quote: quote._id
            };

            // Always save notification to database so buyer sees it in frontend (even without FCM)
            try {
                const NotificationData = {
                    title: notificationMessage.title,
                    description: notificationMessage.description,
                    type: "supplier_quote_added",
                    receiver_id: buyerenquiry.user_id,
                    related_to: buyerenquiry._id,
                    related_to_type: "enquiry",
                };
                const newNotification = new Notification(NotificationData);
                    await newNotification.save();
                    emitNotificationToUser(buyerenquiry.user_id);
                } catch (dbError) {
                    console.error('Error saving buyer notification to database:', dbError);
                }

            const buyerfcm = await fcm_devices.find({ user_id: buyerenquiry.user_id });
            if (buyerfcm && buyerfcm.length > 0) {
                await Promise.all(
                    buyerfcm.map(async (i) => {
                        try {
                            const token = i.token;
                            if (token) {
                                await utils.sendNotification(token, notificationMessage);
                            }
                        } catch (notifError) {
                            console.error('Error sending FCM notification to buyer:', notifError);
                        }
                    })
                );
            }
        } catch (notifError) {
            console.error('Error in buyer notification flow:', notifError);
        }

        // Send notification to supplier - wrapped in try-catch to prevent crashes
        try {
            const supplierNotificationMessage = {
                title: 'Your Quote Has Been Submitted',
                description: `Your quote has been submitted for Enquiry ID: ${buyerenquiry?.enquiry_unique_id}`,
                quote: quote._id
            };

            const supplierfcm = await fcm_devices.find({ user_id: supplier_id });

            // Always save notification to database so supplier sees it in-app (even without FCM)
            try {
                const SupplierNotificationData = {
                    title: supplierNotificationMessage.title,
                    description: supplierNotificationMessage.description,
                    type: "admin_action",
                    receiver_id: supplier_id,
                    related_to: buyerenquiry._id,
                    related_to_type: "enquiry",
                };
                const supplierNotification = new Notification(SupplierNotificationData);
                await supplierNotification.save();
                emitNotificationToUser(supplier_id);
            } catch (dbError) {
                console.error('Error saving supplier notification to database:', dbError);
            }

            // Send push via FCM if tokens exist
            if (supplierfcm && supplierfcm.length > 0) {
                await Promise.all(
                    supplierfcm.map(async (i) => {
                        try {
                            const token = i.token;
                            if (token) {
                                await utils.sendNotification(token, supplierNotificationMessage);
                            }
                        } catch (notifError) {
                            console.error('Error sending FCM notification to supplier:', notifError);
                        }
                    })
                );
            }
        } catch (notifError) {
            console.error('Error in supplier notification flow:', notifError);
            // Continue with the rest of the function even if notifications fail
        }

        // Admin notification: new supplier quote – await so latest shows in bell
        try {
            const { saved, fcmSent } = await notifyAllSuperAdmins({
                title: `New Supplier Quote – ${enquiryIdDisplay}`,
                description: `Admin created supplier quote (${supplier.full_name}). Enquiry ID: ${enquiryIdDisplay}`,
                type: 'supplier_quote',
                related_to: buyerenquiry._id,
                related_to_type: 'enquiry',
            });
            if (saved > 0 || fcmSent > 0) console.log('[admin createSupplierQuote] Admin notification: saved=%s, fcmSent=%s', saved, fcmSent);
        } catch (err) {
            console.error('[admin createSupplierQuote] Admin notification error:', err);
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
                    quote_link: `${process.env.FRONTEND_PROD_URL}enquiry-review-page/${buyerenquiry._id}`,
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
                    subject: `Your Quote Has Been Submitted - Enquiry ${buyerenquiry.enquiry_unique_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    email: supplier.email,
                    name: supplier.full_name || 'Supplier',
                    enquiry_id: buyerenquiry.enquiry_unique_id,
                    enquiry_number: buyerenquiry.enquiry_number,
                    quote_id: quote.quote_unique_id,
                    quote_link: `${process.env.FRONTEND_PROD_URL}quote-review-page/${quote._id}`,
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

// Update quote (supplier or logistics) - CRUD operation
exports.updateQuote = async (req, res) => {
    try {
        const { 
            quote_id, 
            status, 
            enquiry_items, 
            shipping_fee, 
            notes,
            // Additional fields for supplier quotes
            custom_charges_one,
            custom_charges_two,
            discount,
            delivery_time,
            payment_terms,
            pickup_address,
            currency,
            grand_total
        } = req.body;
        const adminId = req.user._id;

        if (!quote_id) {
            return utils.handleError(res, {
                message: "Quote ID is required",
                code: 400,
            });
        }

        if (!mongoose.Types.ObjectId.isValid(quote_id)) {
            return utils.handleError(res, {
                message: "Invalid quote ID",
                code: 400,
            });
        }

        // First try to find in EnquiryQuotes (supplier quotes)
        let quote = await EnquiryQuotes.findOne({ _id: new mongoose.Types.ObjectId(quote_id) });
        let quoteType = 'supplier';
        let updateData = {};
        let previousData = null;

        if (quote) {
            // Supplier quote update
            previousData = JSON.parse(JSON.stringify(quote));
            
            if (status) {
                updateData.status = status;
                updateData.is_selected = status === 'accepted';
                if (status === 'rejected') {
                    updateData.is_selected = false;
                }
            }

            // Update custom charges if provided
            if (custom_charges_one !== undefined) {
                updateData.custom_charges_one = custom_charges_one;
            }
            if (custom_charges_two !== undefined) {
                updateData.custom_charges_two = custom_charges_two;
            }
            if (discount !== undefined) {
                updateData.discount = discount;
            }

            // Update other fields if provided
            if (delivery_time !== undefined) {
                updateData.delivery_time = delivery_time;
            }
            if (payment_terms !== undefined) {
                updateData.payment_terms = payment_terms;
            }
            if (pickup_address !== undefined) {
                updateData.pickup_address = pickup_address;
            }
            if (currency !== undefined) {
                updateData.currency = currency;
            }

            if (enquiry_items && Array.isArray(enquiry_items)) {
                // Update enquiry items
                const updatedItems = quote.enquiry_items.map((item) => {
                    const updatedItem = enquiry_items.find((ei) => ei._id && ei._id.toString() === item._id.toString());
                    if (updatedItem) {
                        return {
                            ...item.toObject(),
                            unit_price: parseFloat(updatedItem.unit_price) || item.unit_price,
                            available_quantity: parseFloat(updatedItem.available_quantity) || item.available_quantity,
                        };
                    }
                    return item;
                });
                updateData.enquiry_items = updatedItems;
            }

            // Recalculate grand_total using updated values or existing values
            const itemsForCalc = updateData.enquiry_items || quote.enquiry_items || [];
                let subtotal = 0;
            itemsForCalc.forEach((item) => {
                const itemObj = item.toObject ? item.toObject() : item;
                subtotal += (parseFloat(itemObj.unit_price) || 0) * (parseFloat(itemObj.available_quantity) || 0);
            });

            // Use updated charges if provided, otherwise use existing
            const chargeOne = updateData.custom_charges_one || quote.custom_charges_one;
            const chargeTwo = updateData.custom_charges_two || quote.custom_charges_two;
            const discountData = updateData.discount || quote.discount;

                let grandTotal = subtotal;
            if (chargeOne && chargeOne.value) {
                grandTotal += parseFloat(chargeOne.value);
            }
            if (chargeTwo && chargeTwo.value) {
                if (chargeTwo.charge_type === 'percentage') {
                    grandTotal += (subtotal * parseFloat(chargeTwo.value)) / 100;
                    } else {
                    grandTotal += parseFloat(chargeTwo.value);
                }
            }
            if (discountData && discountData.value) {
                if (discountData.charge_type === 'percentage') {
                    grandTotal -= (subtotal * parseFloat(discountData.value)) / 100;
                    } else {
                    grandTotal -= parseFloat(discountData.value);
                    }
            }
            
            // Use provided grand_total if available and valid, otherwise use calculated
            updateData.grand_total = (grand_total && grand_total > 0) ? grand_total : grandTotal;

            updateData.is_admin_updated = true;
            updateData.updated_by_admin = adminId;

            quote = await EnquiryQuotes.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(quote_id) },
                { $set: updateData },
                { new: true }
            ).populate('enquiry_id', 'enquiry_unique_id enquiry_number').populate('user_id', 'full_name email');

        } else {
            // Try logistics quotes
            quote = await logistics_quotes.findOne({ _id: new mongoose.Types.ObjectId(quote_id) });
            quoteType = 'logistics';

            if (!quote) {
                return utils.handleError(res, {
                    message: "Quote not found",
                    code: 404,
                });
            }

            previousData = JSON.parse(JSON.stringify(quote));

            if (status) {
                updateData.status = status;
                updateData.is_selected = status === 'accepted';
                if (status === 'rejected') {
                    updateData.is_selected = false;
                }
            }

            if (shipping_fee !== undefined) {
                updateData.shipping_fee = parseFloat(shipping_fee);
            }

            if (notes !== undefined) {
                updateData.notes = notes;
            }

            updateData.updated_by_admin = adminId;

            quote = await logistics_quotes.findOneAndUpdate(
                { _id: new mongoose.Types.ObjectId(quote_id) },
                { $set: updateData },
                { new: true }
            ).populate('enquiry_id', 'enquiry_unique_id enquiry_number').populate('user_id', 'full_name email');
        }

        // Send email notifications
        try {
            const enquiry = quote.enquiry_id;
            const user = quote.user_id;
            
            // Send email to the quote provider (supplier/logistics)
            if (user && user.email) {
                const mailOptions = {
                    to: user.email,
                    subject: `Your Quote Has Been Updated - ${enquiry?.enquiry_unique_id || quote.quote_unique_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    name: user.full_name || 'Provider',
                    quote_unique_id: quote.quote_unique_id,
                    enquiry_id: enquiry?.enquiry_unique_id,
                    enquiry_number: enquiry?.enquiry_number,
                    updated_fields: Object.keys(updateData).join(', '),
                    new_status: updateData.status || previousData?.status,
                    view_link: quoteType === 'supplier' 
                        ? `${process.env.FRONTEND_PROD_URL}quotation-management`
                        : `${process.env.FRONTEND_PROD_URL}quotation-management-logistics`
                };
                await emailer.sendEmail(null, mailOptions, "QuoteUpdated");
            }

            // Send email to buyer if enquiry has user_id
            if (enquiry && enquiry.user_id) {
                const buyerData = await User.findById(enquiry.user_id);
                if (buyerData && buyerData.email) {
                    const mailOptions = {
                        to: buyerData.email,
                        subject: `Quote Updated for Your Enquiry - ${enquiry?.enquiry_unique_id}`,
                        app_name: process.env.APP_NAME || 'BSO Services',
                        name: buyerData.full_name || 'Buyer',
                        quote_unique_id: quote.quote_unique_id,
                        enquiry_id: enquiry?.enquiry_unique_id,
                        provider_name: user?.full_name,
                        quote_type: quoteType,
                        new_status: updateData.status || previousData?.status,
                        view_link: `${process.env.FRONTEND_PROD_URL}enquiry-review-page/${enquiry._id}`
                    };
                    await emailer.sendEmail(null, mailOptions, "QuoteUpdatedBuyer");
                }
            }
        } catch (emailError) {
            console.error('Error sending email notifications:', emailError);
        }

        // Create log entry for update
        try {
            const adminUser = await admin.findById(adminId);
            if (adminUser) {
                const enquiry = quote.enquiry_id;
                const user = quote.user_id;
                
                await logSuccess(
                    adminUser,
                    'quote_management',
                    'update',
                    {
                        related_id: quote._id,
                        related_collection: quoteType === 'supplier' ? 'enquiry_quotes' : 'logistics_quotes',
                        metadata: {
                            quote_type: quoteType,
                            quote_unique_id: quote.quote_unique_id,
                            enquiry_id: enquiry?.enquiry_unique_id || enquiry?._id?.toString(),
                            enquiry_number: enquiry?.enquiry_number,
                            user_id: user?._id?.toString(),
                            user_name: user?.full_name,
                            updated_fields: Object.keys(updateData),
                            previous_status: previousData?.status,
                            new_status: updateData.status || previousData?.status,
                            ...(quoteType === 'supplier' && { 
                                grand_total: updateData.grand_total || previousData?.grand_total 
                            }),
                            ...(quoteType === 'logistics' && { 
                                shipping_fee: updateData.shipping_fee || previousData?.shipping_fee 
                            }),
                        },
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating log:', logError);
        }

        return res.status(200).json({
            message: "Quote updated successfully",
            data: quote,
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
                    'update',
                    error,
                    {
                        related_collection: 'quotes',
                        metadata: {
                            quote_id: req.body.quote_id,
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

        // Check for active subscription - check for logistics type OR all_in_one type
        // Use case-insensitive search for status
        const activeSubscription = await Subscription.findOne({ 
            user_id: logistics_id, 
            status: { $regex: /^active$/i }, 
            type: { $in: ["logistics", "all_in_one"] }
        });

        console.log('🔍 Logistics subscription check:', {
            logistics_id,
            activeSubscription: activeSubscription ? {
                _id: activeSubscription._id,
                status: activeSubscription.status,
                type: activeSubscription.type,
                plan_id: activeSubscription.plan_id
            } : null
        });

        // If no subscription found with type filter, check without type filter (in case type is not set)
        let hasValidSubscription = !!activeSubscription;
        if (!hasValidSubscription) {
            const anyActiveSubscription = await Subscription.findOne({ 
                user_id: logistics_id, 
                status: { $regex: /^active$/i }
            });
            if (anyActiveSubscription) {
                console.log('✅ Found active logistics subscription without type filter:', {
                    _id: anyActiveSubscription._id,
                    status: anyActiveSubscription.status,
                    type: anyActiveSubscription.type,
                    plan_id: anyActiveSubscription.plan_id
                });
                hasValidSubscription = true;
            } else {
                // Log all subscriptions for this user for debugging
                const allSubs = await Subscription.find({ user_id: logistics_id });
                console.log('❌ No active logistics subscription found. All subscriptions for user:', allSubs.map(s => ({
                    _id: s._id,
                    status: s.status,
                    type: s.type,
                    plan_id: s.plan_id,
                    start_at: s.start_at,
                    end_at: s.end_at
                })));
            }
        }

        if (!hasValidSubscription) {
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

        // Remove _id from data to prevent duplicate key errors
        const safeData = { ...data };
        delete safeData._id;
        delete safeData.id;

        // Handle custom created_date from admin (allows past dates)
        let customCreatedAt = null;
        if (safeData.created_date) {
            customCreatedAt = new Date(safeData.created_date);
            console.log("📅 Using custom created date for logistics quote:", customCreatedAt);
            delete safeData.created_date; // Remove from data to prevent field conflict
        }

        let quote;
        let isUpdate = false;
        if (existingQuote) {
            // Update existing quote
            isUpdate = true;
            console.log('📝 Updating existing logistics quote:', existingQuote._id);
            quote = await logistics_quotes.findOneAndUpdate(
                { 
                    enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), 
                    user_id: new mongoose.Types.ObjectId(logistics_id) 
                },
                { 
                    $set: {
                        ...safeData,
                        created_by_admin: adminId,
                        // Update createdAt if custom date provided
                        ...(customCreatedAt && { createdAt: customCreatedAt })
                    }
                },
                { new: true }
            );
        } else {
            // Create new quote
            console.log('📝 Creating new logistics quote for provider:', logistics_id);
            let quote_unique_id = await genQuoteId();
            quote = await logistics_quotes.create({
                ...safeData,
                quote_unique_id,
                user_id: logistics_id,
                created_by_admin: adminId,
                // Set custom createdAt if provided
                ...(customCreatedAt && { createdAt: customCreatedAt })
            });
        }

        // Send notifications to buyer - always save to DB so it shows in frontend bell; send FCM if buyer has tokens
        const enquiryIdDisplayLog = buyerenquiry?.enquiry_unique_id || buyerenquiry?._id?.toString() || 'N/A';
        try {
            const notificationMessage = {
                title: `New Logistics Quote – Enquiry ${enquiryIdDisplayLog}`,
                description: `${logistics.full_name} has submitted a logistics quote. Enquiry ID: ${enquiryIdDisplayLog}`,
                quote: quote._id
            };

            // Always save notification to database so buyer sees it in frontend (even without FCM)
            try {
                const NotificationData = {
                    title: notificationMessage.title,
                    description: notificationMessage.description,
                    type: "logistics_quote_added",
                    receiver_id: buyerenquiry.user_id,
                    related_to: buyerenquiry._id,
                    related_to_type: "enquiry",
                };
                const newNotification = new Notification(NotificationData);
                await newNotification.save();
                emitNotificationToUser(buyerenquiry.user_id);
            } catch (dbError) {
                console.error('Error saving logistics notification to database:', dbError);
            }

            const buyerfcm = await fcm_devices.find({ user_id: buyerenquiry.user_id });
            if (buyerfcm && buyerfcm.length > 0) {
                await Promise.all(
                    buyerfcm.map(async (i) => {
                        try {
                            const token = i.token;
                            if (token) {
                                await utils.sendNotification(token, notificationMessage);
                            }
                        } catch (notifError) {
                            console.error('Error sending FCM notification to buyer:', notifError);
                        }
                    })
                );
            }
        } catch (notifError) {
            console.error('Error in logistics notification flow:', notifError);
        }

        // Admin notification: new logistics quote – await so latest shows in bell
        try {
            const { saved, fcmSent } = await notifyAllSuperAdmins({
                title: `New Logistics Quote – ${enquiryIdDisplayLog}`,
                description: `Admin created logistics quote (${logistics.full_name}). Enquiry ID: ${enquiryIdDisplayLog}`,
                type: 'logistics_quote',
                related_to: buyerenquiry._id,
                related_to_type: 'enquiry',
            });
            if (saved > 0 || fcmSent > 0) console.log('[admin createLogisticsQuote] Admin notification: saved=%s, fcmSent=%s', saved, fcmSent);
        } catch (err) {
            console.error('[admin createLogisticsQuote] Admin notification error:', err);
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
                    quote_link: `${process.env.FRONTEND_PROD_URL}enquiry-review-page/${buyerenquiry._id}`,
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
                    subject: `Your Logistics Quote Has Been Submitted - Enquiry ${buyerenquiry.enquiry_unique_id}`,
                    app_name: process.env.APP_NAME || 'BSO Services',
                    email: logistics.email,
                    name: logistics.full_name || 'Logistics Provider',
                    enquiry_id: buyerenquiry.enquiry_unique_id,
                    enquiry_number: buyerenquiry.enquiry_number,
                    quote_id: quote.quote_unique_id,
                    shipping_fee: quote.shipping_fee,
                    quote_link: `${process.env.FRONTEND_PROD_URL}quote-review-page-logistics/${quote._id}`,
                };
                await emailer.sendEmail(null, mailOptions, "logisticsQuoteCreatedForProvider");
            }
        } catch (emailError) {
            console.error('Error sending email to logistics:', emailError);
        }

        // In-app + real-time notification to logistics provider (same time as email)
        try {
            const logisticsNotificationMessage = {
                title: 'Your Logistics Quote Has Been Submitted',
                description: `Your logistics quote has been submitted for Enquiry ID: ${buyerenquiry?.enquiry_unique_id || enquiryIdDisplayLog}`,
                quote: quote._id,
            };

            // Always save to DB so it shows in-app (even without FCM)
            try {
                const logisticsNotificationData = {
                    title: logisticsNotificationMessage.title,
                    description: logisticsNotificationMessage.description,
                    type: "admin_action",
                    receiver_id: logistics_id,
                    related_to: buyerenquiry._id,
                    related_to_type: "enquiry",
                };
                await new Notification(logisticsNotificationData).save();
                emitNotificationToUser(logistics_id);
            } catch (dbError) {
                console.error('Error saving logistics provider notification to database:', dbError);
            }

            // Send push via FCM if tokens exist
            const logisticsFcm = await fcm_devices.find({ user_id: logistics_id });
            if (logisticsFcm && logisticsFcm.length > 0) {
                await Promise.all(
                    logisticsFcm.map(async (i) => {
                        try {
                            if (i.token) await utils.sendNotification(i.token, logisticsNotificationMessage);
                        } catch (notifError) {
                            console.error('Error sending FCM notification to logistics provider:', notifError);
                        }
                    })
                );
            }
        } catch (notifError) {
            console.error('Error in logistics provider notification flow:', notifError);
        }

        // Create log entry for admin action
        try {
            const adminUser = await admin.findById(adminId);
            if (adminUser) {
                const action = isUpdate ? 'update' : 'create';
                const logMetadata = {
                    quote_type: 'logistics',
                    quote_unique_id: quote.quote_unique_id,
                    enquiry_id: buyerenquiry.enquiry_unique_id,
                    enquiry_number: buyerenquiry.enquiry_number,
                    logistics_id: logistics._id.toString(),
                    logistics_name: logistics.full_name,
                    buyer_id: buyerenquiry.user_id.toString(),
                    shipping_fee: quote.shipping_fee,
                };
                
                if (isUpdate) {
                    logMetadata.previous_quote_id = existingQuote._id.toString();
                    logMetadata.updated_fields = Object.keys(data);
                }
                
                await logSuccess(
                    adminUser,
                    'quote_management',
                    action,
                    {
                        related_id: quote._id,
                        related_collection: 'logistics_quotes',
                        metadata: logMetadata,
                    },
                    req
                );
            }
        } catch (logError) {
            console.error('Error creating log:', logError);
        }

        return res.status(200).json({
            message: isUpdate 
                ? "Logistics quote updated successfully" 
                : "Logistics quote created successfully",
            data: quote,
            quote_id: quote._id,
            code: 200
        });

    } catch (error) {
        // Log failure
        try {
            const adminUser = await admin.findById(req.user._id);
            if (adminUser) {
                // Determine if this was an attempted update or create
                const wasUpdateAttempt = req.body.quote_id || req.body._id;
                const action = wasUpdateAttempt ? 'update' : 'create';
                
                await logFailure(
                    adminUser,
                    'quote_management',
                    action,
                    error,
                    {
                        related_collection: 'logistics_quotes',
                        metadata: {
                            quote_type: 'logistics',
                            enquiry_id: req.body.enquiry_id,
                            logistics_id: req.body.logistics_id,
                            action_attempted: action,
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
            // Include approved status for manual enquiries created by admin
            status: { $in: ["pending", "approved", "delivery", "supplier_quote_accepted"] },
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
            // Include approved and supplier_quote_accepted for manual enquiries and enquiries with accepted supplier quotes
            status: { $in: ["pending", "approved", "delivery", "supplier_quote_accepted", "logistics_quote_accepted"] },
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
                                        // Case-insensitive check for active status
                                        { 
                                            $regexMatch: { 
                                                input: "$status", 
                                                regex: "^active$", 
                                                options: "i" 
                                            } 
                                        }
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
                                        // Case-insensitive check for active status
                                        { 
                                            $regexMatch: { 
                                                input: "$status", 
                                                regex: "^active$", 
                                                options: "i" 
                                            } 
                                        }
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

        // Log for debugging
        console.log('🔍 getLogisticsList - Found logistics:', logistics.length);
        if (logistics.length > 0) {
            console.log('🔍 Sample logistics subscription data:', {
                name: logistics[0].full_name,
                subscription: logistics[0].subscription
            });
        }

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

/**
 * Send Final Quote to Buyer
 * This API is used by admin to send the final quote to the buyer
 * after supplier and logistics quotes have been accepted
 */
exports.sendFinalQuoteToBuyer = async (req, res) => {
    try {
        const adminId = req.user._id;
        const adminName = req.user.full_name || req.user.email || 'Admin';
        const { 
            enquiry_id, 
            payment_terms_id,
            admin_margin,
            admin_margin_type,
            additional_notes,
            logistics_price_override,
            supplier_price_override
        } = req.body;

        // Validate enquiry_id
        if (!enquiry_id || !mongoose.Types.ObjectId.isValid(enquiry_id)) {
            return utils.handleError(res, {
                message: "Valid enquiry ID is required",
                code: 400,
            });
        }

        // Get enquiry with all related data
        const enquiry = await Enquiry.findById(enquiry_id)
            .populate('user_id', 'full_name email')
            .populate('selected_payment_terms')
            .populate('shipping_address')
            .populate({
                path: 'selected_supplier.quote_id',
                populate: [
                    { path: 'user_id', select: 'full_name email company_data' },
                    { path: 'pickup_address' }
                ]
            })
            .populate({
                path: 'selected_logistics.quote_id',
                populate: [
                    { path: 'user_id', select: 'full_name email company_data' }
                ]
            });

        if (!enquiry) {
            return utils.handleError(res, {
                message: "Enquiry not found",
                code: 404,
            });
        }

        // Check if final quote was already sent
        if (enquiry.status === 'final_quote_sent' || enquiry.final_quote_sent_at) {
            return utils.handleError(res, {
                message: "Final quote has already been sent for this enquiry",
                code: 400,
            });
        }

        // Validate that supplier quote is selected OR price override is provided
        if (!enquiry.selected_supplier?.quote_id && (!supplier_price_override || supplier_price_override <= 0)) {
            return utils.handleError(res, {
                message: "A supplier quote must be accepted or supplier price must be provided before sending final quote",
                code: 400,
            });
        }

        const supplierQuote = enquiry.selected_supplier?.quote_id;
        const logisticsQuote = enquiry.selected_logistics?.quote_id;

        // Calculate supplier total - Use override if provided, otherwise calculate from quote
        let supplierTotal = 0;
        if (supplier_price_override && supplier_price_override > 0) {
            // Use provided override
            supplierTotal = supplier_price_override;
        } else if (supplierQuote && supplierQuote.enquiry_items) {
            // Calculate from quote
            supplierQuote.enquiry_items.forEach(item => {
                supplierTotal += (item.unit_price || 0) * (item.available_quantity || item.quantity?.value || 0);
            });
            // Add custom charges
            supplierTotal += supplierQuote.custom_charges_one?.value || 0;
            if (supplierQuote.custom_charges_two?.charge_type === 'flat') {
                supplierTotal += supplierQuote.custom_charges_two?.value || 0;
            } else if (supplierQuote.custom_charges_two?.charge_type === 'percentage') {
                supplierTotal += (supplierTotal * (supplierQuote.custom_charges_two?.value || 0)) / 100;
            }
            // Subtract discount
            if (supplierQuote.discount?.charge_type === 'flat') {
                supplierTotal -= supplierQuote.discount?.value || 0;
            } else if (supplierQuote.discount?.charge_type === 'percentage') {
                supplierTotal -= (supplierTotal * (supplierQuote.discount?.value || 0)) / 100;
            }
        }

        // Calculate logistics total - Use override if provided
        let logisticsTotal = 0;
        if (logistics_price_override && logistics_price_override > 0) {
            logisticsTotal = logistics_price_override;
        } else if (logisticsQuote) {
            logisticsTotal = logisticsQuote.shipping_fee || 0;
        }

        // Calculate admin margin
        let adminMarginAmount = 0;
        const marginValue = admin_margin || 0;
        const marginType = admin_margin_type || 'flat';
        const subtotal = supplierTotal + logisticsTotal;
        
        if (marginType === 'flat') {
            adminMarginAmount = marginValue;
        } else if (marginType === 'percentage') {
            // Percentage is calculated on subtotal (supplier + logistics)
            adminMarginAmount = (subtotal * marginValue) / 100;
        }

        // Calculate grand total for buyer
        const grandTotal = subtotal + adminMarginAmount;

        // Update payment terms if provided
        let paymentTermsUpdate = {};
        if (payment_terms_id && mongoose.Types.ObjectId.isValid(payment_terms_id)) {
            paymentTermsUpdate = { selected_payment_terms: payment_terms_id };
        }

        const previousStatus = enquiry.status;

        // Update enquiry with final quote details
        const updatedEnquiry = await Enquiry.findByIdAndUpdate(
            enquiry_id,
            {
                $set: {
                    status: 'final_quote_sent',
                    supplier_charges: supplierTotal,
                    logistics_charges: logisticsTotal,
                    admin_price: adminMarginAmount,
                    admin_grand_total: grandTotal,
                    grand_total: grandTotal,
                    final_quote_sent_at: new Date(),
                    final_quote_sent_by: adminId,
                    additional_notes: additional_notes || enquiry.additional_notes,
                    ...paymentTermsUpdate
                },
                $push: {
                    activity_logs: {
                        action: 'final_quote_sent',
                        description: `Final quote sent to buyer by admin ${adminName}`,
                        performed_by: {
                            user_id: adminId,
                            user_type: 'admin',
                            name: adminName
                        },
                        previous_status: previousStatus,
                        new_status: 'final_quote_sent',
                        metadata: {
                            supplier_charges: supplierTotal,
                            logistics_charges: logisticsTotal,
                            admin_margin: adminMarginAmount,
                            admin_margin_type: marginType,
                            grand_total: grandTotal,
                            payment_terms_id: payment_terms_id
                        },
                        created_at: new Date()
                    }
                }
            },
            { new: true }
        ).populate('user_id', 'full_name email')
         .populate('selected_payment_terms');

        console.log("✅ Final quote sent to buyer:", {
            enquiry_id: enquiry_id,
            buyer: enquiry.user_id?.email,
            grand_total: grandTotal
        });

        // Send email to buyer
        const frontendUrl = process.env.FRONTEND_PROD_URL || process.env.FRONTEND_URL || 'https://bsoservices.com/';
        // Remove trailing slash if exists to avoid double slashes
        const cleanFrontendUrl = frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl;

        if (enquiry.user_id?.email) {
            const buyerMailOptions = {
                to: enquiry.user_id.email,
                subject: `Final Quote Ready - Enquiry #${enquiry.enquiry_unique_id}`,
                template: "FinalQuoteSent",
                context: {
                    name: enquiry.user_id.full_name || "Valued Customer",
                    enquiry_id: enquiry.enquiry_unique_id,
                    enquiry_number: enquiry.enquiry_number,
                    supplier_name: supplierQuote.user_id?.full_name || supplierQuote.user_id?.company_data?.name || "Supplier",
                    logistics_name: logisticsQuote?.user_id?.full_name || logisticsQuote?.user_id?.company_data?.name || "N/A",
                    supplier_charges: supplierTotal,
                    logistics_charges: logisticsTotal,
                    grand_total: grandTotal,
                    currency: enquiry.currency || supplierQuote.currency || 'GBP',
                    payment_terms: updatedEnquiry.selected_payment_terms?.name || "To be confirmed",
                    additional_notes: additional_notes || "",
                    view_link: `${cleanFrontendUrl}/enquiry-review-page/${enquiry._id}`,
                    app_name: process.env.APP_NAME || 'BSO Services'
                }
            };
            try {
                await emailer.sendEmail(null, buyerMailOptions, "FinalQuoteSent");
                console.log("📧 Final quote email sent to buyer:", enquiry.user_id.email);
            } catch (emailError) {
                console.error("❌ Failed to send final quote email to buyer:", emailError.message);
            }
        }

        // Create admin log
        try {
            await createLog({
                admin_id: adminId,
                admin_name: adminName,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'enquiry',
                action: 'send_final_quote',
                related_id: enquiry_id,
                related_collection: 'enquires',
                status: 'success',
                details: {
                    enquiry_unique_id: enquiry.enquiry_unique_id,
                    buyer_name: enquiry.user_id?.full_name,
                    buyer_email: enquiry.user_id?.email,
                    supplier_charges: supplierTotal,
                    logistics_charges: logisticsTotal,
                    admin_margin: adminMarginAmount,
                    grand_total: grandTotal
                },
                req
            });
        } catch (logError) {
            console.error("❌ Failed to create admin log:", logError.message);
        }

        return res.status(200).json({
            message: "Final quote sent to buyer successfully",
            code: 200,
            data: {
                enquiry_id: enquiry_id,
                enquiry_unique_id: enquiry.enquiry_unique_id,
                status: 'final_quote_sent',
                supplier_charges: supplierTotal,
                logistics_charges: logisticsTotal,
                admin_margin: adminMarginAmount,
                grand_total: grandTotal,
                final_quote_sent_at: updatedEnquiry.final_quote_sent_at
            }
        });

    } catch (error) {
        console.error("❌ Error sending final quote to buyer:", error);
        utils.handleError(res, error);
    }
}

/**
 * Get Enquiry Activity Logs
 * This API returns all activity logs for an enquiry
 */
exports.getEnquiryActivityLogs = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, {
                message: "Invalid enquiry ID",
                code: 400,
            });
        }

        const enquiry = await Enquiry.findById(id)
            .select('enquiry_unique_id enquiry_number status activity_logs')
            .lean();

        if (!enquiry) {
            return utils.handleError(res, {
                message: "Enquiry not found",
                code: 404,
            });
        }

        return res.status(200).json({
            message: "Activity logs fetched successfully",
            code: 200,
            data: {
                enquiry_id: id,
                enquiry_unique_id: enquiry.enquiry_unique_id,
                enquiry_number: enquiry.enquiry_number,
                current_status: enquiry.status,
                activity_logs: enquiry.activity_logs || []
            }
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}

/**
 * Status flow configuration - defines valid transitions and required actions
 */
const STATUS_FLOW = {
    pending: { next: ['approved', 'rejected', 'cancelled'], label: 'Pending', description: 'Enquiry created, waiting for approval' },
    approved: { next: ['supplier_quote_accepted', 'cancelled'], label: 'Approved', description: 'Enquiry approved' },
    rejected: { next: [], label: 'Rejected', description: 'Enquiry rejected' },
    supplier_quote_accepted: { next: ['logistics_quote_accepted', 'final_quote_sent', 'cancelled'], label: 'Supplier Quote Accepted', description: 'Supplier quote accepted' },
    logistics_quote_accepted: { next: ['final_quote_sent', 'cancelled'], label: 'Logistics Quote Accepted', description: 'Logistics quote accepted' },
    final_quote_sent: { next: ['quote_accepted_by_buyer', 'cancelled'], label: 'Final Quote Sent', description: 'Final quote sent to buyer' },
    quote_accepted_by_buyer: { next: ['payment_pending', 'payment_received', 'cancelled'], label: 'Quote Accepted', description: 'Buyer accepted the quote' },
    payment_pending: { next: ['payment_received', 'cancelled'], label: 'Payment Pending', description: 'Waiting for payment' },
    payment_received: { next: ['order_confirmed', 'cancelled'], label: 'Payment Received', description: 'Payment received' },
    order_confirmed: { next: ['processing', 'cancelled'], label: 'Order Confirmed', description: 'Order confirmed' },
    processing: { next: ['ready_for_pickup', 'self_pickup_ready', 'cancelled'], label: 'Processing', description: 'Order being processed' },
    ready_for_pickup: { next: ['picked_up', 'cancelled'], label: 'Ready for Pickup', description: 'Ready for logistics pickup' },
    self_pickup_ready: { next: ['self_pickup_completed', 'cancelled'], label: 'Ready for Self Pickup', description: 'Ready for buyer pickup' },
    picked_up: { next: ['in_transit', 'cancelled'], label: 'Picked Up', description: 'Logistics picked up' },
    in_transit: { next: ['out_for_delivery', 'cancelled'], label: 'In Transit', description: 'Shipment in transit' },
    out_for_delivery: { next: ['delivered', 'cancelled'], label: 'Out for Delivery', description: 'Out for delivery' },
    delivered: { next: ['completed'], label: 'Delivered', description: 'Order delivered' },
    self_pickup_completed: { next: ['completed'], label: 'Self Pickup Done', description: 'Buyer picked up order' },
    completed: { next: [], label: 'Completed', description: 'Order completed' },
    cancelled: { next: [], label: 'Cancelled', description: 'Order cancelled' }
};

/**
 * Get available next statuses for an enquiry
 */
exports.getAvailableStatuses = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, { message: "Invalid enquiry ID", code: 400 });
        }
        const enquiry = await Enquiry.findById(id).select('status shipment_type');
        if (!enquiry) {
            return utils.handleError(res, { message: "Enquiry not found", code: 404 });
        }
        const currentStatus = enquiry.status || 'pending';
        const statusConfig = STATUS_FLOW[currentStatus];
        let availableStatuses = statusConfig?.next || [];
        
        if (enquiry.shipment_type === 'self-pickup') {
            availableStatuses = availableStatuses.filter(s => !['ready_for_pickup', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s));
        } else {
            availableStatuses = availableStatuses.filter(s => !['self_pickup_ready', 'self_pickup_completed'].includes(s));
        }
        const statusOptions = availableStatuses.map(status => ({
            value: status, label: STATUS_FLOW[status]?.label || status, description: STATUS_FLOW[status]?.description || ''
        }));
        return res.status(200).json({
            code: 200, message: "Available statuses fetched",
            data: {
                current_status: currentStatus, current_label: statusConfig?.label || currentStatus,
                available_statuses: statusOptions,
                all_statuses: Object.entries(STATUS_FLOW).map(([key, val]) => ({ value: key, label: val.label, description: val.description }))
            }
        });
    } catch (error) { utils.handleError(res, error); }
};

/**
 * Update enquiry status with activity logging and email notifications
 */
exports.updateEnquiryStatus = async (req, res) => {
    try {
        const adminId = req.user._id;
        const adminName = req.user.full_name || req.user.email || 'Admin';
        const { enquiry_id, new_status, notes, on_behalf_of, payment_info, tracking_info, cancellation_reason, action_date } = req.body;

        if (!enquiry_id || !mongoose.Types.ObjectId.isValid(enquiry_id)) {
            return utils.handleError(res, { message: "Valid enquiry ID is required", code: 400 });
        }
        if (!new_status) {
            return utils.handleError(res, { message: "New status is required", code: 400 });
        }

        // Handle custom action_date from admin (allows past dates)
        let customActionDate = null;
        if (action_date) {
            customActionDate = new Date(action_date);
            console.log("📅 Using custom action date for status update:", customActionDate);
        } else {
            customActionDate = new Date();
        }

        const enquiry = await Enquiry.findById(enquiry_id)
            .populate('user_id', 'full_name email')
            .populate({ path: 'selected_supplier.quote_id', populate: { path: 'user_id', select: 'full_name email company_data' } })
            .populate({ path: 'selected_logistics.quote_id', populate: { path: 'user_id', select: 'full_name email company_data' } });

        if (!enquiry) {
            return utils.handleError(res, { message: "Enquiry not found", code: 404 });
        }

        const previousStatus = enquiry.status;
        const updateObj = { status: new_status, [`status_timestamps.${new_status.replace(/-/g, '_')}_at`]: customActionDate };

        // Handle payment info
        if (payment_info && ['payment_received', 'payment_pending'].includes(new_status)) {
            updateObj.payment_info = {
                status: new_status === 'payment_received' ? 'received' : 'pending',
                platform: payment_info.platform, transaction_id: payment_info.transaction_id,
                amount_paid: payment_info.amount_paid || enquiry.grand_total,
                payment_date: payment_info.payment_date || customActionDate,
                payment_notes: payment_info.payment_notes, updated_by: adminId, updated_at: customActionDate
            };
        }

        // Handle tracking info
        if (tracking_info && ['picked_up', 'in_transit', 'out_for_delivery'].includes(new_status)) {
            updateObj.tracking_info = {
                ...enquiry.tracking_info?.toObject?.() || enquiry.tracking_info || {},
                tracking_number: tracking_info.tracking_number, carrier: tracking_info.carrier,
                carrier_url: tracking_info.carrier_url, estimated_delivery: tracking_info.estimated_delivery
            };
        }

        // Handle delivery/cancellation
        if (['delivered', 'self_pickup_completed'].includes(new_status)) {
            updateObj['tracking_info.actual_delivery'] = customActionDate;
            if (tracking_info?.receiver_name) updateObj['tracking_info.receiver_name'] = tracking_info.receiver_name;
        }
        if (new_status === 'cancelled') {
            updateObj['status_timestamps.cancelled_at'] = customActionDate;
            updateObj['status_timestamps.cancelled_reason'] = cancellation_reason || 'Cancelled by admin';
        }

        // Build activity log
        const activityLog = {
            action: new_status === 'cancelled' ? 'cancelled' : 'status_updated',
            description: `Status: ${STATUS_FLOW[previousStatus]?.label} → ${STATUS_FLOW[new_status]?.label}${notes ? ': ' + notes : ''}`,
            performed_by: { user_id: adminId, user_type: 'admin', name: adminName },
            previous_status: previousStatus, new_status: new_status,
            metadata: { notes, payment_info, tracking_info, custom_action_date: customActionDate.toISOString() }, 
            created_at: customActionDate
        };
        if (on_behalf_of?.user_type) {
            activityLog.on_behalf_of = { user_id: on_behalf_of.user_id, user_type: on_behalf_of.user_type, name: on_behalf_of.name };
            activityLog.description = `[On behalf of ${on_behalf_of.user_type}] ` + activityLog.description;
        }

        const updatedEnquiry = await Enquiry.findByIdAndUpdate(enquiry_id,
            { $set: updateObj, $push: { activity_logs: activityLog } }, { new: true }
        ).populate('user_id', 'full_name email')
         .populate({ path: 'selected_supplier.quote_id', populate: { path: 'user_id', select: 'full_name email company_data' } })
         .populate({ path: 'selected_logistics.quote_id', populate: { path: 'user_id', select: 'full_name email company_data' } });

        console.log(`✅ Status updated: ${previousStatus} → ${new_status}`, { enquiry_id, admin: adminName });

        // Send emails
        await sendStatusEmails(updatedEnquiry, previousStatus, new_status, { notes, payment_info, tracking_info, cancellation_reason });

        return res.status(200).json({
            code: 200, message: `Status updated to ${STATUS_FLOW[new_status]?.label}`,
            data: { enquiry_id, previous_status: previousStatus, new_status, new_status_label: STATUS_FLOW[new_status]?.label }
        });
    } catch (error) {
        console.error("Error updating status:", error);
        utils.handleError(res, error);
    }
};

async function sendStatusEmails(enquiry, prevStatus, newStatus, opts = {}) {
    const frontendUrl = (process.env.FRONTEND_PROD_URL || 'https://bsoservices.com/').replace(/\/$/, '');
    const buyerEmail = enquiry.user_id?.email;
    const buyerName = enquiry.user_id?.full_name || 'Customer';
    const supplierEmail = enquiry.selected_supplier?.quote_id?.user_id?.email;
    const supplierName = enquiry.selected_supplier?.quote_id?.user_id?.full_name || 'Supplier';
    const logisticsEmail = enquiry.selected_logistics?.quote_id?.user_id?.email;
    const logisticsName = enquiry.selected_logistics?.quote_id?.user_id?.full_name || 'Logistics';
    
    const baseContext = {
        enquiry_id: enquiry.enquiry_unique_id,
        enquiry_number: enquiry.enquiry_number,
        view_link: `${frontendUrl}/enquiry-review-page/${enquiry._id}`,
        app_name: process.env.APP_NAME || 'BSO Services'
    };

    try {
        if (newStatus === 'quote_accepted_by_buyer') {
            if (supplierEmail) {
                await emailer.sendEmail(null, {
                    to: supplierEmail,
                    subject: `Quote Accepted - Enquiry #${baseContext.enquiry_id}`,
                    name: supplierName,
                    buyer_name: buyerName,
                    ...baseContext
                }, "QuoteAcceptedByBuyer");
            }
            if (logisticsEmail) {
                await emailer.sendEmail(null, {
                    to: logisticsEmail,
                    subject: `Quote Accepted - Enquiry #${baseContext.enquiry_id}`,
                    name: logisticsName,
                    buyer_name: buyerName,
                    recipient_type: 'logistics',
                    ...baseContext
                }, "QuoteAcceptedByBuyer");
            }
        }
        
        if (newStatus === 'payment_received' && buyerEmail) {
            await emailer.sendEmail(null, {
                to: buyerEmail,
                subject: `Payment Confirmed - Enquiry #${baseContext.enquiry_id}`,
                name: buyerName,
                amount: enquiry.grand_total,
                currency: enquiry.currency || 'GBP',
                payment_method: opts.payment_info?.platform || 'N/A',
                transaction_id: opts.payment_info?.transaction_id || 'N/A',
                ...baseContext
            }, "PaymentReceived");
        }
        
        if (newStatus === 'ready_for_pickup' && logisticsEmail) {
            await emailer.sendEmail(null, {
                to: logisticsEmail,
                subject: `Pickup Ready - Enquiry #${baseContext.enquiry_id}`,
                name: logisticsName,
                pickup_address: enquiry.selected_supplier?.quote_id?.pickup_address || 'Contact supplier',
                ...baseContext
            }, "ReadyForPickup");
        }
        
        if (['picked_up', 'in_transit', 'out_for_delivery'].includes(newStatus) && buyerEmail) {
            await emailer.sendEmail(null, {
                to: buyerEmail,
                subject: `Shipment Update - Enquiry #${baseContext.enquiry_id}`,
                name: buyerName,
                status: STATUS_FLOW[newStatus]?.label || newStatus,
                tracking_number: opts.tracking_info?.tracking_number || enquiry.tracking_info?.tracking_number || 'N/A',
                carrier: opts.tracking_info?.carrier || enquiry.tracking_info?.carrier || 'N/A',
                ...baseContext
            }, "ShipmentUpdate");
        }
        
        if (['delivered', 'self_pickup_completed'].includes(newStatus) && buyerEmail) {
            await emailer.sendEmail(null, {
                to: buyerEmail,
                subject: `Order Delivered - Enquiry #${baseContext.enquiry_id}`,
                name: buyerName,
                delivery_type: newStatus === 'delivered' ? 'Standard Delivery' : 'Self Pickup',
                delivery_date: new Date().toLocaleDateString(),
                ...baseContext
            }, "OrderDelivered");
        }
        
        if (newStatus === 'cancelled') {
            if (buyerEmail) {
                await emailer.sendEmail(null, {
                    to: buyerEmail,
                    subject: `Order Cancelled - Enquiry #${baseContext.enquiry_id}`,
                    name: buyerName,
                    reason: opts.cancellation_reason || 'Order has been cancelled',
                    ...baseContext
                }, "OrderCancelled");
            }
            if (supplierEmail) {
                await emailer.sendEmail(null, {
                    to: supplierEmail,
                    subject: `Order Cancelled - Enquiry #${baseContext.enquiry_id}`,
                    name: supplierName,
                    reason: opts.cancellation_reason || 'Order has been cancelled',
                    ...baseContext
                }, "OrderCancelled");
            }
            if (logisticsEmail) {
                await emailer.sendEmail(null, {
                    to: logisticsEmail,
                    subject: `Order Cancelled - Enquiry #${baseContext.enquiry_id}`,
                    name: logisticsName,
                    reason: opts.cancellation_reason || 'Order has been cancelled',
                    ...baseContext
                }, "OrderCancelled");
            }
        }
    } catch (e) {
        console.error("Email error:", e);
    }
}

/**
 * Update payment information
 */
exports.updatePaymentInfo = async (req, res) => {
    try {
        const adminId = req.user._id, adminName = req.user.full_name || 'Admin';
        const { enquiry_id, platform, transaction_id, amount_paid, payment_date, payment_notes, payment_status } = req.body;
        if (!enquiry_id || !mongoose.Types.ObjectId.isValid(enquiry_id)) return utils.handleError(res, { message: "Valid enquiry ID required", code: 400 });
        
        const updateObj = {
            'payment_info.platform': platform, 'payment_info.transaction_id': transaction_id,
            'payment_info.amount_paid': amount_paid, 'payment_info.payment_date': payment_date || new Date(),
            'payment_info.payment_notes': payment_notes, 'payment_info.status': payment_status || 'received',
            'payment_info.updated_by': adminId, 'payment_info.updated_at': new Date()
        };
        const log = { action: 'payment_info_added', description: `Payment: ${platform} - ${transaction_id || 'N/A'}`,
            performed_by: { user_id: adminId, user_type: 'admin', name: adminName },
            metadata: { platform, transaction_id, amount_paid }, created_at: new Date() };

        await Enquiry.findByIdAndUpdate(enquiry_id, { $set: updateObj, $push: { activity_logs: log } });
        return res.status(200).json({ code: 200, message: "Payment info updated" });
    } catch (error) { utils.handleError(res, error); }
};

/**
 * Update tracking information
 */
exports.updateTrackingInfo = async (req, res) => {
    try {
        const adminId = req.user._id, adminName = req.user.full_name || 'Admin';
        const { enquiry_id, tracking_number, carrier, carrier_url, estimated_delivery } = req.body;
        if (!enquiry_id || !mongoose.Types.ObjectId.isValid(enquiry_id)) return utils.handleError(res, { message: "Valid enquiry ID required", code: 400 });
        
        const updateObj = { 'tracking_info.tracking_number': tracking_number, 'tracking_info.carrier': carrier,
            'tracking_info.carrier_url': carrier_url, 'tracking_info.estimated_delivery': estimated_delivery };
        const log = { action: 'tracking_updated', description: `Tracking: ${carrier} - ${tracking_number}`,
            performed_by: { user_id: adminId, user_type: 'admin', name: adminName },
            metadata: { tracking_number, carrier }, created_at: new Date() };

        await Enquiry.findByIdAndUpdate(enquiry_id, { $set: updateObj, $push: { activity_logs: log } });
        return res.status(200).json({ code: 200, message: "Tracking info updated" });
    } catch (error) { utils.handleError(res, error); }
};

/**
 * Get enquiry status timeline
 */
exports.getEnquiryStatusTimeline = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) return utils.handleError(res, { message: "Invalid ID", code: 400 });
        
        const enquiry = await Enquiry.findById(id)
            .select('enquiry_unique_id status shipment_type status_timestamps payment_info tracking_info activity_logs grand_total currency')
            .populate('user_id', 'full_name email')
            .populate({ path: 'selected_supplier.quote_id', populate: { path: 'user_id', select: 'full_name email company_data' } })
            .populate({ path: 'selected_logistics.quote_id', populate: { path: 'user_id', select: 'full_name email company_data' } }).lean();
        if (!enquiry) return utils.handleError(res, { message: "Not found", code: 404 });

        const isDelivery = enquiry.shipment_type === 'delivery';
        const steps = isDelivery 
            ? ['pending','approved','supplier_quote_accepted','logistics_quote_accepted','final_quote_sent','quote_accepted_by_buyer','payment_pending','payment_received','order_confirmed','processing','ready_for_pickup','picked_up','in_transit','out_for_delivery','delivered','completed']
            : ['pending','approved','supplier_quote_accepted','final_quote_sent','quote_accepted_by_buyer','payment_pending','payment_received','order_confirmed','processing','self_pickup_ready','self_pickup_completed','completed'];
        
        const idx = steps.indexOf(enquiry.status);
        const timeline = steps.map((s, i) => ({
            status: s, label: STATUS_FLOW[s]?.label, description: STATUS_FLOW[s]?.description,
            completed: i < idx || enquiry.status === 'completed', current: i === idx, pending: i > idx,
            timestamp: enquiry.status_timestamps?.[`${s}_at`]
        }));

        return res.status(200).json({ code: 200, data: {
            enquiry_id: id, current_status: enquiry.status, current_label: STATUS_FLOW[enquiry.status]?.label,
            shipment_type: enquiry.shipment_type, timeline, payment_info: enquiry.payment_info,
            tracking_info: enquiry.tracking_info, buyer: enquiry.user_id,
            supplier: enquiry.selected_supplier?.quote_id?.user_id, logistics: enquiry.selected_logistics?.quote_id?.user_id,
            grand_total: enquiry.grand_total, currency: enquiry.currency, activity_logs: enquiry.activity_logs?.slice(-20) || []
        }});
    } catch (error) { utils.handleError(res, error); }
}