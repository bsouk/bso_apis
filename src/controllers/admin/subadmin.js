const Admin = require("../../models/admin");
const utils = require("../../utils/utils");
const ResetPassword = require("../../models/reset_password");
const uuid = require("uuid");
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const generatePassword = require("generate-password");
const { logSuccess, logFailure } = require("../../utils/logger");

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

        // Validate required fields
        if (!data.first_name || !data.last_name || !data.email) {
            return utils.handleError(res, {
                message: "First name, last name, and email are required",
                code: 400,
            });
        }

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
        
        // Use custom password if provided, otherwise generate random password
        const password = data.password && data.password.trim() !== '' 
            ? data.password.trim() 
            : await createNewPassword();
        
        // Construct full_name from first_name and last_name if not provided
        const fullName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim();
        
        const subadminData = {
            first_name: data.first_name,
            last_name: data.last_name,
            full_name: fullName,
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

        // Send welcome email to the newly created SUB-ADMIN with credentials
        console.log(`📧 Preparing to send welcome email to sub-admin: ${newsubadmin.email}`);
        console.log(`📧 Sub-admin details - Name: ${newsubadmin.first_name} ${newsubadmin.last_name}, Email: ${newsubadmin.email}`);
        
        try {
            const mailOptions = {
                to: newsubadmin.email,
                subject: `Welcome to ${process.env.APP_NAME || 'BSO Services'}! Your Account Has Been Created as SubAdmin`,
                name: newsubadmin.first_name || newsubadmin.full_name || 'Sub-Admin',
                app_name: process.env.APP_NAME || 'BSO Services',
                email: newsubadmin.email,
                account_type: "sub admin",
                password: password,
                website_url: process.env.PRODUCTION_ADMIN_URL || process.env.LOCAL_ADMIN_URL,
                adminLink: process.env.PRODUCTION_ADMIN_URL || process.env.LOCAL_ADMIN_URL,
                login_url: process.env.PRODUCTION_ADMIN_URL || process.env.LOCAL_ADMIN_URL,
            };

            console.log(`📧 Mail options prepared:`, {
                to: mailOptions.to,
                subject: mailOptions.subject,
                name: mailOptions.name,
                account_type: mailOptions.account_type
            });

            await emailer.sendEmail(null, mailOptions, "accountCreated");
            console.log(`✅ Welcome email sent successfully to sub-admin ${newsubadmin.email} with credentials`);
        } catch (emailError) {
            console.error('❌ Error sending welcome email to sub-admin:', emailError);
            console.error('❌ Error details:', {
                message: emailError?.message,
                stack: emailError?.stack,
                email: newsubadmin.email
            });
            // Don't fail the entire operation if email fails
            // The sub-admin was already created successfully
        }

        // Audit log: sub-admin created
        try {
            await logSuccess(
                req.user,
                "sub_admin_management",
                "create",
                {
                    related_id: newsubadmin._id,
                    related_collection: "admins",
                    details: {
                        subadmin_id: newsubadmin._id,
                        subadmin_email: newsubadmin.email,
                        subadmin_name: `${newsubadmin.first_name || ""} ${newsubadmin.last_name || ""}`.trim(),
                        phone_number: newsubadmin.phone_number,
                        permissions: newsubadmin.permissions,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log subadmin create:", logError?.message);
        }

        res.json({
            message: "Subadmin added successfully",
            response: newsubadmin,
            code: 200,
        });
    } catch (error) {
        try {
            await logFailure(
                req.user,
                "sub_admin_management",
                "create",
                error,
                {
                    metadata: {
                        email: req.body?.email,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log subadmin create error:", logError?.message);
        }

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
        
        // Fetch the subadmin to update
        const subadmin = await Admin.findById(id);
        if (!subadmin) {
            return utils.handleError(res, {
                message: "Subadmin not found",
                code: 404,
            });
        }

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

        // Capture previous state for audit
        const previousData = {
            first_name: subadmin.first_name,
            last_name: subadmin.last_name,
            full_name: subadmin.full_name,
            email: subadmin.email,
            phone_number: subadmin.phone_number,
            profile_image: subadmin.profile_image,
            permissions: subadmin.permissions,
        };

        // Update fields
        subadmin.first_name = data.first_name || subadmin.first_name;
        subadmin.last_name = data.last_name || subadmin.last_name;
        subadmin.full_name = `${data.first_name || subadmin.first_name} ${data.last_name || subadmin.last_name}`;
        subadmin.email = data.email || subadmin.email;
        subadmin.phone_number = data.phone_number !== undefined ? data.phone_number : subadmin.phone_number;
        subadmin.profile_image = data.profile_image !== undefined ? data.profile_image : subadmin.profile_image;
        subadmin.permissions = data.permissions !== undefined ? data.permissions : subadmin.permissions;

        // Handle password update if provided
        if (data.password && data.password.trim() !== '') {
            // Set password - will be hashed automatically by the model's pre-save hook
            subadmin.password = data.password.trim();
            subadmin.decoded_password = data.password.trim();
        }

        // Save to trigger password hashing if password was updated
        await subadmin.save();
        
        // Note: No email is sent on edit as per requirement (confidential)

        // Audit log: sub-admin updated (including permissions change)
        try {
            const hasPermissionChanged = JSON.stringify(previousData.permissions) !== JSON.stringify(subadmin.permissions);
            await logSuccess(
                req.user,
                "sub_admin_management",
                "update",
                {
                    related_id: subadmin._id,
                    related_collection: "admins",
                    details: {
                        subadmin_id: subadmin._id,
                        subadmin_email: subadmin.email,
                        previous: previousData,
                        current: {
                            first_name: subadmin.first_name,
                            last_name: subadmin.last_name,
                            full_name: subadmin.full_name,
                            email: subadmin.email,
                            phone_number: subadmin.phone_number,
                            profile_image: subadmin.profile_image,
                            permissions: subadmin.permissions,
                        },
                        permissions_changed: hasPermissionChanged,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log subadmin update:", logError?.message);
        }

        res.json({ message: "Subadmin edit successfully", code: 200 });
    } catch (error) {
        try {
            await logFailure(
                req.user,
                "sub_admin_management",
                "update",
                error,
                {
                    metadata: {
                        subadmin_id: req.params?.id,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log subadmin update error:", logError?.message);
        }

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

        // Log admin activity for audit trail
        await logSuccess(
            req.user,
            "sub_admin_management",
            "delete",
            {
                related_id: subadmin._id,
                related_collection: "admins",
                details: {
                    deleted_admin_id: subadmin._id,
                    deleted_admin_email: subadmin.email,
                    deleted_admin_name: `${subadmin.first_name || ""} ${subadmin.last_name || ""}`.trim(),
                    deleted_admin_role: subadmin.role,
                },
            },
            req
        );

        res.json({ message: "Subadmin has been deleted successfully", code: 200 });
    } catch (error) {
        // Make sure failure to log does not break delete flow
        try {
            await logFailure(
                req.user,
                "sub_admin_management",
                "delete",
                error,
                {
                    metadata: {
                        subadmin_id: req.params?.id,
                    },
                },
                req
            );
        } catch (logError) {
            // Intentionally ignore logging errors
            console.error("Failed to log subadmin delete error:", logError?.message);
        }

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

        // Audit log: sub-admins activated
        try {
            await logSuccess(
                req.user,
                "sub_admin_management",
                "update",
                {
                    details: {
                        action: "activate",
                        affected_ids: user_ids,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log subadmin activate:", logError?.message);
        }

        res.json({ message: "Selected Subadmin are active", code: 200 })
    } catch (error) {
        try {
            await logFailure(
                req.user,
                "sub_admin_management",
                "update",
                error,
                {
                    metadata: {
                        action: "activate",
                        user_ids: req.body?.user_ids || [],
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log subadmin activate error:", logError?.message);
        }

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

        // Audit log: sub-admins deactivated
        try {
            await logSuccess(
                req.user,
                "sub_admin_management",
                "update",
                {
                    details: {
                        action: "deactivate",
                        affected_ids: user_ids,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log subadmin deactivate:", logError?.message);
        }

        res.json({ message: "Selected Subadmin are inactive", code: 200 })
    } catch (error) {
        try {
            await logFailure(
                req.user,
                "sub_admin_management",
                "update",
                error,
                {
                    metadata: {
                        action: "deactivate",
                        user_ids: req.body?.user_ids || [],
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log subadmin deactivate error:", logError?.message);
        }

        utils.handleError(res, error)
    }
}

exports.deleteSelectedSubadmin = async (req, res) => {
    try {
        const { user_ids = [] } = req.body;

        if (user_ids.length == 0) return utils.handleError(res, { message: "Please select at least one Subadmin", code: 400 });
        const subadmins = await Admin.find({ _id: user_ids });

        if (!subadmins || subadmins.length <= 0) return utils.handleError(res, { message: "All selected Subadmin are already deleted", code: 400 });

        await Admin.deleteMany({ _id: user_ids });

        // Log bulk delete activity
        try {
            await logSuccess(
                req.user,
                "sub_admin_management",
                "bulk_delete",
                {
                    details: {
                        deleted_count: subadmins.length,
                        deleted_ids: subadmins.map((s) => s._id),
                        deleted_emails: subadmins.map((s) => s.email),
                    },
                    metadata: {
                        requested_ids: user_ids,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log bulk subadmin delete:", logError?.message);
        }

        res.json({ message: "Selected Subadmin have been deleted", code: 200 })
    } catch (error) {
        try {
            await logFailure(
                req.user,
                "sub_admin_management",
                "bulk_delete",
                error,
                {
                    metadata: {
                        user_ids: req.body?.user_ids || [],
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log bulk subadmin delete error:", logError?.message);
        }

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

        // Audit log: credentials shared
        try {
            await logSuccess(
                req.user,
                "sub_admin_management",
                "send",
                {
                    related_id: user._id,
                    related_collection: "admins",
                    details: {
                        subadmin_id: user._id,
                        subadmin_email: user.email,
                        subadmin_name: user.full_name,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log share credentials:", logError?.message);
        }

        res.json({ message: "Credential has been shared successfully", code: 200 })
    } catch (error) {
        try {
            await logFailure(
                req.user,
                "sub_admin_management",
                "send",
                error,
                {
                    metadata: {
                        subadmin_id: req.body?.id,
                    },
                },
                req
            );
        } catch (logError) {
            console.error("Failed to log share credentials error:", logError?.message);
        }

        utils.handleError(res, error)
    }
}
