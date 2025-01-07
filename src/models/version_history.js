const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const version_history_schema = new mongoose.Schema(
    {
        quotation_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "quotation",
            default: null
        },
        date: {
            type: Date,
            default: Date.now
        },
        detail: {
            type: String
        },
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'products',
        },
        supplier_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
        },
        logistics_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
        },
        variant_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        quantity: {
            type: Number
        },
        price: {
            type: Number
        },
        message: {
            type: String
        },
        media: [String],
        document: [String],
        assignedBy: {
            id: {
                type: mongoose.Schema.Types.ObjectId,
            },
            type: {
                type: String
            }
        },
        buyer_notes: {
            type: String
        },
        supplier_notes: {
            type: String
        },
        admin_notes: {
            type: String
        },
    },
    {
        timestamps: true
    }
)

version_history_schema.plugin(mongoosePaginate);
module.exports = mongoose.model("version_history", version_history_schema);