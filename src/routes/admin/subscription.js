const express = require('express');
const router = express.Router();
require('../../config/passport');
const passport = require('passport');
const requireAuth = passport.authenticate('jwt', {
    session: false
});

const controller = require('../../controllers/admin/subscription');
const trimRequest = require('trim-request');

router.get(
    '/searchUsers',
    trimRequest.all,
    requireAuth,
    controller.searchUsers
);

router.get(
    '/getPlans',
    trimRequest.all,
    requireAuth,
    controller.getPlans
);

router.get(
    '/getSubscriptions',
    trimRequest.all,
    requireAuth,
    controller.listSubscriptions
);

router.post(
    '/createSubscription',
    trimRequest.all,
    requireAuth,
    controller.createSubscription
);

router.get(
    '/getSubscription/:id',
    trimRequest.all,
    requireAuth,
    controller.getSubscriptionDetail
);

router.patch(
    '/updateSubscription/:id',
    trimRequest.all,
    requireAuth,
    controller.updateSubscription
);

router.patch(
    '/updateSubscriptionStatus/:id',
    trimRequest.all,
    requireAuth,
    controller.updateSubscriptionStatus
);

router.delete(
    '/deleteSubscription/:id',
    trimRequest.all,
    requireAuth,
    controller.deleteSubscription
);

module.exports = router;




