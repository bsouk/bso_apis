const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const jobSchema = new mongoose.Schema({
    job_unique_id: {
        type: String
    },
    company_description: String,
    phone_number: Number,
    email: String,
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
        type: [String],
        enum: ["Full-Time", "Part-Time", "Freelance", "Contract-Based", "Internship", "Temporary", "Hybrid"],
    },
    schedule: {
        type: [String],
        enum: ["Day-shift", "Morning-shift", "Rotational-shift", "Night-shift", "Monday-Friday", "Evening-shift", "Weekend-availabilty", "Fixed-shift", "US-shift", "UK-shift", "Weekend-only", "other", "none"]
    },
    rate: {
        type: String,
        enum: ["Hourly", "Monthly", "Annually", "Per-project", "Weekly", "Daily", "Other"]
    },
    supplemental_pay: {
        type: [String],
    },
    benefit: [String],
    job_location_type: {
        type: String,
        enum: ["On-Site", "Remote"]
    },
    advertise: {
        status: {
            type: String,
            enum: ["yes", "no"],
        },
        city: String
    },
    office_address: {
        address_line_1: String,
        address_line_2: String,
        city: String,
        state: String,
        country: String,
        pincode: String,
        area: String
    },
    planned_start_date: {
        status: {
            type: String,
            enum: ["yes", "no"]
        },
        date: Date
    },
    application_last_date: {
        status: {
            type: String,
            enum: ["yes", "no"]
        },
        date: Date
    },
    vacancy: String,
    recruitment_timeline: String,
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
    payment_type: {
        type: {
            type: String,
            enum: ['Range', 'Minimum', 'Maximum', 'Exact']
        },
        value: Number,
        min: Number,
        max: Number
    },
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
    },
    get_individual_email: {
        type: Boolean,
        default: false
    },
    let_candidate_contact_us: {
        type: Boolean,
        default: false
    }
},
    { timestamps: true }
)

jobSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("jobs", jobSchema);