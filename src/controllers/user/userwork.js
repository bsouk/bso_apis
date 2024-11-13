const User = require("../../models/user");
const Address = require("../../models/address");

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require("generate-password");
const company_details = require("../../models/company_details");
const jwt = require("jsonwebtoken")

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

const getUniqueId = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        const lastUser = await User.findOne({}).sort({ createdAt: -1 });
        if (lastUser && lastUser.unique_user_id) {
          resolve((+lastUser.unique_user_id) + 1);
        } else {
          resolve(100000);
        }
      } catch (error) {
        reject(error);
      }
    });
  };

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
            unique_user_id: await getUniqueId(),
            password,
            decoded_password: password,
            user_type: "buyer",
            //profile_completed: true,
            is_user_approved_by_admin: true,
        };

        const user = new User(userData);
        await user.save();

        res.status(200).json({ message: "Buyer added successfully", data: user, code: 200 });

    } catch (err) {
        utils.handleError(res, err);
    }
}

//edit Buyer data
exports.editProfile = async (req, res) => {
    try {
        const data = req.body;
        const id = req.params.id;

        const user = await User.findById(id);
        console.log("user is ", user, user?.profile_completed)
        if (!user)
            return utils.handleError(res, {
                message: "Profile not found",
                code: 404,
            });

        if (user.is_deleted)
            return utils.handleError(res, {
                message: "You cannot edit an account that has been deleted",
                code: 400,
            });

        if (data.email) {
            const doesEmailExists = await User.findOne({
                email: data.email,
                _id: { $ne: new mongoose.Types.ObjectId(id) },
            });

            if (doesEmailExists)
                return utils.handleError(res, {
                    message: "This email address is already registered",
                    code: 400,
                });
        }

        if (data.phone_number) {
            const doesPhoneNumberExist = await User.findOne({
                phone_number: data.phone_number,
                _id: { $ne: new mongoose.Types.ObjectId(id) },
            });
            if (doesPhoneNumberExist)
                return utils.handleError(res, {
                    message: "This phone number is already registered",
                    code: 400,
                });
        }

        const updatedUser = await User.findByIdAndUpdate(id, data);
        console.log("updated user is ", updatedUser);

        if (updatedUser.full_name && updatedUser.phone_number && updatedUser.email && updatedUser.first_name && updatedUser.last_name) {
            console.log("condition data is ", updatedUser.profile_completed)
            updatedUser.profile_completed = true; 
            await updatedUser.save()
        }
        else {
            updatedUser.profile_completed = false
            await updatedUser.save()
        }

        res.json({ message: "Profile edit successfully", code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};

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

//edit company data
exports.editCompanyDetails = async (req, res) => {
    try {
        const id = req.params.id
        console.log("company id is ", id)

        const data = req.body;
        console.log("data to edited is ", data)

        const companyData = await company_details.findById(id);
        console.log("company data is ", companyData)

        if (Object.keys(companyData).length === 0) {
            return utils.handleError(res, {
                message: "Company Details Not Found",
                code: 400,
            });
        }

        const result = await company_details.findByIdAndUpdate(id, data);

        res.status(200).json({
            status: true,
            message: "Company details edited Successfully",
            code: 200
        })
    } catch (err) {
        utils.handleError(res, err);
    }
}


//create Supplier Profile
exports.createSupplierProfile = async (req, res) => {
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
            unique_user_id: await getUniqueId(),
            password,
            decoded_password: password,
            user_type: "supplier",
            //profile_completed: true,
            is_user_approved_by_admin: true,
        };

        const user = new User(userData);
        await user.save();

        res.status(200).json({ message: "Supplier added successfully", data: user, code: 200 });

    } catch (err) {
        utils.handleError(res, err);
    }
}

//add address
exports.addAddress = async (req, res) => {
    try {
        const data = req.body
        console.log("address data is ", data)

        const allAddress = await Address.find({user_id : data.user_id});
        console.log("address list is ", allAddress)

        if(!allAddress || allAddress.length === 0){
            data.default_address = true
        }

        const newaddressdata = await Address.create(data);
        console.log("created address data is ", newaddressdata);

        res.status(200).json({
            success: true,
            message: "Address added successfully",
            data: newaddressdata,
            code: 200
        })
    } catch (err) {
        utils.handleError(res, err);
    }
}

//edit address 
exports.editAddress = async (req, res) => {
    try {
        const id = req.params.id
        console.log("address id is ", id)

        const data = req.body;
        console.log("data to edited is ", data)

        const addressdata = await Address.findById(id);
        console.log("addressdata is ", addressdata)

        if (Object.keys(addressdata).length === 0) {
            return utils.handleError(res, {
                message: "Address Not Found",
                code: 400,
            });
        }

        const result = await Address.findByIdAndUpdate(id, data);

        res.status(200).json({
            status: true,
            message: "Address edited Successfully",
            code: 200
        })
    } catch (err) {
        utils.handleError(res, err);
    }
}

// get Address List
exports.getAddressList = async (req, res) => {
    try {
        const addressList = await Address.find().populate("user_id", "full_name");
        console.log(addressList)

        return res.status(200).json({
            success: true,
            message: "Address List Fetched Successfully",
            data: addressList,
            code: 200
        })
    } catch (err) {
        utils.handleError(res, err);
    }
}

//User specific Addresses
exports.getUserAddressList = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("userid is ", userId);

        const addresslist = await Address.find({ user_id: userId }).populate("user_id", "full_name");
        console.log("addressList is ", addresslist);

        if (!addresslist || addresslist.length === 0) {
            return utils.handleError(res, {
                message: "Address Not Found",
                code: 400,
            });
        }

        res.status(200).json({
            success: true,
            message: "User Address List Fetched Successfully",
            data: addresslist,
            code: 200
        })
    } catch (err) {
        utils.handleError(res, err);
    }
}


//change Default Address field
exports.changeDefaultAddress = async (req, res) => {
    try {
        const { id } = req.body;

        const condition = {
            user_id: req.user._id,
            _id: { $ne: new mongoose.Types.ObjectId(id) }
        }

        console.log("condition is ", condition)

        await Address.findByIdAndUpdate(id, { default_address: true });
        await Address.updateMany(condition, { default_address: false });

        res.json({
            message: "Address set to default",
            code: 200,
            id,
        });

    } catch (err) {
        utils.handleError(res, err);
    }
}


//create Logistics Profile
exports.createLogisticsProfile = async (req, res) => {
    try {
        const data = req.body;
        console.log("data is ", data);

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
            unique_user_id: await getUniqueId(),
            password,
            decoded_password: password,
            user_type: "logistics",
            //profile_completed: true,
            is_user_approved_by_admin: true,
        };

        const user = new User(userData);
        await user.save();

        res.status(200).json({ message: "Logistics added successfully", data: user, code: 200 });

    } catch (err) {
        utils.handleError(res, err);
    }
}