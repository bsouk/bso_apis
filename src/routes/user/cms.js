const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/user/cms')
const trimRequest = require('trim-request');

router.get(
    '/getCMS',
    trimRequest.all,
    controller.getCMS
)

router.get(
    '/faq',
    trimRequest.all,
    controller.getFAQ
)

router.post(
    "/contactUs",
    trimRequest.all,
    controller.contactUs
)

router.get(
    "/getContactUsDetails",
    trimRequest.all,
    controller.getContactUsDetails
)

router.get(
    "/getWalkthrough",
    trimRequest.all,
    controller.getWalkthrough
)

module.exports = router