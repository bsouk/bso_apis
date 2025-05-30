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
    '/createPaymentIntentForEnquirylogisticsupplier',
    trimRequest.all,
    requireAuth,
    controller.createPaymentIntentlogisticsupplier
)

router.post(
    '/createPaymentIntentlogisticbuyer',
    trimRequest.all,
    requireAuth,
    controller.createPaymentIntentlogisticbuyer
)
router.post(
    '/createAppPaymentIntent',
    trimRequest.all,
    requireAuth,
    controller.appPaymentIntent
)

router.post(
    '/paynow',
    trimRequest.all,
    requireAuth,
    controller.paynow
)

router.post(
    '/logisticpaynow',
    trimRequest.all,
    requireAuth,
    controller.logisticpaynow
)
router.post(
    '/checkoutOfflinePayment',
    trimRequest.all,
    requireAuth,
    controller.checkoutOfflinePayment
)


router.post(
    '/createTeamLimitIntent',
    trimRequest.all,
    requireAuth,
    controller.createTeamLimitIntent
)


router.post(
    '/createAppTeamLimitIntent',
    trimRequest.all,
    requireAuth,
    controller.createAppTeamLimitIntent
)
router.post("/uploadReceipt", trimRequest.all, requireAuth, controller.uploadReceipt)

router.post(
    '/uploadBankReceipt',
    trimRequest.all,
    requireAuth,
    controller.uploadReceipt
)


module.exports = router