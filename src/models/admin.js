const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");

const AdminSchema = new mongoose.Schema(
  {
    profile_image: {
      type: String,
      default: ""
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
      required: false,
    },
    role: {
      type: String,
      enum: ["super_admin", "sub_admin"],
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    decoded_password: {
      type: String,
      required: true,
      select: false,
    },
    permissions: {
      type: [mongoose.Schema.Types.Mixed],
      default: [""],
    },
    phone_number: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
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

AdminSchema.pre("save", function (next) {
  const that = this;
  const SALT_FACTOR = 5;

  if (that.isModified("first_name") || that.isModified("last_name")) {
    that.full_name = `${this.first_name} ${this.last_name}`;
  }

  if (!that.isModified("password")) {
    return next();
  }

  return genSalt(that, SALT_FACTOR, next);
});

AdminSchema.methods.comparePassword = function (passwordAttempt, cb) {
  bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
    err ? cb(err) : cb(null, isMatch)
  );
};

AdminSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("admins", AdminSchema);
