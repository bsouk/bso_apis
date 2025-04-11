const mongoose = require('mongoose')
const validator = require('validator')

const UserMemberSchema = new mongoose.Schema(
  {
    user_id : {
      type : mongoose.Schema.Types.ObjectId
    },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    last_name: {
      type: String,
    },
    member_count: { type: Number, default: 0 }
  },
  {
    versionKey: false,
    timestamps: true
  }
)
module.exports = mongoose.model('user_member', UserMemberSchema)
