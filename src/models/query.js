const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const querySchema = new mongoose.Schema({
    query_unique_id: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "completed", "rejected"],
        default: "pending"
    },
    queryCreation: {
        type: String,
        default: Date.now
    },
    queryClose: {
        type: String
    },
    action: {
        type: String
    },
    createdByUser: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    adminApproved: {
        type: Boolean,
        default: false
    },
    adminReview: {
        type: String
    },
    queryDetails: [
        {
            // product_id: {
            //     type: mongoose.Schema.Types.ObjectId,
            //     ref: 'products',
            //     required: true
            // },
            // supplier_id: {
            //     type: mongoose.Schema.Types.ObjectId,
            //     ref: 'users',
            //     required: true
            // },
            // variant_id: {
            //     type: mongoose.Schema.Types.ObjectId,
            // },
            product: {
                id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'products'
                },
                name: {
                    type: String
                },
            },
            variant: {
                _id: {
                    type: mongoose.Schema.Types.ObjectId,
                },
                sku_id: {
                    type: String
                },
                description: {
                    type: String,
                },
                price: {
                    type: Number,
                },
                assigned_to: {
                    type: String,
                    required: false,
                },
                inventory_quantity: {
                    type: Number,
                },
                discount: {
                    type: Number,
                },
                bulk_discount: {
                    type: Number,
                },
                images: {
                    type: [String]
                },
                specification: [
                    {
                        specification_type: {
                            type: String
                        },
                        value: {
                            type: String
                        }
                    }
                ],
                is_sku_deleted: {
                    type: Boolean,
                    default: false
                },
                tag: {
                    type: [String]
                },
            },
            supplier: {
                _id: {
                    type: mongoose.Types.ObjectId
                },
                name: {
                    type: String
                },
                profile_image: {
                    type: String
                }
            },
            supplier_quote: {
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
            admin_quote: {
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
            price: {
                type: Number
            },
            quantity: {
                type: Number,
                required: true
            },
            query: {
                type: String,
                required: true
            },
            notes: {
                type: String,
                required: true
            },
            assigned_to: {
                variant_assigned: { type: mongoose.Schema.Types.ObjectId, required: false, default: null },
                type: { type: String, required: false, default: "admin" },
            }
        }
    ],
    final_quote: {
        type: [
            {
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
        ],
        default: []
    }
},
    {
        timestamps: true
    }
)

querySchema.plugin(mongoosePaginate);
module.exports = mongoose.model("queries", querySchema);