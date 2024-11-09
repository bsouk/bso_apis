const { Schema, model } = require("mongoose");

const SupplierSchema = new Schema({
  supplier_name: {
    type: String,
    required: true,
  },
  business_name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
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
  business_type: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  sub_category: {
    type: String,
    required: true,
  },
  bank_details: {
    account_holder_name: {
      type: String,
      required: true,
    },
    account_number: {
      type: String,
      required: true,
    },
    bank_name: {
      type: String,
      required: true,
    },
    swift_code: {
      type: String,
      required: true,
    },
  },
  health_safety_procedures: {
    type: String,
  },
  status: {
    default: "active",
    enum: ["active", "inactive"],
  },
  business_certificates: {
    type: Array,
  },
});
