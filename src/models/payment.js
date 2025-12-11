const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const { v4: uuidv4 } = require("uuid");

const PaymentSchema = new mongoose.Schema(
    {
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'orders'
        },
        team_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'team'
        },
        currency: String,
        enquiry_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'enquires'
        },
        subscription_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'subscriptions'
        },
        buyer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users"
        },
        supplier_id: {
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
        stripe_payment_intent: String,
        stripe_payment_method_id: {
            type: String,
        },
        payment_method_type: String,
        payment_status: {
            type: String,
            default: "pending",
        },
        iloc_document: [String],
        receipt: String,

        logistic_payment: [
            {
                currency: String,
                payment_method: {
                    type: String
                },
                schedule_id: String,
                amount: Number,
                payment_percentage: Number,
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
                receipt_image: {
                    type: String,
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
        ],
        payment_stage: [
            {
                currency: String,
                payment_method: {
                    type: String
                },
                schedule_id: String,
                amount: Number,
                payment_percentage: Number,
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
                receipt_image: {
                    type: String,
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
        ],
        // Payment Management Fields
        payment_purpose: {
            type: String,
            enum: [
                "subscription",
                "enquiry_payment",
                "logistics_payment",
                "team_member",
                "subscription_renewal",
                "other"
            ]
        },
        payment_feature: {
            type: String,
            enum: [
                "buyer_subscription",
                "supplier_subscription",
                "logistics_subscription",
                "recruiter_subscription",
                "enquiry_purchase",
                "order_payment",
                "logistics_fee",
                "team_expansion",
                "other"
            ]
        },
        user_type: {
            type: String,
            enum: ["buyer", "supplier", "logistics", "recruiter", "resource"]
        },
        payment_method_details: {
            card_last4: String,
            card_brand: String,
            card_exp_month: Number,
            card_exp_year: Number,
            bank_name: String,
            bank_account_last4: String,
            transaction_id: String,
            receipt_url: String,
            receipt_image: String
        },
        purpose_details: {
            enquiry_unique_id: String,
            order_unique_id: String,
            subscription_id: String,
            plan_name: String,
            plan_type: String,
            description: String
        },
        // Soft Delete Fields
        is_deleted: {
            type: Boolean,
            default: false
        },
        deleted_at: {
            type: Date,
            default: null
        },
        deleted_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            default: null
        },
        deleted_by_admin: {
            type: Boolean,
            default: false
        },
        deleted_by_user: {
            type: Boolean,
            default: false
        },
        is_permanently_deleted: {
            type: Boolean,
            default: false
        },
        permanently_deleted_at: {
            type: Date,
            default: null
        },
        permanently_deleted_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "admins",
            default: null
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
