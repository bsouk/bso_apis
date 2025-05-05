const mongoose = require('mongoose')
// const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const AdminNotificationSchema = new mongoose.Schema(
    {
        sender_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref : 'admins'
        },
        receiver_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users'
        },
        type: {
            type: String,
            enum: [
                "new_subscription",
                "subscription_upgrade",
                "subscription_downgrade",
                "subscription_cancelled",
                "new_trial",
                "free_trial_to_new_user",
                "by_admin",
            ],
            required: true,
        },
        related_to: {
            type: mongoose.Schema.Types.ObjectId,
        },
        related_to_type: {
            type: String
        },
        title: {
            type: String,
            required: true
        },
        body: {
            type: String,
        },
        is_seen: {
            type: Boolean,
            default: false
        },
        is_admin: {
            type: Boolean,
            default: false
        },
    },
    {
        versionKey: false,
        timestamps: true
    }
)

AdminNotificationSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('admin_notification', AdminNotificationSchema)