const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");

const UserSchema = new mongoose.Schema({
  // user_id: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "Users"
  // },
  email: {
    type: String,
    validate: {
      validator: validator.isEmail,
      message: "EMAIL_IS_NOT_VALID",
    },
    lowercase: true,
    required: true,
  },
  full_name: {
    type: String
  },
  message: {
    type: String,
    required: true
  },
},
  {
    versionKey: false,
    timestamps: true
  }
)

UserSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("contact_us", UserSchema);
