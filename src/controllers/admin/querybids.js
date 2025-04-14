const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Query = require("../../models/query");
const Enquiry = require("../../models/Enquiry");
const BidSetting = require("../../models/bidsetting");
const utils = require("../../utils/utils");
const admin = require("../../models/admin");
const bidsetting = require("../../models/bidsetting");
const quotation = require("../../models/quotation");
const moment = require("moment");
const version_history = require("../../models/version_history");
const query_assigned_suppliers = require("../../models/query_assigned_suppliers");
const subscription = require("../../models/subscription");

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

        const is_supplier_assigned = await query_assigned_suppliers.find({ query_id, is_selected: true })
        console.log('is_supplier_assigned : ', is_supplier_assigned)

        if (is_supplier_assigned.length === 0) {
            const response = await final_quotes.map(async (i) => {
                const newquote = await query_assigned_suppliers.create({
                    query_id,
                    is_selected: true,
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
            // let result = await Promise.all(
            //     final_quotes.map(async i =>
            //         query_assigned_suppliers.findOneAndUpdate(
            //             {
            //                 query_id: new mongoose.Types.ObjectId(query_id),
            //                 variant_id : new mongoose.Types.ObjectId(i?.variant_id),
            //                 product_id : new mongoose.Types.ObjectId(i?.product_id),
            //                 is_selected: true
            //             },
            //             {
            //                 $set: {
            //                     admin_approved_quotes: i?.supplier_quote,
            //                     logistics_price: i?.logistics_price,
            //                     admin_margin: {
            //                         value: i?.admin_margin?.value,
            //                         margin_type: i?.admin_margin?.margin_type
            //                     }
            //                 }
            //             },
            //             { new: true }
            //         )
            //     )
            // );
            let result = await final_quotes.map(async i => {
                const response = await query_assigned_suppliers.findOneAndUpdate(
                    {
                        query_id: new mongoose.Types.ObjectId(query_id),
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
                            }
                        }
                    },
                    { new: true }
                )
                console.log("response : ", response)
                if (!response || response.admin_approved_quotes === null) {
                    const newquote = await query_assigned_suppliers.create({
                        query_id,
                        is_selected: true,
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

        const final_quotes = await Query.aggregate(
            // [
            //     {
            //         $match: {
            //             _id: new mongoose.Types.ObjectId(id)
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
            //                             $eq: ["$$id", "$query_id"]
            //                         },
            //                         is_selected: true
            //                     }
            //                 },
            //                 {
            //                     $project: {
            //                         supplier_quote: 1,
            //                         admin_approved_quotes: 1,
            //                         admin_margin: 1,
            //                         product_id: 1,
            //                         variant_id: 1,
            //                         logistics_price: 1
            //                     }
            //                 }
            //             ],
            //             as: "assigned_suppliers"
            //         }
            //     },
            //     {
            //         $addFields: {
            //             queryDetails: {
            //                 $map: {
            //                     input: "$queryDetails",
            //                     as: "qd",
            //                     in: {
            //                         $mergeObjects: [
            //                             "$$qd",
            //                             {
            //                                 supplier_quotes: {
            //                                     $map: {
            //                                         input: {
            //                                             $filter: {
            //                                                 input:
            //                                                     "$assigned_suppliers",
            //                                                 as: "sq",
            //                                                 cond: {
            //                                                     $and: [
            //                                                         {
            //                                                             $eq: [
            //                                                                 "$$sq.product_id",
            //                                                                 "$$qd.product.id"
            //                                                             ]
            //                                                         },
            //                                                         {
            //                                                             $eq: [
            //                                                                 "$$sq.variant_id",
            //                                                                 "$$qd.variant._id"
            //                                                             ]
            //                                                         }
            //                                                     ]
            //                                                 }
            //                                             }
            //                                         },
            //                                         as: "filtered_supplier",
            //                                         in: {
            //                                             quote_details:
            //                                                 "$$filtered_supplier.supplier_quote",
            //                                             matched_variant_id:
            //                                                 "$$filtered_supplier.variant_id"
            //                                         }
            //                                     }
            //                                 },
            //                                 final_quote: {
            //                                     $map: {
            //                                         input: {
            //                                             $filter: {
            //                                                 input:
            //                                                     "$assigned_suppliers",
            //                                                 as: "sq",
            //                                                 cond: {
            //                                                     $and: [
            //                                                         {
            //                                                             $eq: [
            //                                                                 "$$sq.product_id",
            //                                                                 "$$qd.product.id"
            //                                                             ]
            //                                                         },
            //                                                         {
            //                                                             $eq: [
            //                                                                 "$$sq.variant_id",
            //                                                                 "$$qd.variant._id"
            //                                                             ]
            //                                                         }
            //                                                     ]
            //                                                 }
            //                                             }
            //                                         },
            //                                         as: "filtered_supplier",
            //                                         in: {
            //                                             final_price_by_admin:
            //                                                 "$$filtered_supplier.admin_approved_quotes",
            //                                             logistics_price:
            //                                                 "$$filtered_supplier.logistics_price",
            //                                             admin_margin:
            //                                                 "$$filtered_supplier.admin_margin",
            //                                             matched_variant_id:
            //                                                 "$$filtered_supplier.variant_id"
            //                                         }
            //                                     }
            //                                 }
            //                             }
            //                         ]
            //                     }
            //                 }
            //             }
            //         }
            //     },
            //     {
            //         $project: {
            //             assigned_suppliers: 0
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
                        from: "query_assigned_suppliers",
                        let: { id: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$query_id"]
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
                                    logistics_price: 1
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
                                input: "$queryDetails",
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
                                            }
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
                        assigned_suppliers: 0
                    }
                }
            ]
        )

        return res.status(200).json({
            message: "final quote list generated successfully",
            data: final_quotes[0],
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



// New Flow

exports.getAllEnquiry = async (req, res) => {
    try {
        const { status, search, offset = 0, limit = 10, brand, countries } = req.query;
        console.log('offset : ', offset, " limit : ", limit)
        const filter = {};
        let brandfilter = {}
        let countryFilter = {};

        if (brand) {
            brandfilter = {
                'enquiry_items.brand': { $regex: brand, $options: "i" }
            }
        }
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.enquiry_unique_id = { $regex: search, $options: "i" };
        }

        if (countries) {
            const countryList = countries.split(',').map(country => country.trim());
            console.log("countryList : ", countryList)
            countryFilter = {
                // shipping_address: {
                "shipping_address_data.address.country.name": {
                    $regex: countryList.join('|'),
                    $options: 'i'
                }
            };
            console.log("countryFilter : ", countryFilter)
        }

        let count = 0
        console.log("brandfilter : ", brandfilter, " filter : ", filter)
        const data = await Enquiry.aggregate(
            [
                {
                    $unwind: {
                        path: "$enquiry_items",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: brandfilter
                },
                {
                    $lookup: {
                        from: "quantity_units",
                        let: { unitId: "$enquiry_items.quantity.unit" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$unitId"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    unit: 1
                                }
                            }
                        ],
                        as: "enquiry_items.quantity_unit_data"
                    }
                },
                {
                    $unwind: {
                        path: "$enquiry_items.quantity_unit_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "user_id",
                        foreignField: "_id",
                        as: "user",
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    full_name: 1,
                                    email: 1,
                                }
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$user",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "subscriptions",
                        localField: "user_id",
                        foreignField: "user_id",
                        as: "subscription",
                        pipeline: [
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
                            }
                        ]
                    }
                },
                {
                    $unwind: {
                        path: "$subscription",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "addresses",
                        localField: "shipping_address",
                        foreignField: "_id",
                        as: "shipping_address_data"
                    }
                },
                {
                    $unwind: {
                        path: "$shipping_address_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: {
                        ...filter,
                        ...countryFilter
                    },
                },
                {
                    $group: {
                        _id: "$_id",
                        user: { $first: "$user" },
                        enquiry_unique_id: { $first: "$enquiry_unique_id" },
                        status: { $first: "$status" },
                        expiry_date: { $first: "$expiry_date" },
                        priority: { $first: "$priority" },
                        enquiry_number: { $first: "$enquiry_number" },
                        // shipping_address: { $first: "$shipping_address" },
                        shipping_address: { $first: "$shipping_address_data" },
                        currency: { $first: "$currency" },
                        documents: { $first: "$documents" },
                        enquiry_items: { $push: "$enquiry_items" },
                        delivery_charges: { $first: "$delivery_charges" },
                        reply: { $first: "$reply" },
                        createdAt: { $first: "$createdAt" },
                        updatedAt: { $first: "$updatedAt" },
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
            ]
        );

        count = await Enquiry.countDocuments({ ...filter, ...brandfilter, ...countryFilter });

        const totalCount = await Enquiry.countDocuments()
        const pendingCount = await Enquiry.countDocuments({ status: "pending" })
        const splitCount = await Enquiry.countDocuments({ selected_supplier: { $exists: true } })

        return res.json({ data, count, totalCount, pendingCount, splitCount, code: 200 });

    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getEnquiryDetails = async (req, res) => {
    try {
        const { id } = req.params
        console.log("id : ", id)
        const data = await Enquiry.findOne({ _id: id }).populate("shipping_address").populate("enquiry_items.quantity.unit")
        console.log("data : ", data)
        if (!data) {
            return utils.handleError(res, {
                message: "Query data not found",
                code: 404,
            });
        }

        const subscriptiondata = await subscription.aggregate(
            [
                {
                    $match: {
                        user_id: new mongoose.Types.ObjectId(data?.user_id),
                        status: "active"
                    }
                },
                {
                    $lookup: {
                        from: 'plans',
                        localField: 'plan_id',
                        foreignField: 'plan_id',
                        as: 'plan'
                    }
                },
                {
                    $unwind: {
                        path: '$plan',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: {
                        createdAt: -1
                    }
                },
                {
                    $limit: 1
                }
            ]
        )

        console.log("subscriptiondata : ", subscriptiondata)

        return res.status(200).json({
            message: "Query details fetched successfully",
            data,
            subscription_data: subscriptiondata[0],
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.approveRejectEnquiry = async (req, res) => {
    try {
        const { id, status } = req.body
        console.log("data : ", req.body)

        let updata = {
            is_approved: status,
            status: status === "rejected" ? "rejected" : "pending"
        }
        const result = await Enquiry.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(id)
            },
            {
                $set: updata
            },
            { new: true }
        )
        console.log("result : ", result)

        return res.status(200).json({
            message: `Query ${status} successfully`,
            data: result,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}