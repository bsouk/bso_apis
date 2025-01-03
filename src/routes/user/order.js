const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/user/order')
const trimRequest = require('trim-request');

router.get(
    '/getMyOrders',
    trimRequest.all,
    requireAuth,
    controller.myOrder
)

module.exports = router