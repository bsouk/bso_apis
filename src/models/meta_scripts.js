const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const metaScriptSchema = new mongoose.Schema(
  {
    script_name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    script_type: {
      type: String,
      enum: ['analytics', 'tag-manager', 'pixel', 'chat', 'custom'],
      default: 'custom',
      required: true
    },
    position: {
      type: String,
      enum: ['head', 'body-start', 'body-end'],
      default: 'head',
      required: true
    },
    script_content: {
      type: String,
      required: true
    },
    // Placeholders used in the script (for documentation and validation)
    placeholders: [{
      key: String,
      description: String,
      example: String
    }],
    // Execution order (lower number = executes first)
    order: {
      type: Number,
      default: 0
    },
    // Load strategy
    load_strategy: {
      type: String,
      enum: ['async', 'defer', 'blocking'],
      default: 'async'
    },
    // Status
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },
    // Additional metadata
    added_by: {
      type: String
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

metaScriptSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("meta_scripts", metaScriptSchema);

