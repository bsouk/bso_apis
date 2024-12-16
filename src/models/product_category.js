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
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
)

categoryTypeSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('product_category', categoryTypeSchema)