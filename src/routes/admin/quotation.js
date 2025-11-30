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

// Admin Quote Management Routes
router.get(
    '/getQuotesList',
    trimRequest.all,
    requireAuth,
    controller.getQuotesList
)

router.post(
    '/createSupplierQuote',
    trimRequest.all,
    requireAuth,
    controller.createSupplierQuote
)

router.post(
    '/createLogisticsQuote',
    trimRequest.all,
    requireAuth,
    controller.createLogisticsQuote
)

router.delete(
    '/deleteQuote',
    trimRequest.all,
    requireAuth,
    controller.deleteQuote
)

router.get(
    '/getEnquiriesForSupplier/:id',
    trimRequest.all,
    requireAuth,
    controller.getEnquiriesForSupplier
)

router.get(
    '/getEnquiriesForLogistics/:id',
    trimRequest.all,
    requireAuth,
    controller.getEnquiriesForLogistics
)

router.get(
    '/getEnquiryDetails/:id',
    trimRequest.all,
    requireAuth,
    controller.getEnquiryDetails
)

router.get(
    '/getSuppliersList',
    trimRequest.all,
    requireAuth,
    controller.getSuppliersList
)

router.get(
    '/getLogisticsList',
    trimRequest.all,
    requireAuth,
    controller.getLogisticsList
)

router.get(
    '/getSupplierAddresses/:id',
    trimRequest.all,
    requireAuth,
    controller.getSupplierAddresses
)

router.get(
    '/getLogisticsEnquiryDetail/:id',
    trimRequest.all,
    requireAuth,
    controller.getLogisticsEnquiryDetail
)

router.get(
    '/getQuoteDetails/:id',
    trimRequest.all,
    requireAuth,
    controller.getQuoteDetails
)

router.put(
    '/updateQuote',
    trimRequest.all,
    requireAuth,
    controller.updateQuote
)

// Send final quote to buyer
router.post(
    '/sendFinalQuoteToBuyer',
    trimRequest.all,
    requireAuth,
    controller.sendFinalQuoteToBuyer
)

// Get enquiry activity logs
router.get(
    '/getEnquiryActivityLogs/:id',
    trimRequest.all,
    requireAuth,
    controller.getEnquiryActivityLogs
)

module.exports = router