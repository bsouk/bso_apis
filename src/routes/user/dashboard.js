const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/user/dashboard')
const trimRequest = require('trim-request');

router.get(
    '/getDashboardData',
    trimRequest.all,
    requireAuth,
    controller.getDashboardData
)

module.exports = router