const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");
const { string } = require("i/lib/util");

const UserSchema = new mongoose.Schema(
  {
    profile_image: {
      type: String,
    },
    first_name: {
      type: String,
    },
    last_name: {
      type: String,
    },
    full_name: {
      type: String,
    },
    email: {
      type: String,
      validate: {
        validator: validator.isEmail,
        message: "EMAIL_IS_NOT_VALID",
      },
      lowercase: true,
      required: true,
    },
    phone_number_code: {
      type: String,
    },
    phone_number: {
      type: String,
    },
    password: {
      type: String,
      // required: true,
      select: false,
    },
    decoded_password: {
      type: String,
      // required: true,
      select: false,
    },
    user_type: {
      type: String,
      enum: ["buyer", "supplier", "logistics", "resource"],
      required: true,
    },
    joining_date: {
      type: Date
    },
    is_company_approved: {
      type: Boolean,
      default: false
    },
    is_user_approved_by_admin: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    profile_completed: {
      type: Boolean,
      default: false,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    last_login: {
      type: Date,
      default: null
    },

    //
    experience_in_year: {
      type: Number,
      default: 0
    },
    profile_description: {
      type: String
    },
    skills: {
      type: [String],
    },
    rate_per_hour: {
      type: Number
    },
    availability_status: {
      type: String,
      enum: ["open_to_work", "hired"],
      default: "open_to_work"
    },
    portfolio: {
      type: [String],
    },
    certifications: {
      type: [String],
    },

  

    business_name:{
       type:String
    },
    categories_id : {
      type : mongoose.Schema.Types.ObjectId
    },
    sub_categories_id:{
      type : mongoose.Schema.Types.ObjectId

    },
    // bank_details:{
    //   type:String
    // },
    certification:{
      type:String
    },
    health_and_saftey_procedures:{
      type:String
    },
    quality_procedures:{
      type:String
    },
    anti_correcuptin_procedures:{
      type:String
    },
    business_document:{
      type:String
    },

    //bank details

    account_holder_name:{
      type:String
    },
    bank_account_name:{
      type:String
    },
    bank_name:{
      type:String
    },
    swift_code:{
      type:String
    }
  },
  {
    timestamps: true,
  }
);

const hash = (user, salt, next) => {
  bcrypt.hash(user.password, salt, null, (error, newHash) => {
    if (error) {
      return next(error);
    }
    user.password = newHash;
    return next();
  });
};

const genSalt = (user, SALT_FACTOR, next) => {
  bcrypt.genSalt(SALT_FACTOR, (err, salt) => {
    if (err) {
      return next(err);
    }
    return hash(user, salt, next);
  });
};

UserSchema.pre("save", function (next) {
  const that = this;
  const SALT_FACTOR = 5;

  if (that.type === "buyer") {
    if (that.isModified("first_name") || that.isModified("last_name")) {
      that.full_name = `${that.first_name} ${that.last_name}`;
    }
  }

  if (!that.isModified("password")) {
    return next();
  }
  return genSalt(that, SALT_FACTOR, next);
});

UserSchema.methods.comparePassword = function (passwordAttempt, cb) {
  bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
    err ? cb(err) : cb(null, isMatch)
  );
};

UserSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("users", UserSchema);
