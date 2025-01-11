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
    // is_admin_logistics_decided: {
    //     type: Boolean,
    //     default: false
    // },
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
            // selected_supplier: [
            //     {
            //         id: {
            //             type: mongoose.Types.ObjectId,
            //             ref: 'users'
            //         },
            //         quantity: {
            //             type: Number
            //         }
            //     }
            // ],
            split_quantity: {
                is_selected: {
                    type: Boolean,
                    default: false
                },
                total_quantity: {
                    type: Number,
                    default: 0
                },
                quantity_assigned: {
                    type: Number,
                    default: 0
                },
            },
            final_assigned_to: {
                _id: {
                    type: mongoose.Types.ObjectId,
                },
                user_type: {
                    type: String
                }
            },
            // logistics: {
            //     id: {
            //         type: mongoose.Types.ObjectId,
            //         ref: 'users'
            //     },
            //     name: {
            //         type: String
            //     },
            //     profile_image: {
            //         type: String
            //     }
            // },
            // logistics_quote: {
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
        }
    ],
    // final_quote: {
    //     type: [
    //         {
    //             product_id: {
    //                 type: mongoose.Schema.Types.ObjectId,
    //                 ref: 'products',
    //             },
    //             supplier_id: {
    //                 type: mongoose.Schema.Types.ObjectId,
    //                 ref: 'users',
    //             },
    //             variant_id: {
    //                 type: mongoose.Schema.Types.ObjectId,
    //             },
    //             quantity: {
    //                 type: Number
    //             },
    //             price: {
    //                 type: Number
    //             },
    //             message: {
    //                 type: String
    //             },
    //             media: [String],
    //             document: [String],
    //             assignedBy: {
    //                 id: {
    //                     type: mongoose.Schema.Types.ObjectId,
    //                 },
    //                 type: {
    //                     type: String
    //                 }
    //             }
    //         },
    //     ],
    //     default: []
    // }
},
    {
        timestamps: true
    }
)

querySchema.plugin(mongoosePaginate);
module.exports = mongoose.model("queries", querySchema);