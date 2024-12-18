const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})
const controller = require('../../controllers/user/quotation')
const trimRequest = require('trim-request');

router.get(
    '/getQuotationData/:id',
    trimRequest.all,
    requireAuth,
    controller.getQuotationDetails
)

module.exports = router