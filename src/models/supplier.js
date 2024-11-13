const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");
const { string } = require("i/lib/util");

const SupplierSchema = new mongoose.Schema({
  unique_user_id: {
    type: String,
  },
  supplier_name: {
    type: String,
    required: true,
  },
  // business_name: {
  //   type: String,
  //   required: true,
  // },
  image: {
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
  email: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: "Invalid email format",
    },
  },
  phone: {
    type: String,
    required: true,
  },
  // business_type: {
  //   type: String,
  //   required: true,
  // },
  country: {
    type: String,
  },
  address: {
    type: String,
  },
  category: {
    type: String,
  },
  sub_category: {
    type: String,
  },
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
    }
  },
  company_data: {
    company_logo: {
      type: String
    },
    name: {
      type: String
    },
    business_category: {
      type: String
    },
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
      zip_code: {
        type: Number
      },
      country: {
        type: String
      }
    }
  },
  sample_products: [{
    product_name: {
      type: String
    },
    price: {
      type: Number
    },
    images: [String]
  }],
  health_safety_procedures: {
    type: String,
  },
  status: {
    type: String,
    default: "active",
    enum: ["active", "inactive"],
  },
  business_certificates: {
    type: Array,
  },
  licenses: [String]
},
  {
    timestamps: true,
  }
)

module.exports = mongoose.model("supplier", SupplierSchema)