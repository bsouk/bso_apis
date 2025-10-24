const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const seoPageSchema = new mongoose.Schema(
  {
    page_name: {
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    keywords: {
      type: String,
      trim: true
    },
    // Open Graph Tags
    og_title: {
      type: String,
      trim: true
    },
    og_description: {
      type: String,
      trim: true
    },
    og_image: {
      type: String,
      trim: true
    },
    og_url: {
      type: String,
      trim: true
    },
    og_type: {
      type: String,
      default: 'website',
      trim: true
    },
    // Twitter Card Tags
    twitter_card: {
      type: String,
      default: 'summary_large_image',
      trim: true
    },
    twitter_title: {
      type: String,
      trim: true
    },
    twitter_description: {
      type: String,
      trim: true
    },
    twitter_image: {
      type: String,
      trim: true
    },
    // Additional Meta Tags
    canonical_url: {
      type: String,
      trim: true
    },
    robots: {
      type: String,
      default: 'index, follow',
      trim: true
    },
    author: {
      type: String,
      trim: true
    },
    // Status
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

seoPageSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("seo_pages", seoPageSchema);

