const mongoose = require('mongoose')
const validator = require('validator')

const paymentTermsSchema = new mongoose.Schema(
    {
        name: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('payment_terms', paymentTermsSchema)

