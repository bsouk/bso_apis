const mongoose = require('mongoose')
const validator = require('validator')

const TeamSchema = new mongoose.Schema(
    {
        team_id: String,
        admin_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users'
        },
        members: [
            {
                user_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'users'
                }
            }
        ]
    },
    {
        versionKey: false,
        timestamps: true
    }
)
module.exports = mongoose.model('team', TeamSchema)
