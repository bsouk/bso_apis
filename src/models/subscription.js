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
        start_at: {
            type: Date,
        },
        end_at: {
            type: Date,
            required: true
        },
        type: {
            type: String,
            enum: ["supplier", "buyer", "logistics", "resource"]
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

