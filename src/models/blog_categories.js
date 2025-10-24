const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const blogCategorySchema = new mongoose.Schema(
  {
    category_name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

blogCategorySchema.plugin(mongoosePaginate);

module.exports = mongoose.model("blog_categories", blogCategorySchema);

