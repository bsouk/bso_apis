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
},
    {
        timestamps: true
    }
)


BidSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("bids", BidSchema);