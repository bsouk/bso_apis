const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");


const quantityUnitSchema = new mongoose.Schema(
    {
        unit: {
            type: String,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
)


quantityUnitSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("quantity_units", quantityUnitSchema);