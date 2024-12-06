const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const businessCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
)
businessCategorySchema.plugin(mongoosePaginate);

module.exports = mongoose.model("business_category", businessCategorySchema);
