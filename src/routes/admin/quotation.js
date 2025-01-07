const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/quotation')
const trimRequest = require('trim-request');

router.get(
    '/getQuotationList',
    trimRequest.all,
    requireAuth,
    controller.getQuotationList
);

router.delete(
    '/deleteSelectedQuotation',
    trimRequest.all,
    requireAuth,
    controller.deleteMultipleQuotation
);

router.get(
    '/getQuotationData/:id',
    trimRequest.all,
    requireAuth,
    controller.getQuotationDetails
)

router.post(
    '/addAdminQuotationQuote',
    trimRequest.all,
    requireAuth,
    controller.addAdminQuotationQuery
);

router.post(
    '/addFinalQuotationQuote',
    trimRequest.all,
    requireAuth,
    controller.addFinalQuotationList
);

router.get(
    '/selectLogisticsList',
    trimRequest.all,
    requireAuth,
    controller.selectLogistics
);

router.post(
    '/assignQuotationLogistics',
    trimRequest.all,
    requireAuth,
    controller.assignLogistics
);

router.post(
    '/acceptedRejectedLogistics',
    trimRequest.all,
    requireAuth,
    controller.approveRejectLogistics
);

router.patch(
    '/addAdminQuotationNotes',
    trimRequest.all,
    requireAuth,
    controller.addAdminQuotationNotes
)

router.get(
    '/getVersionHistory',
    trimRequest.all,
    requireAuth,
    controller.getVersionHistory
)

module.exports = router