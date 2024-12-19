const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/quotation')
const trimRequest = require('trim-request');

router.get(
    '/getQuotationList',
    trimRequest.all,
    requireAuth,
    controller.getQuotationList
);

router.delete(
    '/deleteSelectedQuotation',
    trimRequest.all,
    requireAuth,
    controller.deleteMultipleQuotation
);


module.exports = router