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
    "/createSubscription",
    trimRequest.all,
    requireAuth,
    controller.createSubscription
)

module.exports = router
