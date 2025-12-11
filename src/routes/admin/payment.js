const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/payment')
const paymentManagementController = require('../../controllers/admin/paymentManagement')
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
    '/updatepaymentstatus',
    trimRequest.all,
    requireAuth,
    controller.updatepaymentstatus
)

// Payment Management Routes
router.get(
    '/searchUsers',
    trimRequest.all,
    requireAuth,
    paymentManagementController.searchUsers
)

router.get(
    '/getUserPayments/:user_id',
    trimRequest.all,
    requireAuth,
    paymentManagementController.getUserPayments
)

router.get(
    '/getUserPaymentDetails/:user_id/:payment_id',
    trimRequest.all,
    requireAuth,
    paymentManagementController.getUserPaymentDetails
)

router.delete(
    '/deleteUserPayment/:user_id/:payment_id',
    trimRequest.all,
    requireAuth,
    paymentManagementController.deleteUserPayment
)

router.post(
    '/restoreUserPayment/:user_id/:payment_id',
    trimRequest.all,
    requireAuth,
    paymentManagementController.restoreUserPayment
)

router.get(
    '/getUserPaymentStatistics/:user_id',
    trimRequest.all,
    requireAuth,
    paymentManagementController.getUserPaymentStatistics
)

module.exports = router