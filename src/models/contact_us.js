const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");

const UserSchema = new mongoose.Schema({
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
  phone_number: {
    type: String
  },
  subject: {
    type: String
  },
  status:{
    type: String,
    default:'Pending',
    enum:['Hold','Replied','Read','Pending']
  },
  message: {
    type: String,
    required: true
  },
  reply:{
    type: String
  }
},
  {
    versionKey: false,
    timestamps: true
  }
)

UserSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("contact_us", UserSchema);
