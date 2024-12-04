const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');

const Brand = require("../../models/brand");

exports.addBrand = async (req, res) => {
    try {

        const isBrandExists = await Brand.findOne({ name: req.body.name });
        if (isBrandExists) return utils.handleError(res, { message: "The brand name already exists. Please enter a different name", code: 400 });

        const data = {
            name: req.body.name
        }
        const saveBrand = new Brand(data);
        await saveBrand.save()

        res.json({ message: "Brand added successfully", code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
}


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

exports.editBrand = async (req, res) => {
    try {
        const { name } = req.body;
        const id = req.params.id;
        const isBrandExists = await Brand.findById(id);
        if (!isBrandExists) return utils.handleError(res, { message: "Brand not found" });

        const isBrandNameExists = await Brand.findOne({ _id: { $nin: [new mongoose.Types.ObjectId(id)] }, name });
        if (isBrandNameExists) return utils.handleError(res, { message: "The brand name already exists. Please enter a different name", code: 400 });

        await Brand.findByIdAndUpdate(id, { $set: { name } })
        res.json({ message: "Brand edited successfully", code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.deleteBrand = async (req, res) => {
    try {
        const id = req.params.id;

        const brand = await Brand.findById(id);
        if (!brand) return utils.handleError(res, { message: "Brand not found", code: 404 });

        await Brand.findByIdAndDelete(id);
        res.json({ message: "Brand deleted successfully", code: 200 })
    } catch (error) {
        utils.handleError(res, error);
    }
}
