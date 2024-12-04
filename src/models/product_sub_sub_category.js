
const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const SubSubCategory = new mongoose.Schema(
    {
        product_category_type_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "product_category"
        },
        product_sub_category_type_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "product_sub_category_types"
        },
        icon: {
            type: String
        },
        name: {
            type: String
        },
    },
    {
        versionKey: false,
        timestamps: true
    }
)

SubSubCategory.plugin(mongoosePaginate)
module.exports = mongoose.model('product_sub_sub_category_types', SubSubCategory)
