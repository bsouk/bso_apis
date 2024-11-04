const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const FCMDeviceSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.ObjectId,
      ref: "User",
      required: true,
    },
    device_id : {
      type: String
    },
    device_type:{
      type: String,
      enum: ["web","android","ios"],
      default: "web",
    },
    token:{
      type: String,
      required: true,
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

FCMDeviceSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('fcm_device', FCMDeviceSchema)
