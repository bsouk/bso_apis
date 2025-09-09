const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/user/webhook')
const trimRequest = require('trim-request');


router.post(
    "/webhook",
    express.raw({type: 'application/json'}),
    trimRequest.all,
    controller.handleStripeWebhook
)

module.exports = router;
