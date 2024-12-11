const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
    session: false
})

const controller = require('../../controllers/admin/querybids')
const trimRequest = require('trim-request');



router.get(
    '/getquery',
    trimRequest.all,
    requireAuth,
    controller.getquery
)
router.get(
    '/getquerydetail/:id',
     trimRequest.all,
     requireAuth,
    controller.getquerydetail
);
router.put(
    '/addbidexpiration',
     trimRequest.all,
     requireAuth,
    controller.addbidexpiration
);
router.get(
    '/getbidexpiration/:id',
     trimRequest.all,
     requireAuth,
    controller.getbidexpiration
);


module.exports = router