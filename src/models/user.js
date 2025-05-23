const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");
const { string } = require("i/lib/util");

const UserSchema = new mongoose.Schema(
  {
    unique_user_id: {
      type: String,
    },
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
      lowercase: true
    },
    phone_number_code: {
      type: String,
    },
    phone_number: {
      type: String,
    },
    signup_by: {
      type: String,
      enum: ["email", "phone_number"]
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
      type: [String],
      enum: ["buyer", "supplier", "logistics", "resource", "company"],
      default: ["buyer"],
      required: true,
    },
    current_user_type: {
      type: String,
      enum: ["buyer", "supplier", "logistics", "resource", "company"],
      default: "buyer"
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
    reject_reason: {
      type: String
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

    //resources related
    experience_in_year: {
      type: Number,
      default: 0
    },

    // app resource fields
    profile_description: {
      type: String
    },
    profile_title: {
      type: String
    },
    work_exprience: {
      type: [{
        job_title: {
          type: String
        },
        company_name: {
          type: String
        },
        // date_of_employement: {
        //   type: String
        // },
        key_responsibility: {
          type: String
        },
        start_date: {
          type: String
        },
        end_date: {
          type: String
        },
      }],
      default: []
    },
    education: {
      type: [{
        degree: {
          type: String
        },
        collage: {
          type: String
        },
        year_of_passing: {
          type: String
        },
        field_of_study: {
          type: String
        }
      }],
      default: []
    },
    portfolio: {
      type: [{
        project_name: String,
        link: String,
        project_description: String,
        skills_used: [String]
      }],
      default: []
    },
    skills: {
      type: [String],
    },
    certifications: {
      type: [{
        certificate_name: String,
        issuing_organisation: String,
        date_of_issuance: String,
        expiration_date: String,
        certificate_images: [String]
      }],
      default: []
    },
    languages: [String],
    testimonials: {
      type: [{
        user_image: {
          type: String
        },
        name: {
          type: String
        },
        company_name: {
          type: String
        },
        designation: {
          type: String
        },
        feedback: {
          type: String
        }
      }],
      default: []
    },
    specialisations: {
      type: String
    },
    resource_availability: {
      time_zone: {
        type: String
      },
      days_of_operation: {
        type: String
      },
      working_hours: {
        from: {
          type: String
        },
        to: {
          type: String
        }
      },
      other_info: {
        type: String
      }
    },
    rate_per_hour: {
      type: Number
    },
    project_pricing_model: {
      type: String
    },
    employement_history: {
      type: [{
        job_title: {
          type: String
        },
        company_name: {
          type: String
        },
        // date_of_employement: {
        //   type: String
        // },
        key_responsibility: {
          type: String
        },
        start_date: {
          type: String
        },
        end_date: {
          type: String
        },
      }],
      default: []
    },



    availability_status: {
      type: String,
      enum: ["open_to_work", "hired"],
      default: "open_to_work"
    },
    // portfolio: {
    //   type: [String],
    // },



    business_name: {
      type: String
    },
    categories_id: {
      type: mongoose.Schema.Types.ObjectId
    },
    sub_categories_id: {
      type: mongoose.Schema.Types.ObjectId

    },
    // bank_details:{
    //   type:String
    // },
    certification: {
      type: String
    },
    health_and_saftey_procedures: {
      type: String,
      default: ""
    },
    quality_procedures: {
      type: String,
      default: ""
    },
    anti_correcuptin_procedures: {
      type: String,
      default: ""
    },
    environment_policy: {
      type: String,
      default: ""
    },
    business_document: {
      type: String
    },

    //bank details

    // account_holder_name: {
    //   type: String
    // },
    // bank_account_number: {
    //   type: String
    // },
    // bank_name: {
    //   type: String
    // },
    // swift_code: {
    //   type: String
    // }

    bank_details: {
      account_holder_name: {
        type: String,
      },
      account_number: {
        type: String,
      },
      bank_name: {
        type: String,
      },
      swift_code: {
        type: String,
      },
      iban_number: {
        type: String,
      },
      address: {
        line1: {
          type: String
        },
        line2: {
          type: String
        },
        city: {
          type: String
        },
        state: {
          type: String
        },
        zip_code: {
          type: String
        },
        country: {
          type: String
        }
      },
    },
    company_data: {
      company_logo: {
        type: String
      },
      registration_number:
      {
        type: String
      },
      incorporation_date:
      {
        type: String
      },
      vat_number:
      {
        type: String
      },
      owner_name: {
        type: String
      },
      name: {
        type: String
      },
      business_category: {
        type: String
      },
      phone_number_code: String,
      phone_number: {
        type: Number,
      },
      email: {
        type: String
      },
      address: {
        line1: {
          type: String
        },
        line2: {
          type: String
        },
        city: {
          type: String
        },
        state: {
          type: String
        },
        zip_code: {
          type: String
        },
        country: {
          type: String
        },
        service_area: {  //logistics related
          type: String
        }
      }
    },
    beneficiary_address: {
      line1: {
        type: String
      },
      line2: {
        type: String
      },
      city: {
        type: String
      },
      state: {
        type: String
      },
      zip_code: {
        type: String
      },
      country: {
        type: String
      }
    },
    sample_products: {
      type: [{
        product_name: {
          type: String
        },
        type: String,
        price: {
          type: String
        },
        images: [String]
      }],
      default: []
    },
    business_certificates: {
      type: Array,
    },
    licenses: [String],
    insurances: [String], //logistics related
    delivery_type: {
      type: String
    },
    additional_notes: {
      type: String
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId
    },
    team_id: {
      type: String
    },
    message: {
      type: String,
    },
    permission_role: {
      type: String,
      enum: ["custom", "administrator", "super_manager", "manager"],
    },
    permission: {
      request: { type: String, enum: ["all", "own", "none"], default: "none" },
      quotation: { type: String, enum: ["all", "own", "none"], default: "none" },
      inventory: { type: String, enum: ["all", "own", "none"], default: "none" },
      address: { type: String, enum: ["all", "own", "none"], default: "none" },
      invoice: { type: String, enum: ["all", "own", "none"], default: "none" },
      member: { type: String, enum: ["all", "own", "none"], default: "none" },
    },
    member_status: {
      type: String,
      enum: ["pending", "accepted", "decline", "suspend"],
      default: "pending",
    },
    invite_status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    rating: {
      type: Number,
      default: 0
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
