const mongoose = require('mongoose')
const validator = require('validator')

const TeamSchema = new mongoose.Schema(
    {
        team_id: String,
        team_type : {
            type: String,
            enum: ['supplier', 'buyer', 'logistics', 'resource']
        },
        admin_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users'
        },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'users'
            }
        ]
    },
    {
        versionKey: false,
        timestamps: true
    }
)
module.exports = mongoose.model('team', TeamSchema)
