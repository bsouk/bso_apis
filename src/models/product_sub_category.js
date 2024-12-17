
const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const categorySubTypeSchema = new mongoose.Schema(
    {
        product_category_type_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "category_types"
        },
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

categorySubTypeSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('product_sub_category_types', categorySubTypeSchema)
