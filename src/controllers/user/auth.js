const User = require("../../models/user");
const utils = require("../../utils/utils");
const UserAccess = require("../../models/userAccess");
const ResetPassword = require("../../models/reset_password")
const OTP = require("../../models/otp");
const emailer = require("../../utils/emailer");
const jwt = require("jsonwebtoken");
const uuid = require('uuid');


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

exports.checkPhoneNumberExist = async (req, res) => {
  try {
    const { phone_number } = req.body;
    const doesPhoneNumberExist = await emailer.checkMobileExists(phone_number);
    res.json({ data: doesPhoneNumberExist, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.checkEmailExist = async (req, res) => {
  try {
    const { email } = req.body;
    const doesEmailExists = await emailer.emailExists(email);
    res.json({ data: doesEmailExists, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.login = async (req, res) => {
  try {
    const data = req.body;
    let user = await User.findOne({ email: data.email }, "+password");
    if (!user) return utils.handleError(res, { message: "Invalid login credentials. Please try again", code: 400, });

    const isPasswordMatch = await utils.checkPassword(data.password, user);
    if (!isPasswordMatch) return utils.handleError(res, { message: "Invalid login credentials. Please try again", code: 400 });

    if (user.status !== "active") return utils.handleError(res, { message: "Your account has been deactivated", code: 400, });
    // if (user.is_deleted === true) return utils.handleError(res, { message: "Your account has been deleted", code: 400 });

    const token = await saveUserAccessAndReturnToken(req, user);
    user.last_login = new Date();

    await user.save();
    user = user.toJSON();

    delete user.password;
    res.status(200).json({ code: 200, data: { user: user, token: token } });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.socialLogin = async (req, res) => {
  try {
    const data = req.body;
    const userExists = await User.findOne({ $or: [{ email: data.email }, { social_id: data.social_id, social_type: data.social_type }] });

    if (!userExists) {
      const userData = {
        email: data.email,
        social_id: data.social_id,
        social_type: data.social_type,
        first_name: data.first_name,
        last_name: data.last_name,
        user_type: data.user_type,
        password: "12345678",
        step_completed: 1,
      };

      let user = new User(userData);
      await user.save();

      const token = await saveUserAccessAndReturnToken(req, user);
      user = user.toJSON();
      delete user.password;
      res.status(200).json({ code: 200, data: { user: user, token: token } });
    } else {
      if (userExists.status !== "active")
        return utils.handleError(res, {
          message: "Your account has been deactivated",
          code: 400,
        });
      if (userExists.is_deleted === true)
        return utils.handleError(res, {
          message: "Your account has been deleted",
          code: 400,
        });

      userExists.last_sign_in = new Date();

      const token = await saveUserAccessAndReturnToken(req, userExists);
      const user = userExists.toJSON();
      delete user.password;
      res.status(200).json({ code: 200, data: { user: user, token: token } });
    }
  } catch (error) {
    utils.handleError(res, error);
  }
};


exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const otp = utils.generateOTP();

    const user = await User.findOne({ email });
    if (!user) return utils.handleError(res, { message: "No account found with the provided email", code: 400 });

    const otpData = await OTP.findOne({ email: user.email });

    const data = {
      email: user.email,
      otp,
      exp_time: new Date(Date.now() + 1000 * 60 * 10),
      is_used: false,
      verified: false,
    };
    if (otpData) {
      await OTP.findByIdAndUpdate(otpData._id, data);
    } else {
      const saveOTP = new OTP(data);
      await saveOTP.save();
    }

    const mailOptions = {
      to: user.email,
      subject: "Your OTP for Password Reset",
      otp: otp,
      name: user.full_name,
    };
    emailer.sendEmail(null, mailOptions, "forgotPassword");
    res.json({ code: 200, message: "OTP sent successfully" });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { otp, email } = req.body;

    const condition = {
      otp,
      email: email
    };

    const otpData = await OTP.findOne(condition);

    if (!otpData || otpData.otp !== otp) return utils.handleError(res, { message: "The OTP you entered is incorrect. Please try again", code: 400 });
    if (otpData.is_used) return utils.handleError(res, { message: "This OTP has already been used. Please request a new one", code: 400 });
    if (otpData.exp_time < new Date()) return utils.handleError(res, { message: "The OTP you entered has expired. Please request a new one", code: 400 });

    otpData.verified = true;
    otpData.is_used = true;
    await otpData.save();

    res.json({ code: 200, message: "Otp verified successfully" });

  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const user = await User.findOne({ email: email });

    const otpData = await OTP.findOne({ email, otp });
    if (!otpData) return utils.handleError(res, { message: "The OTP you entered is incorrect. Please try again", code: 400 });
    if (!otpData.verified) return utils.handleError(res, {
      message: "The OTP you entered has not verified",
      code: 400,
    });

    user.password = password;
    user.decoded_password = password;
    await user.save();

    res.json({
      message: "Your password has been reset successfully",
      code: 200,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user_id = req.user._id;

    let user = await User.findById(user_id, "+password");
    const isPasswordMatch = await utils.checkPassword(currentPassword, user);
    if (!isPasswordMatch) return utils.handleError(res, { message: "Current password is incorrect", code: 400 });

    const newPasswordMatch = await utils.checkPassword(newPassword, user);
    if (newPasswordMatch) return utils.handleError(res, { message: "New password must be different from the current password", code: 400 });

    user.password = newPassword;
    user.decoded_password = newPassword;

    await user.save();

    res.json({
      message: "Password has been changed successfully",
      code: 200
    });

  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.forgotPasswordForWeb = async (req, res) => {

  try {
    const { email, production } = req.body;

    let user = await User.findOne({ email });
    if (!user) return utils.handleError(res, { message: "No account found with the entered email", code: 400 });

    const token = uuid.v4();

    const tokenExpirationDuration = 15 * 60;
    const resetInstance = new ResetPassword({
      email: email,
      token: token,
      used: false,
      exp_time: new Date(Date.now() + tokenExpirationDuration * 1000)
    });

    await resetInstance.save();
    const mailOptions = {
      to: user.email,
      subject: "Password Reset Request",
      name: user.full_name,
      email: user.email,
      reset_link: production === false ? `${process.env.LOCAL_FRONTEND_URL}resetPassword/${token}` : `${process.env.PRODUCTION_FRONTEND_URL}resetPassword/${token}`
    }

    emailer.sendEmail(null, mailOptions, "forgotPasswordWithLink");

    return res.json({
      code: 200,
      message: "Reset link has been sent to your email",
    });

  } catch (err) {
    console.log(err)
    utils.handleError(res, err)
  }

}


exports.resetPasswordForWeb = async (req, res) => {
  try {
    const { token, password } = req.body;
    const reset = await ResetPassword.findOne({ token: token });

    if (!reset || reset.used) {
      return utils.handleError(res, { message: 'Invalid or expired reset password token', code: 400 })
    }

    // Check if the token has expired
    if (reset.exp_time < new Date()) {
      return utils.handleError(res, { message: 'Reset password token has expired', code: 400 })
    }

    // Find the user associated with the reset token
    const user = await User.findOne({ email: reset.email });

    user.password = password;
    user.decoded_password = password;
    await user.save();

    // Reset the token flag and time
    reset.used = true;
    reset.time = undefined;
    await reset.save();

    res.json({ message: 'Your password has been successfully reset', code: 200 });
  } catch (err) {
    console.error(err);
    utils.handleError(res, err)
  }
};