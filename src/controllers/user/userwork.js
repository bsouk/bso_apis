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
        const id = req.params.id;

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

        switch (updatedUser.user_type) {
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
                    'bank_details.address.line2',
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
                    'company_data.address.line2',
                    'company_data.address.city',
                    'company_data.address.state',
                    'company_data.address.zip_code',
                    'company_data.address.country',
                    'beneficiary_address.line1',
                    'beneficiary_address.line2',
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
                    'company_data.address.line2',
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
                    Array.isArray(updatedUser.employement_history) && updatedUser.employement_history.length > 0;

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
            user_type: "supplier",
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

        const allAddress = await Address.find({ user_id: data.user_id });
        console.log("address list is ", allAddress)

        if (!allAddress || allAddress.length === 0) {
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
exports.uploadMedia = async (req, res) => {
    try {
        if (!req.files.media || !req.body.path)
            return utils.handleError(res, {
                message: "MEDIA OR PATH MISSING",
                code: 400,
            });
        let isArray = req.body.isArray;
        if (Array.isArray(req.files.media)) {
            let mediaArray = [];
            for (let index = 0; index < req.files.media.length; index++) {
                const element = req.files.media[index];
                let media = await utils.uploadImage({
                    file: element,
                    path: `${process.env.STORAGE_PATH}/${req.body.path}`,
                });
                console.log(" media :", media)
                mediaArray.push(`${req.body.path}/${media}`);
            }

            return res.status(200).json({
                code: 200,
                data: mediaArray,
            });
        } else {
            let media = await utils.uploadImage({
                file: req.files.media,
                path: `${process.env.STORAGE_PATH}/${req.body.path}`,
            });

            const url = `${req.body.path}/${media}`;
            console.log("url is ", url)
            return res.status(200).json({
                code: 200,
                data: isArray === "true" ? [url] : url,
            });
        }
    } catch (error) {
        utils.handleError(res, error);
    }
};


//get User Profile details
exports.getProfileDetails = async (req, res) => {
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
            user_type: "resource",
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

// exports.getMyQueries = async (req, res) => {
//     try {
//         const userId = req.user._id;
//         console.log("userid is ", userId)

//         const { status, search, offset = 0, limit = 10 } = req.query

//         const filter = {
//             createdByUser: new mongoose.Types.ObjectId(userId)
//         }

//         if (status) {
//             filter.status = status
//         }

//         if (search) {
//             filter.query_unique_id = { $regex: search, $options: "i" };
//         }




//         const agg = [
//             {
//                 $match: { ...filter }
//             },
//             { $unwind: "$queryDetails" },
//             {
//                 $lookup: {
//                     from: "products",
//                     let: { sku_id: "$queryDetails.sku_id" },
//                     pipeline: [



//                     {
//                         $lookup: {
//                             from: "users",
//                             localField: "user_id",
//                             foreignField : "_id",
//                             as: "user"

//                         }
//                     },
//                         {
//                             $project: {
//                                 variant: 1,
//                                 user_id:1,
//                                 name : 1,
//                             }
//                         }
//                     ],
//                     as: "products"
//                 }
//             },
//             {
//                 $unwind: {
//                     path: "$products",
//                     preserveNullAndEmptyArrays: true
//                 }
//             },

//             {
//                 $addFields: {
//                     "queryDetails.sku_details": "$products.variant"
//                 }
//             },
//             { $skip: parseInt(offset) || 0 },
//             { $limit: parseInt(limit) || 10 }
//         ]
//         console.log(JSON.stringify(agg))
//         const myQueries = await Query.aggregate(agg)

//         const count = await Query.countDocuments(agg);

//         return res.status(200).json({
//             message: "My Queries Fetched Successfully",
//             data: myQueries,
//             count: count,
//             code: 200
//         })
//     } catch (error) {
//         utils.handleError(res, error);
//     }
// }

// exports.getMyQueries = async (req, res) => {
//     try {
//         const userId = req.user._id;
//         console.log("userid is ", userId);
//         const { status, search, offset = 0, limit = 10 } = req.query;
//         // Base filter
//         const filter = {
//             createdByUser: new mongoose.Types.ObjectId(userId),
//         };
//         // Additional filters
//         if (status) {
//             filter.status = status;
//         }
//         if (search) {
//             filter.query_unique_id = { $regex: search, $options: "i" };
//         }
//         // Aggregation pipeline
//         const agg = [
//             {
//                 $match: filter,
//             },
//             {
//                 $unwind: {
//                     path: "$queryDetails",
//                     preserveNullAndEmptyArrays: true,
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "products",
//                     let: { sku_id: "$queryDetails.variant_id" },
//                     pipeline: [
//                         {
//                             $match: {
//                                 $expr: { $in: ["$$sku_id", "$variant._id"] },
//                             },
//                         },
//                         {
//                             $lookup: {
//                                 from: "users",
//                                 localField: "user_id",
//                                 foreignField: "_id",
//                                 as: "user",
//                             },
//                         },
//                         {
//                             $unwind: {
//                                 path: "$user",
//                                 preserveNullAndEmptyArrays: true,
//                             },
//                         },
//                         {
//                             $project: {
//                                 name: 1,
//                                 variant: {
//                                     $filter: {
//                                         input: "$variant",
//                                         as: "v",
//                                         cond: { $eq: ["$$v._id", "$$sku_id"] },
//                                     },
//                                 },
//                                 user: 1,
//                             },
//                         },
//                     ],
//                     as: "product",
//                 },
//             },
//             {
//                 $unwind: {
//                     path: "$product",
//                     preserveNullAndEmptyArrays: true,
//                 },
//             },
//             {
//                 $addFields: {
//                     "queryDetails.product": {
//                         name : "$product.name",
//                         variant: {
//                             $arrayElemAt: ["$product.variant", 0],
//                         },
//                         user: "$product.user",

//                     },

//                 },
//             },
//             {
//                 $project: {
//                     "queryDetails.product.user.password": 0, // Avoid sending sensitive user data
//                     product: 0, // Remove intermediate lookup data
//                 },
//             },
//             {
//                 $skip: parseInt(offset) || 0,
//             },
//             {
//                 $limit: parseInt(limit) || 10,
//             },
//         ];
//         // Aggregation result
//         const myQueries = await Query.aggregate(agg);
//         // Count documents
//         const countAgg = [...agg, { $count: "total" }];
//         const countResult = await Query.aggregate(countAgg);
//         const count = countResult.length > 0 ? countResult[0].total : 0;
//         return res.status(200).json({
//             message: "My Queries Fetched Successfully",
//             data: myQueries,
//             count: count,
//             code: 200,
//         });
//     } catch (error) {
//         console.error(error);
//         utils.handleError(res, error);
//     }
// };

exports.getMyQueries = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("userid is ", userId);
        const { status, search, offset = 0, limit = 10 } = req.query;
        const filter = {
            createdByUser: new mongoose.Types.ObjectId(userId),
        };
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.query_unique_id = { $regex: search, $options: "i" };
        }

        const data = await Query.aggregate([
            { $match: { ...filter } },
            {
                $skip: parseInt(offset) || 0,
            },
            {
                $limit: parseInt(limit) || 10,
            },
        ])

        const count = await Product.countDocuments(filter);
        res.json({ data: data, count, code: 200 });

    } catch (error) {
        utils.handleError(res, error);
    }
}

//get query by id
exports.getQueryById = async (req, res) => {
    try {
        const { id } = req.params

        if (!id) {
            return utils.handleError(res, {
                message: "Query id is required",
                code: 400,
            });
        }

        const agg = [
            {
                $match: { _id: new mongoose.Types.ObjectId(id) },

            },
            {
                $unwind: {
                    path: "$queryDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "products",
                    let: { sku_id: "$queryDetails.variant_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $in: ["$$sku_id", "$variant._id"] },
                            },
                        },
                        {
                            $lookup: {
                                from: "users",
                                localField: "user_id",
                                foreignField: "_id",
                                as: "user",
                            },
                        },
                        {
                            $unwind: {
                                path: "$user",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $project: {
                                name: 1,
                                variant: {
                                    $filter: {
                                        input: "$variant",
                                        as: "v",
                                        cond: { $eq: ["$$v._id", "$$sku_id"] },
                                    },
                                },
                                user: 1,
                            },
                        },
                    ],
                    as: "product",
                },
            },
            {
                $unwind: {
                    path: "$product",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    "queryDetails.product": {
                        name: "$product.name",
                        variant: {
                            $arrayElemAt: ["$product.variant", 0],
                        },
                        user: "$product.user",

                    },

                },
            },
            {
                $project: {
                    "queryDetails.product.user.password": 0, // Avoid sending sensitive user data
                    product: 0, // Remove intermediate lookup data
                },
            },

        ];

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
        const topProduct = await Product.find().limit(10)

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
