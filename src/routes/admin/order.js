const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/order')
const trimRequest = require('trim-request');

router.get(
    '/getOrders',
    trimRequest.all,
    requireAuth,
    controller.getOrders
)

router.get(
    '/orderDetails/:id',
    trimRequest.all,
    requireAuth,
    controller.OrderDetails
)

router.delete(
    '/deleteSelectedOrder',
    trimRequest.all,
    requireAuth,
    controller.deleteMultipleOrder
);

module.exports = router