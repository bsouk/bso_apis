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
    '/getbidexpiration',
     trimRequest.all,
     requireAuth,
    controller.getbidexpiration
);
router.delete(
    '/deletequery',
     trimRequest.all,
     requireAuth,
    controller.deletequery
);
router.post(
    '/updateAssignedProduct',
     trimRequest.all,
     requireAuth,
    controller.updateAssignedProduct
);
router.post(
    '/unassignVariant',
     trimRequest.all,
     requireAuth,
    controller.unassignVariant
);


module.exports = router