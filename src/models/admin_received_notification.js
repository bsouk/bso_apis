const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const AdminReceivedSchema = new mongoose.Schema(
    {
        receiver_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "admin"
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
        },
        user_type: String,
        type: {
            type: String,
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

AdminReceivedSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('admin_received_notification', AdminReceivedSchema)
