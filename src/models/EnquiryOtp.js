const mongoose = require("mongoose");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");

const EnquiryOTPSchema = new mongoose.Schema(
    {
        enquiry_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "enquires"
        },
        quote_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "enquiry_quotes"
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        email: {
            type: String,
        },
        otp: {
            type: String,
        },
        is_used : {
            type :Boolean,
            default : false
        },
        exp_time : {
            type : Date
        },
        verified : {
            type : Boolean,
            default : false
        }
    },
    {
        timestamps: true,
    }
);


EnquiryOTPSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("enquiry_otp", EnquiryOTPSchema);
