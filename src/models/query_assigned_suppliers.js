
const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const assignedSuppliersSchema = new mongoose.Schema(
    {
        query_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'queries'
        },
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'products'
        },
        variant_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        variant_assigned_to: {
            type: mongoose.Schema.Types.ObjectId, ref: 'users', required: false, default: null
        },
        user_type: { type: String, required: false, default: "admin" },
        quantity: {
            value: {
                type: Number,
                required: true
            },
            unit: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'quantity_units'
            }
        },
        is_selected: {
            type: Boolean,
            default: false
        },
        supplier_quote: {
            type: {
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
                }
            },
            default: null
        }
    },
    { timestamps: true }
)


assignedSuppliersSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("query_assigned_suppliers", assignedSuppliersSchema);