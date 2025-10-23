const express = require("express");
const router = express.Router();
require("../../config/passport");
const passport = require("passport");
const requireAuth = passport.authenticate("jwt", {
  session: false,
});

const controller = require("../../controllers/admin/user");
const trimRequest = require("trim-request");

const validation = require("../../middleware/adminValidation");
const validator = require("../../middleware/validator");

// Test email endpoint
router.get("/test-email", requireAuth, controller.testEmail);

router.post(
  "/uploadMedia",
  trimRequest.all,
  requireAuth,
  // controller.uploadMedia
  controller.uploadMediaToBucket
);
router.post(
  "/addCustomer",
  trimRequest.all,
  requireAuth,
  controller.addCustomer
);

router.get(
  "/getCustomerList",
  trimRequest.all,
  requireAuth,
  controller.getCustomerList
);

router.get(
  "/getCustomer/:id",
  trimRequest.all,
  requireAuth,
  controller.getCustomer
);

router.patch(
  "/editCustomer/:id",
  trimRequest.all,
  requireAuth,
  controller.editCustomer
);

router.delete(
  "/deleteCustomer/:id",
  trimRequest.all,
  requireAuth,
  controller.deleteCustomer
);

router.delete(
  "/deleteSelectedCustomer",
  trimRequest.all,
  requireAuth,
  controller.deleteSelectedCustomer
);

// Trash functionality routes
router.patch(
  "/trashCustomer/:id",
  trimRequest.all,
  requireAuth,
  controller.trashCustomer
);

router.patch(
  "/restoreCustomer/:id",
  trimRequest.all,
  requireAuth,
  controller.restoreCustomer
);

router.delete(
  "/deleteCustomerPermanently/:id",
  trimRequest.all,
  requireAuth,
  controller.deleteCustomerPermanently
);

router.get(
  "/getTrashedCustomerList",
  trimRequest.all,
  requireAuth,
  controller.getTrashedCustomerList
);

router.post(
  "/addResource",
  trimRequest.all,
  requireAuth,
  controller.addResource
);

router.get(
  "/getResourceList",
  trimRequest.all,
  requireAuth,
  controller.getResourceList
);
router.get(
  "/getRecruiterList",
  trimRequest.all,
  requireAuth,
  controller.getRecruiterList
);
router.get(
  "/getResource/:id",
  trimRequest.all,
  requireAuth,
  controller.getResource
);

router.patch(
  "/editResource/:id",
  trimRequest.all,
  requireAuth,
  controller.editResource
);

router.delete(
  "/deleteRecruiter",
  trimRequest.all,
  requireAuth,
  controller.deleteRecruiter
);

router.delete(
  "/deleteSelectedResource",
  trimRequest.all,
  requireAuth,
  controller.deleteSelectedResource
);

// addSupplier
router.post(
  "/addSupplier",
  trimRequest.all,
  requireAuth,
  controller.addSupplier
);

router.patch(
  "/editSupplier/:id",
  trimRequest.all,
  requireAuth,
  controller.editSupplier
);
// deleteSupplier
router.delete(
  "/deleteSupplier/:id",
  trimRequest.all,
  requireAuth,
  controller.deleteSupplier
);

// getSupplierList

router.get(
  "/getSupplierList",
  trimRequest.all,
  requireAuth,
  controller.getSupplierList
);

router.get(
  "/getSupplier/:id",
  trimRequest.all,
  requireAuth,
  controller.getSupplier
);

// LOgistics Users routes

//add logisticts user
router.post(
  "/addLogistics",
  trimRequest.all,
  requireAuth,
  controller.addLogisticsUser
);

//edit Logistics user

router.patch(
  "/editLogistics/:id",
  trimRequest.all,
  requireAuth,
  controller.editLogisticsUser
);

// get LOgistics User LIst
router.get(
  "/getLogisticsList",
  trimRequest.all,
  requireAuth,
  controller.getLogisticsUserList
);

// get Logistics User By Id
router.get(
  "/getLogistics/:id",
  trimRequest.all,
  requireAuth,
  controller.getLogisticsUserById
);

// delete Logistics User BY id
router.delete(
  "/deleteLogistics/:id",
  trimRequest.all,
  requireAuth,
  controller.deleteLogisticsUser
);

//delete Multiple LOgistics Users
router.delete(
  "/deleteSelectedLogistics",
  trimRequest.all,
  requireAuth,
  controller.deleteSelectedLogisticsUser
);

//Approve profile by admin
router.post(
  "/approveProfile/:id",
  trimRequest.all,
  requireAuth,
  controller.ApproveUser
);

//Reject profile by admin
router.post(
  "/rejectProfile/:id",
  trimRequest.all,
  requireAuth,
  controller.RejectUser
);

router.post(
  "/sendProfileReply",
  trimRequest.all,
  requireAuth,
  controller.sendProfileReply
)

//change Profile status (Legacy)
router.post(
  "/changeProfileStatus/:id",
  trimRequest.all,
  requireAuth,
  controller.changeStatus
);

// Role-based status change endpoints
router.post(
  "/changeSupplierStatus/:id",
  trimRequest.all,
  requireAuth,
  controller.changeSupplierStatus
);

router.post(
  "/changeLogisticsStatus/:id",
  trimRequest.all,
  requireAuth,
  controller.changeLogisticsStatus
);

router.post(
  "/changeRecruiterStatus/:id",
  trimRequest.all,
  requireAuth,
  controller.changeRecruiterStatus
);

//change profile availability status
router.post(
  "/changeAvailabilityStatus/:id",
  trimRequest.all,
  requireAuth,
  controller.changeAvailabilityStatus
);



//get supplier list for form use
router.get(
  "/getSupplierData",
  trimRequest.all,
  requireAuth,
  controller.supplierListForm
);

router.post(
  "/shareUserCredential",
  trimRequest.all,
  requireAuth,
  controller.shareUserCrendentials
);

router.delete(
  "/deleteSelectedSupplier",
  trimRequest.all,
  requireAuth,
  controller.deleteSelectedSupplier
);


router.get(
  "/getUnit",
  trimRequest.all,
  requireAuth,
  controller.getQuantitiesUnits
);


router.post(
  "/editAddCommission",
  trimRequest.all,
  requireAuth,
  controller.editAddCommision
);


router.get(
  "/getCommission",
  trimRequest.all,
  requireAuth,
  controller.getCommission
);

router.get(
  "/getSupplierQuotes/:id",
  trimRequest.all,
  controller.getAllSupplierQuotes
)

router.get(
  "/getQuotedata/:id",
  trimRequest.all,
  controller.getQuotesdata
)
router.post(
  "/acceptsupplierEnquiry",
  trimRequest.all,
  controller.acceptsupplierEnquiry
)
router.get(
  "/finalquotes/:enquiry_id",
  trimRequest.all,
  controller.finalquotes
)
router.put("/update-submit-query", trimRequest.all, controller.updateSubmitQuery)
router.get(
  "/getlogisticquote/:id",
  trimRequest.all,
  controller.getlogisticquote
)
router.get("/viewLogisticQuote/:id", trimRequest.all, controller.viewLogisticQuote)
router.put("/acceptLogisticQuote/:id", trimRequest.all, controller.acceptLogisticQuote)


router.post(
  "/addAdminFCMDevice",
  requireAuth,
  trimRequest.all,
  controller.addFCMDevice
)

router.post(
  "/deleteAdminFCMDevice",
  requireAuth,
  trimRequest.all,
  controller.deleteFCMDevice
)



router.delete(
  "/deleteAdminQuote",
  requireAuth,
  trimRequest.all,
  controller.deleteAdminQuote
)

router.patch(
  "/editAdminQuote",
  requireAuth,
  trimRequest.all,
  controller.editAdminQuote
)


router.post(
  "/generateResumePDF",
  requireAuth,
  trimRequest.all,
  controller.generateResumePDF
)
router.get(
  "/ratingandreview/:id",
  requireAuth,
  trimRequest.all,
  controller.ratingandreview
)

// ================================
// SUPPLIER TRASH ROUTES
// ================================
router.patch(
  "/trashSupplier/:supplierId",
  trimRequest.all,
  requireAuth,
  controller.trashSupplier
);

router.patch(
  "/restoreSupplier/:supplierId",
  trimRequest.all,
  requireAuth,
  controller.restoreSupplier
);

router.delete(
  "/deleteSupplierPermanently/:supplierId",
  trimRequest.all,
  requireAuth,
  controller.deleteSupplierPermanently
);

router.get(
  "/getTrashedSupplierList",
  trimRequest.all,
  requireAuth,
  controller.getTrashedSupplierList
);

router.patch(
  "/switchSupplierToCustomer/:supplierId",
  trimRequest.all,
  requireAuth,
  controller.switchSupplierToCustomer
);

router.patch(
  "/switchSupplierToLogistic/:supplierId",
  trimRequest.all,
  requireAuth,
  controller.switchSupplierToLogistic
);

router.patch(
  "/switchSupplierToRecruiter/:supplierId",
  trimRequest.all,
  requireAuth,
  controller.switchSupplierToRecruiter
);

router.patch(
  "/switchSupplierToResource/:supplierId",
  trimRequest.all,
  requireAuth,
  controller.switchSupplierToResource
);

// ================================
// LOGISTICS TRASH ROUTES
// ================================
router.patch(
  "/trashLogistics/:logisticsId",
  trimRequest.all,
  requireAuth,
  controller.trashLogistics
);

router.patch(
  "/restoreLogistics/:logisticsId",
  trimRequest.all,
  requireAuth,
  controller.restoreLogistics
);

router.get(
  "/getTrashedLogisticsList",
  trimRequest.all,
  requireAuth,
  controller.getTrashedLogisticsList
);

router.delete(
  "/deleteLogisticsPermanently/:logisticsId",
  trimRequest.all,
  requireAuth,
  controller.deleteLogisticsPermanently
);

router.patch(
  "/switchLogisticsToCustomer/:logisticsId",
  trimRequest.all,
  requireAuth,
  controller.switchLogisticsToCustomer
);

router.patch(
  "/switchLogisticsToSupplier/:logisticsId",
  trimRequest.all,
  requireAuth,
  controller.switchLogisticsToSupplier
);

router.patch(
  "/switchLogisticsToRecruiter/:logisticsId",
  trimRequest.all,
  requireAuth,
  controller.switchLogisticsToRecruiter
);

router.patch(
  "/listLogisticsProfile/:logisticsId",
  trimRequest.all,
  requireAuth,
  controller.listLogisticsProfile
);

// ================================
// RESOURCE TRASH ROUTES
// ================================
router.patch(
  "/trashResource/:resourceId",
  trimRequest.all,
  requireAuth,
  controller.trashResource
);

router.patch(
  "/restoreResource/:resourceId",
  trimRequest.all,
  requireAuth,
  controller.restoreResource
);

router.get(
  "/getTrashedResourceList",
  trimRequest.all,
  requireAuth,
  controller.getTrashedResourceList
);

// ================================
// RECRUITER TRASH ROUTES
// ================================
router.patch(
  "/trashRecruiter/:recruiterId",
  trimRequest.all,
  requireAuth,
  controller.trashRecruiter
);

router.patch(
  "/restoreRecruiter/:recruiterId",
  trimRequest.all,
  requireAuth,
  controller.restoreRecruiter
);

router.get(
  "/getTrashedRecruiterList",
  trimRequest.all,
  requireAuth,
  controller.getTrashedRecruiterList
);

router.delete(
  "/deleteRecruiterPermanently/:recruiterId",
  trimRequest.all,
  requireAuth,
  controller.deleteRecruiterPermanently
);

router.patch(
  "/switchRecruiterToCustomer/:recruiterId",
  trimRequest.all,
  requireAuth,
  controller.switchRecruiterToCustomer
);

router.patch(
  "/switchRecruiterToSupplier/:recruiterId",
  trimRequest.all,
  requireAuth,
  controller.switchRecruiterToSupplier
);

router.patch(
  "/switchRecruiterToLogistic/:recruiterId",
  trimRequest.all,
  requireAuth,
  controller.switchRecruiterToLogistic
);

router.patch(
  "/listRecruiterProfile/:recruiterId",
  trimRequest.all,
  requireAuth,
  controller.listRecruiterProfile
);

// ================================
// ADD RECRUITER ROUTE
// ================================
router.post(
  "/addRecruiter",
  trimRequest.all,
  requireAuth,
  controller.addRecruiter
);

// ================================
// UNITS MANAGEMENT ROUTES
// ================================

// Get all units with pagination and search
router.get(
  "/getUnits",
  trimRequest.all,
  requireAuth,
  controller.getUnits
);

// Get single unit by ID
router.get(
  "/getUnit/:id",
  trimRequest.all,
  requireAuth,
  controller.getUnitById
);

// Add new unit
router.post(
  "/addUnit",
  trimRequest.all,
  requireAuth,
  controller.addUnit
);

// Update unit
router.patch(
  "/updateUnit/:id",
  trimRequest.all,
  requireAuth,
  controller.updateUnit
);

// Delete single unit
router.delete(
  "/deleteUnit/:id",
  trimRequest.all,
  requireAuth,
  controller.deleteUnit
);

// Delete multiple units
router.post(
  "/deleteMultipleUnits",
  trimRequest.all,
  requireAuth,
  controller.deleteMultipleUnits
);

// Toggle unit status (better semantic route)
router.patch(
  "/unit/status/:id",
  trimRequest.all,
  requireAuth,
  controller.toggleUnitStatus
);

module.exports = router;
