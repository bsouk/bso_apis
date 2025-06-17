const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})
const controller = require('../../controllers/user/subscription')
const trimRequest = require('trim-request');


router.get(
    "/getAllPlan",
    trimRequest.all,
    controller.getAllPlan
)

router.get(
    "/getSinglePlan/:id",
    trimRequest.all,
    controller.getSinglePlan
)

router.post(
    "/generateClientSecretKey",
    trimRequest.all,
    requireAuth,
    controller.genrateClientScretKey
)
router.post(
    "/generateClientSecretKeymultiple",
    trimRequest.all,
    requireAuth,
    controller.generateClientSecretKeymultiple
)

router.post(
    "/createAppClientSecretKey",
    trimRequest.all,
    requireAuth,
    controller.createAppClientScretKey
)


router.post(
    "/createSubscription",
    trimRequest.all,
    requireAuth,
    controller.createSubscription
)


router.post(
    "/createFreeSubscription",
    trimRequest.all,
    requireAuth,
    controller.createFreeSubscription
)


router.post(
    "/cancelSubscription",
    trimRequest.all,
    requireAuth,
    controller.cancelSubscription
)

module.exports = router
