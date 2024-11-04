const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const walkthroughSchema = new mongoose.Schema(
  {
    first_screen : {
        title : {
            type : String,
            require : true
        },
        description : {
            type : String,
            required : true
        },
        image : {
            type : String,
            required : true
        }
    },
    second_screen : {
        title : {
            type : String,
            require : true
        },
        description : {
            type : String,
            required : true
        },
        image : {
            type : String,
            required : true
        }
    },
    third_screen : {
        title : {
            type : String,
            require : true
        },
        description : {
            type : String,
            required : true
        },
        image : {
            type : String,
            required : true
        }
    },
  },
  {
    versionKey: false,
    timestamps: true
  }
)

walkthroughSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('walkthrough', walkthroughSchema)
