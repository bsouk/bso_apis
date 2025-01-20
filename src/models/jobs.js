const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const jobSchema = new mongoose.Schema({
    job_unique_id: {
        type: String
    },
    job_title: {
        type: String
    },
    job_category: {

    },
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'company_data'
    },
    job_type: {
        type: String,
        enum: ['full-time', 'remote', 'freelance', 'temporary', 'internship', 'seasonal'],
        default: 'full-time'
    },
    location: {
        type: String
    },
    salary: {
        type: String
    },
    job_description: {
        type: String
    },
    responsibility: {
        type: String
    },
    qualifications: {
        type: String
    },
    applications_instructions: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'inactive'
    }

})


jobSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("jobs", jobSchema);