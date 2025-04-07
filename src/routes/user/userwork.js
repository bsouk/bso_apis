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

router.post(
    "/addNewBuyer",
    trimRequest.all,
    requireAuth,
    controller.createBuyerProfile
);

router.patch(
    "/editProfile",
    trimRequest.all,
    requireAuth,
    controller.editProfile
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

router.patch(
    "/editCompanyData/:id",
    trimRequest.all,
    requireAuth,
    controller.editCompanyDetails
)

router.post(
    "/addNewSupplier",
    trimRequest.all,
    requireAuth,
    controller.createSupplierProfile
);


router.post(
    "/addAddress",
    trimRequest.all,
    requireAuth,
    controller.addAddress
);

router.patch(
    "/editAddress/:id",
    trimRequest.all,
    requireAuth,
    controller.editAddress
)

router.get(
    "/getAddressList",
    trimRequest.all,
    requireAuth,
    controller.getAddressList
)

//user scpecific address list
router.get(
    "/getUserAddressList",
    trimRequest.all,
    requireAuth,
    controller.getUserAddressList
)

router.post(
    "/changeDefaultAddress",
    trimRequest.all,
    requireAuth,
    controller.changeDefaultAddress
)

//delete address
router.delete(
    "/deleteAddress/:id",
    trimRequest.all,
    requireAuth,
    controller.deleteAddress
)

router.post(
    "/addLogistics",
    trimRequest.all,
    requireAuth,
    controller.createLogisticsProfile
);

router.post(
    "/uploadMedia",
    trimRequest.all,
    requireAuth,
    controller.uploadMedia
);

router.get(
    "/getProfileDetails",
    trimRequest.all,
    requireAuth,
    controller.getProfileDetails
);

router.post(
    "/addResource",
    trimRequest.all,
    requireAuth,
    controller.createResourceProfile
);

router.post(
    "/removeMedia",
    trimRequest.all,
    requireAuth,
    controller.deleteMedia
);

// router.post(
//     "/addQuery",
//     trimRequest.all,
//     requireAuth,
//     controller.addQuery
// );

// router.get(
//     "/getMyQueries",
//     trimRequest.all,
//     requireAuth,
//     controller.getMyQueries
// );

//Home Api
router.get(
    "/getBuyerHome",
    trimRequest.all,
    requireAuth,
    controller.getHomeData
);


// router.get(
//     "/getQueryDetails/:id",
//     trimRequest.all,
//     requireAuth,
//     controller.getQueryById
// );


//edit query
router.patch(
    "/editQuery/:id",
    trimRequest.all,
    requireAuth,
    controller.editQuery
);

router.delete(
    "/deleteQuery/:id",
    trimRequest.all,
    requireAuth,
    controller.deleteQuery
);

//add supplier quote
router.post(
    '/addSupplierQuote',
    trimRequest.all,
    requireAuth,
    controller.addSupplierQuote
);

router.post(
    "/addUnit",
    trimRequest.all,
    requireAuth,
    controller.addQuantityUnit
);

router.get(
    "/getUnit",
    trimRequest.all,
    requireAuth,
    controller.getQuantitiesUnits
);


router.post(
    "/addIndustryType",
    trimRequest.all,
    requireAuth,
    controller.addIndustryTypes
);

router.get(
    "/getIndustryType",
    trimRequest.all,
    requireAuth,
    controller.getIndustryTypes
);


//changes
router.post(
    "/addQuery",
    trimRequest.all,
    requireAuth,
    controller.createEnquiry
);

router.get(
    "/getMyQueries",
    trimRequest.all,
    requireAuth,
    controller.getMyEnquiry
);
router.get(
    "/getAllQueries",
    trimRequest.all,
    controller.getAllEnquiry
);
router.get(
    "/getQueryDetails/:id",
    trimRequest.all,
    requireAuth,
    controller.getEnquiryDetails
);


router.get(
    "/getContinent",
    trimRequest.all,
    controller.getContinent
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

router.get(
    "/getCities",
    trimRequest.all,
    controller.getCities
)
router.get(
    "/homepageenquiry",
    trimRequest.all,
    controller.homepageenquiry
)
router.post(
    "/addTeamMember",
    trimRequest.all,
    requireAuth,
    controller.AddTeamMember
)
router.post(
    "/Addusermember",
    trimRequest.all,
    requireAuth,
    controller.usermember
)
router.get(
    "/GetTeamMember",
    trimRequest.all,
    requireAuth,
    controller.GetTeamMember
)
router.post(
    "/TeamMemberDetail/:Id",
    trimRequest.all,
    requireAuth,
    controller.editTeamMember
)
router.get(
    "/deleteTeamMember/:Id",
    trimRequest.all,
    requireAuth,
    controller.deleteTeamMember
)
router.get(
    "/searchenquiry",
    trimRequest.all,
    requireAuth,
    controller.searchenquiry
)
router.post(
    "/addenquiryquotes",
    trimRequest.all,
    requireAuth,
    controller.addenquiryquotes
)

module.exports = router;
