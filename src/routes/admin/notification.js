const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/notification')
const trimRequest = require('trim-request')


router.post(
    "/sendNotification",
    trimRequest.all,
    requireAuth,
    controller.sendNotification
)

router.get(
    "/getNotificationList",
    trimRequest.all,
    requireAuth,
    controller.getNotificationList
)

router.get(
    "/getReceivedNotificationList",
    trimRequest.all,
    requireAuth,
    controller.getReceivedNotificationList
)

router.get(
    "/getAllUsers",
    trimRequest.all,
    requireAuth,
    controller.getAllUsers
)

module.exports = router
