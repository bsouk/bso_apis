const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const notificationSchema = new mongoose.Schema(
    {
        receiver_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        title: {
            type: String,
        },
        description: {
            type: String
        },
        related_to: {
            type: mongoose.Schema.Types.ObjectId,
        },
        related_to_type: {
            type: String,
            enum: ["user", "product", "service", "order", "post", "event", "sos", "payment_slip", "delivery", "job", "enquiry"],
        },
        type: {
            type: String,
            enum: [
                "account_creation",
                "password_changed",
                "profile_updated",

                "payment_reminder",
                "payment_pending",
                "payment_ongoing",
                "payment_completed",

                "product_listed",
                "service_listed",

                "order_placed",
                "order_recieved",
                "order_accepted",
                "order_declined",
                "order_cancelled",
                "order_ready_for_delivery",
                "order_ready_for_pickup",
                "order_picked_up_by_agent",
                "order_delivered",
                "out_for_delivery",


                "post_like",
                "post_comment",

                "event_like",
                "event_comment",

                "sos",

                "payment_slip",
                "payment_slip_declined",
                "payment_slip_paid",
                "payment_slip_ongoing",
                "payment_slip_completed",


                "delivery_cancelled",
                "issue_raised",
                "payout",
                "admin_action",
                "job_updated",
                "bso",
                "supplier_quote_added",
                "logistics_quote_added",
                "logistics_accepted_by_buyer",
                "supplier_accepted_by_buyer",
            ],
            required: true
        },
        is_seen: {
            type: Boolean,
            default: false
        },
        is_read: {
            type: Boolean,
            default: false
        },
    },
    {
        versionKey: false,
        timestamps: true
    }
)

notificationSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('notifications', notificationSchema)
