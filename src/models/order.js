const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')
const TrackingSchema = require("./tracking_order")

const OrderSchema = new mongoose.Schema({
    order_unique_id: {
        type: String,
        required: true,
        sparse: true
    },
    order_type: {
        type: String,
        enum: [
            "active",
            "delivered",
            "return_exchange",
            "cancelled"
        ],
        default: "active",
        sparse: true,
    },
    order_status: {
        type: String,
        enum: [
            "pending",
            "delivered",
            "cancelled"
        ],
        default: "pending"
    },
    enquiry_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'enquries'
    },
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    logistics_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    cancelled_by: {
        type: String,
        enum: ["admin", "buyer"]
    },
    cancelled_by_id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    cancelled_reason: {
        type: String,
        default: null,
    },
    total_amount: {
        type: Number,
        default: 0,
    },
    // delivery_charges: {
    //     type: Number,
    //     default: 0,
    // },
    // order_items: {
    //     type: [
    //         {
    //             product_id: {
    //                 type: mongoose.Schema.Types.ObjectId,
    //                 ref: 'products',
    //             },
    //             supplier_id: {
    //                 type: mongoose.Schema.Types.ObjectId,
    //                 ref: 'users',
    //             },
    //             logistics_id: {
    //                 type: mongoose.Schema.Types.ObjectId,
    //                 ref: 'users',
    //             },
    //             variant_id: {
    //                 type: mongoose.Schema.Types.ObjectId,
    //             },
    //             quantity: {
    //                 type: Number
    //             },
    //             price: {
    //                 type: Number
    //             }
    //         }
    //     ],
    //     default: []
    // },
    payment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "payment"
    },
    shipping_address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'address',
        required: true,
    },
    billing_address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'address',
        required: true,
    },
    tracking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tracking_order',
        default: null
    },
},
    {
        versionKey: false,
        timestamps: true,
        toJSON: {
            virtuals: true,
        },
    }
)

OrderSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('orders', OrderSchema)
