const express = require('express');
const router = express.Router();
const passport = require('passport');
const trimRequest = require('trim-request');

const controller = require('../../controllers/admin/passwordForgotRequest');

const requireAuth = passport.authenticate('jwt', { session: false });

router.post(
  '/forgotPasswordRequest',
  trimRequest.all,
  controller.forgotPasswordRequest
);

router.get(
  '/passwordForgotRequests',
  trimRequest.all,
  requireAuth,
  controller.getPasswordForgotRequests
);

router.get(
  '/passwordForgotRequests/:id',
  trimRequest.all,
  requireAuth,
  controller.getPasswordForgotRequestById
);

router.patch(
  '/passwordForgotRequests/:id/approve',
  trimRequest.all,
  requireAuth,
  controller.approvePasswordForgotRequest
);

router.patch(
  '/passwordForgotRequests/:id/reject',
  trimRequest.all,
  requireAuth,
  controller.rejectPasswordForgotRequest
);

router.delete(
  '/passwordForgotRequests/:id',
  trimRequest.all,
  requireAuth,
  controller.deletePasswordForgotRequest
);

router.post(
  '/passwordForgotRequests/deleteMany',
  trimRequest.all,
  requireAuth,
  controller.deletePasswordForgotRequestsMany
);

router.post(
  '/passwordForgotRequests/deleteByDateRange',
  trimRequest.all,
  requireAuth,
  controller.deletePasswordForgotRequestsByDateRange
);

module.exports = router;
