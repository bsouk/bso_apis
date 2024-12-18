const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const quotationSchema = new mongoose.Schema({
    
})

quotationSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("quotation", quotationSchema);