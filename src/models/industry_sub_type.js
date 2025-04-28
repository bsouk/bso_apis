const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const industrySubTypeSchema = new mongoose.Schema({
    parent_category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'industry_types'
    },
    name: {
        type: String
    }
},
    { timestamps: true }
)

industrySubTypeSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("industry_sub_types", industrySubTypeSchema);