const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/user/payment')
const trimRequest = require('trim-request');

router.get(
    '/getpayment',
    trimRequest.all,
    requireAuth,
    controller.getPaymentListing
)

router.get(
    '/paymentDetails/:id',
    trimRequest.all,
    requireAuth,
    controller.paymentDetails
)


router.post(
    '/createPaymentIntentForEnquiry',
    trimRequest.all,
    requireAuth,
    controller.createPaymentIntent
)

router.post(
    '/paynow',
    trimRequest.all,
    requireAuth,
    controller.paynow
)

module.exports = router