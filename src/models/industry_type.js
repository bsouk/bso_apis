const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const industryTypeSchema = new mongoose.Schema({

})

industryTypeSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("industry_types", industryTypeSchema);