const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/reports')
const trimRequest = require('trim-request');

router.post(
    "/downloadReport",
    trimRequest.all,
    requireAuth,
    controller.downloadReport
);

module.exports = router;
