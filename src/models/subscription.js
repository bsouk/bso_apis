const mongoose = require('mongoose')
const validator = require('validator')

const subscriptionSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        subscription_id: {
            type: String,
            required: true
        },
        plan_id: {
            type: String,
            required: true
        },
        plan_started_at: {
            type: Date,
            required: true
        },
        trial_period: {
            start: {
                type: Date
            },
            end: {
                type: Date
            }
        },
        plan_tier: {
            tier_id: {
                type: mongoose.Schema.Types.ObjectId
            },
            amount: {
                type: Number
            },
            user_count: {
                type: Number
            },
            razorpay_order: {
                id: {
                    type: String
                },
                // entity: {
                //     type: String
                // },
                // amount: {
                //     type: Number
                // },
                // currency: {
                //     type: String
                // },
                // receipt: {
                //     type: String
                // },
                // notes: {
                //     user_id: {
                //         type: String
                //     },
                //     plan_id: {
                //         type: String
                //     }
                // },
                // status: {
                //     type: String
                // },
                // created_at: {
                //     type: String
                // },
                // amount_paid: {
                //     type: Number
                // },
                // amount_due: {
                //     type: Number
                // },
                // payment_modes: {
                //     type: String,
                //     enum: ["card", "netbanking", "wallet"]
                // },
                // method: {
                //     type: String
                // }
            }
        },
        start_at: {
            type: Date,
        },
        end_at: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ["created", "authenticated", "active", "paused", "pending", "halted", "cancelled", "completed", "expired"]
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('subscriptions', subscriptionSchema)

