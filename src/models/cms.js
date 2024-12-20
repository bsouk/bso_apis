const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const CMSSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['privacy_policy', 'terms_and_conditions', 'about_us', "support", "quality_procedures", "health_and_safety_procedures", "anti_corruption_policy", "environmental_policy"],
      required: true
    },
    images: {
      type: [String],
      default: []
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

CMSSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('CMS', CMSSchema)
