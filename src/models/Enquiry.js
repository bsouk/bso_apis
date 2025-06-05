const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const EnquirySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    is_approved: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    enquiry_unique_id: {
        type: String,
    },
    enquiry_number: {
        type: String,
    },
    quotation_number: {
        type: String,
    },
    status: {
        type: String,
        default: "pending"
    },
    expiry_date: {
        type: String
    },
    priority: {
        type: String,
        enum: ["high", "medium", "low"],
        default: "low"
    },
    address: {
        type: mongoose.Schema.Types.ObjectId
    },
    shipping_address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'address'
    },
    quotation_end_date: {
        type: String
    },
    delivery_time: {
        type: String
    },
    additional_notes: {
        type: String
    },
    documents: {
        type: [String],
        default: []
    },
    currency: {
        type: String
    },
    enquiry_items: {
        type: [
            {
                brand: {
                    type: String
                },
                part_no: {
                    type: String
                },
                description: {
                    type: String
                },
                notes: {
                    type: String
                },
                attachment: {
                    type: [
                        String
                    ],
                    default: []
                },
                // quantity: {
                //     type: Number
                // },
                available_quantity: {
                    type: Number
                },
                unit_price: {
                    type: Number
                },
                amount: Number,
                quantity: {
                    unit: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'quantity_units'
                    },
                    value: Number
                },
                condition: {
                    type: mongoose.Schema.Types.Mixed
                },
                manufacturer: {
                    original: {
                        selected: {
                            type: Boolean,
                            default: false
                        },
                        replaced: {
                            type: Boolean,
                            default: false
                        },
                        additional_notes: String
                    },
                    oem: {
                        selected: {
                            type: Boolean,
                            default: false
                        },
                        brand: String,
                        part_no: String,
                        note: String
                    },
                    aftermarket: {
                        selected: {
                            type: Boolean,
                            default: false
                        },
                        brand: String,
                        part_no: String,
                        note: String
                    }
                }
            }
        ],
        default: []
    },
    delivery_charges: {
        type: Number,
        default: 0
    },
    selected_payment_terms: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "payment_terms"
    },
    additional_charges: {
        charge_type: {
            type: String,
            enum: ["flat", "percentage"]
        },
        value: Number
    },
    discount: {
        charge_type: {
            type: String,
            enum: ["flat", "percentage"]
        },
        value: Number
    },
    grand_total: {
        type: Number,
        default: 0
    },
    admin_grand_total: {
        type: Number,
        default: 0
    },
    admin_price: {
        type: Number,
        default: 0
    },
    service_charges: {
        type: Number,
        default: 0
    },
    logistics_charges: {
        type: Number,
        default: 0
    },
    supplier_charges: {
        type: Number,
        default: 0
    },
    reply: {
        documents: {
            type: [String],
            default: []
        },
        message: String
    },
    selected_supplier: {
        quote_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "enquiry_quotes"
        }
    },
    selected_logistics: {
        quote_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "logistics_quotes"
        }
    },
    shipment_type: {
        type: String,
        enum: ["self-pickup", "delivery"],
    },
    delivery_selection_data: {
        name: {
            type: String,
            enum: ["self", "platform", "supplier"],
        },
        tracking_id: String,
        tracking_media: String,
        details: String
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "orders"
    },
    logistics_selection_data: {
        name: {
            type: String,
            enum: ["bso", "local"],
        },
        tracking_id: String,
        tracking_media: String,
        details: String
    },
    buyer_plan_step: String
},
    {
        timestamps: true
    }
)

EnquirySchema.plugin(mongoosePaginate);
module.exports = mongoose.model("enquires", EnquirySchema);