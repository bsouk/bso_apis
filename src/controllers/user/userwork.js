const User = require("../../models/user");
const Address = require("../../models/address");
const Supplier = require("../../models/supplier")

const utils = require("../../utils/utils");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const generatePassword = require("generate-password");
const company_details = require("../../models/company_details");
const jwt = require("jsonwebtoken")
const fs = require('fs');
const path = require('path');
const Query = require("../../models/query");
const Category = require("../../models/product_category");
const ads = require("../../models/ads");
const Product = require("../../models/product");
const query_assigned_suppliers = require("../../models/query_assigned_suppliers");
const quantity_units = require("../../models/quantity_units");
const industry_type = require("../../models/industry_type");
const TeamMember = require("../../models/team_member");
const UserMember = require("../../models/user_member");
const Enquiry = require("../../models/Enquiry");
const EnquiryQuotes = require("../../models/EnquiryQuotes");
const Subscription = require("../../models/subscription");
const Continent = require("../../models/continents")
const { Country, State, City } = require('country-state-city');
const exp = require("constants");
const UserAccess = require("../../models/userAccess");
const uuid = require("uuid");
const bcrypt = require('bcrypt');
const Team = require("../../models/team")


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


const generateToken = (_id) => {
    const expiration =
        Math.floor(Date.now() / 1000) +
        60 * 60 * 24 * process.env.JWT_EXPIRATION_DAY;
    return utils.encrypt(
        jwt.sign(
            {
                data: {
                    _id,
                    type: "user",
                },
                // exp: expiration
            },
            process.env.JWT_SECRET
        )
    );
};

const expireToken = (_id) => {
    const expiredTime = Math.floor(Date.now() / 1000) - 10;

    return utils.encrypt(
        jwt.sign(
            {
                data: {
                    _id,
                    type: "user",
                },
                exp: expiredTime,
            },
            process.env.JWT_SECRET
        )
    );
};

const saveUserAccessAndReturnToken = async (req, user) => {
    return new Promise(async (resolve, reject) => {
        try {
            const userAccess = new UserAccess({
                user_id: user._id,
                ip: utils.getIP(req),
                browser: utils.getBrowserInfo(req),
            });
            await userAccess.save();
            resolve(generateToken(user._id));
        } catch (error) {
            reject(error);
        }
    });
};

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
            user_type: ["buyer"],
            current_user_type: "buyer",
            //profile_completed: true,
            //is_user_approved_by_admin: true,
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
        const id = req.user._id;

        const user = await User.findById(id);
        console.log("user is ", user)
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

        if (data.switch_to) {
            let types = user.user_type
            if (types.includes(data.switch_to.trim())) {
                return utils.handleError(res, {
                    message: `You are already ${data.switch_to} user`,
                    code: 400,
                });
            }
            types.push(data.switch_to.trim())
            data.user_type = types
            data.current_user_type = data.switch_to
        }
        console.log("data : ", data)
        const updatedUser = await User.findByIdAndUpdate(id, data);
        console.log("updated user is ", updatedUser);

        // if (updatedUser.full_name && updatedUser.phone_number && updatedUser.email && updatedUser.first_name && updatedUser.last_name) {
        //     console.log("condition data is ", updatedUser.profile_completed)
        //     updatedUser.profile_completed = true;
        //     await updatedUser.save()
        // }
        // else {
        //     updatedUser.profile_completed = false
        //     await updatedUser.save()
        // }

        //function for checking field values 
        const isFieldPopulated = (obj, path) => {
            console.log("object is ", obj, " and path is ", path)
            const keys = path.split('.');
            console.log("keys is ", keys)
            let current = obj;
            for (let key of keys) {
                console.log("cond is ", current, "key is ", current[key])
                if (!current || !current[key]) {
                    return { path, code: false };
                }
                current = current[key];
            }
            return { path, code: true };
        };

        switch (updatedUser.current_user_type) {
            case "buyer": {
                if (updatedUser.full_name && updatedUser.phone_number && updatedUser.email && updatedUser.first_name && updatedUser.last_name) {
                    console.log("condition data is ", updatedUser.profile_completed)
                    updatedUser.profile_completed = true;
                    await updatedUser.save()
                }
            }
                break;
            case "supplier": {
                const requiredFields = [
                    'full_name',
                    'profile_image',
                    'email',
                    'phone_number',
                    'bank_details.account_holder_name',
                    'bank_details.account_number',
                    'bank_details.bank_name',
                    'bank_details.swift_code',
                    'bank_details.iban_number',
                    'bank_details.address.line1',
                    'bank_details.address.city',
                    'bank_details.address.state',
                    'bank_details.address.zip_code',
                    'bank_details.address.country',
                    'company_data.company_logo',
                    'company_data.name',
                    'company_data.business_category',
                    'company_data.phone_number',
                    'company_data.name',
                    'company_data.registration_number',
                    'company_data.incorporation_date',
                    'company_data.vat_number',
                    'company_data.business_category',
                    'company_data.phone_number',
                    'company_data.email',
                    'company_data.address.line1',
                    'company_data.address.city',
                    'company_data.address.state',
                    'company_data.address.zip_code',
                    'company_data.address.country',
                    'beneficiary_address.line1',
                    'beneficiary_address.city',
                    'beneficiary_address.state',
                    'beneficiary_address.zip_code',
                    'beneficiary_address.country',
                    'additional_notes',
                ];

                console.log("supplier check fields is ", requiredFields)

                const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

                const hasRequiredArrays =
                    Array.isArray(updatedUser.sample_products) && updatedUser.sample_products.length > 0 &&
                    Array.isArray(updatedUser.business_certificates) && updatedUser.business_certificates.length > 0 &&
                    Array.isArray(updatedUser.licenses) && updatedUser.licenses.length > 0;

                console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

                if (isProfileComplete && hasRequiredArrays) {
                    updatedUser.profile_completed = true;
                } else {
                    updatedUser.profile_completed = false;
                }

                await updatedUser.save();
            }
                break;
            case "logistics": {
                const requiredFields = [
                    'full_name',
                    'profile_image',
                    'email',
                    'phone_number',
                    'company_data.company_logo',
                    'company_data.name',
                    'company_data.business_category',
                    'company_data.phone_number',
                    'company_data.email',
                    'company_data.address.line1',
                    'company_data.address.city',
                    'company_data.address.zip_code',
                    'company_data.address.state',
                    'company_data.address.country',
                    'company_data.address.service_area',
                    'delivery_type'
                ];

                console.log("logistics check fields is ", requiredFields)

                const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

                const hasRequiredArrays =
                    Array.isArray(updatedUser.insurances) && updatedUser.insurances.length > 0 &&
                    Array.isArray(updatedUser.licenses) && updatedUser.licenses.length > 0;

                console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

                if (isProfileComplete && hasRequiredArrays) {
                    updatedUser.profile_completed = true;
                } else {
                    updatedUser.profile_completed = false;
                }

                await updatedUser.save();

            }
                break;
            case "resource": {
                const requiredFields = [
                    "full_name",
                    "email",
                    "phone_number",
                    "profile_image",
                    "profile_title",
                    "profile_description",
                    "specialisations",
                    "rate_per_hour",
                    "project_pricing_model",
                    "resource_availability"
                ]

                console.log("resource check fields is ", requiredFields)

                const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

                const hasRequiredArrays =
                    Array.isArray(updatedUser.work_exprience) && updatedUser.work_exprience.length > 0 &&
                    Array.isArray(updatedUser.education) && updatedUser.education.length > 0 &&
                    Array.isArray(updatedUser.portfolio) && updatedUser.portfolio.length > 0 &&
                    Array.isArray(updatedUser.skills) && updatedUser.skills.length > 0 &&
                    Array.isArray(updatedUser.certifications) && updatedUser.certifications.length > 0 &&
                    Array.isArray(updatedUser.languages) && updatedUser.languages.length > 0 &&
                    Array.isArray(updatedUser.testimonials) && updatedUser.testimonials.length > 0 &&
                    // Array.isArray(updatedUser.employement_history) && updatedUser.employement_history.length > 0;

                    console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

                if (isProfileComplete && hasRequiredArrays) {
                    updatedUser.profile_completed = true;
                } else {
                    updatedUser.profile_completed = false;
                }

                await updatedUser.save();

            }
                break;
            default: {
                updatedUser.profile_completed = false
                await updatedUser.save()
            }
        }

        // updatedUser.user_type.forEach(async i => {
        //     switch (i) {
        //         case "buyer": {
        //             if (updatedUser.full_name && updatedUser.phone_number && updatedUser.email && updatedUser.first_name && updatedUser.last_name) {
        //                 console.log("condition data is ", updatedUser.profile_completed)
        //                 updatedUser.profile_completed = true;
        //                 await updatedUser.save()
        //             }
        //         }
        //             break;
        //         case "supplier": {
        //             const requiredFields = [
        //                 'full_name',
        //                 'profile_image',
        //                 'email',
        //                 'phone_number',
        //                 'bank_details.account_holder_name',
        //                 'bank_details.account_number',
        //                 'bank_details.bank_name',
        //                 'bank_details.swift_code',
        //                 'bank_details.iban_number',
        //                 'bank_details.address.line1',
        //                 'bank_details.address.line2',
        //                 'bank_details.address.city',
        //                 'bank_details.address.state',
        //                 'bank_details.address.zip_code',
        //                 'bank_details.address.country',
        //                 'company_data.company_logo',
        //                 'company_data.name',
        //                 'company_data.business_category',
        //                 'company_data.phone_number',
        //                 'company_data.name',
        //                 'company_data.registration_number',
        //                 'company_data.incorporation_date',
        //                 'company_data.vat_number',
        //                 'company_data.business_category',
        //                 'company_data.phone_number',
        //                 'company_data.email',
        //                 'company_data.address.line1',
        //                 'company_data.address.line2',
        //                 'company_data.address.city',
        //                 'company_data.address.state',
        //                 'company_data.address.zip_code',
        //                 'company_data.address.country',
        //                 'beneficiary_address.line1',
        //                 'beneficiary_address.line2',
        //                 'beneficiary_address.city',
        //                 'beneficiary_address.state',
        //                 'beneficiary_address.zip_code',
        //                 'beneficiary_address.country',
        //                 'additional_notes',
        //             ];

        //             console.log("supplier check fields is ", requiredFields)

        //             const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

        //             const hasRequiredArrays =
        //                 Array.isArray(updatedUser.sample_products) && updatedUser.sample_products.length > 0 &&
        //                 Array.isArray(updatedUser.business_certificates) && updatedUser.business_certificates.length > 0 &&
        //                 Array.isArray(updatedUser.licenses) && updatedUser.licenses.length > 0;

        //             console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

        //             if (isProfileComplete && hasRequiredArrays) {
        //                 updatedUser.profile_completed = true;
        //             } else {
        //                 updatedUser.profile_completed = false;
        //             }

        //             await updatedUser.save();
        //         }
        //             break;
        //         case "logistics": {
        //             const requiredFields = [
        //                 'full_name',
        //                 'profile_image',
        //                 'email',
        //                 'phone_number',
        //                 'company_data.company_logo',
        //                 'company_data.name',
        //                 'company_data.business_category',
        //                 'company_data.phone_number',
        //                 'company_data.email',
        //                 'company_data.address.line1',
        //                 'company_data.address.line2',
        //                 'company_data.address.city',
        //                 'company_data.address.zip_code',
        //                 'company_data.address.state',
        //                 'company_data.address.country',
        //                 'company_data.address.service_area',
        //                 'delivery_type'
        //             ];

        //             console.log("logistics check fields is ", requiredFields)

        //             const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

        //             const hasRequiredArrays =
        //                 Array.isArray(updatedUser.insurances) && updatedUser.insurances.length > 0 &&
        //                 Array.isArray(updatedUser.licenses) && updatedUser.licenses.length > 0;

        //             console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

        //             if (isProfileComplete && hasRequiredArrays) {
        //                 updatedUser.profile_completed = true;
        //             } else {
        //                 updatedUser.profile_completed = false;
        //             }

        //             await updatedUser.save();

        //         }
        //             break;
        //         case "resource": {
        //             const requiredFields = [
        //                 "full_name",
        //                 "email",
        //                 "phone_number",
        //                 "profile_image",
        //                 "profile_title",
        //                 "profile_description",
        //                 "specialisations",
        //                 "rate_per_hour",
        //                 "project_pricing_model",
        //                 "resource_availability"
        //             ]

        //             console.log("resource check fields is ", requiredFields)

        //             const isProfileComplete = requiredFields.map(field => isFieldPopulated(updatedUser, field));

        //             const hasRequiredArrays =
        //                 Array.isArray(updatedUser.work_exprience) && updatedUser.work_exprience.length > 0 &&
        //                 Array.isArray(updatedUser.education) && updatedUser.education.length > 0 &&
        //                 Array.isArray(updatedUser.portfolio) && updatedUser.portfolio.length > 0 &&
        //                 Array.isArray(updatedUser.skills) && updatedUser.skills.length > 0 &&
        //                 Array.isArray(updatedUser.certifications) && updatedUser.certifications.length > 0 &&
        //                 Array.isArray(updatedUser.languages) && updatedUser.languages.length > 0 &&
        //                 Array.isArray(updatedUser.testimonials) && updatedUser.testimonials.length > 0 &&
        //                 Array.isArray(updatedUser.employement_history) && updatedUser.employement_history.length > 0;

        //             console.log("isProfileComplete is ", isProfileComplete, " hasRequiredArrays is ", hasRequiredArrays)

        //             if (isProfileComplete && hasRequiredArrays) {
        //                 updatedUser.profile_completed = true;
        //             } else {
        //                 updatedUser.profile_completed = false;
        //             }

        //             await updatedUser.save();

        //         }
        //             break;
        //         default: {
        //             updatedUser.profile_completed = false
        //             await updatedUser.save()
        //         }
        //     }
        // })

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
        console.log("email is ", doesEmailExists)
        if (doesEmailExists)
            return utils.handleError(res, {
                message: "This email address is already registered",
                code: 400,
            });

        if (data.phone_number) {
            const doesPhoneNumberExist = await emailer.checkMobileExists(
                data.phone_number
            );
            console.log("phone no is", doesPhoneNumberExist)
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
            user_type: ["supplier"],
            current_user_type: "supplier",
            //profile_completed: true,
            // is_user_approved_by_admin: true,
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

        const userId = req.user._id;
        console.log("userid is ", userId);

        const allAddress = await Address.find({ user_id: userId });
        console.log("address list is ", allAddress)

        if (!allAddress || allAddress.length === 0) {
            data.default_address = true
        }

        data.user_id = userId;
        console.log("data : ", data)

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

        const result = await Address.findByIdAndUpdate(id, data, { new: true });

        res.status(200).json({
            status: true,
            message: "Address edited Successfully",
            data: result,
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
                // code: 400,
                code: 204,
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
            user_type: ["logistics"],
            current_user_type: "logistics",
            //profile_completed: true,
            // is_user_approved_by_admin: true,
        };

        const user = new User(userData);
        await user.save();

        res.status(200).json({ message: "Logistics added successfully", data: user, code: 200 });

    } catch (err) {
        utils.handleError(res, err);
    }
}

//upload Media
// exports.uploadMedia = async (req, res) => {
//     try {
//         if (!req.files.media || !req.body.path)
//             return utils.handleError(res, {
//                 message: "MEDIA OR PATH MISSING",
//                 code: 400,
//             });
//         let isArray = req.body.isArray;
//         if (Array.isArray(req.files.media)) {
//             let mediaArray = [];
//             for (let index = 0; index < req.files.media.length; index++) {
//                 const element = req.files.media[index];
//                 let media = await utils.uploadImage({
//                     file: element,
//                     path: `${process.env.STORAGE_PATH}/${req.body.path}`,
//                 });
//                 console.log(" media :", media)
//                 mediaArray.push(`${req.body.path}/${media}`);
//             }

//             return res.status(200).json({
//                 code: 200,
//                 data: mediaArray,
//             });
//         } else {
//             let media = await utils.uploadImage({
//                 file: req.files.media,
//                 path: `${process.env.STORAGE_PATH}/${req.body.path}`,
//             });

//             const url = `${req.body.path}/${media}`;
//             console.log("url is ", url)
//             return res.status(200).json({
//                 code: 200,
//                 data: isArray === "true" ? [url] : url,
//             });
//         }
//     } catch (error) {
//         utils.handleError(res, error);
//     }
// };


async function uploadFile(object) {
    return new Promise((resolve, reject) => {
        var obj = object.file;
        var name = Date.now() + obj.name;
        obj.mv(object.path + "/" + name, function (err) {
            if (err) {
                console.log(err)
                reject(err);
            }
            resolve(name);
        });
    });
}

exports.uploadMedia = async (req, res) => {
    try {
        if (!req.files.media || !req.body.path) {
            return utils.handleError(res, {
                message: "MEDIA OR PATH MISSING",
                code: 400,
            });
        }

        let isArray = req.body.isArray;
        let supportedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/avif"];
        let supportedOtherTypes = [
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/pdf",
            "audio/mpeg",
            "video/mp4",
            "video/quicktime",
            "video/x-m4v"
        ];

        if (Array.isArray(req.files.media)) {
            let mediaArray = [];

            for (let index = 0; index < req.files.media.length; index++) {
                const element = req.files.media[index];
                console.log("element:", element);
                console.log("type:", element.mimetype);

                if (supportedImageTypes.includes(element.mimetype)) {
                    let media = await utils.uploadImage({
                        file: element,
                        path: `${process.env.STORAGE_PATH}/${req.body.path}`,
                    });
                    mediaArray.push(`${req.body.path}/${media}`);
                } else if (supportedOtherTypes.includes(element.mimetype)) {
                    let media = await uploadFile({
                        file: element,
                        path: `${process.env.STORAGE_PATH}/${req.body.path}`,
                    });
                    mediaArray.push(`${req.body.path}/${media}`);
                } else {
                    return utils.handleError(res, {
                        message: `Unsupported file type: ${element.mimetype}`,
                        code: 400,
                    });
                }
            }

            return res.status(200).json({
                code: 200,
                data: mediaArray,
            });
        } else {
            const element = req.files.media;
            console.log("element:", element);
            console.log("type:", element.mimetype);

            if (supportedImageTypes.includes(element.mimetype)) {
                let media = await utils.uploadImage({
                    file: element,
                    path: `${process.env.STORAGE_PATH}/${req.body.path}`,
                });
                const url = `${req.body.path}/${media}`;
                return res.status(200).json({
                    code: 200,
                    data: isArray === "true" ? [url] : url,
                });
            } else if (supportedOtherTypes.includes(element.mimetype)) {
                let media = await uploadFile({
                    file: element,
                    path: `${process.env.STORAGE_PATH}/${req.body.path}`,
                });
                const url = `${req.body.path}/${media}`;
                return res.status(200).json({
                    code: 200,
                    data: isArray === "true" ? [url] : url,
                });
            } else {
                return utils.handleError(res, {
                    message: `Unsupported file type: ${element.mimetype}`,
                    code: 400,
                });
            }
        }
    } catch (error) {
        console.error("Error:", error);
        utils.handleError(res, error);
    }
};



//get User Profile details
exports.getProfileDetails = async (req, res) => {
    try {
        const user_id = req.user._id;
        console.log("user : ", user_id)

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
            {
                $project: {
                    password: 0,
                    decoded_password: 0
                }
            }
        ]);

        res.json({ data: user[0], code: 200 });
    } catch (err) {
        utils.handleError(res, err);
    }
}


//create resource profile
exports.createResourceProfile = async (req, res) => {
    try {
        const data = req.body;
        console.log("req.body is ", data);

        const doesEmailExists = await emailer.emailExists(data.email);
        console.log("email is ", doesEmailExists)
        if (doesEmailExists)
            return utils.handleError(res, {
                message: "This email address is already registered",
                code: 400,
            });

        if (data.phone_number) {
            const doesPhoneNumberExist = await emailer.checkMobileExists(
                data.phone_number
            );
            console.log("phone no is", doesPhoneNumberExist)
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
            user_type: ["resource"],
            current_user_type: "resource",
            //profile_completed: true,
            // is_user_approved_by_admin: true,
        };

        const user = new User(userData);
        await user.save();

        res.status(200).json({ message: "Resource added successfully", data: user, code: 200 });

    } catch (err) {
        utils.handleError(res, err);
    }
}


// delete address
exports.deleteAddress = async (req, res) => {
    try {
        const id = req.params.id;

        const address = await Address.findById(id);

        if (!address) return utils.handleError(res, { message: "Address not found", code: 404, });
        if (address.default_address) return utils.handleError(res, { message: "You can not delete default address", code: 400, });

        await Address.findByIdAndDelete(id);

        res.json({
            message: "Address removed successfully",
            code: 200,
            id: id,
        });

    } catch (error) {
        utils.handleError(res, error);
    }
};


// remove media
exports.deleteMedia = async (req, res) => {
    try {
        console.log("req.body is ", req.body)
        if (!req.body.path || !req.body.filename) {
            return utils.handleError(res, {
                message: "PATH OR FILENAME MISSING",
                code: 400,
            });
        }

        const filePath = path.join(req.body.path, req.body.filename);
        console.log("filepath is ", filePath)

        if (!fs.existsSync(filePath)) {
            return utils.handleError(res, {
                message: "File not found",
                code: 404,
            });
        }

        fs.unlink(filePath, (err) => {
            if (err) {
                return utils.handleError(res, {
                    message: "Error deleting file",
                    code: 500,
                });
            }

            return res.status(200).json({
                code: 200,
                message: "File deleted successfully",
            });
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};

//generate query number
async function generateQueryNumber() {
    const randomPart = await Math.floor(Math.random() * 10000000000);
    console.log("query number is ", randomPart)
    return `#${randomPart}`;
}

// add querry
exports.addQuery = async (req, res) => {
    try {
        const data = req.body
        console.log("data is ", data)

        const userId = req.user._id;
        console.log("userid is ", userId);

        let queryid = await generateQueryNumber()
        const newQueryData = {
            query_unique_id: queryid.toString(),
            createdByUser: userId,
            queryDetails: [...data.queryDetails]
        }

        const result = await Query.create(newQueryData)
        console.log("result is ", result);

        return res.status(200).json({
            message: "Query created successfully",
            data: result,
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}


//Buyer Queries

exports.getMyQueries = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("userid is", userId);

        const userDetails = await User.findById(userId);
        console.log("userdetails:", userDetails);

        const { status, search, offset = 0, limit = 10 } = req.query;
        console.log('offset : ', offset, " limit : ", limit)
        const filter = {};

        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.query_unique_id = { $regex: search, $options: "i" };
        }

        let data = []
        let count = 0
        if (userDetails.user_type.includes("buyer")) {
            const userMatchCondition = { createdByUser: new mongoose.Types.ObjectId(userId) }

            data = await Query.aggregate(
                [
                    {
                        $unwind: {
                            path: '$queryDetails',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: {
                            ...filter,
                            ...userMatchCondition,
                        },
                    },
                    {
                        $unwind: {
                            path: '$queryDetails.variant',
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: "quantity_units",
                            let: { id: "$queryDetails.quantity.unit" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ["$$id", "$_id"]
                                        }
                                    }
                                }
                            ],
                            as: "quantity_unit"
                        }
                    },
                    {
                        $unwind: {
                            path: "$quantity_unit",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $addFields: {
                            "queryDetails.quantity.unit":
                                "$quantity_unit.unit",
                            "queryDetails.quantity.unit_id":
                                "$quantity_unit._id"
                        }
                    },
                    {
                        $group: {
                            _id: '$_id',
                            query_unique_id: { $first: '$query_unique_id' },
                            status: { $first: '$status' },
                            queryCreation: { $first: '$queryCreation' },
                            queryClose: { $first: '$queryClose' },
                            action: { $first: '$action' },
                            createdByUser: { $first: '$createdByUser' },
                            adminApproved: { $first: '$adminApproved' },
                            adminReview: { $first: '$adminReview' },
                            queryDetails: {
                                $push: {
                                    product: '$queryDetails.product',
                                    variant: '$queryDetails.variant',
                                    supplier: '$queryDetails.supplier',
                                    price: '$queryDetails.price',
                                    quantity: '$queryDetails.quantity',
                                    query: '$queryDetails.query',
                                    notes: '$queryDetails.notes',
                                    assigned_to: '$queryDetails.assigned_to',
                                    _id: '$queryDetails._id'
                                }
                            },
                            createdAt: { $first: '$createdAt' },
                            updatedAt: { $first: '$updatedAt' }
                        }
                    },
                    {
                        $lookup: {
                            from: "bidsettings",
                            localField: "_id",
                            foreignField: "query_id",
                            as: "bid_setting_data"
                        }
                    },
                    {
                        $unwind: {
                            path: "$bid_setting_data",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $sort: { createdAt: -1 }
                    },
                    {
                        $skip: parseInt(offset) || 0
                    },
                    {
                        $limit: parseInt(limit) || 10
                    }
                ]
            );

            count = await Query.countDocuments({ ...filter, ...userMatchCondition });
        } else {
            const aggregate_data = [
                {
                    $match: {
                        variant_assigned_to: new mongoose.Types.ObjectId(userId)
                    }
                },
                {
                    $lookup: {
                        from: "queries",
                        let: {
                            id: "$query_id",
                            productid: "$product_id",
                            variantid: "$variant_id"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$_id"]
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: "bidsettings",
                                    localField: "_id",
                                    foreignField: "query_id",
                                    as: "bid_setting_data"
                                }
                            },
                            {
                                $unwind: {
                                    path: "$bid_setting_data",
                                    preserveNullAndEmptyArrays: true
                                }
                            },
                            {
                                $unwind: "$queryDetails"
                            },
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: [
                                                    "$queryDetails.product.id",
                                                    "$$productid"
                                                ]
                                            },
                                            {
                                                $eq: [
                                                    "$queryDetails.variant._id",
                                                    "$$variantid"
                                                ]
                                            }
                                        ]
                                    }
                                }
                            },
                            {
                                $project: {
                                    // "queryDetails.quantity": 0,
                                    "queryDetails.split_quantity": 0
                                }
                            }
                        ],
                        as: "query_data"
                    }
                },
                {
                    $lookup: {
                        from: "quantity_units",
                        let: { id: "$quantity.unit" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$$id", "$_id"] }
                                }
                            }
                        ],
                        as: "quantity_unit"
                    }
                },
                {
                    $unwind: {
                        path: "$quantity_unit",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: "$query_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        "query_data.queryDetails.quantity": {
                            $cond: {
                                if: {
                                    $and: [
                                        {
                                            $eq: [
                                                "$query_data.queryDetails.product.id",
                                                "$product_id"
                                            ]
                                        },
                                        {
                                            $eq: [
                                                "$query_data.queryDetails.variant._id",
                                                "$variant_id"
                                            ]
                                        }
                                    ]
                                },
                                then: "$quantity",
                                else: "$query_data.queryDetails.quantity"
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        "query_data.queryDetails.quantity.unit":
                            "$quantity_unit.unit",
                        "query_data.queryDetails.quantity.unit_id":
                            "$quantity_unit._id"
                    }
                },
                {
                    $group: {
                        _id: "$query_id",
                        query_unique_id: {
                            $first: "$query_data.query_unique_id"
                        },
                        status: { $first: "$query_data.status" },
                        createdByUser: {
                            $first: "$query_data.createdByUser"
                        },
                        adminApproved: {
                            $first: "$query_data.adminApproved"
                        },
                        queryDetails: {
                            $push: "$query_data.queryDetails"
                        },
                        bid_setting_data: {
                            $first: "$query_data.bid_setting_data"
                        },
                        createdAt: {
                            $first: "$query_data.createdAt"
                        },
                        updatedAt: {
                            $first: "$query_data.updatedAt"
                        }
                    }
                },
                {
                    $match: { ...filter }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: parseInt(offset) || 0
                },
                {
                    $limit: parseInt(limit) || 10
                }
            ]

            data = await query_assigned_suppliers.aggregate(
                aggregate_data
            )
            const countAggregation = await query_assigned_suppliers.aggregate([
                { $match: { variant_assigned_to: new mongoose.Types.ObjectId(userId) } },
                {
                    $lookup: {
                        from: "queries",
                        let: { id: "$query_id", productid: "$product_id", variantid: "$variant_id" },
                        pipeline: [
                            { $match: { $expr: { $eq: ["$$id", "$_id"] } } },
                            { $unwind: "$queryDetails" },
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$queryDetails.product.id", "$$productid"] },
                                            { $eq: ["$queryDetails.variant._id", "$$variantid"] }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: "query_data"
                    }
                },
                { $unwind: { path: "$query_data", preserveNullAndEmptyArrays: true } },
                { $group: { _id: "$query_id" } },
                { $count: "total" }
            ]);

            count = countAggregation.length > 0 ? countAggregation[0].total : 0;
        }

        return res.json({ data, count, code: 200 });

    } catch (error) {
        utils.handleError(res, error);
    }
}


//get query by id
exports.getQueryById = async (req, res) => {
    try {
        const { id } = req.params
        const userId = req.user._id
        console.log("user id : ", userId)

        if (!id) {
            return utils.handleError(res, {
                message: "Query id is required",
                code: 400,
            });
        }

        const user_data = await User.findOne({ _id: userId })
        let agg = []
        if (user_data.user_type.includes("buyer")) {
            agg = [
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(id)
                    }
                },
                {
                    $unwind: {
                        path: "$queryDetails",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "quantity_units",
                        let: { id: "$queryDetails.quantity.unit" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$_id"]
                                    }
                                }
                            }
                        ],
                        as: "quantity_unit_data"
                    }
                },
                {
                    $unwind: {
                        path: "$quantity_unit_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        "queryDetails.quantity.unit":
                            "$quantity_unit_data.unit",
                        "queryDetails.quantity.unit_id":
                            "$quantity_unit_data._id",

                        "queryDetails.split_quantity.total_quantity.unit":
                            "$quantity_unit_data.unit",
                        "queryDetails.split_quantity.total_quantity.unit_id":
                            "$quantity_unit_data._id",

                        "queryDetails.split_quantity.quantity_assigned.unit":
                            "$quantity_unit_data.unit",
                        "queryDetails.split_quantity.quantity_assigned.unit_id":
                            "$quantity_unit_data._id"
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        queryDetails: { $push: "$queryDetails" },
                        otherFields: { $first: "$$ROOT" }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                "$otherFields",
                                { queryDetails: "$queryDetails" }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        quantity_unit_data: 0,
                        'queryDetails.split_quantity': 0
                    }
                }
            ]
        }

        if (user_data.user_type.includes("supplier")) {
            agg = [
                {
                    $match: {
                        _id: new mongoose.Types.ObjectId(id)
                    }
                },
                {
                    $unwind: {
                        path: "$queryDetails",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "query_assigned_suppliers",
                        let: {
                            query_id: "$_id",
                            product_id: "$queryDetails.product.id",
                            variant_id: "$queryDetails.variant._id"
                        },
                        pipeline: [
                            {
                                $match: {
                                    $and: [
                                        {
                                            $expr: {
                                                $eq: ["$query_id", "$$query_id"]
                                            }
                                        },
                                        {
                                            $expr: {
                                                $eq: [
                                                    "$product_id",
                                                    "$$product_id"
                                                ]
                                            }
                                        },
                                        {
                                            $expr: {
                                                $eq: [
                                                    "$variant_id",
                                                    "$$variant_id"
                                                ]
                                            }
                                        },
                                        {
                                            $expr: {
                                                $eq: [
                                                    "$variant_assigned_to",
                                                    new mongoose.Types.ObjectId(userId)
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        ],
                        as: "supplier_quote"
                    }
                },
                {
                    $addFields: {
                        "queryDetails.assigned_id": {
                            $cond: {
                                if: {
                                    $gt: [{ $size: "$supplier_quote" }, 0]
                                },
                                then: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: "$supplier_quote",
                                                as: "sq",
                                                cond: {
                                                    $and: [
                                                        {
                                                            $eq: [
                                                                "$$sq.query_id",
                                                                "$_id"
                                                            ]
                                                        },
                                                        {
                                                            $eq: [
                                                                "$$sq.variant_id",
                                                                "$queryDetails.variant._id"
                                                            ]
                                                        },
                                                        {
                                                            $eq: [
                                                                "$$sq.product_id",
                                                                "$queryDetails.product.id"
                                                            ]
                                                        },
                                                        {
                                                            $eq: [
                                                                "$$sq.variant_assigned_to",
                                                                new mongoose.Types.ObjectId(userId)
                                                            ]
                                                        }
                                                    ]
                                                }
                                            }
                                        },
                                        as: "filtered_supplier",
                                        in: "$$filtered_supplier._id"
                                    }
                                },
                                else: null
                            }
                        },
                        "queryDetails.supplier_quote": {
                            $cond: {
                                if: {
                                    $gt: [{ $size: "$supplier_quote" }, 0]
                                },
                                then: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: "$supplier_quote",
                                                as: "sq",
                                                cond: {
                                                    $and: [
                                                        {
                                                            $eq: [
                                                                "$$sq.query_id",
                                                                "$_id"
                                                            ]
                                                        },
                                                        {
                                                            $eq: [
                                                                "$$sq.variant_id",
                                                                "$queryDetails.variant._id"
                                                            ]
                                                        },
                                                        {
                                                            $eq: [
                                                                "$$sq.product_id",
                                                                "$queryDetails.product.id"
                                                            ]
                                                        },
                                                        {
                                                            $eq: [
                                                                "$$sq.variant_assigned_to",
                                                                new mongoose.Types.ObjectId(userId)
                                                            ]
                                                        }
                                                    ]
                                                }
                                            }
                                        },
                                        as: "filtered_supplier",
                                        in: "$$filtered_supplier.supplier_quote"
                                    }
                                },
                                else: null
                            }
                        },
                        "queryDetails.quantity": {
                            $cond: {
                                if: {
                                    $gt: [{ $size: "$supplier_quote" }, 0]
                                },
                                then: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: "$supplier_quote",
                                                as: "sq",
                                                cond: {
                                                    $and: [
                                                        {
                                                            $eq: [
                                                                "$$sq.query_id",
                                                                "$_id"
                                                            ]
                                                        },
                                                        {
                                                            $eq: [
                                                                "$$sq.variant_id",
                                                                "$queryDetails.variant._id"
                                                            ]
                                                        },
                                                        {
                                                            $eq: [
                                                                "$$sq.product_id",
                                                                "$queryDetails.product.id"
                                                            ]
                                                        },
                                                        {
                                                            $eq: [
                                                                "$$sq.variant_assigned_to",
                                                                new mongoose.Types.ObjectId(userId)
                                                            ]
                                                        }
                                                    ]
                                                }
                                            }
                                        },
                                        as: "filtered_supplier",
                                        in: "$$filtered_supplier.quantity"
                                    }
                                },
                                else: null
                            }
                        }
                    }
                },
                {
                    $unwind: {
                        path: "$queryDetails.assigned_id",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: "$queryDetails.quantity",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: "$queryDetails.supplier_quote",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "quantity_units",
                        let: { id: "$queryDetails.quantity.unit" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$$id", "$_id"] }
                                }
                            }
                        ],
                        as: "quantity_unit_data"
                    }
                },
                {
                    $unwind: {
                        path: "$quantity_unit_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        "queryDetails.quantity.unit":
                            "$quantity_unit_data.unit",
                        "queryDetails.quantity.unit_id":
                            "$quantity_unit_data._id",

                        "queryDetails.split_quantity.total_quantity.unit":
                            "$quantity_unit_data.unit",
                        "queryDetails.split_quantity.total_quantity.unit_id":
                            "$quantity_unit_data._id",

                        "queryDetails.split_quantity.quantity_assigned.unit":
                            "$quantity_unit_data.unit",
                        "queryDetails.split_quantity.quantity_assigned.unit_id":
                            "$quantity_unit_data._id"
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        queryDetails: { $push: "$queryDetails" },
                        otherFields: { $first: "$$ROOT" }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: [
                                "$otherFields",
                                { queryDetails: "$queryDetails" }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        quantity_unit_data: 0,
                        "queryDetails.query": 0,
                        "queryDetails.notes": 0,
                        supplier_quote: 0
                    }
                }
            ]
        }

        const queryData = await Query.aggregate(agg)
        if (!queryData) {
            return utils.handleError(res, {
                message: "Query not found",
                code: 400,
            });
        }

        if (!queryData[0]) {
            return utils.handleError(res, {
                message: "Query not found",
                code: 400,
            });

        }

        return res.status(200).json({
            message: "Query data fetched successfully",
            data: queryData[0],
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

//get Home Api data
exports.getHomeData = async (req, res) => {
    try {
        const categorylist = await Category.find().limit(10)
        const adslist = await ads.find().limit(10)
        const topProduct = await Product.find({ is_deleted: false, is_admin_approved: "approved" }).limit(10)

        return res.status(200).json({
            message: "data Fetched Successfully",
            data: {
                categories: categorylist,
                ads: adslist,
                topProduct
            },
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


// edit query 
// exports.editQuery = async (req, res) => {
//     try {
//         const { id } = req.params
//         const queryData = await Query.findById({ _id: id })

//         if (!queryData) {
//             return utils.handleError(res, {
//                 message: "Query not found",
//                 code: 400,
//             });
//         }

//         const result = await Query.findByIdAndUpdate(id, req.body)
//         console.log(result)

//         return res.status(200).json({
//             message: "Query edited successfully",
//             code: 200
//         })
//     } catch (error) {
//         utils.handleError(res, error);
//     }
// }

exports.editQuery = async (req, res) => {
    try {
        const { id } = req.params;
        const queryData = await Query.findById({ _id: id });

        if (!queryData) {
            return utils.handleError(res, {
                message: "Query not found",
                code: 400,
            });
        }

        const updateFields = {};

        if (req.body.queryDetails && Array.isArray(req.body.queryDetails)) {
            req.body.queryDetails.forEach(queryDetail => {
                if (queryDetail._id) {
                    const queryDetailIndex = queryData.queryDetails.findIndex(
                        detail => detail._id.toString() === queryDetail._id.toString()
                    );

                    if (queryDetailIndex > -1) {
                        Object.keys(queryDetail).forEach(key => {
                            if (key !== '_id') {
                                updateFields[`queryDetails.${queryDetailIndex}.${key}`] = queryDetail[key];
                            }
                        });
                    }
                }
            });
        } else {
            Object.keys(req.body).forEach(key => {
                if (key !== 'queryDetails') {
                    updateFields[key] = req.body[key];
                }
            });
        }

        console.log('updateFields : ', updateFields);

        const result = await Query.findByIdAndUpdate(
            { _id: id },
            { $set: updateFields },
            { new: true }
        );

        console.log(result);

        return res.status(200).json({
            message: "Query edited successfully",
            code: 200,
            data: result
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};


//delete query
exports.deleteQuery = async (req, res) => {
    try {
        const { id } = req.params
        const queryData = await Query.findById({ _id: id })

        if (!queryData) {
            return utils.handleError(res, {
                message: "Query not found",
                code: 400,
            });
        }

        const result = await Query.deleteOne({ _id: id })
        console.log(result)

        return res.status(200).json({
            message: "Query deleted successfully",
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.addSupplierQuote = async (req, res) => {
    try {
        const { query_id, _id, supplier_quote } = req.body
        const userId = req.user._id;
        console.log("userid is ", userId);

        const userData = await User.findOne({ _id: userId })

        if (!userData) {
            return utils.handleError(res, {
                message: "supplier not found",
                code: 404,
            });
        }

        const queryData = await Query.findById({ _id: query_id })
        if (!queryData) {
            return utils.handleError(res, {
                message: "Query not found",
                code: 404,
            });
        }
        const assignData = {
            id: userId,
            type: userData.user_type
        }

        supplier_quote.assignedBy = assignData

        const result = await query_assigned_suppliers.findOneAndUpdate(
            {
                query_id,
                _id
            },
            {
                $set: {
                    admin_quote: null,
                    supplier_quote
                }
            }
        )
        console.log("result : ", result)
        return res.status(200).json({
            message: "Supplier quote added successfully",
            data: result,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.addQuantityUnit = async (req, res) => {
    try {
        const { unit } = req.body
        const check = await quantity_units.findOne({ unit })
        if (check) {
            return utils.handleError(res, {
                message: "unit already existed",
                code: 404,
            });
        }
        const newquantity = await quantity_units.create({ unit })
        console.log("new quantity : ", newquantity)
        return res.status(200).json({
            message: "Quantity added successfully",
            data: newquantity,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getQuantitiesUnits = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10 } = req.query
        let filter = {}
        if (search) {
            filter.unit = { $regex: search, $options: "i" }
        }
        const data = await quantity_units.aggregate([
            {
                $match: filter
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $skip: parseInt(offset) || 0
            },
            {
                $limit: parseInt(limit) || 10
            }
        ])

        const count = await quantity_units.countDocuments(filter)
        res.status(200).json({
            message: "Quantities unit fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


// add company industry types
exports.addIndustryTypes = async (req, res) => {
    try {
        const { name } = req.body
        const check = await industry_type.findOne({ name })
        if (check) {
            return utils.handleError(res, {
                message: "industry category already existed",
                code: 404,
            });
        }
        const newtype = await industry_type.create({ name })
        console.log("new industry type : ", newtype)
        return res.status(200).json({
            message: "Industry category added successfully",
            data: newtype,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getIndustryTypes = async (req, res) => {
    try {
        const { search, offset = 0, limit = 10 } = req.query
        let filter = {}
        if (search) {
            filter.name = { $regex: search, $options: "i" }
        }
        const data = await industry_type.aggregate([
            {
                $match: filter
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $skip: parseInt(offset) || 0
            },
            {
                $limit: parseInt(limit) || 10
            }
        ])

        const count = await industry_type.countDocuments(filter)
        res.status(200).json({
            message: "Quantities unit fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}



//BSO New changes

async function EnquiryId() {
    const token = Math.floor(Math.random() * 1000000)
    console.log("token : ", token)
    return `#${token}`
}

exports.createEnquiry = async (req, res) => {
    try {
        const id = req.user._id
        console.log("id : ", id)
        const subscription = await Subscription.aggregate([
            {
                $match: {
                    user_id: new mongoose.Types.ObjectId(id),
                    status: "active"
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: '_id',
                    as: 'user',
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                email: 1,
                                user_type: 1,
                                current_user_type: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'plans',
                    localField: 'plan_id',
                    foreignField: 'plan_id',
                    as: 'plan'
                }
            },
            {
                $unwind: {
                    path: '$plan',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $limit: 1
            }
        ])
        console.log("subscription : ", subscription)
        const data = req.body
        console.log("data : ", data)
        // if (Array.isArray(subscription) && subscription.length > 0) {
        //     if (subscription[0].user && subscription[0].user.user_type.includes("buyer") && subscription[0].plan.plan_step === "direct")
        //         data.is_approved = "approved"
        //     else data.is_approved = "pending"
        // }
        data.is_approved = "approved"
        let enquiryId = await EnquiryId();
        let newdata = {
            ...data,
            enquiry_unique_id: enquiryId,
            user_id: id
        }
        console.log("newdata : ", newdata)
        const newquery = await Enquiry.create(newdata);
        console.log("newquery : ", newquery)

        return res.status(200).json({
            message: "Enquiry created successfully",
            data: newquery,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getMyEnquiry = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("userid is", userId);

        const userDetails = await User.findById(userId);
        console.log("userdetails:", userDetails);

        const { status, search, offset = 0, limit = 10, brand, countries } = req.query;
        console.log('offset : ', offset, " limit : ", limit)
        const filter = {};
        let brandfilter = {}
        let countryFilter = {};

        if (brand) {
            brandfilter = {
                'enquiry_items.brand': { $regex: brand, $options: "i" }
            }
        }


        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.query_unique_id = { $regex: search, $options: "i" };
        }

        if (countries) {
            const countryList = countries.split(',').map(country => country.trim());
            console.log("countryList : ", countryList)
            countryFilter = {
                // shipping_address: {
                "shipping_address_data.address.country.name": {
                    $regex: countryList.join('|'),
                    $options: 'i'
                }
            };
            console.log("countryFilter : ", countryFilter)
        }

        let data = []
        let count = 0
        console.log("brandfilter : ", brandfilter, " filter : ", filter)
        if (userDetails.current_user_type = "supplier") {
            const userMatchCondition = { user_id: new mongoose.Types.ObjectId(userId) }
            // console.log('if condition block')
            data = await Enquiry.aggregate(
                [
                    {
                        $unwind: {
                            path: "$enquiry_items",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $match: brandfilter
                    },
                    {
                        $lookup: {
                            from: "quantity_units",
                            let: { unitId: "$enquiry_items.quantity.unit" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: { $eq: ["$_id", "$$unitId"] }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        unit: 1
                                    }
                                }
                            ],
                            as: "enquiry_items.quantity_unit_data"
                        }
                    },
                    {
                        $unwind: {
                            path: "$enquiry_items.quantity_unit_data",
                            preserveNullAndEmptyArrays: true
                        }
                    },

                    {
                        $lookup: {
                            from: "addresses",
                            localField: "shipping_address",
                            foreignField: "_id",
                            as: "shipping_address_data"
                        }
                    },
                    {
                        $unwind: {
                            path: "$shipping_address_data",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $lookup: {
                            from: "enquiry_quotes",
                            let: { id: "$_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ["$$id", "$enquiry_id"]
                                        }
                                    }
                                }
                            ],
                            as: "quotes"
                        }
                    },
                    {
                        $addFields: {
                            total_quotes: { $size: "$quotes" }
                        }
                    },
                    {
                        $match: {
                            ...filter,
                            ...userMatchCondition,
                            ...countryFilter
                        },
                    },
                    {
                        $project: {
                            quotes: 0
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            user_id: { $first: "$user_id" },
                            enquiry_unique_id: { $first: "$enquiry_unique_id" },
                            status: { $first: "$status" },
                            expiry_date: { $first: "$expiry_date" },
                            priority: { $first: "$priority" },
                            enquiry_number: { $first: "$enquiry_number" },
                            // shipping_address: { $first: "$shipping_address" },
                            shipping_address: { $first: "$shipping_address_data" },
                            currency: { $first: "$currency" },
                            documents: { $first: "$documents" },
                            enquiry_items: { $push: "$enquiry_items" },
                            delivery_charges: { $first: "$delivery_charges" },
                            reply: { $first: "$reply" },
                            total_quotes: { $first: "$total_quotes" },
                            createdAt: { $first: "$createdAt" },
                            updatedAt: { $first: "$updatedAt" },
                        }
                    },
                    {
                        $sort: { createdAt: -1 }
                    },
                    {
                        $skip: parseInt(offset) || 0
                    },
                    {
                        $limit: parseInt(limit) || 10
                    }
                ]
            );

            count = await Enquiry.countDocuments({ ...filter, ...userMatchCondition, ...brandfilter, ...countryFilter });
        } else if (userDetails.current_user_type = "buyer") {
            // console.log("else condition")
            const aggregate_data = [
                {
                    $match: {
                        ...filter,
                        ...countryFilter
                    },
                },
                {
                    $unwind: {
                        path: "$enquiry_items",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: brandfilter
                },
                {
                    $lookup: {
                        from: "quantity_units",
                        let: { unitId: "$enquiry_items.quantity.unit" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$unitId"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    unit: 1
                                }
                            }
                        ],
                        as: "enquiry_items.quantity_unit_data"
                    }
                },
                {
                    $unwind: {
                        path: "$enquiry_items.quantity_unit_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "addresses",
                        localField: "shipping_address",
                        foreignField: "_id",
                        as: "shipping_address_data"
                    }
                },
                {
                    $unwind: {
                        path: "$shipping_address_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "enquiry_quotes",
                        let: { id: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$enquiry_id"]
                                    }
                                }
                            }
                        ],
                        as: "quotes"
                    }
                },
                {
                    $addFields: {
                        total_quotes: { $size: "$quotes" }
                    }
                },
                {
                    $project: {
                        quotes: 0
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        user_id: { $first: "$user_id" },
                        enquiry_unique_id: { $first: "$enquiry_unique_id" },
                        status: { $first: "$status" },
                        expiry_date: { $first: "$expiry_date" },
                        priority: { $first: "$priority" },
                        enquiry_number: { $first: "$enquiry_number" },
                        // shipping_address: { $first: "$shipping_address" },
                        shipping_address: { $first: "$shipping_address_data" },
                        currency: { $first: "$currency" },
                        documents: { $first: "$documents" },
                        enquiry_items: { $push: "$enquiry_items" },
                        delivery_charges: { $first: "$delivery_charges" },
                        reply: { $first: "$reply" },
                        total_quotes: { $first: "$total_quotes" },
                        createdAt: { $first: "$createdAt" },
                        updatedAt: { $first: "$updatedAt" },
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: parseInt(offset) || 0
                },
                {
                    $limit: parseInt(limit) || 10
                },
            ]

            data = await Enquiry.aggregate(
                aggregate_data
            )

            count = await Enquiry.countDocuments({
                ...filter,
                ...countryFilter
            });
            console.log("count : ", count)
        }

        return res.json({ data, count, code: 200 });

    } catch (error) {
        utils.handleError(res, error);
    }
}
exports.getAllEnquiry = async (req, res) => {
    try {
        const { status, search, offset = 0, limit = 10, brand, countries, priority, hide_quote } = req.query;
        console.log('offset : ', offset, " limit : ", limit)
        const filter = {
            is_approved: "approved"
        };
        let brandfilter = {}
        let countryFilter = {};

        if (brand) {
            brandfilter = {
                'enquiry_items.brand': { $regex: brand, $options: "i" }
            }
        }
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.enquiry_unique_id = { $regex: search, $options: "i" };
        }
        if (priority) {
            filter.priority = "high"
        }
        if (hide_quote) {
            filter.total_quotes = { $gt: 0 }
        }

        if (countries) {
            const countryList = countries.split(',').map(country => country.trim());
            console.log("countryList : ", countryList)
            countryFilter = {
                // shipping_address: {
                "shipping_address_data.address.country.name": {
                    $regex: countryList.join('|'),
                    $options: 'i'
                }
            };
            console.log("countryFilter : ", countryFilter)
        }

        let count = 0
        console.log("brandfilter : ", brandfilter, " filter : ", filter)
        const data = await Enquiry.aggregate(
            [
                {
                    $unwind: {
                        path: "$enquiry_items",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $match: brandfilter
                },
                {
                    $lookup: {
                        from: "quantity_units",
                        let: { unitId: "$enquiry_items.quantity.unit" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$unitId"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    unit: 1
                                }
                            }
                        ],
                        as: "enquiry_items.quantity_unit_data"
                    }
                },
                {
                    $unwind: {
                        path: "$enquiry_items.quantity_unit_data",
                        preserveNullAndEmptyArrays: true
                    }
                },

                {
                    $lookup: {
                        from: "addresses",
                        localField: "shipping_address",
                        foreignField: "_id",
                        as: "shipping_address_data"
                    }
                },
                {
                    $unwind: {
                        path: "$shipping_address_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $lookup: {
                        from: "enquiry_quotes",
                        let: { id: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$id", "$enquiry_id"]
                                    }
                                }
                            }
                        ],
                        as: "quotes"
                    }
                },
                {
                    $addFields: {
                        total_quotes: { $size: "$quotes" }
                    }
                },
                {
                    $match: {
                        ...filter,
                        ...countryFilter
                    },
                },
                {
                    $project: {
                        quotes: 0
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        user_id: { $first: "$user_id" },
                        enquiry_unique_id: { $first: "$enquiry_unique_id" },
                        status: { $first: "$status" },
                        expiry_date: { $first: "$expiry_date" },
                        priority: { $first: "$priority" },
                        enquiry_number: { $first: "$enquiry_number" },
                        // shipping_address: { $first: "$shipping_address" },
                        shipping_address: { $first: "$shipping_address_data" },
                        currency: { $first: "$currency" },
                        documents: { $first: "$documents" },
                        enquiry_items: { $push: "$enquiry_items" },
                        delivery_charges: { $first: "$delivery_charges" },
                        reply: { $first: "$reply" },
                        total_quotes: { $first: "$total_quotes" },
                        createdAt: { $first: "$createdAt" },
                        updatedAt: { $first: "$updatedAt" },
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: parseInt(offset) || 0
                },
                {
                    $limit: parseInt(limit) || 10
                }
            ]
        );

        count = await Enquiry.aggregate([
            {
                $unwind: {
                    path: "$enquiry_items",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: brandfilter
            },
            {
                $lookup: {
                    from: "quantity_units",
                    let: { unitId: "$enquiry_items.quantity.unit" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$unitId"] }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                unit: 1
                            }
                        }
                    ],
                    as: "enquiry_items.quantity_unit_data"
                }
            },
            {
                $unwind: {
                    path: "$enquiry_items.quantity_unit_data",
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $lookup: {
                    from: "addresses",
                    localField: "shipping_address",
                    foreignField: "_id",
                    as: "shipping_address_data"
                }
            },
            {
                $unwind: {
                    path: "$shipping_address_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "enquiry_quotes",
                    let: { id: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$$id", "$enquiry_id"]
                                }
                            }
                        }
                    ],
                    as: "quotes"
                }
            },
            {
                $addFields: {
                    total_quotes: { $size: "$quotes" }
                }
            },
            {
                $match: {
                    ...filter,
                    ...countryFilter
                },
            },
            {
                $project: {
                    quotes: 0
                }
            },
            // {
            //     $group: {
            //         _id: "$_id",
            //         user_id: { $first: "$user_id" },
            //         enquiry_unique_id: { $first: "$enquiry_unique_id" },
            //         status: { $first: "$status" },
            //         expiry_date: { $first: "$expiry_date" },
            //         priority: { $first: "$priority" },
            //         enquiry_number: { $first: "$enquiry_number" },
            //         // shipping_address: { $first: "$shipping_address" },
            //         shipping_address: { $first: "$shipping_address_data" },
            //         currency: { $first: "$currency" },
            //         documents: { $first: "$documents" },
            //         enquiry_items: { $push: "$enquiry_items" },
            //         delivery_charges: { $first: "$delivery_charges" },
            //         reply: { $first: "$reply" },
            //         total_quotes: { $first: "$total_quotes" },
            //         createdAt: { $first: "$createdAt" },
            //         updatedAt: { $first: "$updatedAt" },
            //     }
            // },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: "$_id",
                }
            },
            {
                $count: "totalCount"
            }
        ]);

        return res.json({ data, count: count.length > 0 ? count[0].totalCount : 0, code: 200 });

    } catch (error) {
        utils.handleError(res, error);
    }
}
exports.getEnquiryDetails = async (req, res) => {
    try {
        const { id } = req.params
        console.log("id : ", id)
        const data = await Enquiry.findOne({ _id: id }).populate("shipping_address").populate("enquiry_items.quantity.unit")
        console.log("data : ", data)
        if (!data) {
            return utils.handleError(res, {
                message: "Query data not found",
                code: 404,
            });
        }

        return res.status(200).json({
            message: "Query details fetched successfully",
            data,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getContinent = async (req, res) => {
    try {
        const data = await Continent.find();
        console.log("data : ", data)
        return res.status(200).json(
            {
                message: "Continent data fetched successfully",
                data,
                code: 200
            }
        )
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.getCountry = async (req, res) => {
    try {
        const data = await Country.getAllCountries()
        console.log("data : ", data)

        return res.status(200).json(
            {
                message: "Countries data fetched successfully",
                data,
                code: 200
            }
        )
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getStates = async (req, res) => {
    try {
        const { country } = req.params;
        const data = State.getStatesOfCountry(country);
        console.log("data : ", data)
        return res.status(200).json(
            {
                message: "Countries data fetched successfully",
                data,
                code: 200
            }
        )
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getCities = async (req, res) => {
    try {
        const { countryCode, stateCode } = req.query;
        const data = City.getCitiesOfState(countryCode, stateCode);
        console.log("data : ", data)
        return res.status(200).json(
            {
                message: "Countries data fetched successfully",
                data,
                code: 200
            }
        )
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.homepageenquiry = async (req, res) => {
    try {
        const data = await Enquiry.aggregate(
            [
                {
                    $unwind: {
                        path: "$enquiry_items",
                        preserveNullAndEmptyArrays: false
                    }
                },
                {
                    $lookup: {
                        from: "quantity_units",
                        let: { unitId: "$enquiry_items.quantity.unit" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$_id", "$$unitId"] }
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    unit: 1
                                }
                            }
                        ],
                        as: "enquiry_items.quantity_unit_data"
                    }
                },
                {
                    $unwind: {
                        path: "$enquiry_items.quantity_unit_data",
                        preserveNullAndEmptyArrays: true
                    }
                },

                {
                    $lookup: {
                        from: "addresses",
                        localField: "shipping_address",
                        foreignField: "_id",
                        as: "shipping_address_data"
                    }
                },
                {
                    $unwind: {
                        path: "$shipping_address_data",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        user_id: { $first: "$user_id" },
                        enquiry_unique_id: { $first: "$enquiry_unique_id" },
                        status: { $first: "$status" },
                        expiry_date: { $first: "$expiry_date" },
                        priority: { $first: "$priority" },
                        enquiry_number: { $first: "$enquiry_number" },
                        // shipping_address: { $first: "$shipping_address" },
                        shipping_address: { $first: "$shipping_address_data" },
                        currency: { $first: "$currency" },
                        documents: { $first: "$documents" },
                        enquiry_items: { $push: "$enquiry_items" },
                        delivery_charges: { $first: "$delivery_charges" },
                        reply: { $first: "$reply" },
                        createdAt: { $first: "$createdAt" },
                        updatedAt: { $first: "$updatedAt" },
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $skip: 0
                },
                {
                    $limit: 10
                }
            ]
        );
        return res.status(200).json(
            {
                data,
                code: 200
            }
        )

    } catch (error) {
        utils.handleError(res, error);
    }
}

async function genTeamId() {
    const token = Math.floor(Math.random() * 1000000)
    return `Team-${token}`
}

exports.AddTeamMember = async (req, res) => {
    try {
        const userId = req.user._id;
        const data = req.body;

        let teamdata = await Team.findOne(
            {
                $or: [
                    {
                        admin_id: new mongoose.Types.ObjectId(userId)
                    },
                    {
                        members: { $in: [new mongoose.Types.ObjectId(userId)] }
                    }
                ]
            }
        ).populate('admin_id')
        console.log("teamdata : ", teamdata)

        if (!teamdata) {
            let tid = await genTeamId()
            teamdata = await Team.create({
                team_id: tid,
                admin_id: userId
            })
        }

        if (teamdata.members.length >= 3) {
            const Member = await UserMember.findOne({ user_id: userId, status: "paid" });

            if (!Member || Member.member_count <= (teamdata.members.length - 3)) {
                return res.status(402).json({
                    message: "You have reached your member limit",
                    code: 402
                });
            }
        }
        const doesEmailExists = await emailer.emailExists(data.email);
        if (doesEmailExists)
            return utils.handleError(res, {
                message: "This email address is already registered",
                code: 400,
            });
        const user = await User.findOne(userId);
        console.log(user)
        // Add new team member
        data.user_id = userId;
        data.user_type = user.user_type;

        const password = createNewPassword();
        const userData = {
            ...data,
            password,
            decoded_password: password,
            company_data: {
                name: data.company, // or whatever the field is
            },
        };

        const Adduser = new User(userData);
        await Adduser.save();

        const teammemberadd = await Team.findOneAndUpdate(
            { admin_id: new mongoose.Types.ObjectId(userId) },
            {
                $push: { members: Adduser._id }
            },
            { new: true }
        )
        console.log("teammemberadd : ", teammemberadd)

        const token = await saveUserAccessAndReturnToken(req, Adduser);
        console.log("token : ", token);
        Adduser.last_login = new Date();
        await Adduser.save();

        let link = `${process.env.APP_URL}team-invitation?token=${token}&id=${Adduser._id}`
        console.log("link : ", link)
        const mailOptions = {
            to: Adduser.email,
            subject: "Team Invitation from Blue Sky",
            app_name: process.env.APP_NAME,
            name: Adduser.full_name,
            company_name: Adduser.company_data.name,
            app_url: process.env.APP_URL,
            invitation_link: link,
            email: Adduser.email,
            password: Adduser.decoded_password
        };
        emailer.sendEmail(null, mailOptions, "teamInvite");
        return res.status(200).json({
            message: "Team Member Added successfully",
            data: Adduser,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.ResendInvite = async (req, res) => {
    try {
        const { member_id } = req.body
        // const teamdata = await Team.findOne({ members: { $in: [new mongoose.Types.ObjectId(member_id)] } }).populate('members');
        // console.log("teamdata : ", teamdata)

        memberdata = await User.findOne({ _id: new mongoose.Types.ObjectId(member_id) });
        console.log("memberdata : ", memberdata)

        const token = await saveUserAccessAndReturnToken(req, memberdata);
        console.log("token : ", token);
        memberdata.last_login = new Date();
        await memberdata.save();

        let link = `${process.env.APP_URL}team-invitation?token=${token}&id=${memberdata._id}`
        console.log("link : ", link)
        const mailOptions = {
            to: memberdata.email,
            subject: "Team Invitation from Blue Sky",
            app_name: process.env.APP_NAME,
            name: memberdata.full_name,
            company_name: memberdata.company_data.name,
            app_url: process.env.APP_URL,
            invitation_link: link,
            email: memberdata.email,
            password: memberdata.decoded_password
        };
        emailer.sendEmail(null, mailOptions, "teamInvite");
        return res.status(200).json({
            message: "Invite resent successfully",
            code: 200
        });
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.usermember = async (req, res) => {
    try {
        const userId = req.user._id;
        const data = req.body;

        // Check if a paid member already exists for this user
        let member = await UserMember.findOne({ user_id: userId, status: "paid" });

        if (member) {
            // Update existing member
            member = await UserMember.findOneAndUpdate(
                { user_id: userId, status: "paid" },
                { $set: data },
                { new: true }
            );
        } else {
            // Create new member
            data.user_id = userId;
            data.status = "paid";
            member = await UserMember.create(data);
        }

        return res.status(200).json({
            message: "Team Member added/updated successfully",
            data: member,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.GetTeamMember = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("userId : ", userId)
        const offset = parseInt(req.query.offset) || 0;
        const limit = parseInt(req.query.limit) || 3;

        // const teamMembers = await User.find({
        //     user_id: userId,
        //     member_status: { $nin: ['decline', 'suspend'] }
        // })
        //     .skip(offset)
        //     .limit(limit);

        // const total = await User.countDocuments({ user_id: userId, member_status: { $nin: ['decline', 'suspend'] } });

        const teamMembers = await Team.findOne({
            $or: [
                {
                    admin_id: new mongoose.Types.ObjectId(userId)
                },
                {
                    members: { $in: [new mongoose.Types.ObjectId(userId)] }
                }
            ]
        }).populate('admin_id members')
        console.log("teamMembers : ", teamMembers)

        const teamLimit = await UserMember.findOne({ user_id: teamMembers?.admin_id })
        console.log("teamLimit : ", teamLimit)

        let teamLimitCount = 3;
        let teamMemberCount = 0

        if (teamLimit) {
            teamLimitCount += teamLimit?.member_count ? teamLimit.member_count : 0
        }

        if (teamMembers) {
            teamMemberCount = teamMembers?.members?.length === 0 ? 0 : teamMembers.members?.length
        }

        return res.status(200).json({
            message: "Team Members fetched successfully",
            data: teamMembers,
            team_limit: teamLimitCount,
            count: teamMemberCount,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.editTeamMember = async (req, res) => {
    try {
        const Id = req.params.Id;
        const updateData = req.body;

        const updatedMember = await User.findByIdAndUpdate(Id, updateData, {
            new: true,
            runValidators: true
        });

        if (!updatedMember) {
            return res.status(404).json({
                message: "Team Member not found",
                code: 404
            });
        }

        return res.status(200).json({
            message: "Team Member updated successfully",
            data: updatedMember,
            code: 200
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.deleteTeamMember = async (req, res) => {
    try {
        const Id = req.params.Id;
        const deletedMember = await User.findOneAndDelete(
            { _id: Id },
        );
        if (!deletedMember) {
            return res.status(404).json({
                message: "Team Member not found",
                code: 404
            });
        }

        const result = await Team.findByIdAndUpdate(
            {
                $or: [
                    {
                        admin_id: new mongoose.Types.ObjectId(Id)
                    },
                    {
                        members: { $in: [new mongoose.Types.ObjectId(Id)] }
                    }
                ]
            },
            {
                $pull: {
                    members: new mongoose.Types.ObjectId(Id)
                }
            }, { new: true }
        )

        console.log("result : ", result)

        await Team.deleteMany({ admin_id: new mongoose.Types.ObjectId(Id) });

        return res.status(200).json({
            message: "Team Member deleted successfully",
            code: 200
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.searchenquiry = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'search parameter is required' });
        }

        const aggregationPipeline = [];

        if (search) {
            aggregationPipeline.push({
                $match: {
                    enquiry_unique_id: search
                }
            });
        }

        aggregationPipeline.push(
            {
                $unwind: {
                    path: "$enquiry_items",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "quantity_units",
                    let: { unitId: "$enquiry_items.quantity.unit" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$unitId"] }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                unit: 1
                            }
                        }
                    ],
                    as: "enquiry_items.quantity_unit_data"
                }
            },
            {
                $unwind: {
                    path: "$enquiry_items.quantity_unit_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "addresses",
                    localField: "shipping_address",
                    foreignField: "_id",
                    as: "shipping_address_data"
                }
            },
            {
                $unwind: {
                    path: "$shipping_address_data",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: "$_id",
                    user_id: { $first: "$user_id" },
                    enquiry_unique_id: { $first: "$enquiry_unique_id" },
                    status: { $first: "$status" },
                    expiry_date: { $first: "$expiry_date" },
                    priority: { $first: "$priority" },
                    enquiry_number: { $first: "$enquiry_number" },
                    shipping_address: { $first: "$shipping_address_data" },
                    currency: { $first: "$currency" },
                    documents: { $first: "$documents" },
                    enquiry_items: { $push: "$enquiry_items" },
                    delivery_charges: { $first: "$delivery_charges" },
                    reply: { $first: "$reply" },
                    createdAt: { $first: "$createdAt" },
                    updatedAt: { $first: "$updatedAt" },
                }
            },
            {
                $sort: { createdAt: -1 }
            },

        );

        const data = await Enquiry.aggregate(aggregationPipeline);


        // const enquiry = await Enquiry.findOne({
        //     $or: [
        //         { enquiry_unique_id: search },
        //         { enquiry_number: search }
        //     ]
        // });

        if (!data) {
            return res.status(404).json({ message: 'Enquiry not found' });
        }
        return res.status(200).json({
            data: data[0],
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.addenquiryquotes = async (req, res) => {
    try {
        const data = req.body;
        const userId = req.user._id;
        const enquiry = await EnquiryQuotes.create({
            ...data,
            user_id: userId,
        });
        return res.status(200).json({
            message: "Quotation Submit Successfully",
            data: enquiry,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.checksubscriptions = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log(userId)
        const subscription = await Subscription.findOne({
            user_id: userId,
            status: 'active',
        });

        if (!subscription) {
            return res.status(201).json({
                message: "No active subscription found",
                code: 201
            });
        }

        return res.status(200).json({
            message: "Active subscription found",
            data: subscription,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.changeInviteStatus = async (req, res) => {
    try {
        const data = req.body;
        const userdata = User.findOne({ _id: data.user_id })
        console.log("userdata : ", userdata)

        if (!userdata) {
            return utils.handleError(res, {
                message: "User not found",
                code: 400,
            });
        }

        if (!data.status || data.status !== 'accepted') {
            const result = await User.deleteOne({ _id: userdata._id })
            console.log("result : ", result)

            return res.status(200).json({
                message: `Invite ${data.status} successfully`,
                code: 200
            })
        }

        const response = await User.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(data.user_id) },
            {
                $set: {
                    invite_status: "accepted",
                    member_status: "accepted"
                }
            }, { new: true }
        )
        console.log("response : ", response)

        return res.status(200).json({
            message: `Invite ${data.status} successfully`,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.SuspendTeamMember = async (req, res) => {
    try {
        const Id = req.params.Id;
        const SuspendedMember = await User.findByIdAndUpdate(
            Id,
            { $set: { member_status: "suspend" } },
            { new: true });

        if (!SuspendedMember) {
            return res.status(404).json({
                message: "Team Member not found",
                code: 404
            });
        }

        const result = await expireToken(Id)
        console.log("result : ", result)

        return res.status(200).json({
            message: "Team Member suspended successfully",
            data: SuspendedMember,
            code: 200
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.ActivateTeamMember = async (req, res) => {
    try {
        const Id = req.params.Id;
        const SuspendedMember = await User.findByIdAndUpdate(
            Id,
            { $set: { member_status: "accepted" } },
            { new: true });

        if (!SuspendedMember) {
            return res.status(404).json({
                message: "Team Member not found",
                code: 404
            });
        }

        return res.status(200).json({
            message: "Team Member activated successfully",
            data: SuspendedMember,
            code: 200
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.getAllSupplierQuotes = async (req, res) => {
    try {
        const { id } = req.params
        console.log("id : ", id)

        const data = await EnquiryQuotes.find({ enquiry_id: new mongoose.Types.ObjectId(id) }).populate('user_id', 'full_name email user_type current_user_type').populate('enquiry_items.quantity.unit')
        console.log("data : ", data)

        const count = await EnquiryQuotes.countDocuments({ enquiry_id: new mongoose.Types.ObjectId(id) })

        return res.status(200).json({
            message: "Supplier quotes fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.selectSupplierQuote = async (req, res) => {
    try {
        const { quote_id } = req.body
        console.log("data : ", req.body)

        const quotedata = await EnquiryQuotes.findOne({ _id: new mongoose.Types.ObjectId(quote_id) }).populate('user_id enquiry_id')
        console.log("quotedata : ", quotedata)

        const selected = await Enquiry.findByIdAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(quotedata?.enquiry_id?._id)
            },
            {
                $set: {
                    selected_supplier: {
                        quote_id: new mongoose.Types.ObjectId(quote_id)
                    }
                }
            }, { new: true }
        )

        console.log("selected : ", selected)

        let totalprice = 0
        quotedata.enquiry_items.forEach(i => totalprice += (i.unit_price * i.quantity.value))
        console.log("totalprice : ", totalprice)

        totalprice += (quotedata?.custom_charges_one?.value + quotedata?.custom_charges_two?.value) - quotedata?.discount?.value
        console.log("totalprice : ", totalprice)

        quotedata.is_selected = true
        quotedata.final_price = totalprice
        await quotedata.save()

        return res.status(200).json({
            message: "Supplier quote selected successfully",
            code: 200
        })

    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getMyAllQuotes = async (req, res) => {
    try {
        const userId = req.user._id
        console.log("userId : ", userId)

        const data = await EnquiryQuotes.find({ user_id: new mongoose.Types.ObjectId(userId) })
        console.log("data : ", data)

        const count = await EnquiryQuotes.countDocuments({ user_id: new mongoose.Types.ObjectId(userId) })

        return res.status(200).json({
            message: "All quotes fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}