const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/dashboard')
const trimRequest = require('trim-request');

router.get(
    '/getdashboardChartData',
    trimRequest.all,
    controller.dashboardChartData
)

module.exports = router