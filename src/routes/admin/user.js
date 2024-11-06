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

router.get("/getCustomerList", trimRequest.all, requireAuth, controller.getCustomerList);

router.get("/getCustomer/:id", trimRequest.all, requireAuth, controller.getCustomer);

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
)

router.delete(
  "/deleteSelectedCustomer",
  trimRequest.all,
  requireAuth,
  controller.deleteSelectedCustomer
)

router.post(
  "/addResource",
  trimRequest.all,
  requireAuth,
  controller.addResource
)


router.get("/getResourceList", trimRequest.all, requireAuth, controller.getResourceList);

router.get("/getResource/:id", trimRequest.all, requireAuth, controller.getResource);

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
)

router.delete(
  "/deleteSelectedResource",
  trimRequest.all,
  requireAuth,
  controller.deleteSelectedResource
)

module.exports = router;
