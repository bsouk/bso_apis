const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const companySchema = mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId
    },
    company_logo: {
        type: String,
    },
    company_website: {
        type: String,
    },
    company_name: {
        type: String
    },
    company_overview: {
        type: String
    },
    company_address: {
        type: String
    },
    company_industry: {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'industry_types'
    },
    company_size: {
        type: Number
    },
    services: [{
        name: {
            type: String
        },
        description: {
            type: String
        }
    }],
    social_links: [{
        name: {
            type: String
        },
        link: {
            type: String
        }
    }],
    portfolio: {
        type: [String],
    },
    certifications: {
        type: [String],
    },
    testimonials: [{
        user_profile: {
            type: String
        },
        name: {
            type: String
        },
        company_name: {
            type: String
        },
        designation: {
            type: String
        },
        feedback: {
            type: String
        }
    }],
    hourly_price: {
        type: Number
    },
    project_pricing_model: {
        type: Number
    },
    //bussiness hours
    timezone: {
        type: String
    },
    days_of_operation: {
        type: String
    },
    working_hours: {
        from: {
            type: String
        },
        to: {
            type: String
        }
    },
    other_info: {
        type: String
    },
    team_members: [{
        name: { type: String },
        email: { type: String }
    }]
},
    {
        timestamps: true,
    }
)

companySchema.plugin(mongoosePaginate)
module.exports = mongoose.model('company_data', companySchema)