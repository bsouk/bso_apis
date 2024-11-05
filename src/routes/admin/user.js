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
  "/addUser",
  trimRequest.all,
  requireAuth,
  validator(validation.addUser),
  controller.addUser
);

router.get("/users", trimRequest.all, requireAuth, controller.users);

router.get("/user/:id", trimRequest.all, requireAuth, controller.singleUser);

router.patch(
  "/editUser/:id",
  trimRequest.all,
  requireAuth,
  controller.editUser
);

router.delete(
  "/deleteUser/:id",
  trimRequest.all,
  requireAuth,
  controller.deleteUser
)

router.post(
  "/activeSelectedUsers",
  trimRequest.all,
  requireAuth,
  controller.activeSelectedUsers
)


router.post(
  "/inactiveSelectedUsers",
  trimRequest.all,
  requireAuth,
  controller.inactiveSelectedUsers
)


router.delete(
  "/deleteSelectedUsers",
  trimRequest.all,
  requireAuth,
  controller.deleteSelectedUsers
)

router.post(
  "/shareCrendentials",
  trimRequest.all,
  requireAuth,
  controller.shareCrendentials
)

router.post(
  "/bulkUploadUserWithExcel",
  trimRequest.all,
  requireAuth,
  controller.bulkUploadUserWithExcel
)

module.exports = router;
