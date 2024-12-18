const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const quotationSchema = new mongoose.Schema({
    quotation_unique_id: {
        type: String
    },
    final_quote: [
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
            buyer_notes: {
                type: String
            },
            supplier_notes: {
                type: String
            },
            admin_notes: {
                type: String
            }
        }
    ],
    is_admin_approved: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    rejected_reason: {
        type: String
    },
})

quotationSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("quotation", quotationSchema);