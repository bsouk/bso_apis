const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/auth')
const trimRequest = require('trim-request')

router.post(
    "/addAdmin",
    trimRequest.all,
    controller.addAdmin
)

router.post(
    "/login",
    trimRequest.all,
    controller.login
)

router.post(
    "/forgotPassword",
    trimRequest.all,
    controller.forgotPassword
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

router.get(
    "/getMyProfile",
    trimRequest.all,
    requireAuth,
    controller.getMyProfile
)


module.exports = router
