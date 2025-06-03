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

router.get(
    '/getQuotationAssignedSupplier',
    trimRequest.all,
    requireAuth,
    controller.getQuotationAssignedSupplier
)

router.patch(
    '/acceptRejectSupplierQuote',
    trimRequest.all,
    requireAuth,
    controller.acceptRejectSupplierQuote
)

router.get(
    '/getFinalQuotationList',
    trimRequest.all,
    requireAuth,
    controller.getFinalQuotationList
)
router.post(
    '/addAddress',
    trimRequest.all,
    requireAuth,
    controller.addAddress
)
router.get(
    '/getAddress',
    trimRequest.all,
    requireAuth,
    controller.getAddressList
)
router.patch(
    "/editAddress/:id",
    trimRequest.all,
    requireAuth,
    controller.editAddress
)
router.get(
    "/getAddressbyid/:id",
    trimRequest.all,
    requireAuth,
    controller.getAddressbyid
)
router.get(
    "/getEnquiryItem",
    trimRequest.all,
    requireAuth,
    controller.getEnquiryItem
)
router.get(
    "/getCountries",
    trimRequest.all,
    controller.getCountry
)
router.get(
    "/getStates/:country",
    trimRequest.all,
    controller.getStates
)
router.post(
    '/addenquiryquotes',
    trimRequest.all,
    requireAuth,
    controller.addenquiryquotes
)



router.post(
    '/addAdminquotes',
    trimRequest.all,
    requireAuth,
    controller.addAdminquotes
)

router.get(
    '/getAdminQuotes/:id',
    trimRequest.all,
    requireAuth,
    controller.getSingleAdminQuotes
)

module.exports = router