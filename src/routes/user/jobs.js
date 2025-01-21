const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/user/jobs')
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
    requireAuth,
    controller.getJobs
)

router.get(
    '/getJobData/:id',
    trimRequest.all,
    requireAuth,
    controller.getJobData
)

router.post(
    '/createJobApplication',
    trimRequest.all,
    requireAuth,
    controller.createJobApplication
)

router.get(
    '/getAppliedJob',
    trimRequest.all,
    requireAuth,
    controller.getappliedJobs
)

router.patch(
    '/acceptApplication',
    trimRequest.all,
    requireAuth,
    controller.acceptApplication
)

module.exports = router