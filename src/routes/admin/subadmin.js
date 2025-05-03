const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/subadmin')
const trimRequest = require('trim-request');

router.post(
    "/addSubAdmin",
    trimRequest.all,
    requireAuth,
    controller.addSubAdmin
);

router.patch(
    "/editSubAdmin/:id",
    trimRequest.all,
    requireAuth,
    controller.editSubAdmin
);

router.get(
    "/SubAdmin/:id",
    trimRequest.all,
    requireAuth,
    controller.singleSubadmin
);

router.delete(
    "/deleteSubAdmin/:id",
    trimRequest.all,
    requireAuth,
    controller.deleteSubadmin
);

router.get(
    "/SubAdmin",
    trimRequest.all,
    requireAuth,
    controller.getSubadmin
);

router.post(
    "/activeSelectedSubadmin",
    trimRequest.all,
    requireAuth,
    controller.activeSelectedSubadmin
)


router.post(
    "/inactiveSelectedSubadmin",
    trimRequest.all,
    requireAuth,
    controller.inactiveSelectedSubadmin
)


router.delete(
    "/deleteSelectedSubadmin",
    trimRequest.all,
    requireAuth,
    controller.deleteSelectedSubadmin
)

router.post(
    "/shareCrendentials",
    trimRequest.all,
    requireAuth,
    controller.shareCrendentials
)

module.exports = router;
