const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const querySchema = new mongoose.Schema({
    query_unique_id: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "completed"],
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
            product_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'products',
                required: true
            },
            supplier_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'users',
                required: true
            },
            sku_id: {
                type: String,
            },
            price: {
                type: Number,
                required: true
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
            }
        }
    ]
},
    {
        timestamps: true
    }
)

querySchema.plugin(mongoosePaginate);
module.exports = mongoose.model("queries", querySchema);