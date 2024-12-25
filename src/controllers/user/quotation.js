const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require("generate-password");
const quotation = require("../../models/quotation");
const user = require("../../models/user");


exports.getQuotationList = async (req, res) => {
    try {
        const { offset = 0, limit = 10, search } = req.query

        const userId = req.user._id;
        console.log("userid is ", userId);

        const user_data = await user.findOne({ _id: userId });
        console.log("logged user : ", user_data)
        if (!user_data) {
            return utils.handleError(res, {
                message: "User not found",
                code: 404,
            });
        }

        let filter = {}

        if (user_data.user_type === "supplier") {
            filter["final_quote.assignedBy.id"] = new mongoose.Types.ObjectId(userId);
            filter["final_quote.assignedBy.type"] = "supplier";
        }

        if (search) {
            filter.quotation_unique_id = { $regex: search, $options: "i" }
        }
        const data = await quotation.aggregate([
            { $match: { ...filter } },
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
            message: "quotation list fetched successfully",
            data: data,
            count: count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

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