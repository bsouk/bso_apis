const express = require('express');
const router = express.Router();
require('../../config/passport');
const passport = require('passport');
const requireAuth = passport.authenticate('jwt', { session: false });
const trimRequest = require('trim-request');

const controller = require('../../controllers/user/billingManagement');

// Get all billing methods (saved cards)
router.get(
  '/getBillingMethods',
  trimRequest.all,
  requireAuth,
  controller.getBillingMethods
);

// Get default billing method
router.get(
  '/getDefaultBillingMethod',
  trimRequest.all,
  requireAuth,
  controller.getDefaultBillingMethod
);

// Add new billing method (card)
router.post(
  '/addBillingMethod',
  trimRequest.all,
  requireAuth,
  controller.addBillingMethod
);

// Set default billing method
router.put(
  '/setDefaultBillingMethod/:id',
  trimRequest.all,
  requireAuth,
  controller.setDefaultBillingMethod
);

// Update billing method (billing details)
router.put(
  '/updateBillingMethod/:id',
  trimRequest.all,
  requireAuth,
  controller.updateBillingMethod
);

// Delete billing method
router.delete(
  '/deleteBillingMethod/:id',
  trimRequest.all,
  requireAuth,
  controller.deleteBillingMethod
);

module.exports = router;

