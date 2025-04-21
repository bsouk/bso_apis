const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const { v4: uuidv4 } = require("uuid");

const PaymentSchema = new mongoose.Schema(
    {
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'orders'
        },
        enquiry_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'enquries'
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
        payment_method: {
            type: String,
            enum: [
                "cash_on_delivery",
                "net_banking",
                "upi",
                "wallet",
                "card"
            ],
            default: "cash_on_delivery",
        },
        receipt_number: {
            type: String,
            default: function () {
                const uuid = uuidv4().replace(/-/g, ""); // Generate UUID and remove hyphens
                const upperCaseUuid = uuid.toUpperCase(); // Convert UUID to uppercase
                return upperCaseUuid.substring(0, 10); // Take the first 10 characters
            },
        },
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
        buyer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
        },
        status: {
            type: String,
            enum: ["success", "failed", "pending"],
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
        }
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
