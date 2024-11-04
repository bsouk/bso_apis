const mongoose = require('mongoose')
const validator = require('validator')

const UserAccessSchema = new mongoose.Schema(
  {
    user_id : {
      type : mongoose.Schema.Types.ObjectId
    },
    ip: {
      type: String,
    },
    browser: {
      type: String,
    },
  },
  {
    versionKey: false,
    timestamps: true
  }
)
module.exports = mongoose.model('user_access', UserAccessSchema)
