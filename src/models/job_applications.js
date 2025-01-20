const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const jobApplicationSchema = new mongoose.Schema({
    application_id: {
        type: String
    },
    job_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : ''
    }
})

jobApplicationSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("job_applications", jobApplicationSchema);