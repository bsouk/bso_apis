const express = require('express');
const router = express.Router();
require('../../config/passport');
const passport = require('passport');
const requireAuth = passport.authenticate('jwt', {
  session: false,
});
const trimRequest = require('trim-request');

const controller = require('../../controllers/admin/currency');

router.post(
  '/currency',
  trimRequest.all,
  requireAuth,
  controller.createCurrency
);

router.get(
  '/currency',
  trimRequest.all,
  requireAuth,
  controller.getCurrencies
);

router.get(
  '/currency/:id',
  trimRequest.all,
  requireAuth,
  controller.getCurrency
);

router.patch(
  '/currency/:id',
  trimRequest.all,
  requireAuth,
  controller.updateCurrency
);

router.delete(
  '/currency/:id',
  trimRequest.all,
  requireAuth,
  controller.deleteCurrency
);

router.patch(
  '/currency/:id/default',
  trimRequest.all,
  requireAuth,
  controller.setDefaultCurrency
);

module.exports = router;

