const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const clientTestimonialSchema = new mongoose.Schema(
    {
        image: String,
        name: String,
        email: String,
        phone_number: String,
        company_name: String,
        designation: String,
        review: String,
        view: {
            type: Boolean,
            default: true
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
)

clientTestimonialSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('client_testimonials', clientTestimonialSchema)
