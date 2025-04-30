const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/job')
const trimRequest = require('trim-request');

router.post(
    '/createJob',
    trimRequest.all,
    requireAuth,
    controller.createJob
)

router.get(
    '/getJob',
    trimRequest.all,
    controller.getJobs
)

router.get(
    '/getJobData/:id',
    trimRequest.all,
    controller.getJobData
)

module.exports = router