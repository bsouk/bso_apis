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
    '/getjobs/:id',
    trimRequest.all,
    requireAuth,
    controller.getCompanyPostedJobs
)
router.get(
    '/getJobData/:id',
    trimRequest.all,
    controller.getJobData
)


router.get(
    "/getIndustryType",
    trimRequest.all,
    requireAuth,
    controller.getIndustryTypes
);

router.get(
    "/getSubIndustryType/:id",
    trimRequest.all,
    requireAuth,
    controller.getIndustrySubTypes
);


router.get(
    '/getCompanyListing',
    trimRequest.all,
    requireAuth,
    controller.getCompanyListing
)


router.delete(
    '/deleteJob',
    trimRequest.all,
    requireAuth,
    controller.deleteJobs
)


router.patch(
    '/editJob/:id',
    trimRequest.all,
    requireAuth,
    controller.editJob
)

router.get(
    '/getApplicantDetails/:id',
    trimRequest.all,
    requireAuth,
    controller.getApllicantDetails
)

module.exports = router