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
        stripe_subscription_id: {
            type: String,
        },
        stripe_payment_method_id: {
            type: String,
        },
        stripe_customer_id: {
            type: String,
        },
        payment_method_type: String,
        plan_id: {
            type: String,
            required: true
        },
        start_at: {
            type: Date,
        },
        end_at: {
            type: Date,
        },
        type: {
            type: String,
            enum: ["supplier", "buyer", "logistics", "resource", "recruiter", "all_in_one"]
        },
        buyer_type: {
            type: String,
            enum: ["direct-buyer", "indirect-buyer"],
            default: null
        },
        status: {
            type: String,
            // enum: ["created", "authenticated", "active", "paused", "pending", "halted", "cancelled", "completed", "expired", "terminated"]
        },
        subscription_type: {
            type: String,
            enum: ["unpaid", "paid"],
            default: "paid"
        },
        isPurchased: {
            type: Boolean,
            default: false
        },
        source: {
            type: String,
            enum: ["stripe", "iap", "admin", "system"],
            default: "stripe"
        },
        payment_mode: {
            type: String,
            enum: ["stripe", "iap", "admin_manual", "unknown"],
            default: "stripe"
        },
        admin_note: {
            type: String,
        },
        assigned_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admins'
        },
        last_updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admins'
        },
        is_active: {
            type: Boolean,
            default: true
        },
        // ========================================
        // DUNNING MANAGEMENT FIELDS (NEW)
        // ========================================
        dunning_status: {
            type: String,
            enum: ['none', 'grace_period', 'suspended', 'cancelled'],
            default: 'none'
        },
        grace_period_start: {
            type: Date
        },
        grace_period_end: {
            type: Date
        },
        suspension_date: {
            type: Date
        },
        cancellation_date: {
            type: Date
        },
        last_payment_attempt: {
            type: Date
        },
        failed_payment_count: {
            type: Number,
            default: 0
        },
        auto_retry_enabled: {
            type: Boolean,
            default: true
        },
        payment_retry_log_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'payment_retry_logs'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('subscriptions', subscriptionSchema)

