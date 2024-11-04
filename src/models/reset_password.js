const mongoose = require('mongoose')
const validator = require('validator')

const ResetPasswordSchema = new mongoose.Schema(
  {
    user_id : {
      type : mongoose.Schema.Types.ObjectId
    },
    email: {
      type: String,
      required: true,
      validate: {
        validator: validator.isEmail,
        message: 'EMAIL_IS_NOT_VALID'
      },
      lowercase: true,
    },
    token: {
      type: String
    },
    used: {
      type: Boolean,
      default: false
    },
    exp_time: {
      type: Date,
    },
    verified : {
      type : Boolean,
      default : false
    }
  },
  {
    timestamps : true
  }
);

module.exports = mongoose.model('reset_password', ResetPasswordSchema)

