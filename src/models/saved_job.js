const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const validator = require("validator");
const mongoosePaginate = require("mongoose-paginate-v2");

const SavedJob = new mongoose.Schema({
    job_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "jobs"
    },
    candidate_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    status: {
        type: String,
        enum: ["saved", "unsaved"],
        default: "saved"
    }
},
    {
        versionKey: false,
        timestamps: true
    }
)

SavedJob.plugin(mongoosePaginate);

module.exports = mongoose.model("saved_job", SavedJob);
