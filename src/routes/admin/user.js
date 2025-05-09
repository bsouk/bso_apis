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

router.post(
  "/uploadMedia",
  trimRequest.all,
  requireAuth,
  controller.uploadMedia
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
  "/deleteResource/:id",
  trimRequest.all,
  requireAuth,
  controller.deleteResource
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

//change Profile status
router.post(
  "/changeProfileStatus/:id",
  trimRequest.all,
  requireAuth,
  controller.changeStatus
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

module.exports = router;
