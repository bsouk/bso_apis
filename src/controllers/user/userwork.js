const User = require("../../models/user");
const Address = require("../../models/address");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require("generate-password");
const company_details = require("../../models/company_details");

//create password for users
function createNewPassword() {
    const password = generatePassword.generate({
        length: 8,
        numbers: true,
        uppercase: true,
        lowercase: true,
        strict: true,
    });
    return password;
}

//create Buyer profile
exports.createBuyerProfile = async (req, res) => {
    try {
        const data = req.body;
        console.log("user data is ", data);

        const doesEmailExists = await emailer.emailExists(data.email);
        if (doesEmailExists)
            return utils.handleError(res, {
                message: "This email address is already registered",
                code: 400,
            });

        if (data.phone_number) {
            const doesPhoneNumberExist = await emailer.checkMobileExists(
                data.phone_number
            );
            if (doesPhoneNumberExist)
                return utils.handleError(res, {
                    message: "This phone number is already registered",
                    code: 400,
                });
        }
        const password = createNewPassword();
        const userData = {
            ...data,
            password,
            decoded_password: password,
            user_type: "buyer",
            profile_completed: true,
            is_user_approved_by_admin: true,
        };

        const user = new User(userData);
        await user.save();

        res.status(200).json({ message: "Buyer added successfully", data: user, code: 200 });

    } catch (err) {
        utils.handleError(res, err);
    }
}

//get buyer profile details
exports.getBuyerDetails = async (req, res) => {
    try {
        const user_id = req.params.id;
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(user_id),
                },
            },
            {
                $lookup: {
                    from: "addresses",
                    let: { user_id: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$user_id", "$$user_id"] },
                                is_primary: true,
                            },
                        },
                    ],
                    as: "address",
                },
            },
            {
                $unwind: {
                    path: "$address",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    address: "$address.address",
                },
            },
        ]);
        res.json({ data: user[0], code: 200 });
    } catch (err) {
        utils.handleError(res, err);
    }
}

//add company details
exports.addCompanyDetails = async (req, res) => {
    try {
        const data = req.body
        console.log("comapny data is ", data)

        const newcompanydata = await company_details.create(data);
        console.log("created data is ", newcompanydata);

        res.status(200).json({
            success: true,
            message: "Company details added successfully",
            data: newcompanydata,
            code: 200
        })
    } catch (err) {
        utils.handleError(res, err);
    }
}
