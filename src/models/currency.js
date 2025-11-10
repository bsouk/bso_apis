const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: (value) => /^[A-Z]{3}$/.test(value),
        message: 'INVALID_CURRENCY_CODE',
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
    },
    decimal_digits: {
      type: Number,
      min: 0,
      max: 6,
      default: 2,
    },
    exchange_rate: {
      type: Number,
      min: 0,
      default: 1,
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

currencySchema.pre('save', function (next) {
  if (this.isModified('code') && this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

currencySchema.index({ code: 1 }, { unique: true });
currencySchema.index({ status: 1, is_default: 1 });

module.exports = mongoose.model('currencies', currencySchema);

