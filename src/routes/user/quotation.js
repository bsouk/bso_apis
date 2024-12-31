const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})
const controller = require('../../controllers/user/quotation')
const trimRequest = require('trim-request');

router.get(
    '/getQuotationData/:id',
    trimRequest.all,
    requireAuth,
    controller.getQuotationDetails
)

router.get(
    '/getQuotationList',
    trimRequest.all,
    requireAuth,
    controller.getQuotationList
)

router.patch(
    '/approveRejectQuotation',
    trimRequest.all,
    requireAuth,
    controller.approveRejectQuotation
)


router.patch(
    '/addQuotationNotes',
    trimRequest.all,
    requireAuth,
    controller.addQuotationNotes
)

router.post(
    '/addSupplierQuotationQuote',
    trimRequest.all,
    requireAuth,
    controller.addSupplierQuotationQuery
);

module.exports = router