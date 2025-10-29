/**
 * IAP (In-App Purchase) Routes
 * Handles mobile app subscription purchases from Apple App Store and Google Play Store
 */

const express = require('express');
const router = express.Router();
require('../../config/passport');
const passport = require('passport');
const requireAuth = passport.authenticate('jwt', {
    session: false
});
const controller = require('../../controllers/user/iap');
const trimRequest = require('trim-request');

/**
 * @route   POST /user/verifyIAPSubscription
 * @desc    Verify in-app purchase receipt and create subscription
 * @access  Private (requires JWT token)
 * @body    {
 *            plan_id: string,
 *            platform: 'ios' | 'android',
 *            product_id: string,
 *            receipt_data: string (for iOS),
 *            purchase_token: string (for Android)
 *          }
 */
router.post(
    "/verifyIAPSubscription",
    trimRequest.all,
    requireAuth,
    controller.verifyIAPSubscription
);

/**
 * @route   GET /user/getIAPSubscriptions
 * @desc    Get user's IAP subscriptions
 * @access  Private (requires JWT token)
 */
router.get(
    "/getIAPSubscriptions",
    trimRequest.all,
    requireAuth,
    controller.getIAPSubscriptions
);

module.exports = router;




