const mongoose = require('mongoose');

const AdminPasswordResetRequestSchema = new mongoose.Schema(
  {
    sub_admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'admins',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'admins',
      default: null,
    },
    approved_at: {
      type: Date,
      default: null,
    },
    reset_token: {
      type: String,
      default: null,
    },
    reset_token_expiry: {
      type: Date,
      default: null,
    },
    rejected_reason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('admin_password_reset_requests', AdminPasswordResetRequestSchema);
