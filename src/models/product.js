const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const productSchema = new mongoose.Schema(
  {
    user_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'users'
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    brand_id: {
      type: mongoose.Schema.Types.ObjectId,
    },
    category_id: {
      type: [mongoose.Schema.Types.ObjectId],
    },
    sub_category_id: {
      type: [mongoose.Schema.Types.ObjectId],
    },
    sub_sub_category_id: {
      type: [mongoose.Schema.Types.ObjectId],
    },
    sku: {
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
    tag : {
        type : [String]
    },
    images : {
        type : [String]
    },
    is_deleted : {
        type : Boolean,
        default : false
    }
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

productSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("products", productSchema);
