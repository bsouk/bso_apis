const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/business_category')
const trimRequest = require('trim-request')

router.post(
    "/addBusinessCategory",
    trimRequest.all,
    requireAuth,
    controller.addBusinessCategory
);

router.delete(
    "/deleteselectedBusinessCategory",
    trimRequest.all,
    requireAuth,
    controller.deleteselectedBusinessCategory
);

router.get(
    "/getBusinessCategory",
    trimRequest.all,
    requireAuth,
    controller.getBusinessCategory
);
router.get(
    "/getBusinessCategorybyId/:id",
    trimRequest.all,
    requireAuth,
    controller.getBusinessCategorybyId
)
router.put(
    "/editBusinessCategory/:id",
    trimRequest.all,
    requireAuth,
    controller.editBusinessCategory
);

router.delete(
    "/deleteBusinessCategory/:id",
    trimRequest.all,
    requireAuth,
    controller.deleteBusinessCategory
);


router.patch(
    '/approveRejectBusinessCategory',
    trimRequest.all,
    requireAuth,
    controller.approveRejectBusinessCategory
)

module.exports = router