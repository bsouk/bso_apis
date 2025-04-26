const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const EnquiryQuotesSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    shipment_type:{
        type:String,
        default: "pending"
    },
    is_admin_updated:{
        type: Boolean,
        default: false
    },
    quote_unique_id : String,
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
    admin_price:{
        type: Number,
        default: 0
    },
    logistics_price: {
        type: Number,
        default: 0
    },
    margin_type:{
        type: String,
        enum: ["flat", "percentage"],
        default: "flat"
    },
    margin_value: {
        type: Number,
        default: 0
    },
    grand_total: {
        type: Number,
        default: 0
    },
    enquiry_items: {
        type: [

            {
                admin_unit_price: {
                    type: Number,
                    default: 0
                },
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
                    type: Number,
                    default: 0
                },
                amount: Number,
                quantity: {
                    unit: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'quantity_units'
                    },
                    value: {
                        type: Number,
                        default: 0
                    }
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
        value: {
            type: Number,
            default: 0
        }
    },
    custom_charges_two: {
        field_name: {
            type: String,
        },
        charge_type: {
            type: String,
            enum: ["flat", "percentage"]
        },
        value: {
            type: Number,
            default: 0
        }
    },
    payment_terms: {
        type: mongoose.Schema.Types.Mixed
    },
    discount: {
        charge_type: {
            type: String,
            enum: ["flat", "percentage"]
        },
        value: {
            type: Number,
            default: 0
        }
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
        value: {
            type: Number,
            default: 0
        }
    },
    is_selected: {
        type: Boolean,
        default: false
    },
    final_price: {
        type: Number,
        default: 0
    },
    pickup_address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'address'
    },
},
    {
        timestamps: true
    }
)

EnquiryQuotesSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("enquiry_quotes", EnquiryQuotesSchema);