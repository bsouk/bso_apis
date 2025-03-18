const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const EnquirySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    enquiry_unique_id: {
        type: String,
    },
    quotation_number: {
        type: String,
    },
    status: {
        type: String,
        enum: ["pending", "completed", "rejected"],
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
    shipping_address: {
        type: String
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
                quantity: {
                    type: Number
                },
                available_quantity: {
                    type: Number
                },
                unit_price: {
                    type: Number
                },
                amount: Number,
                unit_weight: {
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
    grand_total: Number,
    reply: {
        documents: {
            type: [String],
            default: []
        },
        message: String
    }
},
    {
        timestamps: true
    }
)

EnquirySchema.plugin(mongoosePaginate);
module.exports = mongoose.model("enquires", EnquirySchema);