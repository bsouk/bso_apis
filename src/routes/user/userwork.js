const express = require("express");
const router = express.Router();
require("../../config/passport");
const passport = require("passport");
const requireAuth = passport.authenticate("jwt", {
    session: false,
});

const controller = require("../../controllers/user/userwork");
const trimRequest = require("trim-request");

const validation = require("../../middleware/adminValidation");
const validator = require("../../middleware/validator");

//buyer routes

//add buyer route
router.post(
    "/addNewBuyer",
    trimRequest.all,
    requireAuth,
    controller.createBuyerProfile
);

router.get(
    "/buyerdetails/:id",
    trimRequest.all,
    requireAuth,
    controller.getBuyerDetails
)

router.post(
    "/addCompanyData",
    trimRequest.all,
    requireAuth,
    controller.addCompanyDetails
)

module.exports = router;
