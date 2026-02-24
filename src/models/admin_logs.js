const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

/**
 * Admin Activity Logs Schema
 * 
 * Tracks all administrative actions across the platform
 * Designed to handle 10K+ logs with optimized indexes
 * 
 * @version 1.0.0
 * @created November 5, 2025
 */
const adminLogsSchema = new mongoose.Schema(
  {
    // ═══════════════════════════════════════════════════════
    // WHO - Admin Information
    // ═══════════════════════════════════════════════════════
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admins",
      required: true,
      index: true
    },
    admin_name: {
      type: String,
      required: true
    },
    admin_email: {
      type: String,
      required: true
    },
    admin_role: {
      type: String,
      enum: ["super_admin", "sub_admin"],
      required: true,
      index: true
    },

    // ═══════════════════════════════════════════════════════
    // WHAT - Action Information
    // ═══════════════════════════════════════════════════════
    feature: {
      type: String,
      required: true,
      enum: [
        "manual_enquiry",
        "enquiry",
        "product",
        "category",
        "sub_category",
        "business_category",
        "brand",
        "user",
        "customer",
        "supplier",
        "logistics",
        "logistics_quote",
        "supplier_quote",
        "order",
        "payment",
        "subscription",
        "job",
        "blog",
        "seo",
        "settings",
        "report",
        "notification",
        "quote_management",
        "quotation",
        "sub_admin_management",
        "auth",
        // Extensible - can add more features
      ],
      index: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        "create",
        "update",
        "delete",
        "approve",
        "reject",
        "accept",
        "send",
        "assign",
        "view",
        "export",
        "bulk_delete",
        "restore",
        "status_change",
        // Extensible
      ],
      index: true
    },

    // ═══════════════════════════════════════════════════════
    // WHERE - Related Record Information
    // ═══════════════════════════════════════════════════════
    related_id: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    related_collection: {
      type: String,
      // e.g., 'enquiries', 'products', 'users', etc.
    },

    // ═══════════════════════════════════════════════════════
    // HOW - Status & Results
    // ═══════════════════════════════════════════════════════
    status: {
      type: String,
      enum: ["success", "failed"],
      default: "success",
      required: true,
      index: true
    },

    // ═══════════════════════════════════════════════════════
    // DETAILS - Action Details
    // ═══════════════════════════════════════════════════════
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Error tracking (for failed actions)
    error_message: {
      type: String,
    },
    error_stack: {
      type: String,
    },

    // ═══════════════════════════════════════════════════════
    // REQUEST - HTTP Request Metadata
    // ═══════════════════════════════════════════════════════
    ip_address: {
      type: String,
    },
    user_agent: {
      type: String,
    },
    request_method: {
      type: String,
      // GET, POST, PATCH, DELETE
    },
    request_endpoint: {
      type: String,
    },

    // ═══════════════════════════════════════════════════════
    // METADATA - Feature-specific Information
    // ═══════════════════════════════════════════════════════
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Flexible structure for different features
      // Example for manual_enquiry:
      // {
      //   buyer_id: ObjectId,
      //   buyer_name: String,
      //   buyer_email: String,
      //   enquiry_number: String,
      //   enquiry_items_count: Number,
      //   shipping_address: String
      // }
    },

    // ═══════════════════════════════════════════════════════
    // SOFT DELETE
    // ═══════════════════════════════════════════════════════
    is_deleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deleted_at: {
      type: Date,
    },
    deleted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admins",
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ═══════════════════════════════════════════════════════════
// INDEXES - Optimized for Fast Queries
// ═══════════════════════════════════════════════════════════

// Compound indexes for common query patterns
adminLogsSchema.index({ admin_id: 1, createdAt: -1 });
adminLogsSchema.index({ feature: 1, createdAt: -1 });
adminLogsSchema.index({ feature: 1, action: 1, createdAt: -1 });
adminLogsSchema.index({ status: 1, createdAt: -1 });
adminLogsSchema.index({ is_deleted: 1, createdAt: -1 });

// Text index for full-text search
adminLogsSchema.index({
  admin_name: "text",
  admin_email: "text",
  "metadata.enquiry_number": "text",
  "metadata.buyer_name": "text",
});

// ═══════════════════════════════════════════════════════════
// PAGINATION PLUGIN
// ═══════════════════════════════════════════════════════════
adminLogsSchema.plugin(mongoosePaginate);

// ═══════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════

/**
 * Get logs summary statistics
 */
adminLogsSchema.statics.getStats = async function () {
  return this.aggregate([
    { $match: { is_deleted: { $ne: true } } },
    {
      $facet: {
        by_feature: [
          { $group: { _id: "$feature", count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        by_action: [
          { $group: { _id: "$action", count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        by_status: [
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ],
        by_admin_role: [
          { $group: { _id: "$admin_role", count: { $sum: 1 } } }
        ],
        total_count: [
          { $count: "total" }
        ],
        failed_count: [
          { $match: { status: "failed" } },
          { $count: "total" }
        ]
      }
    }
  ]);
};

/**
 * Get recent logs
 */
adminLogsSchema.statics.getRecent = async function (limit = 10) {
  return this.find({ is_deleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("admin_id", "full_name email role")
    .lean();
};

// ═══════════════════════════════════════════════════════════
// EXPORT MODEL
// ═══════════════════════════════════════════════════════════

module.exports = mongoose.model("admin_logs", adminLogsSchema);

