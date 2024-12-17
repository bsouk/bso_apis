const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const businessCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
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
businessCategorySchema.plugin(mongoosePaginate);

module.exports = mongoose.model("business_category", businessCategorySchema);
