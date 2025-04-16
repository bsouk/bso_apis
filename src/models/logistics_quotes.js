const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const logisticsQuotesSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    enquiry_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "enquires"
    },
    enquiry_items: {
        type: [
            {
                item_id: {
                    type: mongoose.Schema.Types.ObjectId
                },
                shipping_fee: {
                    type: Number
                }
            }
        ],
        default: []
    },
},
    {
        timestamps: true
    }
)

logisticsQuotesSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("logistics_quotes", logisticsQuotesSchema);