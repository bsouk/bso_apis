const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Query = require("../../models/query");
const Enquiry = require("../../models/Enquiry");
const BidSetting = require("../../models/bidsetting");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const admin = require("../../models/admin");
const bidsetting = require("../../models/bidsetting");
const quotation = require("../../models/quotation");
const moment = require("moment");
const version_history = require("../../models/version_history");
const query_assigned_suppliers = require("../../models/query_assigned_suppliers");
const subscription = require("../../models/subscription");
const fcm_devices = require("../../models/fcm_devices");
const Notification = require("../../models/notification");
const EnquiryQuotes = require("../../models/EnquiryQuotes");
const logistics_quotes = require("../../models/logistics_quotes");
const User = require("../../models/user");
const Address = require("../../models/address");
const quantity_units = require("../../models/quantity_units");
const { createLog, logSuccess, logFailure } = require("../../utils/logger");
const { getCleanFrontendUrl, getEnquiryReviewUrl } = require("../../utils/urlHelper");
const { notifyAllSuperAdmins } = require("../../utils/notifyAdmins");

exports.getquery = async (req, res) => {
    try {
        const { search, userSearch, offset = 0, limit = 10 } = req.query;

        const filter = {
            is_deleted: { $ne: true }
        };

        if (search) {
            filter.query_unique_id = { $regex: search, $options: "i" };
        }

        // Optional: filter by user (search by user email, name, phone, or id)
        if (userSearch && typeof userSearch === 'string' && userSearch.trim()) {
            const term = userSearch.trim();
            const isObjectId = mongoose.Types.ObjectId.isValid(term) && /^[a-fA-F0-9]{24}$/.test(term);
            const userConditions = [
                { email: { $regex: term, $options: 'i' } },
                { full_name: { $regex: term, $options: 'i' } },
                { first_name: { $regex: term, $options: 'i' } },
                { last_name: { $regex: term, $options: 'i' } },
                { phone_number: { $regex: term, $options: 'i' } },
                { unique_user_id: { $regex: term, $options: 'i' } }
            ];
            if (isObjectId) userConditions.push({ _id: new mongoose.Types.ObjectId(term) });
            const users = await User.find({ $or: userConditions }).select('_id').lean();
            const userIds = users.map((u) => u._id);
            filter.createdByUser = userIds.length ? { $in: userIds } : { $in: [] };
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
        const existingRecords = await Enquiry.find({ _id: { $in: ids } });

        if (existingRecords.length !== ids.length) {
            return res.status(404).json({
                message: "One or more IDs do not match any records.",
                code: 404
            });
        }

        // Get enquiry details for logging
        const enquiryNumbers = existingRecords.map(e => e.enquiry_unique_id || e._id.toString()).join(', ');

        const result = await Enquiry.deleteMany({ _id: { $in: ids } });
        const assigned_supplier_result = await query_assigned_suppliers.deleteMany({ query_id: { $in: ids } })
        const query_quotation = await quotation.deleteMany({ query_id: { $in: ids } })

        // Log successful deletion
        try {
            await createLog({
                admin_id: req.user._id,
                admin_name: req.user.full_name || `${req.user.first_name} ${req.user.last_name}`,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'manual_enquiry',
                action: 'delete',
                status: 'success',
                related_id: ids.length === 1 ? ids[0] : null,
                related_collection: 'enquiries',
                details: {
                    deleted_count: result.deletedCount,
                    enquiry_numbers: enquiryNumbers,
                    enquiry_ids: ids,
                    also_deleted: {
                        assigned_suppliers: assigned_supplier_result.deletedCount || 0,
                        quotations: query_quotation.deletedCount || 0
                    }
                },
                req: req
            });
        } catch (logError) {
            console.error("Error creating log for delete query:", logError);
        }

        res.json({
            message: `${result.deletedCount} query(s) deleted successfully.`,
            code: 200
        });
    } catch (error) {
        console.error("Error in deletequery:", error);

        // Log failed deletion
        try {
            await createLog({
                admin_id: req.user._id,
                admin_name: req.user.full_name || `${req.user.first_name} ${req.user.last_name}`,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'manual_enquiry',
                action: 'delete',
                status: 'failure',
                related_id: req.body.ids?.[0] || null,
                related_collection: 'enquiries',
                details: {
                    enquiry_ids: req.body.ids || [],
                    error_type: error.name || 'Unknown'
                },
                error_message: error.message,
                error_stack: error.stack,
                req: req
            });
        } catch (logError) {
            console.error("Error creating log for failed delete query:", logError);
        }

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
        const { status, search, userSearch, offset = 0, limit = 10, brand, countries, plan_step, start_date, end_date } = req.query;
        console.log('offset : ', offset, " limit : ", limit)
        const filter = {};
        let brandfilter = {}
        let countryFilter = {};
        let dateFilter = {};

        if (plan_step) {
            filter['subscription.plan.plan_step'] = plan_step;
        }

        if (brand) {
            brandfilter = {
                'enquiry_items.brand': { $regex: brand, $options: "i" }
            }
        }
        if (status) {
            filter.status = status;
        }

        // Primary search for Query Management.
        // Business requirement: search should be based on Enquiry Number,
        // not only the internal Query/Enquiry ID.
        // We still support searching by the old `enquiry_unique_id` for backwards compatibility,
        // but the UI and API both treat `search` as "Enquiry Number".
        if (search && typeof search === 'string' && search.trim()) {
            const term = search.trim();
            filter.$or = [
                { enquiry_number: { $regex: term, $options: "i" } },
                { enquiry_unique_id: { $regex: term, $options: "i" } },
                { enquiry_id: { $regex: term, $options: "i" } },
            ];
        }

        // Filter by buyer/user: search by email, name, phone, or id (works alongside enquiry ID search)
        if (userSearch && typeof userSearch === 'string' && userSearch.trim()) {
            const term = userSearch.trim();
            const isObjectId = mongoose.Types.ObjectId.isValid(term) && /^[a-fA-F0-9]{24}$/.test(term);
            const userConditions = [
                { email: { $regex: term, $options: 'i' } },
                { full_name: { $regex: term, $options: 'i' } },
                { first_name: { $regex: term, $options: 'i' } },
                { last_name: { $regex: term, $options: 'i' } },
                { phone_number: { $regex: term, $options: 'i' } },
                { unique_user_id: { $regex: term, $options: 'i' } }
            ];
            if (isObjectId) userConditions.push({ _id: new mongoose.Types.ObjectId(term) });
            const users = await User.find({ $or: userConditions }).select('_id').lean();
            const userIds = users.map((u) => u._id);
            filter.user_id = userIds.length ? { $in: userIds } : { $in: [] };
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

        // ⭐ Date range filter
        if (start_date || end_date) {
            dateFilter.createdAt = {};
            if (start_date) {
                dateFilter.createdAt.$gte = new Date(start_date);
            }
            if (end_date) {
                // Add one day to end_date to include the entire end date
                const endDateObj = new Date(end_date);
                endDateObj.setDate(endDateObj.getDate() + 1);
                dateFilter.createdAt.$lt = endDateObj;
            }
            console.log("dateFilter : ", dateFilter);
        }

        let count = 0
        console.log("brandfilter : ", brandfilter, " filter : ", filter, " dateFilter : ", dateFilter)
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
                                $match: {
                                    status: "active",
                                    type: "buyer"
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
                    $lookup: {
                        from: "enquiry_quotes",
                        localField: "_id",
                        foreignField: "enquiry_id",
                        as: "supplier_quote"
                    }
                },
                {
                    $lookup: {
                        from: "logistics_quotes",
                        localField: "_id",
                        foreignField: "enquiry_id",
                        as: "logistics_quotes"
                    }
                },
                {
                    $addFields: {
                        total_supplier_quote: { $size: "$supplier_quote" },
                        total_logistics_quote: { $size: "$logistics_quotes" }
                    }
                },
                {
                    $match: {
                        ...filter,
                        ...countryFilter,
                        ...dateFilter
                    },
                },
                {
                    $group: {
                        _id: "$_id",
                        user: { $first: "$user" },
                        enquiry_unique_id: { $first: "$enquiry_unique_id" },
                        enquiry_id: { $first: "$enquiry_id" },
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
                        subscription: { $first: "$subscription" },
                        total_supplier_quote: { $first: "$total_supplier_quote" },
                        total_logistics_quote: { $first: "$total_logistics_quote" },
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

        count = await Enquiry.countDocuments({ ...filter, ...brandfilter, ...countryFilter, ...dateFilter });

        // ═══════════════════════════════════════════════════
        // COMPREHENSIVE STATS CALCULATION (ALL STATUSES)
        // ═══════════════════════════════════════════════════
        const statsFilter = { ...brandfilter, ...countryFilter, ...dateFilter };
        
        const totalCount = await Enquiry.countDocuments(statsFilter);
        const pendingCount = await Enquiry.countDocuments({ ...statsFilter, status: "pending" });
        const approvedCount = await Enquiry.countDocuments({ ...statsFilter, status: "approved" });
        const supplierQuoteAcceptedCount = await Enquiry.countDocuments({ ...statsFilter, status: "supplier_quote_accepted" });
        const logisticsQuoteAcceptedCount = await Enquiry.countDocuments({ ...statsFilter, status: "logistics_quote_accepted" });
        const finalQuoteSentCount = await Enquiry.countDocuments({ ...statsFilter, status: "final_quote_sent" });
        const quoteAcceptedByBuyerCount = await Enquiry.countDocuments({ ...statsFilter, status: "quote_accepted_by_buyer" }); // ⭐ Added
        const paymentPendingCount = await Enquiry.countDocuments({ ...statsFilter, status: "payment_pending" }); // ⭐ Added
        const paymentReceivedCount = await Enquiry.countDocuments({ ...statsFilter, status: "payment_received" });
        const orderConfirmedCount = await Enquiry.countDocuments({ ...statsFilter, status: "order_confirmed" }); // ⭐ Added
        const processingCount = await Enquiry.countDocuments({ ...statsFilter, status: "processing" }); // ⭐ Added
        const readyForPickupCount = await Enquiry.countDocuments({ ...statsFilter, status: "ready_for_pickup" }); // ⭐ Added
        const pickedUpCount = await Enquiry.countDocuments({ ...statsFilter, status: "picked_up" }); // ⭐ Added
        const inTransitCount = await Enquiry.countDocuments({ ...statsFilter, status: "in_transit" }); // ⭐ Added
        const outForDeliveryCount = await Enquiry.countDocuments({ ...statsFilter, status: "out_for_delivery" }); // ⭐ Added
        const shipmentReadyCount = await Enquiry.countDocuments({ ...statsFilter, status: "shipment_ready" });
        const logisticPickupCount = await Enquiry.countDocuments({ ...statsFilter, status: "logistic_pickup" });
        const deliveredCount = await Enquiry.countDocuments({ ...statsFilter, status: "delivered" });
        const selfPickupReadyCount = await Enquiry.countDocuments({ ...statsFilter, status: "self_pickup_ready" }); // ⭐ Added
        const selfPickupCompletedCount = await Enquiry.countDocuments({ ...statsFilter, status: "self_pickup_completed" }); // ⭐ Added
        const selfDeliveredCount = await Enquiry.countDocuments({ ...statsFilter, status: "self_delivered" });
        const completedCount = await Enquiry.countDocuments({ 
            ...statsFilter, 
            status: { $in: ["completed", "delivered", "self_delivered", "self_pickup_completed"] } 
        });
        const cancelledCount = await Enquiry.countDocuments({ ...statsFilter, status: "cancelled" });
        const rejectedCount = await Enquiry.countDocuments({ ...statsFilter, status: "rejected" });
        
        // Check for expired enquiries (expiry_date < today and status is still pending/approved)
        const today = new Date();
        const expiredCount = await Enquiry.countDocuments({ 
            ...statsFilter,
            expiry_date: { $lt: today },
            status: { $in: ["pending", "approved"] }
        });

        const splitCount = await Enquiry.countDocuments({ 
            ...statsFilter,
            selected_supplier: { $exists: true } 
        });

        return res.json({ 
            data, 
            count, 
            totalCount, 
            pendingCount,
            approvedCount,
            supplierQuoteAcceptedCount,
            logisticsQuoteAcceptedCount,
            finalQuoteSentCount,
            quoteAcceptedByBuyerCount, // ⭐ Added
            paymentPendingCount, // ⭐ Added
            paymentReceivedCount,
            orderConfirmedCount, // ⭐ Added
            processingCount, // ⭐ Added
            readyForPickupCount, // ⭐ Added
            pickedUpCount, // ⭐ Added
            inTransitCount, // ⭐ Added
            outForDeliveryCount, // ⭐ Added
            shipmentReadyCount,
            logisticPickupCount,
            deliveredCount,
            selfPickupReadyCount, // ⭐ Added
            selfPickupCompletedCount, // ⭐ Added
            selfDeliveredCount,
            completedCount,
            cancelledCount,
            rejectedCount,
            expiredCount,
            splitCount,
            code: 200 
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getEnquiryDetails = async (req, res) => {
    try {
        const { id } = req.params
        console.log("id : ", id)
        const data = await Enquiry.findOne({ _id: id }).populate('selected_payment_terms').populate("shipping_address").populate("enquiry_items.quantity.unit")
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
                        status: "active",
                        type: "buyer"
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
        const { id, status, reason } = req.body;
        const adminId = req.user._id;
        const adminName = req.user.full_name || req.user.email || 'Admin';
        console.log("data : ", req.body);

        // Get current enquiry for activity log
        const currentEnquiry = await Enquiry.findById(id).populate('user_id', 'full_name email');
        if (!currentEnquiry) {
            return res.status(404).json({
                message: "Enquiry not found",
                code: 404
            });
        }

        const previousStatus = currentEnquiry.status;
        const newStatus = status === "rejected" ? "rejected" : "approved";

        const result = await Enquiry.findOneAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(id)
            },
            {
                $set: {
                    is_approved: status,
                    status: newStatus
                },
                $push: {
                    activity_logs: {
                        action: status === "rejected" ? 'enquiry_rejected' : 'enquiry_approved',
                        description: `Enquiry ${status === "rejected" ? 'rejected' : 'approved'} by admin ${adminName}${reason ? '. Reason: ' + reason : ''}`,
                        performed_by: {
                            user_id: adminId,
                            user_type: 'admin',
                            name: adminName
                        },
                        previous_status: previousStatus,
                        new_status: newStatus,
                        metadata: {
                            reason: reason || null
                        },
                        created_at: new Date()
                    }
                }
            },
            { new: true }
        );
        console.log("result : ", result);

        // Log admin action
        try {
            await createLog({
                admin_id: adminId,
                admin_name: adminName,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'enquiry',
                action: status === "rejected" ? 'reject' : 'approve',
                related_id: id,
                related_collection: 'enquires',
                status: 'success',
                details: {
                    enquiry_unique_id: currentEnquiry.enquiry_unique_id,
                    buyer_name: currentEnquiry.user_id?.full_name,
                    buyer_email: currentEnquiry.user_id?.email,
                    previous_status: previousStatus,
                    new_status: newStatus,
                    reason: reason || null
                },
                req
            });
        } catch (logError) {
            console.error("❌ Failed to create admin log:", logError.message);
        }

        return res.status(200).json({
            message: `Enquiry ${status} successfully`,
            data: result,
            code: 200
        });
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.planChangeRequest = async (req, res) => {
    try {
        const { id } = req.body
        console.log("id : ", id)
        const data = await Enquiry.findOne({ _id: id })
        console.log("data : ", data)

        const userFcmDevices = await fcm_devices.find({ user_id: data?.user_id });
        console.log("userFcmDevices : ", userFcmDevices)
        let notificationbody = {
            title: 'Plan Change Request',
            description: `As we can see on your enquiry number ${data?.enquiry_unique_id}, no supplier has quoted yet. We request you to change your current plan to BSO Admin.`
        }
        if (userFcmDevices && userFcmDevices.length > 0) {
            userFcmDevices.forEach(async i => {
                const token = i.token
                console.log("token : ", token)
                await utils.sendNotification(token, notificationbody);
            })
            let dbnotificationbody = {
                title: notificationbody.title,
                description: notificationbody.description,
                type: "admin_action",
                receiver_id: data?.user_id,
                related_to: data?.user_id,
                related_to_type: "user",
            }
            const newuserNotification = new Notification(dbnotificationbody);
            console.log("newuserNotification : ", newuserNotification)
            await newuserNotification.save();
        }
        return res.status(200).json({
            message: "Plan change request sent successfully",
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getdownloadSingleEnquiryPdfdata = async (req, res) => {
    try {
        const { id } = req.params
        const enquiry = await Enquiry.findOne({ _id: id }).populate('user_id').populate('shipping_address').populate('selected_supplier.quote_id').populate('selected_logistics.quote_id').sort({ createdAt: -1 })
        console.log("enquiry : ", enquiry)
        const supplierquote = await EnquiryQuotes.find({ enquiry_id: new mongoose.Types.ObjectId(id) }).populate('user_id').populate("enquiry_items.quantity.unit").populate({
            path: "enquiry_id",
            select: "enquiry_unique_id user_id priority shipping_address expiry_date",
            populate: {
                path: "shipping_address",
                select: "address"
            }
        }).populate("pickup_address", "address")
        const logisticsquote = await logistics_quotes.find({ enquiry_id: id })
            .populate({
                path: 'enquiry_id',
                populate: [
                    {
                        path: "selected_supplier.quote_id",
                        populate: { path: "pickup_address", strictPopulate: false }
                    },
                    {
                        path: "enquiry_items.quantity.unit"
                    }
                ]
            });
        console.log("logistics data : ", logisticsquote, " supplier data : ", supplierquote)
        return res.status(200).json({
            message: "Enquiry data fetched successfully",
            enquiry,
            supplier_quote: supplierquote,
            logistics_quote: logisticsquote,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

/**
 * Create Manual Enquiry by Admin
 * POST /admin/createManualEnquiry
 * Creates an enquiry on behalf of a selected buyer
 */
exports.createManualEnquiry = async (req, res) => {
    try {
        const { user_id, ...enquiryData } = req.body;
        const admin_id = req.user._id;
        const admin_email = req.user.email;
        const admin_name = req.user.username || req.user.email;

        console.log("Admin creating manual enquiry for user:", user_id);

        // ═══════════════════════════════════════════════════
        // STEP 1: VALIDATE BUYER EXISTS
        // ═══════════════════════════════════════════════════
        const buyer = await User.findById(user_id).lean();
        if (!buyer) {
            return res.status(404).json({
                message: "Buyer not found",
                code: 404
            });
        }

        console.log("📧 createManualEnquiry – buyer _id:", buyer._id, "| email:", buyer.email || "(none)", "| full_name:", buyer.full_name || buyer.first_name);

        // Check if user is a valid buyer:
        // - Has 'buyer' in user_type array, OR
        // - Has 'company' in user_type array (companies can be buyers), OR
        // - Has buyer_type set (direct-buyer or indirect-buyer)
        const isBuyer = buyer.user_type?.includes('buyer') || 
                        buyer.user_type?.includes('company') || 
                        buyer.buyer_type === 'direct-buyer' || 
                        buyer.buyer_type === 'indirect-buyer';
        
        if (!isBuyer) {
            return res.status(400).json({
                message: "Selected user is not a buyer. User must be a buyer, company, or have a buyer type set.",
                code: 400
            });
        }

        console.log("Buyer found:", buyer.full_name || buyer.first_name, "| buyer_type:", buyer.buyer_type, "| user_type:", buyer.user_type);

        // ═══════════════════════════════════════════════════
        // STEP 2: CHECK BUYER SUBSCRIPTION (REQUIRED)
        // Buyer must have an active subscription (free or paid) to create enquiry
        // ═══════════════════════════════════════════════════
        const buyerSubscription = await subscription.aggregate([
            {
                $match: {
                    user_id: new mongoose.Types.ObjectId(user_id),
                    status: "active",
                    type: "buyer"
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
        ]);

        // Check if buyer has active subscription - REQUIRED
        if (buyerSubscription.length === 0) {
            console.log("❌ Buyer has no active subscription, cannot create enquiry");
            return res.status(400).json({
                message: "Buyer does not have an active subscription. Please ensure the buyer has subscribed to a plan (free or paid) before creating an enquiry.",
                code: 400
            });
        }
        console.log("✅ Buyer subscription found:", buyerSubscription[0]?.plan?.plan_name)

        // ═══════════════════════════════════════════════════
        // STEP 3: PROCESS ENQUIRY ITEMS (UNITS)
        // ═══════════════════════════════════════════════════
        if (enquiryData.enquiry_items && Array.isArray(enquiryData.enquiry_items)) {
            for (let item of enquiryData.enquiry_items) {
                if (item.quantity && item.quantity.unit) {
                    const unitValue = item.quantity.unit;
                    
                    // Check if unit is a string (temporary unit) instead of ObjectId
                    if (typeof unitValue === 'string' && !mongoose.Types.ObjectId.isValid(unitValue)) {
                        // This is a temporary unit name, create it in database
                        let existingUnit = await quantity_units.findOne({ unit: unitValue });
                        
                        if (!existingUnit) {
                            // Create new unit in database
                            existingUnit = await quantity_units.create({ unit: unitValue });
                            console.log("Created new unit:", existingUnit.unit);
                        }
                        
                        // Replace string with ObjectId
                        item.quantity.unit = existingUnit._id;
                    }
                }
            }
        }

        // ═══════════════════════════════════════════════════
        // STEP 4: GENERATE UNIQUE ENQUIRY ID
        // ═══════════════════════════════════════════════════
        async function generateUniqueEnquiryId() {
            let isUnique = false;
            let enquiryId = '';
            let attempts = 0;
            const maxAttempts = 10;
            
            while (!isUnique && attempts < maxAttempts) {
                const token = Math.floor(Math.random() * 1000000);
                enquiryId = `#${token}`;
                
                // Check if this ID already exists
                const existingEnquiry = await Enquiry.findOne({
                    $or: [
                        { enquiry_unique_id: enquiryId },
                        { enquiry_number: enquiryId }
                    ]
                });
                
                if (!existingEnquiry) {
                    isUnique = true;
                }
                attempts++;
            }
            
            if (!isUnique) {
                // Use timestamp-based ID as fallback
                enquiryId = `#${Date.now()}`;
            }
            
            return enquiryId;
        }

        // ═══════════════════════════════════════════════════
        // ALWAYS GENERATE enquiry_unique_id (System ID - Format: #123456)
        // enquiry_number is separate - user-provided reference (optional)
        // ═══════════════════════════════════════════════════
        const enquiryUniqueId = await generateUniqueEnquiryId();
        
        // enquiry_number can be:
        // 1. Custom provided by admin, OR
        // 2. Default to enquiry_unique_id if not provided
        const enquiryNumber = enquiryData.enquiry_number && enquiryData.enquiry_number.trim() !== '' 
            ? enquiryData.enquiry_number.trim() 
            : enquiryUniqueId; // Default to unique_id if not provided

        // System enquiry_id (bso-enq-xxxxx) for search and conditional display
        const { generateEnquiryId } = require("../../utils/enquiryIdGenerator");
        const systemEnquiryId = await generateEnquiryId(Enquiry);
        
        console.log("✅ Generated enquiry_unique_id:", enquiryUniqueId);
        console.log("✅ Enquiry number:", enquiryNumber);
        console.log("✅ Enquiry ID (bso-enq):", systemEnquiryId);

        // ═══════════════════════════════════════════════════
        // STEP 5: CREATE ENQUIRY
        // ═══════════════════════════════════════════════════
        
        // Handle custom created_date from admin (allows past dates)
        let customCreatedAt = null;
        if (enquiryData.created_date) {
            customCreatedAt = new Date(enquiryData.created_date);
            // Validate that expiry_date is after created_date
            if (enquiryData.expiry_date) {
                const expiryDate = new Date(enquiryData.expiry_date);
                if (expiryDate <= customCreatedAt) {
                    return res.status(400).json({
                        message: "Expiry date must be after the created date",
                        code: 400
                    });
                }
            }
            console.log("Using custom created date:", customCreatedAt);
        }
        
        const newEnquiryData = {
            ...enquiryData,
            enquiry_unique_id: enquiryUniqueId,
            enquiry_id: systemEnquiryId,
            enquiry_number: enquiryNumber,
            user_id: user_id,
            buyer_plan_step: buyerSubscription[0]?.plan?.plan_step || null,
            is_approved: "approved",
            created_by_admin: admin_id,
            status: "approved", // Manual enquiries are auto-approved
            // Set custom createdAt if provided
            ...(customCreatedAt && { createdAt: customCreatedAt }),
            activity_logs: [{
                action: 'enquiry_created',
                description: `Manual enquiry created by admin ${req.user.full_name || req.user.email} on behalf of buyer ${buyer.full_name || buyer.email}`,
                performed_by: {
                    user_id: admin_id,
                    user_type: 'admin',
                    name: req.user.full_name || req.user.email
                },
                on_behalf_of: {
                    user_id: buyer._id,
                    user_type: 'buyer',
                    name: buyer.full_name || buyer.email
                },
                previous_status: null,
                new_status: 'approved',
                metadata: {
                    items_count: enquiryData.enquiry_items?.length || 0,
                    priority: enquiryData.priority,
                    shipment_type: enquiryData.shipment_type,
                    custom_created_date: customCreatedAt ? customCreatedAt.toISOString() : null
                },
                created_at: customCreatedAt || new Date()
            }]
        };

        console.log("Creating enquiry with data:", {
            enquiry_unique_id: enquiryUniqueId,
            enquiry_number: enquiryNumber,
            buyer: buyer.email,
            items_count: enquiryData.enquiry_items?.length || 0
        });

        const newEnquiry = await Enquiry.create(newEnquiryData);
        console.log("Enquiry created successfully:", newEnquiry._id);

        // ═══════════════════════════════════════════════════
        // STEP 6: SEND EMAIL TO BUYER
        // ═══════════════════════════════════════════════════
        const buyerEmail = buyer.email || (buyer.company_data && buyer.company_data.email) || null;
        console.log("📧 Admin manual enquiry – buyer email for notification:", buyerEmail || "(none)");

        if (buyerEmail) {
            try {
                const enquiryPlain = (newEnquiry && typeof newEnquiry.toObject === 'function') ? newEnquiry.toObject() : (typeof newEnquiry === 'object' ? JSON.parse(JSON.stringify(newEnquiry)) : {});
                const buyerEmailOptions = {
                    to: buyerEmail,
                    subject: `Enquiry Created Successfully - Ref: ${newEnquiry.enquiry_unique_id}`,
                    app_name: process.env.APP_NAME || 'Blue Sky',
                    name: buyer.full_name || buyer.first_name || 'Buyer',
                    app_url: getCleanFrontendUrl(),
                    storage_url: process.env.STORAGE_BASE_URL || 'https://bso-content.s3.eu-west-2.amazonaws.com/public/',
                    enquiry: enquiryPlain,
                    view_link: getEnquiryReviewUrl(newEnquiry._id)
                };

                await emailer.sendEmail(null, buyerEmailOptions, "AdminCreatedEnquiry");
                console.log("✅ Email sent to buyer:", buyerEmail);
            } catch (emailError) {
                console.error("❌ Failed to send email to buyer:", buyerEmail, emailError?.message || emailError);
                // Don't fail the request if email fails
            }
        } else {
            console.warn("⚠️ Buyer has no email (user_id:", user_id, "). AdminCreatedEnquiry email skipped.");
        }

        // ═══════════════════════════════════════════════════
        // STEP 7: SEND FCM NOTIFICATION TO BUYER (OPTIONAL)
        // ═══════════════════════════════════════════════════
        try {
            const buyerFcmDevices = await fcm_devices.find({ user_id: buyer._id });
            
            if (buyerFcmDevices && buyerFcmDevices.length > 0) {
                const notificationMessage = {
                    title: 'New Enquiry Created for You',
                    description: `Blue Sky admin has created an enquiry on your behalf. Enquiry ID: ${newEnquiry.enquiry_unique_id}`,
                    enquiry_id: newEnquiry._id
                };

                for (const device of buyerFcmDevices) {
                    await utils.sendNotification(device.token, notificationMessage);
                }

                // Save notification in database
                const buyerNotificationData = {
                    title: notificationMessage.title,
                    body: notificationMessage.description,
                    type: "manual_enquiry_created",
                    receiver_id: buyer._id,
                    related_to: newEnquiry._id,
                    related_to_type: "enquiry",
                };
                const newNotification = new Notification(buyerNotificationData);
                await newNotification.save();
                
                console.log("✅ Push notification sent to buyer");
            }
        } catch (notificationError) {
            console.error("❌ Failed to send push notification:", notificationError.message);
            // Don't fail the request if notification fails
        }

        // ═══════════════════════════════════════════════════
        // STEP 7b: NOTIFY ALL SUPER_ADMINS (DB + FCM; works in dev) – await so notification is saved before response
        // ═══════════════════════════════════════════════════
        const enquiryIdDisplay = newEnquiry.enquiry_unique_id || newEnquiry._id?.toString() || 'N/A';
        try {
            const { saved, fcmSent } = await notifyAllSuperAdmins({
                title: `New Enquiry (Manual) – ${enquiryIdDisplay}`,
                description: `Admin created an enquiry for buyer. Enquiry ID: ${enquiryIdDisplay}`,
                type: 'new_enquiry',
                related_to: newEnquiry._id,
                related_to_type: 'enquiry',
            });
            if (saved > 0 || fcmSent > 0) console.log(`[createManualEnquiry] Admin notification: saved=${saved}, fcmSent=${fcmSent}`);
        } catch (err) {
            console.error('[createManualEnquiry] Admin notification error:', err);
        }

        // ═══════════════════════════════════════════════════
        // STEP 8: LOG SUCCESS
        // ═══════════════════════════════════════════════════
        await createLog({
            admin_id: admin_id,
            admin_name: req.user.full_name || `${req.user.first_name} ${req.user.last_name}`,
            admin_email: admin_email,
            admin_role: req.user.role,
            feature: 'manual_enquiry',
            action: 'create',
            related_id: newEnquiry._id,
            related_collection: 'enquiries',
            status: 'success',
            details: {
                enquiry_unique_id: newEnquiry.enquiry_unique_id,
                items_count: enquiryData.enquiry_items?.length || 0,
                priority: enquiryData.priority,
                shipment_type: enquiryData.shipment_type
            },
            metadata: {
                buyer_id: buyer._id,
                buyer_name: buyer.full_name || buyer.first_name,
                buyer_email: buyer.email,
                buyer_company: buyer.company_data?.name || null,
                enquiry_number: newEnquiry.enquiry_unique_id,
                enquiry_items_count: enquiryData.enquiry_items?.length || 0,
                shipping_country: newEnquiry.shipping_address?.address?.country?.name || null,
                plan_step: buyerSubscription[0]?.plan?.plan_step || null
            },
            req
        });

        // ═══════════════════════════════════════════════════
        // STEP 10: RETURN SUCCESS RESPONSE
        // ═══════════════════════════════════════════════════
        return res.status(200).json({
            message: "Enquiry created successfully for buyer",
            data: newEnquiry,
            emails_sent: {
                buyer: true,
                admin: true
            },
            code: 200
        });

    } catch (error) {
        console.error("❌ Error creating manual enquiry:", error);
        
        // ═══════════════════════════════════════════════════
        // LOG FAILURE
        // ═══════════════════════════════════════════════════
        await createLog({
            admin_id: req.user._id,
            admin_name: req.user.full_name || `${req.user.first_name} ${req.user.last_name}`,
            admin_email: req.user.email,
            admin_role: req.user.role,
            feature: 'manual_enquiry',
            action: 'create',
            status: 'failed',
            error_message: error.message,
            error_stack: error.stack,
            details: {
                attempted_buyer_id: req.body.user_id,
                error_type: error.name
            },
            metadata: {
                buyer_id: req.body.user_id,
                items_count: req.body.enquiry_items?.length || 0
            },
            req
        });
        
        utils.handleError(res, error);
    }
}

/**
 * Get User Addresses for Admin
 * GET /admin/getUserAddresses/:userId
 * Fetches all addresses of a specific user
 */
exports.getUserAddresses = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                message: "User ID is required",
                code: 400
            });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                code: 404
            });
        }

        // Fetch user's addresses
        const addresses = await Address.find({ user_id: userId }).sort({ default_address: -1, createdAt: -1 });

        return res.status(200).json({
            message: "User addresses fetched successfully",
            data: addresses,
            count: addresses.length,
            code: 200
        });

    } catch (error) {
        console.error("Error fetching user addresses:", error);
        utils.handleError(res, error);
    }
}

/**
 * Create Address for User (by Admin)
 * POST /admin/createUserAddress
 * Allows admin to create address for a specific user
 */
exports.createUserAddress = async (req, res) => {
    try {
        const { user_id, address, default_address, first_name, last_name, company_name, phone_number, email } = req.body;

        if (!user_id) {
            return res.status(400).json({
                message: "User ID is required",
                code: 400
            });
        }

        // Verify user exists
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                code: 404
            });
        }

        // Check if this should be default address
        if (default_address) {
            // Remove default from other addresses
            await Address.updateMany(
                { user_id: user_id },
                { $set: { default_address: false, is_primary: false } }
            );
        }

        // Structure the address data properly
        const addressData = {
            user_id: user_id,
            first_name: first_name || user.first_name || "",
            last_name: last_name || user.last_name || "",
            company_name: company_name || user.company_data?.name || "",
            phone_number: phone_number || user.phone_number || "",
            email: email || user.email || "",
            address: {
                address_line_1: address.address || address.address_line_1 || "",
                address_line_2: address.address_line_2 || "",
                city: {
                    name: address.city || "",
                    iso_code: ""
                },
                state: {
                    name: address.state?.name || address.state || "",
                    iso_code: address.state?.iso_code || address.state || ""
                },
                country: {
                    name: address.country?.name || address.country || "",
                    iso_code: address.country?.iso_code || address.country || ""
                },
                pin_code: address.postal_code || address.pin_code || ""
            },
            default_address: default_address || false,
            is_primary: default_address || false,
            address_type: address.address_type || "Home"
        };

        // Create new address
        const newAddress = await Address.create(addressData);

        console.log("Address created for user:", user.email);

        return res.status(200).json({
            message: "Address created successfully",
            data: newAddress,
            code: 200
        });

    } catch (error) {
        console.error("Error creating user address:", error);
        utils.handleError(res, error);
    }
}

/**
 * Send Enquiry to Suppliers
 * POST /admin/sendEnquiryToSuppliers
 * Sends enquiry notification (email + FCM) to selected or all suppliers
 */
exports.sendEnquiryToSuppliers = async (req, res) => {
    try {
        const { enquiry_id, send_to_all, supplier_ids } = req.body;

        console.log("📤 Sending enquiry to suppliers:", { enquiry_id, send_to_all, supplier_ids });

        // Validation
        if (!enquiry_id) {
            return res.status(400).json({
                message: "Enquiry ID is required",
                code: 400
            });
        }

        if (!send_to_all && (!supplier_ids || supplier_ids.length === 0)) {
            return res.status(400).json({
                message: "Please select at least one supplier or choose 'Send to All'",
                code: 400
            });
        }

        // Fetch enquiry details with populated data
        const enquiry = await Enquiry.findById(enquiry_id)
            .populate('user_id shipping_address');

        if (!enquiry) {
            return res.status(404).json({
                message: "Enquiry not found",
                code: 404
            });
        }

        // Get suppliers list
        let suppliers;
        if (send_to_all) {
            suppliers = await User.find({
                user_type: { $in: ['supplier'] },
                status: 'active',
                is_deleted: false,
                is_trashed: { $ne: true }
            });
        } else {
            suppliers = await User.find({
                _id: { $in: supplier_ids },
                user_type: { $in: ['supplier'] },
                is_deleted: false
            });
        }

        if (!suppliers || suppliers.length === 0) {
            return res.status(404).json({
                message: "No suppliers found",
                code: 404
            });
        }

        const frontendUrl = process.env.FRONTEND_PROD_URL || 'https://bsoservices.com/';
        const storageUrl = process.env.STORAGE_BASE_URL || 'https://bso-content.s3.eu-west-2.amazonaws.com/public/';

        // Send notifications to each supplier
        let emailsSent = 0;
        let fcmSent = 0;
        const recipientDetails = []; // Track detailed recipient information

        for (const supplier of suppliers) {
            const recipientInfo = {
                supplier_id: supplier._id,
                supplier_name: supplier.full_name,
                supplier_email: supplier.email,
                email_sent: false,
                fcm_sent: false,
                error: null
            };

            try {
                // Send Email
                const mailOptions = {
                    to: supplier.email,
                    subject: `New Enquiry Available for Quote - ${enquiry.enquiry_unique_id}`,
                    supplier_name: supplier.full_name,
                    buyer_name: enquiry.user_id?.full_name || 'BSO Customer',
                    app_url: frontendUrl,
                    storage_url: storageUrl,
                    enquiry: enquiry,
                    view_link: `${frontendUrl}enquiry-review-page/${enquiry._id}`
                };

                await emailer.sendEmail(null, mailOptions, "NewEnquiryNotification");
                emailsSent++;
                recipientInfo.email_sent = true;

                // Send FCM Notification
                const notificationMessage = {
                    title: 'New Enquiry Available',
                    description: `A new enquiry ${enquiry.enquiry_unique_id} is available for quoting. Priority: ${enquiry.priority}`,
                    enquiry_id: enquiry._id
                };

                const fcmDevices = await fcm_devices.find({ user_id: supplier._id });
                if (fcmDevices && fcmDevices.length > 0) {
                    for (const device of fcmDevices) {
                        await utils.sendNotification(device.token, notificationMessage);
                    }
                    fcmSent++;
                    recipientInfo.fcm_sent = true;
                }

                // Save notification record
                const supplierNotification = new Notification({
                    title: notificationMessage.title,
                    body: notificationMessage.description,
                    type: "new_enquiry",
                    receiver_id: supplier._id,
                    related_to: enquiry._id,
                    related_to_type: "enquiry"
                });
                await supplierNotification.save();

            } catch (error) {
                console.error(`Error sending to supplier ${supplier.email}:`, error);
                recipientInfo.error = error.message;
                // Continue with next supplier even if one fails
            }

            recipientDetails.push(recipientInfo);
        }

        // Log successful send to suppliers
        try {
            await createLog({
                admin_id: req.user._id,
                admin_name: req.user.full_name || `${req.user.first_name} ${req.user.last_name}`,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'manual_enquiry',
                action: 'send_to_suppliers',
                status: 'success',
                related_id: enquiry_id,
                related_collection: 'enquiries',
                details: {
                    enquiry_number: enquiry.enquiry_unique_id,
                    buyer_name: enquiry.user_id?.full_name || 'N/A',
                    buyer_email: enquiry.user_id?.email || 'N/A',
                    send_to_all: send_to_all,
                    total_suppliers: suppliers.length,
                    emails_sent: emailsSent,
                    fcm_sent: fcmSent,
                    sent_by_admin: req.user.full_name || `${req.user.first_name} ${req.user.last_name}`,
                    sent_by_email: req.user.email,
                    recipients: recipientDetails // Detailed list of all recipients
                },
                req: req
            });
        } catch (logError) {
            console.error("Error creating log for send to suppliers:", logError);
        }

        return res.status(200).json({
            message: `Enquiry sent to ${suppliers.length} supplier(s) successfully`,
            data: {
                total_suppliers: suppliers.length,
                emails_sent: emailsSent,
                fcm_sent: fcmSent
            },
            code: 200
        });

    } catch (error) {
        console.error("❌ Error sending enquiry to suppliers:", error);

        // Log failed send to suppliers
        try {
            await createLog({
                admin_id: req.user._id,
                admin_name: req.user.full_name || `${req.user.first_name} ${req.user.last_name}`,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'manual_enquiry',
                action: 'send_to_suppliers',
                status: 'failure',
                related_id: req.body.enquiry_id || null,
                related_collection: 'enquiries',
                details: {
                    send_to_all: req.body.send_to_all,
                    supplier_ids: req.body.supplier_ids || [],
                    error_type: error.name || 'Unknown'
                },
                error_message: error.message,
                error_stack: error.stack,
                req: req
            });
        } catch (logError) {
            console.error("Error creating log for failed send to suppliers:", logError);
        }

        utils.handleError(res, error);
    }
}

/**
 * Send Enquiry to Logistics
 * POST /admin/sendEnquiryToLogistics
 * Sends enquiry notification (email + FCM) to selected or all logistics providers
 */
exports.sendEnquiryToLogistics = async (req, res) => {
    try {
        const { enquiry_id, send_to_all, logistics_ids } = req.body;

        console.log("📤 Sending enquiry to logistics:", { enquiry_id, send_to_all, logistics_ids });

        // Validation
        if (!enquiry_id) {
            return res.status(400).json({
                message: "Enquiry ID is required",
                code: 400
            });
        }

        if (!send_to_all && (!logistics_ids || logistics_ids.length === 0)) {
            return res.status(400).json({
                message: "Please select at least one logistics provider or choose 'Send to All'",
                code: 400
            });
        }

        // Fetch enquiry details with populated data
        const enquiry = await Enquiry.findById(enquiry_id)
            .populate('user_id shipping_address');

        if (!enquiry) {
            return res.status(404).json({
                message: "Enquiry not found",
                code: 404
            });
        }

        // Get logistics list
        let logisticsProviders;
        if (send_to_all) {
            logisticsProviders = await User.find({
                user_type: { $in: ['logistics'] },
                status: 'active',
                is_deleted: false,
                is_trashed: { $ne: true }
            });
        } else {
            logisticsProviders = await User.find({
                _id: { $in: logistics_ids },
                user_type: { $in: ['logistics'] },
                is_deleted: false
            });
        }

        if (!logisticsProviders || logisticsProviders.length === 0) {
            return res.status(404).json({
                message: "No logistics providers found",
                code: 404
            });
        }

        const frontendUrl = process.env.FRONTEND_PROD_URL || 'https://bsoservices.com/';
        const storageUrl = process.env.STORAGE_BASE_URL || 'https://bso-content.s3.eu-west-2.amazonaws.com/public/';

        // Send notifications to each logistics provider
        let emailsSent = 0;
        let fcmSent = 0;
        const recipientDetails = []; // Track detailed recipient information

        for (const logistics of logisticsProviders) {
            const recipientInfo = {
                logistics_id: logistics._id,
                logistics_name: logistics.full_name,
                logistics_email: logistics.email,
                email_sent: false,
                fcm_sent: false,
                error: null
            };

            try {
                // Send Email
                const mailOptions = {
                    to: logistics.email,
                    subject: `New Logistics Enquiry Available - ${enquiry.enquiry_unique_id}`,
                    logistics_name: logistics.full_name,
                    buyer_name: enquiry.user_id?.full_name || 'BSO Customer',
                    app_url: frontendUrl,
                    storage_url: storageUrl,
                    enquiry: enquiry,
                    view_link: `${frontendUrl}enquiry-review-page/${enquiry._id}`
                };

                await emailer.sendEmail(null, mailOptions, "NewLogisticsEnquiry");
                emailsSent++;
                recipientInfo.email_sent = true;

                // Send FCM Notification
                const notificationMessage = {
                    title: 'New Logistics Enquiry Available',
                    description: `A new logistics enquiry ${enquiry.enquiry_unique_id} is available for quoting. Priority: ${enquiry.priority}`,
                    enquiry_id: enquiry._id
                };

                const fcmDevices = await fcm_devices.find({ user_id: logistics._id });
                if (fcmDevices && fcmDevices.length > 0) {
                    for (const device of fcmDevices) {
                        await utils.sendNotification(device.token, notificationMessage);
                    }
                    fcmSent++;
                    recipientInfo.fcm_sent = true;
                }

                // Save notification record
                const logisticsNotification = new Notification({
                    title: notificationMessage.title,
                    body: notificationMessage.description,
                    type: "new_enquiry",
                    receiver_id: logistics._id,
                    related_to: enquiry._id,
                    related_to_type: "enquiry"
                });
                await logisticsNotification.save();

            } catch (error) {
                console.error(`Error sending to logistics ${logistics.email}:`, error);
                recipientInfo.error = error.message;
                // Continue with next logistics provider even if one fails
            }

            recipientDetails.push(recipientInfo);
        }

        // Log successful send to logistics
        try {
            await createLog({
                admin_id: req.user._id,
                admin_name: req.user.full_name || `${req.user.first_name} ${req.user.last_name}`,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'manual_enquiry',
                action: 'send_to_logistics',
                status: 'success',
                related_id: enquiry_id,
                related_collection: 'enquiries',
                details: {
                    enquiry_number: enquiry.enquiry_unique_id,
                    buyer_name: enquiry.user_id?.full_name || 'N/A',
                    buyer_email: enquiry.user_id?.email || 'N/A',
                    send_to_all: send_to_all,
                    total_logistics: logisticsProviders.length,
                    emails_sent: emailsSent,
                    fcm_sent: fcmSent,
                    sent_by_admin: req.user.full_name || `${req.user.first_name} ${req.user.last_name}`,
                    sent_by_email: req.user.email,
                    recipients: recipientDetails // Detailed list of all recipients
                },
                req: req
            });
        } catch (logError) {
            console.error("Error creating log for send to logistics:", logError);
        }

        return res.status(200).json({
            message: `Enquiry sent to ${logisticsProviders.length} logistics provider(s) successfully`,
            data: {
                total_logistics: logisticsProviders.length,
                emails_sent: emailsSent,
                fcm_sent: fcmSent
            },
            code: 200
        });

    } catch (error) {
        console.error("❌ Error sending enquiry to logistics:", error);

        // Log failed send to logistics
        try {
            await createLog({
                admin_id: req.user._id,
                admin_name: req.user.full_name || `${req.user.first_name} ${req.user.last_name}`,
                admin_email: req.user.email,
                admin_role: req.user.role,
                feature: 'manual_enquiry',
                action: 'send_to_logistics',
                status: 'failure',
                related_id: req.body.enquiry_id || null,
                related_collection: 'enquiries',
                details: {
                    send_to_all: req.body.send_to_all,
                    logistics_ids: req.body.logistics_ids || [],
                    error_type: error.name || 'Unknown'
                },
                error_message: error.message,
                error_stack: error.stack,
                req: req
            });
        } catch (logError) {
            console.error("Error creating log for failed send to logistics:", logError);
        }

        utils.handleError(res, error);
    }
}

/**
 * Check if Enquiry Number Already Exists
 * GET /admin/checkEnquiryNumberExists
 * Used for real-time validation before creating enquiry
 */
exports.checkEnquiryNumberExists = async (req, res) => {
    try {
        const { enquiry_number } = req.query;
        
        if (!enquiry_number || enquiry_number.trim() === '') {
            return res.status(400).json({
                message: "Enquiry number is required",
                code: 400
            });
        }
        
        const trimmedNumber = enquiry_number.trim();
        
        const existingEnquiry = await Enquiry.findOne({
            $or: [
                { enquiry_unique_id: trimmedNumber },
                { enquiry_number: trimmedNumber }
            ]
        }).select('_id enquiry_unique_id enquiry_number');
        
        if (existingEnquiry) {
            return res.status(200).json({
                exists: true,
                message: `Enquiry number "${trimmedNumber}" already exists`,
                code: 200
            });
        }
        
        return res.status(200).json({
            exists: false,
            message: "Enquiry number is available",
            code: 200
        });
        
    } catch (error) {
        console.error("Error checking enquiry number:", error);
        utils.handleError(res, error);
    }
}

