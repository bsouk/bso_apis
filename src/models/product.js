const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const productSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users'
    },
    product_of: {
      type: String
    },
    name: {
      type: String
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
    // supplier: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'users'
    // },
    variant: [
      {
        sku_id: {
          type: String
        },
        part_id: String,
        description: {
          type: String,
        },
        price: {
          type: Number,
        },
        assigned_to: {
          type: String,
          required: false,
        },
        inventory_quantity: {
          type: String,
        },
        Threshold_value: {
          type: Number
        },
        remind_on_low_stock: {
          type: Boolean,
          default: false
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
    },
    review: {
      type: [
        {
          order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'orders'
          },
          review_stars: {
            type: Number,
            max: 5,
            default: 0
          },
          title: {
            type: String
          },
          comment: {
            type: String
          },
          uploaded_images: [String]
        }
      ],
      default: []
    }
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

productSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("products", productSchema);
