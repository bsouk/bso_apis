const User = require("../../models/user");
const utils = require("../../utils/utils");
const UserAccess = require("../../models/userAccess");
const ResetPassword = require("../../models/reset_password");
const OTP = require("../../models/otp");
const EmailOrPhoneVerifiedStatus = require("../../models/email_or_phone_verified_status");

const emailer = require("../../utils/emailer");
const jwt = require("jsonwebtoken");
const uuid = require("uuid");

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

exports.sendOtpForSignup = async (req, res) => {
  try {
    const { email, signup_by, phone_number_code, phone_number } = req.body;
    if (!["email", "phone_number"].includes(signup_by))
      return utils.handleError(res, {
        message: "Invalid sign up by value",
        code: 400,
      });
    const otp = utils.generateOTP();

    if (signup_by == "email") {
      const otpData = await EmailOrPhoneVerifiedStatus.findOne({
        email: email,
      });
      const data = {
        email: email,
        otp,
        exp_time: new Date(Date.now() + 1000 * 60 * 10),
        is_used: false,
        verified: false,
      };
      if (otpData) {
        await EmailOrPhoneVerifiedStatus.findByIdAndUpdate(otpData._id, data);
      } else {
        const saveOTP = new EmailOrPhoneVerifiedStatus(data);
        await saveOTP.save();
      }

      const mailOptions = {
        to: email,
        subject: "Verify Your Email Address",
        app_name: process.env.APP_NAME,
        otp: otp,
      };
      emailer.sendEmail(null, mailOptions, "verifyEmail");
      res.json({ code: 200, message: "OTP sent successfully" });
    } else {
      const otpData = await EmailOrPhoneVerifiedStatus.findOne({
        phone_number: phone_number,
      });
      const data = {
        phone_number: phone_number,
        otp,
        exp_time: new Date(Date.now() + 1000 * 60 * 10),
        is_used: false,
        verified: false,
      };
      if (otpData) {
        await EmailOrPhoneVerifiedStatus.findByIdAndUpdate(otpData._id, data);
      } else {
        const saveOTP = new EmailOrPhoneVerifiedStatus(data);
        await saveOTP.save();
      }

      res.json({ code: 200, message: "OTP sent successfully", otp: otp });
    }
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.verifyOtpForSignup = async (req, res) => {
  try {
    const { otp, email, signup_by, phone_number } = req.body;
    if (!["email", "phone_number"].includes(signup_by))
      return utils.handleError(res, {
        message: "Invalid sign up by value",
        code: 400,
      });

    if (signup_by === "email") {
      const condition = {
        otp,
        email: email,
      };

      const otpData = await EmailOrPhoneVerifiedStatus.findOne(condition);

      if (!otpData || otpData.otp !== otp)
        return utils.handleError(res, {
          message: "The OTP you entered is incorrect. Please try again",
          code: 400,
        });
      if (otpData.verified == true)
        return res.json({ code: 200, message: "Otp verified successfully" });

      if (otpData.exp_time < new Date())
        return utils.handleError(res, {
          message: "The OTP you entered has expired. Please request a new one",
          code: 400,
        });

      otpData.verified = true;
      otpData.is_used = true;
      await otpData.save();

      res.json({ code: 200, message: "Otp verified successfully" });
    } else {
      const condition = {
        otp,
        phone_number: phone_number,
      };

      const otpData = await EmailOrPhoneVerifiedStatus.findOne(condition);

      if (!otpData || otpData.otp !== otp)
        return utils.handleError(res, {
          message: "The OTP you entered is incorrect. Please try again",
          code: 400,
        });
      if (otpData.verified == true)
        return res.json({ code: 200, message: "Otp verified successfully" });

      if (otpData.exp_time < new Date())
        return utils.handleError(res, {
          message: "The OTP you entered has expired. Please request a new one",
          code: 400,
        });

      otpData.verified = true;
      otpData.is_used = true;
      await otpData.save();

      res.json({ code: 200, message: "Otp verified successfully" });
    }
  } catch (error) {
    utils.handleError(res, error);
  }
};

// exports.signup = async (req, res) => {
//   try {
//     const data = req.body;
//     if (!["email", "phone_number"].includes(data.signup_by)) return utils.handleError(res, { message: "Invalid sign up by value", code: 400 });

//     if (data.signup_by == "email") {
//       const doesEmailExists = await emailer.emailExists(data.email);
//       if (doesEmailExists) return utils.handleError(res, { message: "", code: 400 })
//     }

//     if (!user) return utils.handleError(res, { message: "Invalid login credentials. Please try again", code: 400, });

//     const isPasswordMatch = await utils.checkPassword(data.password, user);
//     if (!isPasswordMatch) return utils.handleError(res, { message: "Invalid login credentials. Please try again", code: 400 });

//     if (user.status !== "active") return utils.handleError(res, { message: "Your account has been deactivated", code: 400, });
//     // if (user.is_deleted === true) return utils.handleError(res, { message: "Your account has been deleted", code: 400 });

//     const token = await saveUserAccessAndReturnToken(req, user);
//     user.last_login = new Date();

//     await user.save();
//     user = user.toJSON();

//     delete user.password;
//     res.status(200).json({ code: 200, data: { user: user, token: token } });
//   } catch (error) {
//     utils.handleError(res, error);
//   }
// };

async function checkEmailVerified(email) {
  try {
    const otpData = await EmailOrPhoneVerifiedStatus.findOne({ email });
    if (!otpData || otpData.verified !== true) return false;
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function checkPhoneNumberVerified(phone_number) {
  try {
    const otpData = await EmailOrPhoneVerifiedStatus.findOne({ phone_number });
    if (!otpData || otpData.verified !== true) return false;
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}


exports.signup = async (req, res) => {
  try {
    const data = req.body;
    console.log("req.body is ", data)
    if (!["email", "phone_number"].includes(data.signup_by))
      return utils.handleError(res, {
        message: "Invalid sign up by value",
        code: 400,
      });

    if (data.signup_by == "email") {
      const doesEmailExists = await emailer.emailExists(data.email);
      if (doesEmailExists)
        return utils.handleError(res, {
          message: "This email is already registered with us",
          code: 400,
        });
    }

    if (data.signup_by == "phone_number") {
      const doesPhoneNumberExist = await emailer.checkMobileExists(
        data.phone_number
      );
      if (doesPhoneNumberExist)
        return utils.handleError(res, {
          message: "This phone number is already registered with us",
          code: 400,
        });
    }
    if (data.signup_by == "phone_number") {
      const isPhoneNumberVerified = await checkPhoneNumberVerified(
        data.phone_number
      );

      if (!isPhoneNumberVerified)
        return utils.handleError(res, {
          message: "Phone number is verified yet",
          code: 400,
        });
    }

    if (data.signup_by == "email") {
      const isEmailVerified = await checkEmailVerified(data.email);
      console.log("email is ", isEmailVerified)

      if (!isEmailVerified)
        return utils.handleError(res, {
          message: "Email is verified yet",
          code: 400,
        });
    }

    let user = await User(data);
    const token = await saveUserAccessAndReturnToken(req, user);

    await user.save();
    // await utils.createCustomer(user)
    //user = user.toJSON();
    delete user.password;

    const notificaitonData = {
      receiver_id: user._id,
      title: "Account Created",
      description: `Your account has been created successfully. Welcome to Heii!`,
      finnish_title: "Tili luotu",
      finnish_description: `Tilisi luominen onnistui. Tervetuloa Heiille!`,
      type: "account_creation",
      related_to: user._id,
    };
    console.log(notificaitonData);

    await utils.sendPushNotification(notificaitonData);

    //const notification = new Notification(notificaitonData);

    //await notification.save();

    res.status(200).json({ code: 200, data: { user: user, token: token } });
  } catch (error) {
    utils.handleError(res, error);
  }
};


exports.login = async (req, res) => {
  try {
    const { user_credentials, password } = req.body;
    console.log(req.body)

    let user = await User.findOne(
      { $or: [{ email: user_credentials }, { phone_number: user_credentials }] },
      "+password"
    );

    console.log("user is ", user)

    if (Object.keys(user).length === 0)
      return utils.handleError(res, {
        message: "Invalid login credentials. Please try again",
        code: 400,
      });

    const isPasswordMatch = await utils.checkPassword(password, user);
    if (!isPasswordMatch)
      return utils.handleError(res, {
        message: "Invalid login credentials. Please try again",
        code: 400,
      });

    if (user.status !== "active")
      return utils.handleError(res, {
        message: "Your account has been deactivated",
        code: 400,
      });
    // if (user.is_deleted === true) return utils.handleError(res, { message: "Your account has been deleted", code: 400 });

    const token = await saveUserAccessAndReturnToken(req, user);
    user.last_login = new Date();

    await user.save();

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",  
      maxAge: 1000 * 60 * 60 * 24 * process.env.JWT_EXPIRATION_DAY,
    });

    user = user.toJSON();

    delete user.password;
    res.status(200).json({ code: 200, data: { user: user, token: token } });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const otp = utils.generateOTP();

    const user = await User.findOne({ email });
    if (!user)
      return utils.handleError(res, {
        message: "No account found with the provided email",
        code: 400,
      });

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
      email: email,
    };

    const otpData = await OTP.findOne(condition);
    console.log(otpData)

    if (!otpData || otpData.otp !== otp)
      return utils.handleError(res, {
        message: "The OTP you entered is incorrect. Please try again",
        code: 400,
      });
    if (otpData.is_used)
      return utils.handleError(res, {
        message: "This OTP has already been used. Please request a new one",
        code: 400,
      });
    if (otpData.exp_time < new Date())
      return utils.handleError(res, {
        message: "The OTP you entered has expired. Please request a new one",
        code: 400,
      });

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
    if (!otpData)
      return utils.handleError(res, {
        message: "The OTP you entered is incorrect. Please try again",
        code: 400,
      });
    if (!otpData.verified)
      return utils.handleError(res, {
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
    if (!isPasswordMatch)
      return utils.handleError(res, {
        message: "Current password is incorrect",
        code: 400,
      });

    const newPasswordMatch = await utils.checkPassword(newPassword, user);
    if (newPasswordMatch)
      return utils.handleError(res, {
        message: "New password must be different from the current password",
        code: 400,
      });

    user.password = newPassword;
    user.decoded_password = newPassword;

    await user.save();

    res.json({
      message: "Password has been changed successfully",
      code: 200,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};
