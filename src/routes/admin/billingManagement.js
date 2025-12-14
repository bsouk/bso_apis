const express = require('express');
const router = express.Router();
require('../../config/passport');
const passport = require('passport');
const requireAuth = passport.authenticate('jwt', { session: false });
const trimRequest = require('trim-request');
const adminAuth = require('../../middleware/adminAuth');

const controller = require('../../controllers/admin/billingManagement');

// Search users for billing management
router.get(
  '/searchUsersForBilling',
  trimRequest.all,
  requireAuth,
  adminAuth,
  controller.searchUsersForBilling
);

// Get user's billing methods
router.get(
  '/getUserBillingMethods/:userId',
  trimRequest.all,
  requireAuth,
  adminAuth,
  controller.getUserBillingMethods
);

// Add billing method for user
router.post(
  '/addUserBillingMethod/:userId',
  trimRequest.all,
  requireAuth,
  adminAuth,
  controller.addUserBillingMethod
);

// Set default billing method for user
router.put(
  '/setUserDefaultBillingMethod/:userId/:methodId',
  trimRequest.all,
  requireAuth,
  adminAuth,
  controller.setUserDefaultBillingMethod
);

// Update billing method for user
router.put(
  '/updateUserBillingMethod/:userId/:methodId',
  trimRequest.all,
  requireAuth,
  adminAuth,
  controller.updateUserBillingMethod
);

// Delete billing method for user
router.delete(
  '/deleteUserBillingMethod/:userId/:methodId',
  trimRequest.all,
  requireAuth,
  adminAuth,
  controller.deleteUserBillingMethod
);

module.exports = router;

