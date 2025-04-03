const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const addressSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users'
        },
        first_name: {
            type: String,
            default: "",
        },
        last_name: {
            type: String,
            default: "",
        },
        company_name: {
            type: String,
            default: "",
        },
        website: {
            type: String,
            default: "",
        },
        fax: {
            type: String,
            default: "",
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
                name: {
                    type: String,
                    default: "",
                },
                iso_code: {
                    type: String,
                    default: "",
                }
            },
            state: {
                name: {
                    type: String,
                    default: "",
                },
                iso_code: {
                    type: String,
                    default: "",
                }
            },
            country: {
                name: {
                    type: String,
                    default: "",
                },
                iso_code: {
                    type: String,
                    default: "",
                }
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
        address_type: {
            type: String,
            enum: ["Home", "Work"],
            default: "Home"
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
)

addressSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('address', addressSchema)
