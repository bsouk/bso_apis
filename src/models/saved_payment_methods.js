const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const SavedPaymentMethodSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true
    },
    stripe_payment_method_id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    stripe_customer_id: {
      type: String,
      required: true,
      index: true
    },
    payment_method_type: {
      type: String,
      enum: ["card", "bank_account", "us_bank_account", "link"],
      default: "card"
    },
    // Card details (extracted from Stripe)
    card_details: {
      card_last4: {
        type: String
      },
      card_brand: {
        type: String, // visa, mastercard, amex, etc.
      },
      card_exp_month: {
        type: Number
      },
      card_exp_year: {
        type: Number
      },
      card_funding: {
        type: String // credit, debit, prepaid, unknown
      },
      card_country: {
        type: String
      }
    },
    // Bank account details (if applicable)
    bank_details: {
      bank_name: {
        type: String
      },
      account_last4: {
        type: String
      },
      account_type: {
        type: String // checking, savings
      },
      routing_number: {
        type: String
      }
    },
    billing_details: {
      name: {
        type: String
      },
      email: {
        type: String
      },
      phone: {
        type: String
      },
      address: {
        line1: String,
        line2: String,
        city: String,
        state: String,
        postal_code: String,
        country: String
      }
    },
    is_default: {
      type: Boolean,
      default: false,
      index: true
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true
    },
    // Track who added this (for admin actions)
    added_by: {
      type: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
      },
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
      },
      admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "admins"
      }
    },
    // Metadata
    metadata: {
      type: Object,
      default: {}
    },
    // Soft delete
    is_deleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deleted_at: {
      type: Date,
      default: null
    },
    deleted_by: {
      type: {
        type: String,
        enum: ["user", "admin"]
      },
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
      },
      admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "admins"
      }
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true
    }
  }
);

// Indexes for performance
SavedPaymentMethodSchema.index({ user_id: 1, is_deleted: 1, is_active: 1 });
SavedPaymentMethodSchema.index({ user_id: 1, is_default: 1 });
SavedPaymentMethodSchema.index({ stripe_customer_id: 1 });
SavedPaymentMethodSchema.index({ is_deleted: 1, is_active: 1 });

// Virtual for formatted card display
SavedPaymentMethodSchema.virtual('card_display').get(function() {
  if (this.payment_method_type === 'card' && this.card_details?.card_last4) {
    return `**** **** **** ${this.card_details.card_last4}`;
  }
  return null;
});

// Virtual for expiry display
SavedPaymentMethodSchema.virtual('expiry_display').get(function() {
  if (this.payment_method_type === 'card' && this.card_details?.card_exp_month && this.card_details?.card_exp_year) {
    return `${String(this.card_details.card_exp_month).padStart(2, '0')}/${this.card_details.card_exp_year}`;
  }
  return null;
});

SavedPaymentMethodSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("saved_payment_methods", SavedPaymentMethodSchema);

