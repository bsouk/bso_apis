const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/user/brand')
const trimRequest = require('trim-request')

router.get(
    "/getBrand",
    trimRequest.all,
    controller.getBrand
);

router.post(
    "/addBrand",
    trimRequest.all,
    requireAuth,
    controller.addBrand
);

module.exports = router