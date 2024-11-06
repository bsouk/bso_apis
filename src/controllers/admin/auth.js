const Admin = require("../../models/admin");
const utils = require("../../utils/utils")
const ResetPassword = require("../../models/reset_password")
const uuid = require('uuid');
const emailer = require("../../utils/emailer");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken")


const generateToken = (_id, remember_me) => {
  const expiration = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * (remember_me === true ? process.env.JWT_EXPIRATION_DAY_FOR_REMEMBER_ME : process.env.JWT_EXPIRATION_DAY));

  // returns signed and encrypted token
  return utils.encrypt(
    jwt.sign(
      {
        data: {
          _id,
          type: 'admin'
        },
        exp: expiration
      },
      process.env.JWT_SECRET
    )
  )
}

exports.addAdmin = async (req, res) => {
  try {
    const data = {
      _id: new mongoose.Types.ObjectId("64b29004376e6cb3d3c6e55c"),
      first_name: "John",
      last_name:"Doe",
      email: "bso@mailinator.com",
      password: "Admin@123",
      phone: "9967656543",
      role: "super_admin",
    }

    const item = new Admin(data)
    await item.save();
    return res.status(200).json(item);
  } catch (error) {
    console.log(error);
    utils.handleError(res, error);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, remember_me } = req.body;
    const user = await Admin.findOne({ email: email } , "+password" );
    if (!user) return utils.handleError(res, { message: "Invalid login credentials. Please try again", code: 400 })

    const isPasswordMatch = await utils.checkPassword(password, user)
    console.log("isPasswordMatch" ,isPasswordMatch)
    if (!isPasswordMatch) {
      return utils.handleError(res, { message: "Invalid login credentials. Please try again", code: 400 })
    }

    let userObj = user.toJSON();
    delete userObj.password;

    const token = generateToken(user._id, remember_me);
    res.json({ code: 200, data: { user: userObj, token } })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.forgotPassword = async (req, res) => {

  try {
    const {email , production} = req.body;

    let user = await Admin.findOne({ email } );
    if (!user) return utils.handleError(res, { message: "No account found with the provided information", code: 400 });

    const token = uuid.v4();
    console.log('token: ', token);

    const tokenExpirationDuration = 15 * 60;
    const resetInstance = new ResetPassword({
      email:email,
      token: token,
      used: false,
      exp_time: new Date(Date.now() + tokenExpirationDuration * 1000)
    });

    console.log("resetInstance",resetInstance)

    //Save the resetInstance to the database
    await resetInstance.save();
    const mailOptions = {
      to : user.email,
      subject : "Password Reset Request",
      name: user.full_name,
      email: user.email,
      reset_link: production === false ? `${process.env.LOCAL_ADMIN_URL}reset-password/${token}` : `${process.env.PRODUCTION_ADMIN_URL}reset-password/${token}`
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

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const reset = await ResetPassword.findOne({ token: token });
    console.log('reset: ', reset);

    // Check if the reset token exists and if it's flagged as used
    if (!reset || reset.used) {
      return utils.handleError(res, { message: 'Invalid or expired reset password token', code: 400 })
    }

    // Check if the token has expired
    if (reset.exp_time < new Date()) {
      return utils.handleError(res, { message: 'Reset password token has expired', code: 400 })
    }

    // Find the user associated with the reset token
    const user = await Admin.findOne({ email: reset.email });

    user.password = password;
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

exports.changePassword = async (req, res) => {
  try {
      const { currentPassword, newPassword } = req.body;
      const user_id = req.user._id

      let user = await Admin.findById(user_id, "+password");
      const isPasswordMatch = await utils.checkPassword(currentPassword, user);
      if (!isPasswordMatch) return utils.handleError(res, { message: "Current password is incorrect", code: 400 });

      const newPasswordMatch = await utils.checkPassword(newPassword, user);
      if (newPasswordMatch) return utils.handleError(res, { message: "New password must be different from the current password", code: 400 });

      user.password = newPassword;

      await user.save();

      res.status(200).json({ message: 'Password has been changed successfully' ,code : 200});
  } catch (error) {
      utils.handleError(res, error);
  }
};

