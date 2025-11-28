const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/querybids')
const trimRequest = require('trim-request');


// router.get(
//     '/getquery',
//     trimRequest.all,
//     requireAuth,
//     controller.getquery
// )
// router.get(
//     '/getquerydetail/:id',
//     trimRequest.all,
//     requireAuth,
//     controller.getquerydetail
// );


router.get(
    '/getquery',
    trimRequest.all,
    requireAuth,
    controller.getAllEnquiry
)
router.get(
    '/getquerydetail/:id',
    trimRequest.all,
    requireAuth,
    controller.getEnquiryDetails
);

router.put(
    '/addbidexpiration',
    trimRequest.all,
    requireAuth,
    controller.addbidexpiration
);
router.get(
    '/getbidexpiration',
    trimRequest.all,
    requireAuth,
    controller.getbidexpiration
);
router.delete(
    '/deletequery',
    trimRequest.all,
    requireAuth,
    controller.deletequery
);
router.post(
    '/updateAssignedProduct',
    trimRequest.all,
    requireAuth,
    controller.updateAssignedProduct
);
router.post(
    '/unassignVariant',
    trimRequest.all,
    requireAuth,
    controller.unassignVariant
);
// router.post(
//     '/addquote',
//      trimRequest.all,
//      requireAuth,
//     controller.addquote
// );


router.post(
    '/addFinalQuote',
    trimRequest.all,
    requireAuth,
    controller.addFinalQuote
);

router.post(
    '/addAdminQuote',
    trimRequest.all,
    requireAuth,
    controller.addAdminQuote
);


router.get(
    '/getSingleSupplierQuote',
    trimRequest.all,
    requireAuth,
    controller.supplierQuotesById
);

router.get(
    '/getSingleAdminQuote',
    trimRequest.all,
    requireAuth,
    controller.adminQuotesById
);

router.get(
    '/getFinalQuote/:id',
    trimRequest.all,
    requireAuth,
    controller.generateFinalQuote
);

//assign multiple query to supplier
router.post(
    '/assignSelectedQueries',
    trimRequest.all,
    requireAuth,
    controller.assignMultipleQueries
);

//Unassign multiple query to supplier
router.post(
    '/unAssignSelectedQueries',
    trimRequest.all,
    requireAuth,
    controller.unAssignMultipleQueries
);


router.patch(
    '/updateQuantity',
    trimRequest.all,
    requireAuth,
    controller.updateSplitQuantity
);

router.get(
    '/getAssignedSuppliers',
    trimRequest.all,
    requireAuth,
    controller.getAssignedSuppliers
);


router.get(
    '/getProductVariantdata',
    trimRequest.all,
    requireAuth,
    controller.getProductVariantdetails
);

router.patch(
    '/acceptRejectAssignedSupplier',
    trimRequest.all,
    requireAuth,
    controller.acceptRejectAssignedSupplier
);


//New flow
router.patch(
    '/approveRejectEnquiry',
    trimRequest.all,
    requireAuth,
    controller.approveRejectEnquiry
);

router.post(
    '/planChangeRequest',
    trimRequest.all,
    requireAuth,
    controller.planChangeRequest
)

router.get(
    '/getdownloadSingleEnquiryPdfdata/:id',
    trimRequest.all,
    requireAuth,
    controller.getdownloadSingleEnquiryPdfdata
)

// Check if enquiry number already exists (for validation)
router.get(
    '/checkEnquiryNumberExists',
    trimRequest.all,
    requireAuth,
    controller.checkEnquiryNumberExists
)

// Manual enquiry creation by admin
router.post(
    '/createManualEnquiry',
    trimRequest.all,
    requireAuth,
    controller.createManualEnquiry
)

// Get user addresses (for manual enquiry)
router.get(
    '/getUserAddresses/:userId',
    trimRequest.all,
    requireAuth,
    controller.getUserAddresses
)

// Create address for user (by admin)
router.post(
    '/createUserAddress',
    trimRequest.all,
    requireAuth,
    controller.createUserAddress
)

// Send enquiry to suppliers (email + FCM notification)
router.post(
    '/sendEnquiryToSuppliers',
    trimRequest.all,
    requireAuth,
    controller.sendEnquiryToSuppliers
)

// Send enquiry to logistics (email + FCM notification)
router.post(
    '/sendEnquiryToLogistics',
    trimRequest.all,
    requireAuth,
    controller.sendEnquiryToLogistics
)

module.exports = router