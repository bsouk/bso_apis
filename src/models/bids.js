const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const BidSchema = new mongoose.Schema({
    bid_unique_id: {
        type: String
    },
    query_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'queries'
    },
    quotation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'quotation'
    },
    bid_setting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'bidsettings'
    },
    is_admin_approved: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    rejected_reason: {
        type: String
    },
    bid_data: {
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
        default: {}
    },
},
    {
        timestamps: true
    }
)


BidSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("bids", BidSchema);