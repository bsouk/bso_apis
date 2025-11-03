const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const awardsSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
      trim: true,
    },
    image_alt: {
      type: String,
      required: true,
      trim: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Add pagination plugin
awardsSchema.plugin(mongoosePaginate);

// Add indexes for better query performance
awardsSchema.index({ is_active: 1, order: 1 });
awardsSchema.index({ createdAt: -1 });

const Awards = mongoose.model('Awards', awardsSchema);

module.exports = Awards;



