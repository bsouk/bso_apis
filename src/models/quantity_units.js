const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");


const quantityUnitSchema = new mongoose.Schema(
    {
        unit: {
            type: String
        }
    },
    { timestamps: true }
)


quantityUnitSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("quantity_units", quantityUnitSchema);