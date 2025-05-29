const mongoose=require('mongoose')
const bankSchema=new mongoose.Schema({
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
        state: {
          type: String
        },
        zip_code: {
          type: String
        },
        country: {
          type: String
        }
      },
    
    
},{
    timestamps:true
})
const Bank=mongoose.model('BankDetails',bankSchema)
module.exports=Bank