const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    }
},
    {
        versionKey: false,
        timestamps: true,
    }
)
brandSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("brand", brandSchema);
