const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");

const AdminCommisionSchema = new mongoose.Schema(
    {
        charge_type: {
            type: String,
            enum: ["flat", "percentage"],
            default: "percentage"
        },
        value: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("commision", AdminCommisionSchema);
