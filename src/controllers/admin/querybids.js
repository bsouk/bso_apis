const { default: mongoose } = require("mongoose");
const Product = require("../../models/product");
const Query = require("../../models/query");
const BidSetting = require("../../models/bidsetting");
const utils = require("../../utils/utils");




exports.getquery = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10 } = req.query;

        const filter = {
            is_deleted: { $ne: true }
        };

        if (search) {
            filter.name = { $regex: search, $options: "i" };
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
                $addFields: {
                    user_detail: {
                        $ifNull: [{ $arrayElemAt: ['$user_detail', 0] }, null],
                    },

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

        const count = await Query.countDocuments(filter);

        res.json({ data: productlist, count, code: 200 });
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
                $addFields: {
                    user_detail: {
                        $ifNull: [{ $arrayElemAt: ['$user_detail', 0] }, null],
                    },
                    product_detail: {
                        $ifNull: [{ $arrayElemAt: ['$product_detail', 0] }, null],
                    },
                },
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
        const { id,  product_id, sku_id, supplier_id } = req.body;

        console.log("=============req.body",req.body)
        if (!id ||  !product_id || !sku_id || !supplier_id) {
            return res.status(400).json({
                message: "Missing required fields: id, user_id, product_id, sku_id, or supplier_id.",
                code: 400
            });
        }

        const queryObjectId = new mongoose.Types.ObjectId(id);
        const productObjectId = new mongoose.Types.ObjectId(product_id);
        const skuObjectId = new mongoose.Types.ObjectId(sku_id);
        const supplierObjectId = new mongoose.Types.ObjectId(supplier_id);

        const query = await Query.findOne({
            _id: queryObjectId,
            "queryDetails.product_id": productObjectId,
            "queryDetails.sku_id": skuObjectId,
            "queryDetails.supplier_id": supplierObjectId
        });
        console.log("=============query",query)

        if (!query) {
            return res.status(404).json({
                message: "Query not found with the given criteria.",
                code: 404
            });
        }

        const queryDetails = query.queryDetails.find(
            (detail) =>
                detail.product_id.equals(productObjectId) &&
                detail.sku_id.equals(skuObjectId) &&
                detail.supplier_id.equals(supplierObjectId)
        );

        if (!queryDetails) {
            return res.status(404).json({
                message: "Matching queryDetails not found.",
                code: 404
            });
        }

        queryDetails.assigned_to = {
            variant_assigned: supplierObjectId.toString(),
            type: "supplier"
        };

        await query.save();

        res.json({
            message: "Variant assigned successfully.",
            code: 200,
            updatedQuery: query
        });
    } catch (error) {
        console.error("Error in updateAssignedProduct:", error);
        res.status(500).json({
            message: "Internal Server Error",
            code: 500,
            error: error.message
        });
    }
};

exports.unassignVariant = async (req, res) => {
    try {
        const { id, product_id, sku_id, supplier_id } = req.body;

        // Validate required fields
        if (!id || !product_id || !sku_id || !supplier_id) {
            return res.status(400).json({
                message: "Missing required fields: query_id, product_id, sku_id, or supplier_id.",
                code: 400,
            });
        }

        // Convert IDs to ObjectId
        const queryObjectId = new mongoose.Types.ObjectId(id);
        const productObjectId = new mongoose.Types.ObjectId(product_id);
        const skuObjectId = new mongoose.Types.ObjectId(sku_id);
        const supplierObjectId = new mongoose.Types.ObjectId(supplier_id);

        // Find the Query document with the matching details
        const query = await Query.findOneAndUpdate(
            {
                _id: queryObjectId,
                "queryDetails.product_id": productObjectId,
                "queryDetails.sku_id": skuObjectId,
                "queryDetails.supplier_id": supplierObjectId,
            },
            {
                $set: {
                    "queryDetails.$.assigned_to.variant_assigned": null,
                    "queryDetails.$.assigned_to.type": null,
                },
            },
            { new: true } // Return the updated document
        );

        // Check if the query was found and updated
        if (!query) {
            return res.status(404).json({
                message: "Query not found or no matching queryDetails to unassign.",
                code: 404,
            });
        }

        // Success response
        res.json({
            message: "Variant unassigned successfully.",
            code: 200,
            updatedQuery: query, // Optional: return updated query for verification
        });
    } catch (error) {
        console.error("Error in unassignVariant:", error);
        res.status(500).json({
            message: "Internal Server Error",
            code: 500,
            error: error.message,
        });
    }
};

