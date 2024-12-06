const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const productSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    name: {
      type: String,
      required: true,
    },
    brand_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'brand'
    },
    category_id: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "product_category"
    },
    sub_category_id: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "product_sub_category_types"
    },
    sub_sub_category_id: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "product_sub_sub_category_types"
    },
    variant: [
      {
        sku_id: {
          type: String
        },
        description: {
          type: String,
        },
        price: {
          type: Number,
        },
        inventory_quantity: {
          type: Number,
        },
        discount: {
          type: Number,
        },
        bulk_discount: {
          type: Number,
        },
        images: {
          type: [String]
        },
        specification: [
          {
            specification_type: {
              type: String
            },
            value: {
              type: String
            }
          }
        ],
        is_sku_deleted: {
          type: Boolean,
          default: false
        },
        tag: {
          type: [String]
        },
      }
    ],
    is_deleted: {
      type: Boolean,
      default: false
    },
    is_admin_approved: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    rejected_reason: {
      type: String
    }
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

productSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("products", productSchema);
