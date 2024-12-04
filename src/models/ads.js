const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const adsSchema = new mongoose.Schema([
    {
        background: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        }
    }
],
    {
        timestamps: true
    }
)
adsSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Ads", adsSchema);
