const mongoose = require('mongoose')
const validator = require('validator')

const TeamMemberSchema = new mongoose.Schema(
  {
    user_id : {
      type : mongoose.Schema.Types.ObjectId
    },
    first_name: {
      type: String,
    },
    last_name: {
      type: String,
    },
    email: {
      type: String,
    },
    company_name: {
      type: String,
    },
    message: {
      type: String,
    },
    permission_role: {
      type: String,
      enum: ["custom", "administrator", "super_manager","manager"],
    },
    permission: {
      request: { type: String, enum: ["all", "own", "none"], default: "all" },
      quotation: { type: String, enum: ["all", "own", "none"], default: "all" },
      inventory: { type: String, enum: ["all", "own", "none"], default: "all" },
      address: { type: String, enum: ["all", "own", "none"], default: "all" },
      invoice: { type: String, enum: ["all", "own", "none"], default: "all" },
      member: { type: String, enum: ["all", "own", "none"], default: "all" },
    },
  },
  {
    versionKey: false,
    timestamps: true
  }
)
TeamMemberSchema.virtual("full_name").get(function () {
  return `${this.first_name} ${this.last_name}`;
});
module.exports = mongoose.model('team_member', TeamMemberSchema)
