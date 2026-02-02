const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const paymentRetryLogSchema = new mongoose.Schema(
    {
        subscription_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'subscriptions',
            required: true,
            index: true
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: true,
            index: true
        },
        stripe_invoice_id: {
            type: String,
            index: true
        },
        stripe_subscription_id: {
            type: String,
            index: true
        },
        payment_source: {
            type: String,
            enum: ['stripe', 'iap', 'manual'],
            default: 'stripe'
        },
        attempt_number: {
            type: Number,
            default: 0
        },
        max_attempts: {
            type: Number,
            default: 3
        },
        retry_schedule: [
            {
                attempt: {
                    type: Number,
                    required: true
                },
                scheduled_at: {
                    type: Date,
                    required: true
                },
                executed_at: {
                    type: Date
                },
                status: {
                    type: String,
                    enum: ['pending', 'executed', 'skipped', 'cancelled'],
                    default: 'pending'
                },
                result: {
                    type: String,
                    enum: ['success', 'failed', 'error', 'pending'],
                    default: 'pending'
                },
                error_code: {
                    type: String
                },
                error_message: {
                    type: String
                },
                amount: {
                    type: Number
                },
                currency: {
                    type: String,
                    default: 'USD'
                },
                stripe_payment_intent_id: {
                    type: String
                }
            }
        ],
        next_retry_at: {
            type: Date,
            index: true
        },
        status: {
            type: String,
            enum: ['active', 'retrying', 'succeeded', 'exhausted', 'cancelled'],
            default: 'active',
            index: true
        },
        final_result: {
            type: String,
            enum: ['pending', 'recovered', 'failed', 'cancelled'],
            default: 'pending'
        },
        email_notifications_sent: [
            {
                type: {
                    type: String,
                    enum: [
                        'payment_failed',
                        'retry_failed',
                        'payment_success',
                        'subscription_suspended',
                        'daily_reminder',
                        'renewal_reminder',
                        'subscription_cancelled'
                    ]
                },
                sent_at: {
                    type: Date,
                    default: Date.now
                },
                template: {
                    type: String
                },
                success: {
                    type: Boolean,
                    default: true
                },
                error: {
                    type: String
                }
            }
        ],
        original_failure_date: {
            type: Date,
            default: Date.now
        },
        original_failure_reason: {
            type: String
        },
        recovery_date: {
            type: Date
        },
        notes: {
            type: String
        },
        admin_intervention: {
            type: Boolean,
            default: false
        },
        admin_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'admins'
        }
    },
    {
        timestamps: true
    }
);

// Indexes for performance
paymentRetryLogSchema.index({ status: 1, next_retry_at: 1 });
paymentRetryLogSchema.index({ subscription_id: 1, status: 1 });
paymentRetryLogSchema.index({ user_id: 1, status: 1 });
paymentRetryLogSchema.index({ created_at: -1 });

// Plugin for pagination
paymentRetryLogSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('payment_retry_logs', paymentRetryLogSchema);







