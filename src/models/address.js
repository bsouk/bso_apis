const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const addressSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref : 'users'
        },
        phone_number: {
            type: String
        },
        email: {
            type: String
        },
        address: {
            address_line_1: {
                type: String,
                default: "",
            },
            address_line_2: {
                type: String,
                default: "",
            },
            city: {
                type: String,
                default: "",
            },
            state: {
                type: String,
                default: "",
            },
            country: {
                type: String,
                default: "",
            },
            pin_code: {
                type: String,
                default: "",
            },
        },
        location: {
            type: {
                type: String,
                enum: ["Point"]
            },
            coordinates: {
                type: [Number]
            }
        },
        default_address: {
            type: Boolean,
            default: false
        },
        is_primary: {
            type: Boolean,
            default: false
        },
        address_type : {
            type : String,
            enum : ["Home", "Work"],
            default : "Home"
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
)

addressSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('address', addressSchema)
