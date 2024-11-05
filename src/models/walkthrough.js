const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const walkthroughSchema = new mongoose.Schema(
  {
    first_screen : {
        title : {
            type : String,
            require : true
        },
    },
    second_screen : {
        title : {
            type : String,
            require : true
        },
    },
    third_screen : {
        title : {
            type : String,
            require : true
        },
    },
  },
  {
    versionKey: false,
    timestamps: true
  }
)

walkthroughSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('walkthrough', walkthroughSchema)
