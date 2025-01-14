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
        ref: 'users',
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
            split_quantity: {
                is_selected: {
                    type: Boolean,
                    default: false
                },
                total_quantity: {
                    type: {
                        value: {
                            type: Number
                        },
                        unit: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: 'quantity_units'
                        }
                    },
                    default: null
                },
                quantity_assigned: {
                    type: {
                        value: {
                            type: Number
                        },
                        unit: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: 'quantity_units'
                        }
                    },
                    default: null
                }
            },
            price: {
                type: Number
            },
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
            query: {
                type: String,
                required: true
            },
            notes: {
                type: String,
                required: true
            },
        }
    ]
},
    {
        timestamps: true
    }
)

querySchema.plugin(mongoosePaginate);
module.exports = mongoose.model("queries", querySchema);