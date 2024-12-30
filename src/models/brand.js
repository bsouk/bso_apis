const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    icon: {
        type: String,
    },
    is_admin_approved: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    rejected_reason: {
        type: String
    }
},
    {
        versionKey: false,
        timestamps: true,
    }
)
brandSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("brand", brandSchema);
