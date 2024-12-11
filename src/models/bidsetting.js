const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const BidSettingSchema = new mongoose.Schema({

    query_id:{
        type:mongoose.Schema.Types.ObjectId,
        required: true
    },

    bid_closing_date:{
        type:Date,
        required: true
    },
    remainder_setup_date:{
        type:Date,
        required: true
    }, 
    query_priority: {
        type: String,
        enum: ["high", "medium", "low"],
        default: ""
    },
},
    {
        timestamps: true
    }
)

BidSettingSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("bidsettings", BidSettingSchema);