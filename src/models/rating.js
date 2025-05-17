const mongoose = require('mongoose')
const validator = require('validator')

const RatingSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
        },
        company_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
        },
        count: Number,
        comment: String,
    },
    {
        versionKey: false,
        timestamps: true
    }
)
module.exports = mongoose.model('rating', RatingSchema)
