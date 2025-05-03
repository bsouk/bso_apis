const Admin = require("../../models/admin");
const utils = require("../../utils/utils")
const ResetPassword = require("../../models/reset_password")
const uuid = require('uuid');
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken")
const generatePassword = require("generate-password");

function createNewPassword() {
    const password = generatePassword.generate({
        length: 8,
        numbers: true,
        symbols: true,
        uppercase: true,
        lowercase: true,
        strict: true,
    });
    return password;
}

exports.addSubAdmin = async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) {
            return utils.handleError(res, {
                message: "Fill necessary data",
                code: 400,
            });
        }
        const data = req.body;

        const doesEmailExists = await Admin.findOne({ email: data.email });
        if (doesEmailExists)
            return utils.handleError(res, {
                message: "This email address is already registered",
                code: 400,
            });

        if (data.phone_number) {
            const doesPhoneNumberExist = await Admin.findOne({
                phone_number: data.phone_number,
            });
            if (doesPhoneNumberExist)
                return utils.handleError(res, {
                    message: "This phone number is already registered",
                    code: 400,
                });
        }
        const password = await createNewPassword();
        const subadminData = {
            first_name : data.first_name,
            last_name : data.last_name,
            full_name: data.full_name,
            email: data.email,
            role: "sub_admin",
            permissions: data.permissions,
            phone_number: data.phone_number,
            profile_image: data.profile_image,
            password,
            decoded_password: password,
        };

        const newsubadmin = new Admin(subadminData);
        await newsubadmin.save();

        const mailOptions = {
            to: newsubadmin.email,
            subject: `Welcome to ${process.env.APP_NAME}! Your Account Has Been Created as SubAdmin`,
            app_name: process.env.APP_NAME,
            email: newsubadmin.email,
            account_type: "sub admin",
            password: password,
            // adminLink: ADMIN_LINK
        };

        emailer.sendEmail(null, mailOptions, "accountCreated");
        res.json({
            message: "Subadmin added successfully",
            response: newsubadmin,
            code: 200,
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.editSubAdmin = async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) {
            return utils.handleError(res, {
                message: "Fill necessary data",
                code: 400,
            });
        }
        const data = req.body;
        const id = req.params.id;
        const subadmin = await Admin.findById(id);
        if (!subadmin)
            return utils.handleError(res, {
                message: "Subadmin not found",
                code: 404,
            });

        const doesEmailExists = await Admin.findOne({
            email: data.email,
            _id: { $ne: new mongoose.Types.ObjectId(id) },
        });
        if (doesEmailExists)
            return utils.handleError(res, {
                message: "This email address is already registered",
                code: 400,
            });

        if (data.phone_number) {
            const doesPhoneNumberExist = await Admin.findOne({
                phone_number: data.phone_number,
                _id: { $ne: new mongoose.Types.ObjectId(id) },
            });
            if (doesPhoneNumberExist)
                return utils.handleError(res, {
                    message: "This phone number is already registered",
                    code: 400,
                });
        }

        await Admin.findByIdAndUpdate(id, data);

        res.json({ message: "Subadmin edit successfully", code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};

exports.deleteSubadmin = async (req, res) => {
    try {
        const id = req.params.id;

        const subadmin = await Admin.findById(id);
        if (!subadmin)
            return utils.handleError(res, {
                message: "Subadmin not found",
                code: 404,
            });

        await Admin.deleteOne({ _id: id });
        res.json({ message: "Subadmin has been deleted successfully", code: 200 });
    } catch (error) {
        utils.handleError(res, error);
    }
};



exports.getSubadmin = async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;

        // Count the number of sub_admins
        const count = await Admin.aggregate([
            { $match: { role: "sub_admin" } },
            { $group: { _id: null, count: { $sum: 1 } } }
        ]);

        // Fetch the paginated list of sub_admins
        const Subadminlist = await Admin.aggregate([
            { $match: { role: "sub_admin" } },
            { $sort: { createdAt: -1 } },
            { $skip: +offset },
            { $limit: +limit }
        ]);

        res.json({
            message: "Subadmin has been fetched successfully",
            data: Subadminlist,
            count: count[0]?.count || 0,
            code: 200,
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.singleSubadmin = async (req, res) => {
    try {
        const id = req.params.id;
        const subadmindata = await Admin.findById(id);
        res.json({
            message: "Subadmin details has been fetched successfully",
            data: subadmindata,
            code: 200,
        });
    } catch (error) {
        utils.handleError(res, error);
    }
};


exports.activeSelectedSubadmin = async (req, res) => {
    try {
        const { user_ids = [] } = req.body;

        if (user_ids.length == 0) return utils.handleError(res, { message: "Please select at least one user", code: 400 });
        const isAllActive = await Admin.find({ _id: user_ids, status: "active" });

        if (isAllActive.length == user_ids.length) return utils.handleError(res, { message: "All selected users are already active", code: 400 });

        await Admin.updateMany({ _id: user_ids }, { status: "active" });

        res.json({ message: "Selected Subadmin are active", code: 200 })
    } catch (error) {
        utils.handleError(res, error)
    }
}

exports.inactiveSelectedSubadmin = async (req, res) => {
    try {
        const { user_ids = [] } = req.body;

        if (user_ids.length == 0) return utils.handleError(res, { message: "Please select at least one user", code: 400 });
        const isAllInactive = await Admin.find({ _id: user_ids, status: "inactive" });

        if (isAllInactive.length == user_ids.length) return utils.handleError(res, { message: "All selected users are already inactive", code: 400 });

        await Admin.updateMany({ _id: user_ids }, { status: "inactive" });

        res.json({ message: "Selected Subadmin are inactive", code: 200 })
    } catch (error) {
        utils.handleError(res, error)
    }
}

exports.deleteSelectedSubadmin = async (req, res) => {
    try {
        const { user_ids = [] } = req.body;

        if (user_ids.length == 0) return utils.handleError(res, { message: "Please select at least one Subadmin", code: 400 });
        const isAllDeleted = await Admin.find({ _id: user_ids });

        if (!isAllDeleted || isAllDeleted.length <= 0) return utils.handleError(res, { message: "All selected Subadmin are already deleted", code: 400 });

        await Admin.deleteMany({ _id: user_ids });

        res.json({ message: "Selected Subadmin have been deleted", code: 200 })
    } catch (error) {
        utils.handleError(res, error)
    }
}

exports.shareCrendentials = async (req, res) => {
    try {
        const user_id = req.body.id;
        console.log("user_id", user_id)
        const user = await Admin.findOne({ _id: new mongoose.Types.ObjectId(user_id) }, "+decoded_password");
        if (!user) return utils.handleError(res, { message: "Subadmin not found", code: 404 });

        const password = user.decoded_password;
        console.log("===============password", password)
        const mailOptions = {
            to: user.email,
            subject: "Your Account Credentials",
            name: user.full_name,
            email: user.email,
            password: password,
            app_name: process.env.APP_NAME,
            // adminLink: ADMIN_LINK
        }

        emailer.sendEmail(null, mailOptions, "shareCredential");

        res.json({ message: "Credential has been shared successfully", code: 200 })
    } catch (error) {
        utils.handleError(res, error)
    }
}
