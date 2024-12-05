const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/brand')
const trimRequest = require('trim-request')

router.post(
    "/addBrand",
    trimRequest.all,
    requireAuth,
    controller.addBrand
);

router.delete(
    "/deleteselectedbrand",
    trimRequest.all,
    requireAuth,
    controller.deleteselectedbrand
);

router.get(
    "/getBrand",
    trimRequest.all,
    requireAuth,
    controller.getBrand
);
router.get(
    "/getBrandbyId/:id",
    trimRequest.all,
    requireAuth,
    controller.getBrandbyId
)
router.put(
    "/editBrand/:id",
    trimRequest.all,
    requireAuth,
    controller.editBrand
);

router.delete(
    "/deleteBrand/:id",
    trimRequest.all,
    requireAuth,
    controller.deleteBrand
);



module.exports = router