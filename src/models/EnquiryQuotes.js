const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const EnquiryQuotesSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    enquiry_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "enquires"
    },
    quotation_number: {
        type: String,
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
                unit_weight: {
                    type: Number
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
                            selected: {
                                type: Boolean,
                                default: false
                            },
                            part_no: String
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
    custom_charges_one: {
        field_name: {
            type: String,
        },
        value: Number,
    },
    custom_charges_two: {
        field_name: {
            type: String,
        },
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
    },
    admin_charge: {
        charge_type: {
            type: String,
            enum: ["flat", "percentage"],
            default: "percentage"
        },
        value: Number
    },
    is_selected: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true
    }
)

EnquiryQuotesSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("enquiry_quotes", EnquiryQuotesSchema);