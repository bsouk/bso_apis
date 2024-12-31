const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const quotationSchema = new mongoose.Schema({
    quotation_unique_id: {
        type: String
    },
    query_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'queries'
    },
    bid_setting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'bidsettings'
    },
    final_quote: [
        {
            product_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'products',
            },
            supplier_id: {
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
            supplier_quote: {
                type: {
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
                    }
                },
                default: null
            },
            admin_quote: {
                type: {
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
                    }
                },
                default: null
            }
        }
    ],
    is_approved: {
        type: String,
        enum: ["processing", "approved", "cancelled"],
        default: "processing"
    },
    rejected_reason: {
        type: String
    },
    version_history: {
        type:
            [
                {
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
                }
            ],
        default: []
    }
},
    {
        timestamps: true
    }
)

quotationSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("quotation", quotationSchema);