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
        price_per_person: {
            type: Number
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
        },
        stripe_product_id: {
            type: String,
            required: true,
            unique: true
        },
        stripe_price_id: {
            type: String,
            required: true,
            unique: true
        },
        stripe_per_user_price_id: {
            type: String,
            unique: true,
            sparse: true // Only required if price_per_person > 0
        },
        features: [{
            name: String,
            included: Boolean,
            limit: Number
        }]
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (doc, ret) {
                delete ret.__v;
                delete ret.stripe_product_id;
                delete ret.stripe_base_price_id;
                delete ret.stripe_per_user_price_id;
                return ret;
            }
        }
    }
);

module.exports = mongoose.model('plans', planSchema)

