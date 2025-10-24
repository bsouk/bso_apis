const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
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
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'blog_categories'
    }],
    image: {
      type: String,
      required: true
    },
    author: {
      type: String,
      default: 'BSO Team'
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
    views: {
      type: Number,
      default: 0
    },
    tags: [{
      type: String,
      trim: true
    }]
  },
  {
    timestamps: true,
    versionKey: false
  }
);

blogSchema.plugin(mongoosePaginate);

// Index for better search performance
blogSchema.index({ title: 'text', description: 'text', content: 'text' });

module.exports = mongoose.model("blogs", blogSchema);

