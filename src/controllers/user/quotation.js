const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require("generate-password");
const quotation = require("../../models/quotation");
const user = require("../../models/user");


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

        if (user_data.user_type === "supplier") {
            filter["final_quote.assignedBy.id"] = new mongoose.Types.ObjectId(userId);
            filter["final_quote.assignedBy.type"] = "supplier";
        }

        const data = await quotation.aggregate([
            {
                $match: { ...filter }
            },
            {
                $lookup: {
                    from: "queries",
                    localField: "query_id",
                    foreignField: "_id",
                    as: "query_data",
                },
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
                $project: {
                    final_quote: {
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
                    },
                    query_data: 1,
                    bid_setting_data: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    is_approved: 1
                }
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



exports.getQuotationDetails = async (req, res) => {
    try {
        const { id } = req.params

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return utils.handleError(res, {
                message: "Invalid quotation id",
                code: 404,
            });
        }

        const data = await quotation.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(id) }
            },
            {
                $lookup: {
                    from: 'queries',
                    localField: 'query_id',
                    foreignField: '_id',
                    as: 'query_data'
                }
            },
            {
                $unwind: {
                    path: '$query_data',
                    preserveNullAndEmptyArrays: true,
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
                    path: '$bid_setting_data',
                    preserveNullAndEmptyArrays: true,
                }
            },
            {
                $project: {
                    query_id: 0,
                    bid_setting: 0
                }
            }
        ])

        return res.status(200).json({
            message: "Quotation data fetched successfully",
            data: data[0],
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

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

        const { final_quote_id, note } = req.body
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

        return res.status(200).json({
            message: "Quotation notes added successfully",
            data,
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}