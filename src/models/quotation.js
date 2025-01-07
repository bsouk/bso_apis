const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const quotationSchema = new mongoose.Schema({
    quotation_unique_id: {
        type: String
    },
    quotation_type: {
        type: String,
        enum: ['admin-supplier', 'admin-logistics'],
        default: 'admin-supplier'
    },
    query_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'queries'
    },
    bid_setting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'bidsettings'
    },
    is_admin_logistics_decided: {
        type: String,
        enum: ['decided', 'rejected', 'undecided'],
        default: 'undecided'
    },
    rejected_reason: {
        reason: {
            type: String,
            default: null
        },
        logistics_ids: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'users'
                }
            ],
            default: []
        }
    },
    accepted_logistics: {
        type: mongoose.Types.ObjectId,
        ref: 'users',
        default : null
    },
    decided_logistics_id: {
        type: mongoose.Types.ObjectId,
        ref: 'users',
        default : null
    },
    logistics_quote: {
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
                },
                date_time: {
                    type: Date
                }
            }
        },
        default: null
    },
    admin_notes: {
        type: String
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
            // admin_notes: {
            //     type: String
            // },
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
    is_approved_rejected_reason: {
        type: String
    },
    
    final_quotation_order: [
        {
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
                    ref: 'users'
                },
                type: {
                    type: String
                }
            },
            // buyer_notes: {
            //     type: String
            // },
            // supplier_notes: {
            //     type: String
            // },
            // admin_notes: {
            //     type: String
            // },
            // is_buyer_approved: {
            //     type: Boolean,
            //     default: false
            // },
            // is_supplier_approved: {
            //     type: Boolean,
            //     default: false
            // },
            // is_admin_approved: {
            //     type: Boolean,
            //     default: false
            // },
            // supplier_quote: {
            //     type: {
            //         quantity: {
            //             type: Number
            //         },
            //         price: {
            //             type: Number
            //         },
            //         message: {
            //             type: String
            //         },
            //         media: [String],
            //         document: [String],
            //         assignedBy: {
            //             id: {
            //                 type: mongoose.Schema.Types.ObjectId,
            //             },
            //             type: {
            //                 type: String
            //             }
            //         }
            //     },
            //     default: null
            // },
            // admin_quote: {
            //     type: {
            //         quantity: {
            //             type: Number
            //         },
            //         price: {
            //             type: Number
            //         },
            //         message: {
            //             type: String
            //         },
            //         media: [String],
            //         document: [String],
            //         assignedBy: {
            //             id: {
            //                 type: mongoose.Schema.Types.ObjectId,
            //             },
            //             type: {
            //                 type: String
            //             }
            //         }
            //     },
            //     default: null
            // }
        }
    ]
},
    {
        timestamps: true
    }
)

quotationSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("quotation", quotationSchema);