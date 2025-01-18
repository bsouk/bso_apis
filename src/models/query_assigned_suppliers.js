
const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const assignedSuppliersSchema = new mongoose.Schema(
    {
        query_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'queries'
        },
        quotation_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'quotation'
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
        assigned_logistics_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
        },
        user_type: { type: String, required: false, default: "admin" },
        quantity: {
            value: {
                type: Number
            },
            unit: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'quantity_units'
            }
        },
        is_selected: {
            type: Boolean,
            default: null
        },
        admin_approved_quotes: {
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
        },
        admin_quote: {
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
        },
        logistics_price: {
            type: Number,
            default: 0
        },
        admin_margin: {
            value: {
                type: Number
            },
            margin_type: {
                type: String,
                enum: ["flat", "percentage"],
                default: "flat"
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
        is_buyer_approved: {
            type: Boolean,
            default: false
        },
        is_supplier_approved: {
            type: Boolean,
            default: false
        },
        is_admin_approved: {
            type: Boolean,
            default: false
        },
        is_logistics_approved: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true }
)


assignedSuppliersSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("query_assigned_suppliers", assignedSuppliersSchema);