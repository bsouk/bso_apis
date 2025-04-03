const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/plan')
const trimRequest = require('trim-request');

router.post(
    '/createPlan',
    trimRequest.all,
    requireAuth,
    controller.createPlan
)

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


router.delete(
    "/deletePlan/:id",
    trimRequest.all,
    requireAuth,
    controller.deletePlan
)

module.exports = router;
