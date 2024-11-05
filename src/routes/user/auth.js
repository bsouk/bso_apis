// const validate = require('../controllers/auth.validate')
const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/user/auth')
const trimRequest = require('trim-request')

router.post(
    "/checkEmailExist",
    trimRequest.all,
    controller.checkEmailExist,
)

router.post(
    "/checkPhoneNumberExist",
    trimRequest.all,
    controller.checkPhoneNumberExist,
)

router.post(
    "/sendOtpForSignup",
    trimRequest.all,
    controller.sendOtpForSignup,
)

router.post(
    "/verifyOtpForSignup",
    trimRequest.all,
    controller.verifyOtpForSignup,
)



router.post(
    "/verifyOTP",
    trimRequest.all,
    controller.verifyOTP,
)

router.post(
    '/login',
    trimRequest.all,
    controller.login
)

router.post(
    "/forgetPassword",
    trimRequest.all,
    controller.forgetPassword
)

router.post(
    "/resetPassword",
    trimRequest.all,
    controller.resetPassword
)

router.post(
    "/changePassword",
    trimRequest.all,
    requireAuth,
    controller.changePassword
)


module.exports = router