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
const Team = require("../../models/team");
const payment_terms = require("../../models/payment_terms");
const logistics_quotes = require("../../models/logistics_quotes");
const Commision = require("../../models/commision")
const EnquiryOtp = require("../../models/EnquiryOtp");
const payment = require("../../models/payment");
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
            if (types.includes(data.switch_to.trim()) && user.profile_completed === true) {
                return utils.handleError(res, {
                    message: `You are already ${data.switch_to} user`,
                    code: 400,
                });
            }
            if (!types.includes(data.switch_to.trim())) {
                types.push(data.switch_to.trim())
            }
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
                    'email',
                    'phone_number',
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
        let supportedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/avif", "image/webp", "image/svg", "image/bmp"];
        let supportedOtherTypes = [
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/pdf",
            "audio/mpeg",
            "audio/wav",
            "audio/mp3",
            "audio/ogg",
            "video/mp4",
            "video/quicktime",
            "video/x-m4v",
            "video/webm",
            "video/mov"
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
                        $lookup: {
                            from: "enquiry_quotes",
                            let: { id: "$selected_supplier.quote_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ["$$id", "$_id"]
                                        }
                                    }
                                }
                            ],
                            as: "selected_supplier"
                        }
                    },
                    {
                        $lookup: {
                            from: "logistics_quotes",
                            let: { id: "$selected_logistics.quote_id" },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ["$$id", "$_id"]
                                        }
                                    }
                                }
                            ],
                            as: "selected_logistics"
                        }
                    },
                    {
                        $unwind: {
                            path: "$selected_supplier",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $unwind: {
                            path: "$selected_logistics",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $project: {
                            quotes: 0
                        }
                    },
                    {
                        $sort: { createdAt: -1 }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            user_id: { $first: "$user_id" },
                            is_approved: { $first: "$is_approved" },
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
                            selected_supplier: { $first: "$selected_supplier" },
                            selected_logistics: { $first: "$selected_logistics" },
                            delivery_charges: { $first: "$delivery_charges" },
                            reply: { $first: "$reply" },
                            grand_total: { $first: "$grand_total" },
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
        const { status, search, offset = 0, limit = 10, brand, countries, priority, hide_quote, logisticsview } = req.query;
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
        if (hide_quote && logisticsview) {
            filter.total_logistics_quotes = { $lte: 0 };
        } else if (hide_quote) {
            filter.total_supplier_quotes = { $lte: 0 };
        }
        if (logisticsview) {

            filter.shipment_type = "delivery"
            filter.selected_supplier = { $exists: true }
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
                        as: "supplier_quotes"
                    }
                },
                {
                    $lookup: {
                        from: "logistics_quotes",
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
                        as: "logistics_quotes"
                    }
                },
                {
                    $addFields: {
                        total_supplier_quotes: { $size: "$supplier_quotes" },
                        total_logistics_quotes: { $size: "$logistics_quotes" }
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
                    $sort: { createdAt: -1 }
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
                        total_supplier_quotes: { $first: "$total_supplier_quotes" },
                        total_logistics_quotes: { $first: "$total_logistics_quotes" },
                        shipment_type: { $first: "$shipment_type" },
                        selected_supplier: { $first: "$selected_supplier" },
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
            .populate({ path: 'selected_supplier.quote_id', populate: [{ path: "pickup_address" }, { path: 'enquiry_items.quantity.unit' }] })
        console.log("data : ", data)
        if (!data) {
            return utils.handleError(res, {
                message: "Query data not found",
                code: 404,
            });
        }

        const { selected_supplier, ...rest } = data.toObject();

        if (selected_supplier?.quote_id) {
            delete selected_supplier.quote_id.custom_charges_one;
            delete selected_supplier.quote_id.custom_charges_two;
            delete selected_supplier.quote_id.discount;
            delete selected_supplier.quote_id.admin_charge;
        }
        const commisiondata = await Commision.findOne();
        const ispaymentdone = await payment.findOne({ enquiry_id: id });
        const newdata = {
            ...rest,
            selected_supplier: selected_supplier?.quote_id || null,
            admincommission: commisiondata || null,
        };
        if (ispaymentdone) {
            newdata.payment_status = "paid";
        }

        return res.status(200).json({
            message: "Query details fetched successfully",
            data: newdata,
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
        console.log("userId", userId)

        const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(userId), status: "active" });
        console.log("activeSubscription : ", activeSubscription)

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "No subscription found",
                code: 400,
            });
        }

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

            if (!Member || teamdata.members.length >= Member.member_count) {
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

        let teamLimitCount = 0;
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
            team_limit: teamLimitCount !== 0 ? teamLimitCount : 3,
            count: teamMemberCount,
            code: 200
        });

    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.editTeamMember = async (req, res) => {
    try {
        const userId = req.user._id;
        const Id = req.params.Id;
        const updateData = req.body;

        const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(userId), status: "active" });
        console.log("activeSubscription : ", activeSubscription)

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "No subscription found",
                code: 400,
            });
        }

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
        const userId = req.user._id
        const Id = req.params.Id;
        console.log("userId : ", userId)

        const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(userId), status: "active" });
        console.log("activeSubscription : ", activeSubscription)

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "No subscription found",
                code: 400,
            });
        }

        const deletedMember = await User.findOneAndDelete(
            { _id: Id },
        );
        if (!deletedMember) {
            return res.status(404).json({
                message: "Team Member not found",
                code: 404
            });
        }

        const result = await Team.findOneAndUpdate(
            {
                admin_id: new mongoose.Types.ObjectId(userId)
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


async function genQuoteId() {
    let token = Math.floor(Math.random() * 100000000)
    return `quote-${token}`
}

exports.addenquiryquotes = async (req, res) => {
    try {
        const data = req.body;
        console.log("data : ", data)
        const userId = req.user._id;

        const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(userId), status: "active", type: "supplier" });
        console.log("activeSubscription : ", activeSubscription)

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "No supplier subscription found",
                code: 400,
            });
        }
        // const enquirydata = await Enquiry.findOne({ _id: data.enquiry_id })
        // const buyersubscription = await Subscription.findOne({ user_id: enquirydata.user_id, status: "active", type: "" });
        const enquiryData = await EnquiryQuotes.findOne({ enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), user_id: new mongoose.Types.ObjectId(userId) });
        console.log("enquiryData : ", enquiryData);
        let enquiry = {}
        if (enquiryData) {
            enquiry = await EnquiryQuotes.findOneAndUpdate(
                { enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), user_id: new mongoose.Types.ObjectId(userId) },
                { $set: data },
                {
                    new: true
                }
            )
            console.log("enquiry : ", enquiry);
        } else {
            let quote_unique_id = await genQuoteId()
            enquiry = await EnquiryQuotes.create({
                ...data,
                quote_unique_id,
                user_id: userId,
            });
            console.log("enquiry : ", enquiry);
        }
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
        const subscription = await Subscription.find({
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
        const userId = req.user._id
        const data = req.body;
        console.log("userIdddd : ", userId)

        // const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(data.userId), status: "active" });
        // console.log("activeSubscription : ", activeSubscription)

        // if (!activeSubscription) {
        //     return utils.handleError(res, {
        //         message: "No subscription found",
        //         code: 400,
        //     });
        // }

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
        const userId = req.user._id;
        const Id = req.params.Id;

        const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(userId), status: "active" });
        console.log("activeSubscription : ", activeSubscription)

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "No subscription found",
                code: 400,
            });
        }

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
        const userId = req.user._id
        const Id = req.params.Id;

        const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(userId), status: "active" });
        console.log("activeSubscription : ", activeSubscription)

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "No subscription found",
                code: 400,
            });
        }

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
        const userId = req.user._id;
        const { id } = req.params
        console.log("id : ", id)
        const plan = await Subscription.aggregate(
            [
                {
                    $match: {
                        user_id: new mongoose.Types.ObjectId(userId),
                        status: "active",
                        type: "buyer"
                    }
                },
                {
                    $lookup: {
                        from: "plans",
                        localField: 'plan_id',
                        foreignField: 'plan_id',
                        as: 'plan'
                    }
                },
                {
                    $unwind: {
                        path: "$plan",
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]
        )
        console.log("plan : ", plan)

        let data = {}
        if (plan.length === 0) {
            return res.status(200).json({
                message: "No active subscription found",
                code: 200
            })
        }
        if (plan[0]?.plan?.plan_step === "direct") {
            data = await EnquiryQuotes.find({ enquiry_id: new mongoose.Types.ObjectId(id) }).populate('user_id', 'full_name email user_type current_user_type').populate('enquiry_items.quantity.unit').populate("pickup_address")
        } else {
            data = await EnquiryQuotes.find({ enquiry_id: new mongoose.Types.ObjectId(id), is_admin_approved: true }).populate('user_id', 'full_name email user_type current_user_type').populate('enquiry_items.quantity.unit').populate("pickup_address")
        }
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
        const user_id = req.user._id
        const { quote_id, shipment_type } = req.body
        console.log("data : ", req.body)

        const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(user_id), status: "active", type: "buyer" });
        console.log("activeSubscription : ", activeSubscription)

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "No buyer subscription found",
                code: 400,
            });
        }

        const quotedata = await EnquiryQuotes.findOne({ _id: new mongoose.Types.ObjectId(quote_id) }).populate('user_id enquiry_id').populate(
            {
                path: "pickup_address"
            }
        )
        console.log("quotedata : ", quotedata)


        if (quotedata?.enquiry_id?.selected_supplier?.quote_id && mongoose.isValidObjectId(quotedata?.enquiry_id?.selected_supplier?.quote_id)) {
            return utils.handleError(res, {
                message: "Enquiry has already an assigned Supplier",
                code: 400
            })
        }

        const selected = await Enquiry.findByIdAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(quotedata?.enquiry_id?._id)
            },
            {
                $set: {
                    selected_supplier: {
                        quote_id: new mongoose.Types.ObjectId(quote_id)
                    },
                    shipment_type: shipment_type
                }
            }, { new: true }
        ).populate('shipping_address user_id')

        console.log("selected : ", selected)

        let totalprice = 0
        quotedata.enquiry_items.forEach(i => totalprice += (i.unit_price * i.quantity.value))
        console.log("totalprice : ", totalprice)

        totalprice += (quotedata?.custom_charges_one?.value + quotedata?.custom_charges_two?.value) - quotedata?.discount?.value
        console.log("totalprice : ", totalprice)

        quotedata.is_selected = true
        quotedata.final_price = totalprice
        await quotedata.save()

        let full_address = `${quotedata?.pickup_address?.address?.address_line_1}, ${quotedata?.pickup_address?.address_line2} , ${quotedata?.pickup_address?.city?.name}, ${quotedata?.pickup_address?.state?.name}, ${quotedata?.pickup_address?.country?.name}, ${quotedata?.pickup_address?.pin_code}`
        if (shipment_type === "self-pickup") {
            const mailOptions = {
                to: quotedata.user_id.email,
                subject: "Shipment Pickup details",
                name: quotedata.user_id.full_name,
                buyer_name: quotedata.user_id.full_name,
                pickup_location: full_address,
                tracking_id: "",
                tracking_url: ""
            }

            emailer.sendEmail(null, mailOptions, "shipmentPickup");
        }

        let full_ship_address = `${selected?.shipping_address?.address?.address_line_1}, ${selected?.shipping_address?.address?.address_line2} , ${selected?.shipping_address?.address?.city?.name}, ${selected?.shipping_address?.address?.state?.name}, ${selected?.shipping_address?.address?.country?.name}, ${selected?.shipping_address?.address?.pin_code}`
        const mailOptions = {
            to: quotedata.user_id.email,
            subject: "Quote Selection Notification - Blue Sky",
            supplier_name: quotedata.user_id.full_name,
            enquiry_id: selected.enquiry_unique_id,
            buyer_name: selected.user_id.full_name,
            portal_url: "",
            detail: `
             <div class="quote-box">
               <p><strong>Quote ID:</strong>${quotedata?.quote_unique_id}</p>
               <p><strong>Pickup Address:</strong>${full_address}</p>
               <p><strong>Shipping Address:</strong>${full_ship_address}</p>
             </div>
            `
        }

        emailer.sendEmail(null, mailOptions, "EnquirySelection");

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
        const { offset = 0, limit = 10 } = req.query
        const userId = req.user._id
        console.log("userId : ", userId)

        const data = await EnquiryQuotes.find({ user_id: new mongoose.Types.ObjectId(userId) }).populate({ path: "pickup_address", select: "address" }).populate("enquiry_items.quantity.unit").populate("enquiry_id").sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit))
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


exports.getPaymentTerms = async (req, res) => {
    try {
        const { offset = 0, limit = 10, search } = req.query
        let filter = {}

        if (search) {
            filter.name = new RegExp(search, 'i')
        }
        const data = await payment_terms.find(filter).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit))
        const count = await payment_terms.countDocuments(filter)
        console.log("data : ", data)
        return res.status(200).json({
            message: "Payment terms fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.submitLogisticsQuotes = async (req, res) => {
    try {
        const data = req.body;
        console.log("data : ", data)
        const userId = req.user._id;
        let userdata = req.user
        console.log("userdata : ", userdata)

        const activeSubscription = await Subscription.findOne({ user_id: new mongoose.Types.ObjectId(userId), status: "active", type: "logistics" });
        console.log("activeSubscription : ", activeSubscription)

        if (!activeSubscription) {
            return utils.handleError(res, {
                message: "No logistics subscription found",
                code: 400,
            });
        }

        if (!userdata.user_type.includes("logistics")) {
            return utils.handleError(res, {
                message: "Only Logistics can add quotes",
                code: 400,
            });
        }

        const enquiryData = await logistics_quotes.findOne({ enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), user_id: new mongoose.Types.ObjectId(userId) });
        console.log("enquiryData : ", enquiryData);
        let enquiry = {}
        if (enquiryData) {
            enquiry = await logistics_quotes.findOneAndUpdate(
                { enquiry_id: new mongoose.Types.ObjectId(data.enquiry_id), user_id: new mongoose.Types.ObjectId(userId) },
                { $set: data },
                {
                    new: true
                }
            )
            console.log("enquiry : ", enquiry);
        } else {
            let quote_unique_id = await genQuoteId()
            enquiry = await logistics_quotes.create({
                ...data,
                quote_unique_id,
                user_id: userId,
            });
            console.log("enquiry : ", enquiry);
        }
        return res.status(200).json({
            message: "Logistics Quotation Submit Successfully",
            data: enquiry,
            code: 200
        });
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.logisticsEnquiryDetails = async (req, res) => {
    try {
        const { id } = req.params
        console.log("id : ", id)
        const data = await Enquiry.findOne({ _id: id }).populate("shipping_address").populate("enquiry_items.quantity.unit").populate({
            path: 'selected_supplier.quote_id', populate: [
                {
                    path: "pickup_address"
                },
                {
                    path: "enquiry_items.quantity.unit"
                }
            ]
        })
        console.log("data : ", data)
        if (!data) {
            return utils.handleError(res, {
                message: "Query data not found",
                code: 404,
            });
        }

        const newdata = {
            ...data.toObject(),
            selected_supplier: data?.selected_supplier?.quote_id || null,
        };

        return res.status(200).json({
            message: "Query details fetched successfully",
            data: newdata,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}

exports.selectLogisticsQuote = async (req, res) => {
    try {
        const userId = req.user._id
        console.log("userId : ", userId)
        const { quote_id } = req.body
        console.log("data : ", req.body)

        const activeSubscription = await Subscription.aggregate(
            [
                {
                    $match: {
                        user_id: new mongoose.Types.ObjectId(userId),
                        status: "active",
                        type: "buyer"
                    }
                },
                {
                    $lookup: {
                        from: "plans",
                        localField: 'plan_id',
                        foreignField: 'plan_id',
                        as: 'plan'
                    }
                },
                {
                    $unwind: {
                        path: "$plan",
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]
        )
        console.log("activeSubscription : ", activeSubscription)

        if (activeSubscription.length === 0) {
            return utils.handleError(res, {
                message: "No buyer subscription found",
                code: 400,
            });
        }

        const quotedata = await logistics_quotes.findOne({ _id: new mongoose.Types.ObjectId(quote_id) }).populate('user_id enquiry_id')
        console.log("quotedata : ", quotedata)

        const enquiry = await Enquiry.findOne({ _id: quotedata.enquiry_id }).populate({ path: 'selected_supplier.quote_id', populate: 'pickup_address' }).populate('user_id')
        console.log("enquiry : ", enquiry)

        if (enquiry?.selected_logistics?.quote_id && mongoose.isValidObjectId(enquiry?.selected_logistics?.quote_id)) {
            return utils.handleError(res, {
                message: "Enquiry has already an assigned Logistics",
                code: 400
            })
        }

        const selected = await Enquiry.findByIdAndUpdate(
            {
                _id: new mongoose.Types.ObjectId(quotedata?.enquiry_id?._id)
            },
            {
                $set: {
                    selected_logistics: {
                        quote_id: new mongoose.Types.ObjectId(quote_id)
                    },
                }
            }, { new: true }
        )

        console.log("selected : ", selected)

        let totalprice = 0
        enquiry?.selected_supplier?.quote_id?.enquiry_items.forEach(i => totalprice += (i.unit_price * i.quantity.value))
        console.log("totalprice : ", totalprice)

        totalprice += (enquiry?.selected_supplier?.quote_id?.custom_charges_one?.value + enquiry?.selected_supplier?.quote_id?.custom_charges_two?.value + quotedata?.shipping_fee) - enquiry?.selected_supplier?.quote_id?.discount?.value
        console.log("totalprice : ", totalprice)

        if (activeSubscription[0].plan.plan_step === "direct") {
            const commision = await Commision.findOne()
            console.log("Commision : ", commision)

            if (commision.charge_type === "percentage") {
                totalprice += (totalprice) + ((commision.value) / 100)
                console.log("totalprice : ", totalprice)
            } else {
                totalprice += commision.value
                console.log("totalprice : ", totalprice)
            }
        }

        quotedata.is_selected = true
        enquiry.grand_total = totalprice
        await quotedata.save()
        await enquiry.save()

        let field = enquiry.selected_supplier.quote_id
        let full_ship_address = `${enquiry?.shipping_address?.address?.address_line_1}, ${enquiry?.shipping_address?.address?.address_line2} , ${enquiry?.shipping_address?.address?.city?.name}, ${enquiry?.shipping_address?.address?.state?.name}, ${enquiry?.shipping_address?.address?.country?.name}, ${enquiry?.shipping_address?.address?.pin_code}`
        let full_address = `${field?.pickup_address?.address?.address_line_1}, ${field?.pickup_address?.address_line2} , ${field?.pickup_address?.city?.name}, ${field?.pickup_address?.state?.name}, ${field?.pickup_address?.country?.name}, ${field?.pickup_address?.pin_code}`
        const mailOptions = {
            to: quotedata.user_id.email,
            subject: "Quote Selection Notification - Blue Sky",
            supplier_name: quotedata.user_id.full_name,
            enquiry_id: enquiry.enquiry_unique_id,
            buyer_name: enquiry.user_id.full_name,
            portal_url: "",
            detail: `
             <div class="quote-box">
               <p><strong>Quote ID:</strong>${quotedata?.quote_unique_id}</p>
               <p><strong>Pickup Address:</strong>${full_address}</p>
               <p><strong>Shipping Address:</strong>${full_ship_address}</p>
             </div>
            `
        }

        emailer.sendEmail(null, mailOptions, "EnquirySelection");

        return res.status(200).json({
            message: "Logistics quote selected successfully",
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.getLogisticsQuotes = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params
        console.log("id : ", id)
        const plan = await Subscription.aggregate(
            [
                {
                    $match: {
                        user_id: new mongoose.Types.ObjectId(userId),
                        status: "active",
                        type: "buyer"
                    }
                },
                {
                    $lookup: {
                        from: "plans",
                        localField: 'plan_id',
                        foreignField: 'plan_id',
                        as: 'plan'
                    }
                },
                {
                    $unwind: {
                        path: "$plan",
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]
        )
        console.log("plan : ", plan)

        let data = {}
        if (plan.length === 0) {
            return res.status(200).json({
                message: "No active subscription found",
                code: 200
            })
        }
        if (plan[0]?.plan?.plan_step === "direct") {
            data = await logistics_quotes.find({ enquiry_id: id })
                .populate({
                    path: 'enquiry_id',
                    populate: [
                        {
                            path: "selected_supplier.quote_id",
                            populate: { path: "pickup_address", strictPopulate: false }
                        },
                        {
                            path: "enquiry_items.quantity.unit"
                        }
                    ]
                }).populate({ path: 'user_id', select: "company_data" }).sort({ createdAt: -1 })
        } else {
            data = await logistics_quotes.find({ enquiry_id: id, is_selected: true })
                .populate({
                    path: 'enquiry_id',
                    populate: [
                        {
                            path: "selected_supplier.quote_id",
                            populate: { path: "pickup_address", strictPopulate: false }
                        },
                        {
                            path: "enquiry_items.quantity.unit"
                        }
                    ]
                }).populate({ path: 'user_id', select: "company_data" }).sort({ createdAt: -1 })
        }
        console.log("data : ", data)

        const count = await logistics_quotes.countDocuments({ enquiry_id: new mongoose.Types.ObjectId(id) })

        return res.status(200).json({
            message: "Logistics quotes fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}



exports.getMyOwnLogisticsQuotes = async (req, res) => {
    try {
        const { offset = 0, limit = 10 } = req.query
        const id = req.user._id
        console.log("id : ", id)

        const data = await logistics_quotes.find({ user_id: id })
            .populate({
                path: 'enquiry_id',
                populate: [
                    {
                        path: "selected_supplier.quote_id",
                        populate: { path: "pickup_address", strictPopulate: false }
                    },
                    {
                        path: "enquiry_items.quantity.unit"
                    }
                ]
            }).sort({ createdAt: -1 }).skip(parseInt(offset)).limit(parseInt(limit))
        console.log("data : ", data)

        const count = await logistics_quotes.countDocuments({ user_id: new mongoose.Types.ObjectId(id) })

        return res.status(200).json({
            message: "Logistics quotes fetched successfully",
            data,
            count,
            code: 200
        })
    } catch (error) {
        utils.handleError(res, error);
    }
}


exports.sendOtpForEnquiry = async (req, res) => {
    try {

        const { enquiry_id, quote_id } = req.body;
        const enquiry = await Enquiry.findOne({ _id: enquiry_id })
        const user = await User.findOne({ _id: enquiry.user_id })
        const user_id = user._id;
        if (!user || !user.email) {
            return res.status(400).json({ code: 400, message: "User not found or missing email" });
        }

        const email = user.email;
        const otp = Math.floor(100000 + Math.random() * 900000);

        const existingOtp = await EnquiryOtp.findOne({
            user_id,
            enquiry_id,
            quote_id,
        });

        const data = {
            user_id,
            enquiry_id,
            quote_id,
            email,
            otp,
            is_used: false,
            verified: false,
        };

        if (existingOtp) {
            await EnquiryOtp.findByIdAndUpdate(existingOtp._id, data);
        } else {
            const newOtp = new EnquiryOtp(data);
            await newOtp.save();
        }

        const mailOptions = {
            to: email,
            subject: "Verify Your OTP",
            app_name: process.env.APP_NAME,
            otp: otp,
        };

        emailer.sendEmail(null, mailOptions, "verifyOTP");

        res.json({ code: 200, message: "OTP sent successfully", email: email.slice(0, 2) + '****' + email.split('@').pop() }); // Remove `otp` if you don't want to expose it
    } catch (error) {
        utils.handleError(res, error);
    }
};
exports.sendOtpForQuote = async (req, res) => {
    try {

        const { enquiry_id, quote_id } = req.body;
        const enquiry = await EnquiryQuotes.findOne({ _id: quote_id })
        const user = await User.findOne({ _id: enquiry.user_id })
        const user_id = user._id;
        if (!user || !user.email) {
            return res.status(400).json({ code: 400, message: "User not found or missing email" });
        }

        const email = user.email;
        const otp = Math.floor(100000 + Math.random() * 900000);

        const existingOtp = await EnquiryOtp.findOne({
            user_id,
            enquiry_id,
            quote_id,
        });

        const data = {
            user_id,
            enquiry_id,
            quote_id,
            email,
            otp,
            is_used: false,
            verified: false,
        };

        if (existingOtp) {
            await EnquiryOtp.findByIdAndUpdate(existingOtp._id, data);
        } else {
            const newOtp = new EnquiryOtp(data);
            await newOtp.save();
        }

        const mailOptions = {
            to: email,
            subject: "Verify Your OTP",
            app_name: process.env.APP_NAME,
            otp: otp,
        };

        emailer.sendEmail(null, mailOptions, "verifyOTP");

        res.json({ code: 200, message: "OTP sent successfully", email: email.slice(0, 2) + '****' + email.split('@').pop() }); // Remove `otp` if you don't want to expose it
    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.verifyOtpForEnquiry = async (req, res) => {
    try {
        const { enquiry_id, quote_id, otp } = req.body;

        const otpData = await EnquiryOtp.findOne({
            enquiry_id,
            quote_id,
        });
        console.log("otpData : ", req.body)

        if (!otpData || otpData.otp !== otp)
            return utils.handleError(res, {
                message: "The OTP you entered is incorrect. Please try again",
                code: 400,
            });
        if (otpData.verified == true) {
            console.log("Otp already verified")


            return res.json({ code: 200, message: "Otp verified already" });
        }
        const updatedStatus = await Enquiry.findOneAndUpdate(
            { _id: enquiry_id },
            { $set: { status: "self_delivered" } },
            { new: true }
        );

        const updatedQuote = await EnquiryQuotes.findOneAndUpdate(
            { _id: quote_id },
            { $set: { status: "delivered" } },
            { new: true }
        );



        otpData.verified = true;
        otpData.is_used = true;
        await otpData.save();

        res.json({ code: 200, message: "Otp verified successfullyyy" });
    } catch (error) {
        utils.handleError(res, error);
    }
};
exports.verifyOtpForQuote = async (req, res) => {
    try {
        const { enquiry_id, quote_id, otp } = req.body;

        const otpData = await EnquiryOtp.findOne({
            enquiry_id,
            quote_id,
        });
        console.log("otpData : ", req.body)

        if (!otpData || otpData.otp !== otp)
            return utils.handleError(res, {
                message: "The OTP you entered is incorrect. Please try again",
                code: 400,
            });
        if (otpData.verified == true) {
            console.log("Otp already verified")


            return res.json({ code: 200, message: "Otp verified already" });
        }
        const updatedStatus = await Enquiry.findOneAndUpdate(
            { _id: enquiry_id },
            { $set: { status: "logistic_pickup" } },
            { new: true }
        );

        const updatedQuote = await EnquiryQuotes.findOneAndUpdate(
            { _id: quote_id },
            { $set: { status: "logistic_pickup" } },
            { new: true }
        );



        otpData.verified = true;
        otpData.is_used = true;
        await otpData.save();

        res.json({ code: 200, message: "Otp verified successfullyyy" });
    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.verifyOtpForBuyer = async (req, res) => {
    try {
        const { enquiry_id, quote_id, otp } = req.body;

        const otpData = await EnquiryOtp.findOne({
            enquiry_id,
            quote_id,
        });
        console.log("otpData : ", req.body)

        if (!otpData)
            return utils.handleError(res, {
                message: "The OTP you entered is incorrect. Please try again",
                code: 400,
            });

        const updatedStatus = await Enquiry.findOneAndUpdate(
            { _id: enquiry_id },
            { $set: { status: "delivered" } },
            { new: true }
        );

        const updatedQuote = await EnquiryQuotes.findOneAndUpdate(
            { _id: quote_id },
            { $set: { status: "delivered" } },
            { new: true }
        );



        otpData.verified = true;
        otpData.is_used = true;
        await otpData.save();

        res.json({ code: 200, message: "Otp verified successfullyyy" });
    } catch (error) {
        utils.handleError(res, error);
    }
};