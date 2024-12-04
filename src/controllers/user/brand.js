const User = require("../../models/user");
const Address = require("../../models/address");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');
const Brand = require("../../models/brand");

exports.getBrand = async (req, res) => {
    try {
        const { limit = 10, offset = 0, search } = req.query;
        const condition = {};

        if (search) {
            condition["$or"] = [
                { name: { $regex: search, $options: "i" } }
            ];
        }

        const count = await Brand.aggregate([
            {
                $match: condition,
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 }
                }
            }
        ]);

        const data = await Brand.aggregate([
            {
                $match: condition,
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $skip: +offset,
            },
            {
                $limit: +limit,
            },
        ]);

        res.json({ data: data, count: count?.[0]?.count ?? 0, code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};

