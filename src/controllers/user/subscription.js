const User = require("../../models/user");
const Address = require("../../models/address");
const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require('generate-password');
const Brand = require("../../models/brand");
const utils = require("../../utils/utils");
const crypto = require("crypto");
const plan = require("../../models/plan");
// const stripe = require('stripe')('your_stripe_secret_key');


async function getCustomerByEmail(email) {
    const customers = await stripe.customers.list({
        email: email,
        limit: 1,
    });
    return customers.data.length > 0 ? customers.data[0] : null;
}

// exports.createSubscription = async (req, res) => {
//     try {
//         const userid = req.user._id
//         const data = req.body
//         const userdata = await User.findOne({ _id: userid })
//         console.log("userdata : ", userdata)
//         if(!userdata){
            
//         }
//         const is_customer_existed = await getCustomerByEmail(req.user.email)
//     } catch (error) {
//         utils.handleError(res, error);
//     }
// }