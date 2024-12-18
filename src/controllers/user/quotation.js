const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require("generate-password");
const quotation = require("../../models/quotation");


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