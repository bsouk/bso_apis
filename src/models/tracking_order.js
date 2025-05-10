const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const TrackingSchema = new mongoose.Schema({
    tracking_unique_id: {
        type: String
    },
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'orders'
    },
    order_shipment_status: {
        type: String,
        // enum: [
        //     "pending",
        //     "cancelled",
        //     "ready_for_pickup_pending",
        //     "shipment_pending",
        //     "ready_for_dispatch",
        //     "dispatched",
        //     "out_for_delivery",
        //     "delivered"
        // ],
        enum: [
            "placed",
            "confirmed",
            "dispatched",
            "out_for_delivery",
            "delivered",
            "pickup ready",
            "cancelled",
        ],
        default: "placed"
    },
    order_shipment_dates: [
        {
            order_status: String,
            date: Date,
        },
    ],
    logistics_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    delivery_note: {
        type: String
    },
});

TrackingSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('tracking_order', TrackingSchema)

