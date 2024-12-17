const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const categoryTypeSchema = new mongoose.Schema(
    {
        icon: {
            type: String
        },
        name: {
            type: String
        },
        isNext: {
            type: Boolean,
            default: false
        },
        is_admin_approved: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },
        rejected_reason: {
            type: String
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
)

categoryTypeSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('product_category', categoryTypeSchema)