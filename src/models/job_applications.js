const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const jobApplicationSchema = new mongoose.Schema({
    application_id: {
        type: String
    },
    job_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'jobs'
    },
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'company_data'
    },
    canditate_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    // is_saved: {
    //     type: Boolean,
    //     default: false
    // },
    resume: {
        type: String
    },
    cover_letter: {
        type: String
    },
    experience: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'active'
    },
    questions: {
        type: [
            {
                question: String,
                answer: String,
            }
        ],
        default: []
    },
    is_accepted_by_company: {
        type: Boolean,
        default: false
    }
},
    { timestamps: true }
)

jobApplicationSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("job_applications", jobApplicationSchema);