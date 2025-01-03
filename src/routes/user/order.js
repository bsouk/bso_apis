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

router.get(
    '/orderDetails/:id',
    trimRequest.all,
    requireAuth,
    controller.OrderDetails
)

module.exports = router