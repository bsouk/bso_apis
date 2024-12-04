const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/ads')
const trimRequest = require('trim-request')

router.post(
    "/addAds",
    trimRequest.all,
    requireAuth,
    controller.addAds
);


module.exports = router