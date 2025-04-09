const mongoose = require('mongoose')
const validator = require('validator')

const planSchema = new mongoose.Schema(
    {
        plan_id: {
            type: String,
        },
        // plan_type : {
        //     type : String,
        //     enum : ["paid", "unpaid"]
        // },
        type: {
            type: String,
            enum: ["supplier", "buyer", "logistics", "resource"]
        },
        plan_name: {
            type: String,
        },
        plan_description: {
            type: String,
        },
        price: {
            type: Number,
        },
        currency: {
            type: String,
            default: "USD"
        },
        interval: {
            type: String,
            enum: ["daily", "weekly", "monthly", "quarterly", "yearly"]
        },
        interval_count: {
            type: Number,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed
        },
        plan_type: {
            type: String,
            enum: ["freemium", "premium"],
            default: "premium"
        },
        allowed_user: {
            type: Number,
            default: 1
        },
        selected: {
            type: Boolean,
            default: true
        },
        is_auto_renewal: {
            type: Boolean,
            default: false
        },
        access_level: {
            type: String,
            enum: ["partial", "fully"]
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        },
        plan_step: {
            type: String,
            enum: ["direct", "admin_involved"],
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('plans', planSchema)

