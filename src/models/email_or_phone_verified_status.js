const mongoose = require("mongoose");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");

const OTPSchema = new mongoose.Schema(
    {
        email: {
            type: String,
        },
        phone_number_code : {
            type: String,
        },
        phone_number : {
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


OTPSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("email_or_phone_verified_status", OTPSchema);
