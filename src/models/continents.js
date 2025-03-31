const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const ContinentSchema = new mongoose.Schema({
    key: String,
    title: String,
    folder: {
        type: Boolean,
        default: true
    },
    children: [
        {
            key: String,
            title: String
        }
    ]
})


module.exports = mongoose.model("continent", ContinentSchema);
