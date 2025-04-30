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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'industry_types'
    },
    job_sub_category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'industry_sub_types'
    },
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    job_type: {
        type: String,
        enum: ["Full-Time", "Part-Time", "Freelance", "Contract-Based", "Internship", "Temporary", "Remote", "On-Site", "Hybrid"],
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
    experience_type: {
        type: String,
        enum: ['fresher', 'experienced'],
    },
    experience: Number,
    skills: [String],
    budget: String,
    payment_type: String,
    job_duration: String,
    weekly_hour_requirement: String,
    project_visibility: String,
    questions: {
        type: [
            {
                question: String,
                answer: String,
                is_required: Boolean,
                options: [String]
            }
        ],
        default: []
    },
    qualifications: {
        type: String
    },
    applications_instructions: {
        type: String
    },
    attachments: [String],
    proposal_prefrences: String,
    special_requirements: String,
    languages: String,
    proficiency_level: String,
    created_by: {
        type: String,
        enum: ["admin", "company"],
        default: 'company'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'inactive'
    }
},
    { timestamps: true }
)

jobSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("jobs", jobSchema);