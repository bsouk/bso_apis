const mongoose = require('mongoose')
const validator = require('validator')
const { v4: uuidv4 } = require("uuid");

const paymentTermsSchema = new mongoose.Schema(
    {
        name: {
            type: String
        },
        method: {
            type: String,
            enum: ["scheduled", "cash-on-delivery", "iloc", "advanced"]
        },
        iloc_document: [String],
        schedule: [
            {
                schedule_id: {
                    type: String,
                    default: function () {
                        const uuid = uuidv4().replace(/-/g, ""); // Generate UUID and remove hyphens
                        const upperCaseUuid = uuid.toUpperCase(); // Convert UUID to uppercase
                        return upperCaseUuid.substring(0, 5); // Take the first 10 characters
                    },
                },
                value_type: {
                    type: String,
                    enum: ['flat', 'percentage'],
                    default: "percentage"
                },
                value: Number,
                days: Number,
                payment_stage: {
                    type: String,
                    enum: ["advance", "readiness", "within", "upon-delivery"]
                }
            },
        ],
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('payment_terms', paymentTermsSchema)

