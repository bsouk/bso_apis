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
const query = require("../../models/query");
const query_assigned_suppliers = require("../../models/query_assigned_suppliers");

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
        let data = []
        if (user_data.user_type === "buyer") {
            data = await query.aggregate([
                {
                    $match: { createdByUser: userId }
                },
                {
                    $lookup: {
                        from: "quotations",
                        let: { id: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$query_id"]
                                    }
                                }
                            },
                            {
                                $match: filter
                            },
                        ],
                        as: "quotations"
                    }
                },
                {
                    $unwind: {
                        path: "$quotations",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 0,
                        quotations: 1
                    }
                },
                {
                    $sort: { createdAt: -1 },
                },
                { $skip: parseInt(offset) },
                { $limit: parseInt(limit) }
            ]);

            console.log("quotations: ", data);
        }

        if (user_data.user_type === "supplier") {
            data = await query_assigned_suppliers.aggregate(
                [
                    {
                        $match: {
                            variant_assigned_to: new mongoose.Types.ObjectId(userId)
                        }
                    },
                    {
                        $lookup: {
                            from: "quotations",
                            let: { id: "$quotation_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ["$$id", "$_id"]
                                        }
                                    }
                                },
                                {
                                    $match: filter
                                },
                            ],
                            as: "quotations"
                        }
                    },
                    {
                        $unwind: {
                            path: "$quotations",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            quotations: { $ne: null }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            quotations: 1
                        }
                    }
                ]
            )
        }

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


exports.getQuotationDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        console.log("User ID:", userId);

        const user_data = await user.findOne({ _id: userId });
        console.log("Logged user:", user_data);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, {
                message: "Invalid quotation id",
                code: 404,
            });
        }
        let data = []
        if (user_data.user_type === 'supplier') {
            data = await quotation.aggregate(
                [
                    {
                        $match: {
                            _id: new mongoose.Types.ObjectId(id)
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
                            from: "users",
                            localField: "decided_logistics_id",
                            foreignField: "_id",
                            as: "logistics_data"
                        }
                    },
                    {
                        $unwind: {
                            path: "$logistics_data",
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
                                    $lookup: {
                                        from: "queries",
                                        let: {
                                            id: "$query_id",
                                            vid: "$variant_id"
                                        },
                                        pipeline: [
                                            {
                                                $unwind: {
                                                    path: "$queryDetails",
                                                    preserveNullAndEmptyArrays: true
                                                }
                                            },
                                            {
                                                $match: {
                                                    $and: [
                                                        {
                                                            $expr: {
                                                                $eq: ["$$id", "$_id"]
                                                            }
                                                        },
                                                        {
                                                            $expr: {
                                                                $eq: [
                                                                    "$$vid",
                                                                    "$queryDetails.variant._id"
                                                                ]
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                $project: {
                                                    "queryDetails.split_quantity": 1
                                                }
                                            }
                                        ],
                                        as: "query_data"
                                    }
                                },
                                {
                                    $addFields: {
                                        split_quantity: {
                                            $arrayElemAt: [
                                                "$query_data.queryDetails.split_quantity",
                                                0
                                            ]
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        query_id: 0,
                                        product_id: 0,
                                        variant_id: 0,
                                        admin_margin: 0,
                                        admin_approved_quotes: 0,
                                        logistics_price: 0,
                                        query_data: 0,
                                        quotation_id: 0,
                                        is_buyer_approved: 0,
                                        is_admin_approved: 0,
                                        is_supplier_approved: 0,
                                        is_logistics_approved: 0,
                                        admin_quote: 0
                                    }
                                }
                            ],
                            as: "final_quote"
                        }
                    }
                ]
            )
        }

        if (user_data.user_type === 'buyer') {
            data = await quotation.aggregate(
                [
                    {
                        $match: {
                            _id: new mongoose.Types.ObjectId(id)
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
                            from: "users",
                            localField: "decided_logistics_id",
                            foreignField: "_id",
                            as: "logistics_data"
                        }
                    },
                    {
                        $unwind: {
                            path: "$logistics_data",
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
                                    $lookup: {
                                        from: "queries",
                                        let: {
                                            id: "$query_id",
                                            vid: "$variant_id"
                                        },
                                        pipeline: [
                                            {
                                                $unwind: {
                                                    path: "$queryDetails",
                                                    preserveNullAndEmptyArrays: true
                                                }
                                            },
                                            {
                                                $match: {
                                                    $and: [
                                                        {
                                                            $expr: {
                                                                $eq: ["$$id", "$_id"]
                                                            }
                                                        },
                                                        {
                                                            $expr: {
                                                                $eq: [
                                                                    "$$vid",
                                                                    "$queryDetails.variant._id"
                                                                ]
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                $project: {
                                                    "queryDetails.quantity": 1
                                                }
                                            }
                                        ],
                                        as: "query_data"
                                    }
                                },
                                {
                                    $addFields: {
                                        quantity: {
                                            $arrayElemAt: [
                                                "$query_data.queryDetails.quantity",
                                                0
                                            ]
                                        }
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "quantity_units",
                                        let: {
                                            id: "$quantity.unit"
                                        },
                                        pipeline: [
                                            {
                                                $match: {
                                                    $expr: {
                                                        $eq: ["$$id", "$_id"]
                                                    }
                                                }
                                            }
                                        ],
                                        as: "unit_data"
                                    }
                                },
                                {
                                    $unwind: {
                                        path: "$unit_data",
                                        preserveNullAndEmptyArrays: true
                                    }
                                },
                                {
                                    $addFields: {
                                        "quantity.unit": "$unit_data.unit",
                                        "quantity.unit_id": "$unit_data._id"
                                    }
                                },
                                {
                                    $project: {
                                        query_id: 0,
                                        product_id: 0,
                                        variant_id: 0,
                                        admin_margin: 0,
                                        supplier_quote: 0,
                                        logistics_price: 0,
                                        query_data: 0,
                                        quotation_id: 0,
                                        is_buyer_approved: 0,
                                        is_admin_approved: 0,
                                        is_supplier_approved: 0,
                                        is_logistics_approved: 0,
                                        admin_quote: 0,
                                        unit_data: 0
                                    }
                                }
                            ],
                            as: "final_quote"
                        }
                    }
                ]
            )
        }

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
        const { quotation_id, supplier_id, note } = req.body
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

        const queryData = await query_assigned_suppliers.findOneAndUpdate(
            {
                quotation_id: new mongoose.Types.ObjectId(quotation_id),
                variant_assigned_to: new mongoose.Types.ObjectId(supplier_id)
            },
            {
                $set: {
                    buyer_notes: note
                }
            }, { new: true }
        )
        console.log("query data :", queryData)
        if (!queryData) {
            return utils.handleError(res, {
                message: "Quotation not found",
                code: 404,
            });
        }
        const currentTime = await moment(Date.now()).format('lll')
        const timeline_data = {
            date: currentTime,
            detail: user_data.user_type === "supplier" ? 'Supplier quotation note added' : 'Buyer quotation note added',
            product_id: queryData?.product_id,
            supplier_id: queryData?.variant_assigned_to,
            variant_id: queryData?.variant_id,
            price: queryData?.price,
            quantity: queryData?.quantity,
            media: queryData?.media,
            document: queryData?.document,
            assignedBy: queryData?.assignedBy
        }

        const result = await version_history.create({
            quotation_id: queryData._id,
            ...timeline_data
        })
        console.log("result : ", result)

        return res.status(200).json({
            message: "Quotation notes added successfully",
            data : queryData,
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

        // const quote = await result.final_quote.map(i => (i._id.toString() === quotation_details_id.toString() ? i : null)).filter(e => e !== null)[0]
        // console.log('quote : ', quote)
        // const timeline_data = {
        //     date: currentTime,
        //     detail: 'Logistics quotation quote added',
        //     product_id: quote?.product_id,
        //     supplier_id: quote?.supplier_id,
        //     variant_id: quote?.variant_id,
        //     price: quote?.logistics_quote?.price,
        //     media: quote?.logistics_quote?.media,
        //     document: quote?.logistics_quote?.document,
        //     assignedBy: quote?.logistics_quote?.assignedBy
        // }

        // const response = await version_history.create({
        //     quotation_id: queryData._id,
        //     ...timeline_data
        // })
        // console.log("response : ", response)

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
        const { shipping_address, billing_address, order_items, total_amount, delivery_charges, payment_method, logistics_id, quotation_id } = req.body
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

        const quotation_data = await quotation.findOne({ _id: quotation_id })
        quotation_data.order_id = neworder._id
        await quotation_data.save()

        const payment_data = {
            order_id: neworder._id,
            buyer_id: userId,
            total_amount,
            delivery_charges,
            payment_method
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