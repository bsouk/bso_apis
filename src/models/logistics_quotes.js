const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const logisticsQuotesSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    quote_unique_id: String,
    enquiry_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "enquires"
    },
    shipping_fee: {
        type: Number
    },
    notes: String,
    is_selected: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true
    }
)

logisticsQuotesSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("logistics_quotes", logisticsQuotesSchema);