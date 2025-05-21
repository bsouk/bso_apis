const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const { v4: uuidv4 } = require("uuid");

const PaymentSchema = new mongoose.Schema(
    {
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'orders'
        },
        currency: String,
        enquiry_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'enquries'
        },
        subscription_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'subscriptions'
        },
        buyer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        total_amount: {
            type: Number,
        },
        delivery_charges: {
            type: Number,
        },
        service_charges: {
            type: Number,
        },
        logistics_charges: {
            type: Number,
        },
        supplier_charges: {
            type: Number,
        },
        stripe_customer_id: {
            type: String,
        },
        stripe_subscription_id: {
            type: String,
        },
        stripe_payment_method_id: {
            type: String,
        },
        payment_method_type: String,
        payment_status: {
            type: String,
            enum: ["pending", "complete"],
            default: "pending",
        },
        iloc_document: [String],
        receipt: String,
        payment_stage: [
            {
                currency: String,
                payment_method: {
                    type: String
                },
                schedule_id: String,
                amount: Number,
                schedule_status: {
                    type: String,
                    enum: ["pending", "completed"],
                    default: "pending"
                },
                receipt_number: {
                    type: String,
                    default: function () {
                        const uuid = uuidv4().replace(/-/g, ""); // Generate UUID and remove hyphens
                        const upperCaseUuid = uuid.toUpperCase(); // Convert UUID to uppercase
                        return upperCaseUuid.substring(0, 10); // Take the first 10 characters
                    },
                },
                receipt: String,
                promocode: {
                    type: Object,
                    default: null,
                },
                txn_id: {
                    type: String,
                    default: null,
                },
                tid_number: {
                    type: String,
                },
                status: {
                    type: String,
                    default: "pending",
                },
                payment_obj: {
                    // from payu
                    type: Object,
                },
                refund_obj: {
                    // from payu
                    type: Object,
                },
                transactionTimeStamps: {
                    type: String,
                },
                paymentFrom: {
                    type: String,
                },
                stripe_payment_intent: String,
                stripe_payment_method: String,
            }
        ]
    },
    {
        versionKey: false,
        timestamps: true,
        toJSON: {
            virtuals: true,
        },
    }
);

PaymentSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('payment', PaymentSchema)
