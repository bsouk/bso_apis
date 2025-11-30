const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

// Activity Log Schema for tracking all enquiry actions
const ActivityLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            "enquiry_created",
            "enquiry_approved",
            "enquiry_rejected",
            "supplier_quote_submitted",
            "supplier_quote_accepted",
            "supplier_quote_rejected",
            "logistics_quote_submitted",
            "logistics_quote_accepted",
            "logistics_quote_rejected",
            "final_quote_sent",
            "quote_accepted_by_buyer",
            "payment_pending",
            "payment_received",
            "order_confirmed",
            "processing",
            "ready_for_pickup",
            "picked_up",
            "in_transit",
            "out_for_delivery",
            "delivered",
            "completed",
            "self_pickup_ready",
            "self_pickup_completed",
            "cancelled",
            "status_updated",
            "tracking_updated",
            "payment_info_added",
            "note_added"
        ]
    },
    description: {
        type: String,
        required: true
    },
    performed_by: {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        user_type: {
            type: String,
            enum: ["buyer", "supplier", "logistics", "admin", "system"]
        },
        name: String
    },
    on_behalf_of: {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        user_type: {
            type: String,
            enum: ["buyer", "supplier", "logistics"]
        },
        name: String
    },
    previous_status: String,
    new_status: String,
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

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
        enum: [
            "pending",
            "approved",
            "rejected",
            "supplier_quote_accepted",
            "logistics_quote_accepted",
            "final_quote_sent",
            "quote_accepted_by_buyer",
            "payment_pending",
            "payment_received",
            "order_confirmed",
            "processing",
            "ready_for_pickup",
            "picked_up",
            "in_transit",
            "out_for_delivery",
            "delivered",
            "completed",
            "self_pickup_ready",
            "self_pickup_completed",
            "cancelled"
        ],
        default: "pending"
    },
    // Admin who created this enquiry on behalf of buyer (if manual enquiry)
    created_by_admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    // Final quote details
    final_quote_sent_at: {
        type: Date
    },
    final_quote_sent_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    // Activity logs for tracking all actions
    activity_logs: {
        type: [ActivityLogSchema],
        default: []
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
    documents_description:{
        type:[String],
        default:[]
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
    buyer_plan_step: String,
    
    // Payment tracking fields
    payment_info: {
        status: {
            type: String,
            enum: ["pending", "partial", "received", "refunded"],
            default: "pending"
        },
        platform: {
            type: String,
            enum: ["bank_transfer", "stripe", "paypal", "cash", "cheque", "credit_card", "other"],
        },
        transaction_id: String,
        amount_paid: {
            type: Number,
            default: 0
        },
        payment_date: Date,
        payment_proof: [String],  // Document/screenshot URLs
        payment_notes: String,
        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        updated_at: Date
    },
    
    // Order/Delivery tracking fields
    tracking_info: {
        tracking_number: String,
        carrier: String,
        carrier_url: String,
        estimated_delivery: Date,
        actual_delivery: Date,
        delivery_proof: [String],
        receiver_name: String,
        receiver_signature: String,
        delivery_notes: String
    },
    
    // Status timestamps for tracking
    status_timestamps: {
        quote_accepted_at: Date,
        payment_received_at: Date,
        order_confirmed_at: Date,
        processing_started_at: Date,
        ready_for_pickup_at: Date,
        picked_up_at: Date,
        in_transit_at: Date,
        out_for_delivery_at: Date,
        delivered_at: Date,
        completed_at: Date,
        cancelled_at: Date,
        cancelled_reason: String
    }
},
    {
        timestamps: true
    }
)

EnquirySchema.plugin(mongoosePaginate);
module.exports = mongoose.model("enquires", EnquirySchema);